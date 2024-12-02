
from __future__ import annotations
import os
import subprocess
import pika
from ffmpeg import FFmpeg, Progress
from transcoder.ffmpeg.video_quality import VideoQuality
import json
import shutil
from multiprocessing import Pool
from config import (
    RABBITMQ_HOST,
    QUEUE_NAME,
    S3_BUCKET_NAME,
    S3_BUCKET_ENCODED_NAME,
    STATUS_QUEUE_NAME,
    s3_client
)



def get_total_frames(file_path):
    """Get the total number of frames in a video using ffprobe."""
   

    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=nb_frames", "-of", "default=noprint_wrappers=1:nokey=1", file_path],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE
        )
        frames = result.stdout.decode('utf-8').strip()
        if frames:
            return int(frames)
        else:
            raise ValueError("Could not retrieve the total number of frames.")
    except Exception as e:
        print(f"Error getting total frames: {e}")
        return 0

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
        print(f"Error determining video quality: {e}")
        return "Unknown quality"

def send_progress_to_status_queue(video_id, progress, quality, mq_channel):
    """Send transcoding progress to the 'video.status' queue."""

    # Message structure
    message = {
        "videoId": video_id,
        "quality": quality,
        "progress": progress
    }

    # Publish the progress message to the queue
    mq_channel.basic_publish(
        exchange='',
        routing_key=STATUS_QUEUE_NAME,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Make the message persistent
        )
    )

    print(f"Sent progress to status queue: {message}")

def transcode_to_quality(file_path, base_path, quality: VideoQuality, actual_quality: VideoQuality, videoId: str):
    """Transcode the video to a specific quality."""
    print(f"Transcoding to {quality.label}...")
    segmentsPath = os.path.join(base_path, quality.label)
    os.makedirs(segmentsPath, exist_ok=True)
    video_total_frame = get_total_frames(file_path)

    # Connect to RabbitMQ
    mq_connection = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))
    mq_channel = mq_connection.channel()
    print(f"Connected to RabbitMQ on {RABBITMQ_HOST} for quality: {quality.label}")

    if quality == actual_quality:
        create_video_thumbnail(file_path, os.path.join(base_path, "thumbnail.jpg"))

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
            vf="scale=" + quality.resolution,
            hls_time=6,
            hls_playlist_type="vod",
            hls_segment_filename=os.path.join(segmentsPath, "s_%03d.ts")
        )
    )

    @ffmpeg.on("progress")
    def on_progress(progress: Progress):
        percentage = int((float(progress.frame) / video_total_frame) * 100)
        #print(f"Progress: {percentage:.2f}% for quality: {quality.label}")

        # Send progress to RabbitMQ queue 'video.status'
        send_progress_to_status_queue(videoId, percentage, quality.label, mq_channel)

    @ffmpeg.on("completed")
    def on_completed():
        send_progress_to_status_queue(videoId, "completed", quality.label, mq_channel)
        mq_connection.close()
        print(f"Connection closed for quality: {quality.label}")

    try:
        ffmpeg.execute()
    except Exception as e:
        print(f"Error during transcoding to {quality.label}: {e}")

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
                resolution = quality.resolution

                # M3U8 entry for each quality
                f.write(f"#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={resolution}\n")
                f.write(f"{playlist_path}\n")

        print(f"Master playlist created at {master_playlist_path}")
    except Exception as e:
        print(f"Error creating master playlist: {e}")

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
        print(f"Error: ffmpeg command failed. {e}")
        return False
    except Exception as e:
        print(f"Unexpected error: {e}")
        return False