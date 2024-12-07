from __future__ import annotations
import os
import json
import shutil
from multiprocessing import Pool, Manager
from S3_storage import download_s3_file, upload_s3_folder
from transcode_flow import create_master_playlist, get_total_frames, get_video_quality, transcode_to_quality
from video_quality import VideoQuality
from progress import send_combined_progress, ProgressStatus
from config import (
    RABBITMQ_HOST,
    TRANSCODE_QUEUE_NAME,
    S3_BUCKET_NAME,
    STATUS_QUEUE_NAME,
    RABBITMQ_CHANNEL
)


def process_file(file_path, output, videoId: str):
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

    # Create a manager for shared progress dictionary
    with Manager() as manager:
        shared_progress = manager.dict()
        
        # Create a pool of workers (one per transcoding task)
        with Pool(processes=len(qualities_to_process)) as pool:
            pool.starmap(transcode_to_quality, [(file_path, basePath, quality, actual_quality, videoId, shared_progress) for quality in qualities_to_process])


    # Create a master playlist for all qualities
    create_master_playlist(basePath, qualities_to_process, "master.m3u8")

    send_combined_progress(ProgressStatus.COMPLETED.name, videoId)



def callback(ch, method, properties, body):
    """Callback function for RabbitMQ consumer."""
    message = json.loads(body)
    object_id = message['videoId']  # The S3 object name sent in the message
    object_path = message['path']  # The S3 object location sent in the message
    object_bucket = message['bucket'] # The S3 bucket name sent in the message
    print(f"Received message with object_name: {object_id}")

    # Download the file from S3 and process it
    file_path = download_s3_file(object_bucket, object_path)
    output = f"./encoded/{object_id}"
    process_file(file_path, output, object_id)
    upload_s3_folder("./encoded/", object_id, S3_BUCKET_NAME)
    #os.remove(output)
    # Acknowledge message processing completion
    ack = ch.basic_ack(delivery_tag=method.delivery_tag)
    if ack:
        print(f"Message processed and acknowledged: {object_id}")

    # Clean up after processing
    try:
        shutil.rmtree("./tmp")
        shutil.rmtree("./encoded")
        print("Cleaned up temporary files and folders.")
    except Exception as e:
        send_combined_progress(ProgressStatus.ERROR.name, error=str(e))
        print(f"Error deleting file: {e}")


def main():
    """Set up RabbitMQ connection and start consuming messages."""

    print(f"Connecting to RabbitMQ on {RABBITMQ_HOST}...")

    try:
        RABBITMQ_CHANNEL.queue_declare(queue=TRANSCODE_QUEUE_NAME, passive=True)
        RABBITMQ_CHANNEL.queue_declare(queue=STATUS_QUEUE_NAME, passive=True)
    except Exception as e:
        send_combined_progress(ProgressStatus.ERROR.name, error=str(e))
        print(f"Queue '{TRANSCODE_QUEUE_NAME}' does not exist.")
        return 0

    RABBITMQ_CHANNEL.basic_consume(queue=TRANSCODE_QUEUE_NAME, on_message_callback=callback)
    
    print(f"Waiting for messages in queue: {TRANSCODE_QUEUE_NAME}. To exit press CTRL+C")
    RABBITMQ_CHANNEL.start_consuming()


if __name__ == '__main__':
    main()