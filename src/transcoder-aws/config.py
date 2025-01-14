import os
import boto3
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

# Environment variables
S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME')
VIDEO_ID = os.environ.get("VIDEO_ID")
STATUS_LAMBDA = os.environ.get("STATUS_LAMBDA")
VIDEO_PATH = os.environ.get("VIDEO_PATH")

# Initialize the S3 client
s3_client = boto3.client(
    's3',
    config=Config(signature_version="s3v4")
)
