from __future__ import annotations
from ffmpeg import FFmpeg, Progress
import pika

import boto3
from botocore.client import Config
from botocore.exceptions import NoCredentialsError, PartialCredentialsError


import os
import json



# RabbitMQ setup
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST', 'localhost')  # Read from environment variable, default to 'localhost'
QUEUE_NAME = os.getenv('QUEUE_NAME', 'video.transcode_queue')  # Read from environment variable, default to 'transcoder'
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME', 'video')  # Read from environment variable, no default
S3_BUCKET_ENCODED_NAME = os.getenv('S3_BUCKET_ENCODED_NAME', 'video-encoded')  # Read from environment variable, no default

minio_endpoint = "localhost:9000"  # Replace with your MinIO server endpoint
access_key = "m0aC1Ion2J2HlbJOODTo"                  # Replace with your MinIO access key
secret_key = "GRI0BCHVKYJ7An1MN1xwBCGInt4YTSBg2biPbr8D"                  # Replace with your MinIO secret key

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
    
    local_path = f'{temp_dir}/{file_name}'  # Temp directory to store downloaded file
    
    print(f"Downloading {object_name} from S3...")
    s3_client.download_file(S3_BUCKET_NAME, object_name, local_path)
    
    return local_path

def upload_s3_file(local_path, object_name, encoded_bucked):
    """Upload file to S3 given the local path and object name."""
    print(f"Uploading {local_path} to {object_name} on S3...")
    s3_client.upload_file(local_path, encoded_bucked, object_name)

def process_file(file_path, output,quality):
    """Stub function to perform work on the downloaded file."""
    print(f"Processing file at {file_path}...")
    ffmpeg = (
        FFmpeg()
        .option("y")
        .input(file_path)
        .output(
        output,
        {
            "codec:v": "libx264",
            "b:v": "2500k"
        },  # Set the bitrate to 2500 kbps
        vf="scale=1280:720",
        preset="veryfast",
        crf=24,
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
        pass

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
    output = f"encoded/{object_name}.mp4"
    process_file(file_path, output, quality)
    upload_s3_file(output, object_name, S3_BUCKET_ENCODED_NAME)
    os.remove(output)
    # Acknowledge message processing completion
    ch.basic_ack(delivery_tag=method.delivery_tag)
    print(f"Message processed and acknowledged: {object_name}")

def main():
    """Set up RabbitMQ connection and start consuming messages."""
    # Connect to RabbitMQ
    connection = pika.BlockingConnection(pika.ConnectionParameters(RABBITMQ_HOST))
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