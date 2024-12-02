
import os
from config import (
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