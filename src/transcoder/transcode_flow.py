import os
import subprocess
from ffmpeg import FFmpeg, Progress
from video_quality import VideoQuality
from progress import send_combined_progress, ProgressStatus
from config import RABBITMQ_HOST

def get_video_quality(file_path):
    # Get the resolution-based quality of a video using ffprobe and map to VideoQuality.
    try:
        # Run ffprobe to get video resolution
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "error",
                "-select_streams", "v:0",
                "-show_entries", "stream=width,height",
                "-of", "csv=p=0",
                file_path
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        # Parse the output for width and height
        output = result.stdout.strip()
        if not output:
            raise ValueError("Could not retrieve video resolution.")
        width, height = map(int, output.split(','))  # Ensure width and height are integers

        # Use the VideoQuality enum to map the height
        quality = VideoQuality.from_height(height)
        return quality if quality else "Unknown quality"

    except Exception as e:
        send_combined_progress(ProgressStatus.ERROR, error=str(e))
        print(f"Error determining video quality: {e}")
        return "Unknown quality"

def transcode_to_quality(file_path, base_path, quality: VideoQuality, actual_quality: VideoQuality, videoId: str, shared_progress):
    """Transcode the video to a specific quality."""
    print(f"Transcoding to {quality.label}...")
    segmentsPath = os.path.join(base_path, quality.label)
    os.makedirs(segmentsPath, exist_ok=True)
    video_total_frame = get_total_frames(file_path)

    if quality == actual_quality:
        create_video_thumbnail(file_path, os.path.join(base_path, "thumbnail.jpg"))

    # Initialize progress for this quality
    shared_progress[quality.label] = 0

    # Configure FFmpeg command for transcoding
    ffmpeg = (
        FFmpeg()
        .option("y")
        .input(file_path)
        .output(
            os.path.join(segmentsPath, "playlist.m3u8"),
            codec="h264",
            b=quality.bitrate,
            acodec="aac",
            ab="128k",
            vf=f"scale={quality.width}:{quality.height}",
            hls_time=6,
            hls_playlist_type="vod",
            hls_segment_filename=os.path.join(segmentsPath, "s_%03d.ts")
        )
    )

    @ffmpeg.on("progress")
    def on_progress(progress: Progress):
        percentage = int((float(progress.frame) / video_total_frame) * 100)
        # Update progress in shared dictionary
        shared_progress[quality.label] = percentage
        # Send combined progress
        send_combined_progress(ProgressStatus.TRANSCODING, videoId, shared_progress)

    @ffmpeg.on("completed")
    def on_completed():
        shared_progress[quality.label] = 100
        send_combined_progress(ProgressStatus.TRANSCODING, videoId, shared_progress)

    try:
        ffmpeg.execute()
    except Exception as e:
        send_combined_progress(ProgressStatus.ERROR, error=str(e))
        print(f"Error during transcoding to {quality.label}: {e}")

def get_total_frames(file_path):
    """Get the total number of frames in a video using ffprobe."""
    
    def get_frames_by_duration_and_fps():
        """Calculate frames using video duration and frame rate."""
        duration_result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=duration", "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        duration = float(duration_result.stdout.decode('utf-8').strip())
        
        fps_result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate", "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        fps_str = fps_result.stdout.decode('utf-8').strip()
        fps_parts = fps_str.split('/')
        fps = float(fps_parts[0]) / float(fps_parts[1]) if len(fps_parts) == 2 else float(fps_str)
        
        return int(duration * fps)

    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-count_packets", "-show_entries", "stream=nb_read_packets", "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        frames = result.stdout.decode('utf-8').strip()
        if frames and frames != 'N/A':
            return int(frames)
        else:
            return get_frames_by_duration_and_fps()
    except Exception as e:
        print(f"Error getting total frames: {e}")
        try:
            return get_frames_by_duration_and_fps()
        except Exception as e:
            send_combined_progress(ProgressStatus.ERROR, error=str(e))
            print(f"Error calculating frames from duration and fps: {e}")
            return 0

def create_video_thumbnail(video_path: str, thumbnail_path: str, time: str = "00:00:01"):
    """
    Create a thumbnail from a video using ffmpeg.

    Parameters:
    - video_path (str): Path to the input video file.
    - thumbnail_path (str): Path to save the generated thumbnail image.
    - time (str): Timestamp to capture the thumbnail (format: HH:MM:SS). Default is 00:00:01.

    Returns:
    - bool: True if the thumbnail was created successfully, False otherwise.
    """
    if not os.path.exists(video_path):
        print("Error: The specified video file does not exist.")
        return False

    try:
        # Execute the ffmpeg command
        command = [
            "ffmpeg",
            "-i", video_path,
            "-ss", time,  # Seek to the specified time
            "-vframes", "1",  # Capture a single frame
            "-q:v", "2",  # Set quality level for the output image
            thumbnail_path
        ]
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Thumbnail created at {thumbnail_path}")
        return True
    except subprocess.CalledProcessError as e:
        send_combined_progress(ProgressStatus.ERROR, error=str(e))
        print(f"Error: ffmpeg command failed. {e}")
        return False
    except Exception as e:
        send_combined_progress(ProgressStatus.ERROR, error=str(e))
        print(f"Unexpected error: {e}")
        return False

def create_master_playlist(base_path: str, qualities: list[VideoQuality], output_file: str):
    """
    Create a master playlist (.m3u8) that references individual quality playlists.

    Parameters:
    - base_path (str): The base directory containing the individual quality playlists.
    - qualities (list[VideoQuality]): List of qualities to include in the master playlist.
    - output_file (str): Path to save the master playlist file.
    """
    master_playlist_path = os.path.join(base_path, output_file)

    try:
        with open(master_playlist_path, 'w') as f:
            # M3U8 header
            f.write("#EXTM3U\n")

            for quality in qualities:
                playlist_path = os.path.join(quality.label, "playlist.m3u8")
                bandwidth = int(quality.bitrate[:-1]) * 1000  # Convert bitrate to an integer in bits
                resolution = f"{quality.width}x{quality.height}" 

                # M3U8 entry for each quality
                f.write(f"#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={resolution},NAME=\"{quality.label}\"\n")
                f.write(f"{playlist_path}\n")

        print(f"Master playlist created at {master_playlist_path}")
    except Exception as e:
        send_combined_progress(ProgressStatus.ERROR, error=str(e))
        print(f"Error creating master playlist: {e}")