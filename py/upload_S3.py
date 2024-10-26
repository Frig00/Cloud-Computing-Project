import boto3
from botocore.client import Config
from botocore.exceptions import NoCredentialsError, PartialCredentialsError

import pika
import json
import sys
import random
import string

# Configure your MinIO connection details
minio_endpoint = "localhost:9000"  # Replace with your MinIO server endpoint
access_key = "m0aC1Ion2J2HlbJOODTo"                  # Replace with your MinIO access key
secret_key = "GRI0BCHVKYJ7An1MN1xwBCGInt4YTSBg2biPbr8D"                  # Replace with your MinIO secret key

# Initialize the S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=f"http://{minio_endpoint}",
    aws_access_key_id=access_key,
    aws_secret_access_key=secret_key,
    config=Config(signature_version="s3v4")
)

def upload_file(file_path, bucket_name, object_name=None):
    """
    Uploads a file to a specified MinIO bucket.

    Parameters:
    - file_path (str): Path to the file you want to upload.
    - bucket_name (str): Name of the bucket.
    - object_name (str): The object name in the bucket (defaults to file name).

    Returns:
    - None
    """
    # Set object name to file name if not provided
    if not object_name:
        object_name = file_path.split("/")[-1]

    # Create the bucket if it doesn't exist
    try:
        s3_client.head_bucket(Bucket=bucket_name)
    except s3_client.exceptions.NoSuchBucket:
        s3_client.create_bucket(Bucket=bucket_name)

    # Upload the file
    try:
        s3_client.upload_file(file_path, bucket_name, object_name)
        print(f"File '{file_path}' uploaded to bucket '{bucket_name}' as '{object_name}'")
    except (NoCredentialsError, PartialCredentialsError) as e:
        print(f"Credential error: {e}")
    except Exception as e:
        print(f"Error uploading file: {e}")

# Usage



def publish_video(video_path):
    # RabbitMQ connection
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    # Fanout exchange configuration
    exchange_name = 'video.transcode'

    # Prepare the message
    message = {
        "videoId": video_path,
        "quality": "all"
    }

    # Publish message to the fanout exchange (no routing key needed)
    channel.basic_publish(
        exchange=exchange_name,
        routing_key='',  # Fanout exchange ignores routing keys
        body=json.dumps(message),
        properties=pika.BasicProperties(content_type="application/json")
    )

    print(f"Published video {video_path} to all quality queues.")
    connection.close()




def random_string(length):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

obj_id = random_string(8)
upload_file("videos\sample-30s.mp4", "video", obj_id)
publish_video(obj_id)

