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

class VideoQuality(Enum):
    LOW = "360p"
    SD = "480p"
    HD = "720p"
    FULL_HD = "1080p"
    QHD = "1440p"  # 2K
    UHD = "2160p"  # 4K

    @classmethod
    def from_height(cls, height):
        """Map a video height to a VideoQuality enum."""
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


def get_video_quality(file_path):
    """Get the resolution-based quality of a video using ffprobe and map to VideoQuality."""
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
        width, height = map(int, output.split(','))

        # Use the VideoQuality enum to map the height
        quality = VideoQuality.from_height(height)
        return quality.value if quality else "Unknown quality"

    except Exception as e:
        print(f"Error determining video quality: {e}")
        return "Unknown quality"


def publish_video(video_id, video_res):
    # RabbitMQ connection
    connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
    channel = connection.channel()

    # Fanout exchange configuration
    queue_name = 'video.transcode'

    for quality in VideoQuality:
        if quality.value != video_res:
        # Prepare the message
            message = {
                "videoId": video_id,
                "quality": quality.value
            }

            # Publish message to the fanout exchange (no routing key needed)
            channel.basic_publish(
                exchange='',
                routing_key=queue_name,  # Fanout exchange ignores routing keys
                body=json.dumps(message),
                properties=pika.BasicProperties(content_type="application/json")
            )

            print(f"Published video {video_id} to quality {message['quality']}.")
    
    
    connection.close()


def random_string(length):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))

obj_id = random_string(8)
upload_file("videos\sample-30s.mp4", "video", obj_id)
publish_video(obj_id, get_video_quality("videos\sample-30s.mp4"))

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