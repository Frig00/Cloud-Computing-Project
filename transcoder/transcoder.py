from __future__ import annotations
from ffmpeg import FFmpeg, Progress
import pika

import boto3
from botocore.client import Config
from botocore.exceptions import NoCredentialsError, PartialCredentialsError


import os
import json

from dotenv import load_dotenv
import subprocess

class Quality:
    def __init__(self, resolution, bitrate):
        self.resolution = resolution
        self.bitrate = bitrate

qualities = {
    "720p": Quality(resolution="1280:720", bitrate="2500k"),
    "1080p": Quality(resolution="1920:1080", bitrate="5000k"),
    "4k": Quality(resolution="3840:2160", bitrate="10000k")
}

load_dotenv()


# RabbitMQ setup
# Read from environment variable, default to 'localhost'
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')
# Read from environment variable, default to 'transcoder'
QUEUE_NAME = os.getenv('QUEUE_NAME', 'video.transcode')
# Read from environment variable, no default
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'video')
# Read from environment variable, no default
S3_BUCKET_ENCODED_NAME = os.getenv('S3_BUCKET_ENCODED_NAME', 'video-encoded')

minio_endpoint = "localhost:9000"  # Replace with your MinIO server endpoint
# Replace with your MinIO access key
access_key = os.getenv("MINIO_ACCESS_KEY")
# Replace with your MinIO secret key
secret_key = os.getenv("MINIO_SECRET_KEY")

# Initialize the S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=f"http://{minio_endpoint}",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
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


def process_file(file_path, output, quality):
    """Stub function to perform work on the downloaded file."""

    # Ensure the output directory exists
    basePath = os.path.dirname(output)
    os.makedirs(basePath, exist_ok=True)

    # Merge base path with the quality
    segmentsPath = os.path.join(basePath, quality)
    os.makedirs(segmentsPath, exist_ok=True)

    print(f"Processing file at {file_path}...")

        # Get video duration before processing
    video_total_frame = get_total_frames(file_path)
    if video_total_frame == 0:
        print("Unable to get video duration. Exiting.")
        return

    ffmpeg = (
        FFmpeg()
        .option("y")  # Overwrite output files without asking
        .input(file_path)
        .output(
            os.path.join(segmentsPath, "playlist.m3u8"),    # Set output file
            codec="h264",                                   # Set video codec
            b=qualities[quality].bitrate,                   # Set video bitrate
            acodec="aac",                                   # Set audio codec
            ab="128k",                                      # Set audio bitrate
            vf="scale=" + qualities[quality].resolution,    # Video filter for scaling
            hls_time=6,                                     # Set HLS segment duration
            hls_playlist_type="vod",                        # Set HLS playlist type
            hls_segment_filename=os.path.join(segmentsPath, "s_%03d.ts")  # Set HLS segment filename
        )
    )

    @ffmpeg.on("start")
    def on_start(arguments: list[str]):
        print("arguments:", arguments)

    @ffmpeg.on("stderr")
    def on_stderr(line):
        pass

    @ffmpeg.on("progress")
    def on_progress(progress: Progress):
        percentage = (float(progress.frame) / video_total_frame) * 100
        print(f"Progress: {percentage:.2f}%")

    @ffmpeg.on("completed")
    def on_completed():
        print("completed")

    @ffmpeg.on("terminated")
    def on_terminated():
        print("terminated")

    ffmpeg.execute()

    # Clean up after processing
    os.remove(file_path)
    print(f"File {file_path} processed and deleted.")


def callback(ch, method, properties, body):
    """Callback function for RabbitMQ consumer."""
    message = json.loads(body)
    object_name = message['videoId']  # The S3 object name sent in the message
    quality = message['quality']  # The quality

    print(f"Received message with object_name: {object_name}")

    # Download the file from S3 and process it
    file_path = download_s3_file(object_name)
    output = f"./encoded/{object_name}"
    process_file(file_path, output, quality)
    upload_s3_folder("./encoded/", object_name, S3_BUCKET_ENCODED_NAME)
    #os.remove(output)
    # Acknowledge message processing completion
    ch.basic_ack(delivery_tag=method.delivery_tag)
    print(f"Message processed and acknowledged: {object_name}")


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