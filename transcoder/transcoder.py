from __future__ import annotations
from enum import Enum
from ffmpeg import FFmpeg, Progress
import pika
import boto3
from botocore.client import Config
import os
import json
from dotenv import load_dotenv
import subprocess
import shutil
from enum import Enum
from multiprocessing import Pool


class VideoQuality(Enum):
    LOW = ("360p", "640:360", "800k")
    SD = ("480p", "854:480", "1200k")
    HD = ("720p", "1280:720", "2500k")
    FULL_HD = ("1080p", "1920:1080", "5000k")
    QHD = ("1440p", "2560:1440", "8000k")  # 2K
    UHD = ("2160p", "3840:2160", "10000k")  # 4K

    def __init__(self, label: str, resolution: str, bitrate: str):
        self.label = label
        self.resolution = resolution
        self.bitrate = bitrate

    @classmethod
    def from_height(cls, height: int):
        """Determine the appropriate VideoQuality based on video height."""
        if height >= 2160:
            return cls.UHD
        elif height >= 1440:
            return cls.QHD
        elif height >= 1080:
            return cls.FULL_HD
        elif height >= 720:
            return cls.HD
        elif height >= 480:
            return cls.SD
        elif height >= 360:
            return cls.LOW
        else:
            return None

    @classmethod
    def qualities_below(cls, quality):
        """Return all qualities equal to or below the given quality."""
        qualities = list(cls)
        return qualities[:qualities.index(quality) + 1]

load_dotenv()


RABBITMQ_HOST = os.getenv('RABBITMQ_HOST')
QUEUE_NAME = os.getenv('QUEUE_NAME')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
S3_BUCKET_ENCODED_NAME = os.getenv('S3_BUCKET_ENCODED_NAME')
STATUS_QUEUE_NAME = os.getenv('STATUS_QUEUE_NAME')
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT')
MINIO_ACCESS_KEY= os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")

# Initialize the S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=f"http://{os.getenv('MINIO_ENDPOINT')}",
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    config=Config(signature_version="s3v4"))


def download_s3_file(object_name):
    """Download file from S3 given the object name."""
    file_name = object_name.split('/')[-1]  # Extract filename from object path
    # Ensure the temporary directory exists
    temp_dir = './tmp'
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    # Temp directory to store downloaded file
    local_path = f'{temp_dir}/{file_name}'

    print(f"Downloading {object_name} from S3...")
    s3_client.download_file(S3_BUCKET_NAME, object_name, local_path)

    return local_path


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
    
def send_progress_to_status_queue(video_id, progress, quality):
    """Send transcoding progress to the 'video.status' queue."""
    connection = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))
    channel = connection.channel()

    # Declare the 'video.status' queue (if it doesn't already exist)
    channel.queue_declare(queue=STATUS_QUEUE_NAME, durable=True)

    # Message structure
    message = {
        "videoId": video_id,
        "quality": quality,
        "progress": progress
    }

    # Publish the progress message to the queue
    channel.basic_publish(
        exchange='',
        routing_key=STATUS_QUEUE_NAME,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Make the message persistent
        )
    )

    print(f"Sent progress to status queue: {message}")
    connection.close()


def transcode_to_quality(file_path, base_path, quality: VideoQuality, actual_quality: VideoQuality):
    """Transcode the video to a specific quality."""
    print(f"Transcoding to {quality.label}...")
    segmentsPath = os.path.join(base_path, quality.label)
    os.makedirs(segmentsPath, exist_ok=True)
    video_total_frame = get_total_frames(file_path)

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
        send_progress_to_status_queue(file_path.split('/')[-1], percentage, quality.label)

    @ffmpeg.on("completed")
    def on_completed():
        print("completed")

    try:
        ffmpeg.execute()
    except Exception as e:
        print(f"Error during transcoding to {quality.label}: {e}")

def process_file(file_path, output):
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

    # Create a pool of workers (one per transcoding task)
    with Pool(processes=len(qualities_to_process)) as pool:
        pool.starmap(transcode_to_quality, [(file_path, basePath, quality, actual_quality) for quality in qualities_to_process])

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
                resolution = quality.resolution

                # M3U8 entry for each quality
                f.write(f"#EXT-X-STREAM-INF:BANDWIDTH={bandwidth},RESOLUTION={resolution}\n")
                f.write(f"{playlist_path}\n")

        print(f"Master playlist created at {master_playlist_path}")
    except Exception as e:
        print(f"Error creating master playlist: {e}")


def upload_s3_file(local_path, object_name, encoded_bucked):
    """Upload file to S3 given the local path and object name."""
    print(f"Uploading {local_path} to {object_name} on S3...")
    s3_client.upload_file(local_path, encoded_bucked, object_name)


def upload_s3_folder(local_path, object_name, encoded_bucked):
    for root, dirs, files in os.walk(local_path):
        for file in files:
            local = os.path.join(root, file)
            relative = os.path.relpath(local, local_path)
            s3_path = os.path.join(object_name, relative).replace("\\", "/")
            s3_client.upload_file(local, encoded_bucked, s3_path)


def callback(ch, method, properties, body):
    """Callback function for RabbitMQ consumer."""
    message = json.loads(body)
    object_name = message['videoId']  # The S3 object name sent in the message
    print(f"Received message with object_name: {object_name}")

    # Download the file from S3 and process it
    file_path = download_s3_file(object_name)
    output = f"./encoded/{object_name}"
    process_file(file_path, output)
    upload_s3_folder("./encoded/", object_name, S3_BUCKET_ENCODED_NAME)
    #os.remove(output)
    # Acknowledge message processing completion
    ch.basic_ack(delivery_tag=method.delivery_tag)
    print(f"Message processed and acknowledged: {object_name}")

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
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(RABBITMQ_HOST))
    channel = connection.channel()

    # Check if the queue exists
    try:
        channel.queue_declare(queue=QUEUE_NAME, passive=True)
    except pika.exceptions.ChannelClosedByBroker:
        print(f"Queue '{QUEUE_NAME}' does not exist.")
        return

    # Set up subscription on the queue
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=callback)

    print(f"Waiting for messages in queue: {QUEUE_NAME}. To exit press CTRL+C")
    channel.start_consuming()


if __name__ == '__main__':
    main()