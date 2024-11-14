import boto3
from botocore.client import Config
from botocore.exceptions import NoCredentialsError, PartialCredentialsError, ClientError

import pika
import json
import sys
import random
import string
from dotenv import load_dotenv
import os

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

# Usage



def publish_video(video_path):
    # RabbitMQ connection
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    # Fanout exchange configuration
    queue_name = 'video.transcode'

    # Prepare the message
    message = {
        "videoId": video_path,
        "quality": "720p"
    }

    # Publish message to the fanout exchange (no routing key needed)
    channel.basic_publish(
        exchange='',
        routing_key=queue_name,  # Fanout exchange ignores routing keys
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

def generate_presigned_url(bucket_name, object_name, expiration=3600):
    """
    Generate a pre-signed URL to upload a file to an S3 bucket.
    """
    
    try:
        # Generate a pre-signed URL for the S3 object
        response = s3_client.generate_presigned_url(
            'put_object',
            Params={'Bucket': bucket_name, 'Key': object_name},
            ExpiresIn=expiration
        )
    except ClientError as e:
        print(f"Error generating pre-signed URL: {e}")
        return None

    # Return the pre-signed URL
    return response


presign = generate_presigned_url("video", "sample-30s.mp4")
print(presign)

# Usage:
# curl --location --request PUT '' --header 'Content-Type: video/mp4'--data-binary '@/C:/path/file.mp4'

# Come sapere quando il front-end ha finito di caricare il file?
# - Il frontend può inviare un messaggio al backend quando il caricamento è completato con un ID univoco
# - Impostare un S3 Event Notification per inviare un messaggio a una coda SQS quando un file viene caricato (richiede SQS o Lambda)