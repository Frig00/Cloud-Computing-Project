import os
import boto3
from botocore.client import Config
from dotenv import load_dotenv

load_dotenv()

# Environment variables
RABBITMQ_HOST = os.getenv('RABBITMQ_HOST')
QUEUE_NAME = os.getenv('QUEUE_NAME')
S3_BUCKET_NAME = os.getenv('S3_BUCKET_NAME')
S3_BUCKET_ENCODED_NAME = os.getenv('S3_BUCKET_ENCODED_NAME')
STATUS_QUEUE_NAME = os.getenv('STATUS_QUEUE_NAME')
MINIO_ENDPOINT = os.getenv('MINIO_ENDPOINT')
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")

# Initialize the S3 client
s3_client = boto3.client(
    's3',
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    config=Config(signature_version="s3v4")
)
