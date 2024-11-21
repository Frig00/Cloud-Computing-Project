import boto3
from botocore.client import Config
from botocore.exceptions import NoCredentialsError, PartialCredentialsError, ClientError

import pika
import json
import random
import string
from dotenv import load_dotenv
import os
import subprocess
from enum import Enum

load_dotenv()

# Configure your MinIO connection details
minio_endpoint = "localhost:9000"  # Replace with your MinIO server endpoint
access_key = os.getenv("MINIO_ACCESS_KEY")                  # Replace with your MinIO access key
secret_key = os.getenv("MINIO_SECRET_KEY")                  # Replace with your MinIO secret key

print("Access key: " + access_key)
print("Secret key: " + secret_key + "\n\n")

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


def random_string(length):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

obj_id = random_string(8)
upload_file("videos\sample-30s.mp4", "video", obj_id)