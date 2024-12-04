from __future__ import annotations
from ffmpeg import FFmpeg, Progress
import pika
import os
import json
import subprocess
import shutil
from multiprocessing import Pool, Manager
from video_quality import VideoQuality
from config import (
    RABBITMQ_HOST,
    TRANSCODE_QUEUE_NAME,
    S3_BUCKET_NAME,
    S3_BUCKET_ENCODED_NAME,
    STATUS_QUEUE_NAME,
    s3_client
)


def download_s3_file(bucket, object_path):
    """Download file from S3 given the object name."""
    file_name = object_path.split('/')[-1]  # Extract filename from object path
    # Ensure the temporary directory exists
    temp_dir = './tmp'
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    # Temp directory to store downloaded file
    local_path = f'{temp_dir}/{file_name}'

    try:
        # Attempt to download the file
        s3_client.download_file(bucket, object_path, local_path)
        print(f"Downloaded {object_path} to {local_path}")
        return local_path
    except Exception as e:
        print(f"File {object_path} not found in bucket {bucket} or bucket {bucket} does not exist.")
        print(f"Error: {e}")
        return None


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
            print(f"Error calculating frames from duration and fps: {e}")
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

def send_combined_progress(video_id, progress_dict, mq_channel):
    """Send combined transcoding progress for all qualities."""
    message = {
        "videoId": video_id,
        "progress": progress_dict.copy()  # Create a copy of the dict to avoid any threading issues
    }

    mq_channel.basic_publish(
        exchange='',
        routing_key=STATUS_QUEUE_NAME,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2,
        )
    )
    print(f"Sent combined progress: {message}")

def transcode_to_quality(file_path, base_path, quality: VideoQuality, actual_quality: VideoQuality, videoId: str, shared_progress):
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
        send_combined_progress(videoId, shared_progress, mq_channel)

    @ffmpeg.on("completed")
    def on_completed():
        shared_progress[quality.label] = 100
        send_combined_progress(videoId, shared_progress, mq_channel)
        mq_connection.close()
        print(f"Connection closed for quality: {quality.label}")

    try:
        ffmpeg.execute()
    except Exception as e:
        print(f"Error during transcoding to {quality.label}: {e}")

def process_file(file_path, output, videoId: str):
    """Transcode the video into all qualities equal to or lower than its actual quality."""
    basePath = os.path.dirname(output)
    os.makedirs(basePath, exist_ok=True)

    print(f"Processing file at {file_path}...")

    # Get video total frames
    video_total_frame = get_total_frames(file_path)
    if video_total_frame == 0:
        print("Unable to get video duration. Exiting.")
        return

    # Determine the actual quality of the video
    actual_quality = get_video_quality(file_path)
    if not actual_quality:
        print("Could not determine video quality. Exiting.")
        return

    # Transcode to all qualities below or equal to the actual quality in parallel
    qualities_to_process = VideoQuality.qualities_below(actual_quality)

    # Create a manager for shared progress dictionary
    with Manager() as manager:
        shared_progress = manager.dict()
        
        # Create a pool of workers (one per transcoding task)
        with Pool(processes=len(qualities_to_process)) as pool:
            pool.starmap(transcode_to_quality, [(file_path, basePath, quality, actual_quality, videoId, shared_progress) for quality in qualities_to_process])


    # Create a master playlist for all qualities
    create_master_playlist(basePath, qualities_to_process, "master.m3u8")


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
        print(f"Error creating master playlist: {e}")


def upload_s3_file(local_path, object_name, encoded_bucked):
    """Upload file to S3 given the local path and object name."""

    try:
        s3_client.upload_file(local_path, encoded_bucked, object_name)
        print(f"Uploaded {object_name} to S3 bucket '{encoded_bucked}'")
    except Exception as e:
        print(f"Bucket {encoded_bucked} does not exist or file {object_name} could not be uploaded.")


def upload_s3_folder(local_path, object_name, encoded_bucked):
    for root, dirs, files in os.walk(local_path):
        for file in files:
            local = os.path.join(root, file)
            relative = os.path.relpath(local, local_path)
            s3_path = os.path.join(object_name, relative).replace("\\", "/")
            try:
                s3_client.upload_file(local, encoded_bucked, s3_path)
                print(f"Uploaded {s3_path} to S3 bucket '{encoded_bucked}'")
            except Exception as e:
                print(f"Bucket {encoded_bucked} does not exist or file {s3_path} could not be uploaded.")


def callback(ch, method, properties, body):
    """Callback function for RabbitMQ consumer."""
    message = json.loads(body)
    object_id = message['videoId']  # The S3 object name sent in the message
    object_path = message['path']  # The S3 object location sent in the message
    object_bucket = message['bucket'] # The S3 bucket name sent in the message
    print(f"Received message with object_name: {object_id}")

    # Download the file from S3 and process it
    file_path = download_s3_file(object_bucket, object_path)
    output = f"./encoded/{object_id}"
    process_file(file_path, output, object_id)
    upload_s3_folder("./encoded/", object_id, S3_BUCKET_ENCODED_NAME)
    #os.remove(output)
    # Acknowledge message processing completion
    ack = ch.basic_ack(delivery_tag=method.delivery_tag)
    if ack:
        print(f"Message processed and acknowledged: {object_id}")

    # Clean up after processing
    try:
        shutil.rmtree("./tmp")
        shutil.rmtree("./encoded")
        print("Cleaned up temporary files and folders.")
    except Exception as e:
        print(f"Error deleting file: {e}")


def main():
    """Set up RabbitMQ connection and start consuming messages."""
    # Connect to RabbitMQ

    print(f"Connecting to RabbitMQ on {RABBITMQ_HOST}...")
    connection = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))
    channel = connection.channel()
    print(f"Connected to RabbitMQ on {RABBITMQ_HOST}")

    # Check if the queue exists
    try:
        channel.queue_declare(queue=TRANSCODE_QUEUE_NAME, passive=True)
    except pika.exceptions.ChannelClosedByBroker:
        print(f"Queue '{TRANSCODE_QUEUE_NAME}' does not exist.")
        return

    # Set up subscription on the queue
    channel.basic_consume(queue=TRANSCODE_QUEUE_NAME, on_message_callback=callback)
    
    print(f"Waiting for messages in queue: {TRANSCODE_QUEUE_NAME}. To exit press CTRL+C")
    channel.start_consuming()


if __name__ == '__main__':
    main()