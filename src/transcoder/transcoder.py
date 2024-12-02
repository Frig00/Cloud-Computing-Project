from __future__ import annotations
from ffmpeg import FFmpeg, Progress
import pika
import os
import json
import shutil
from multiprocessing import Pool
from transcoder.ffmpeg.video import create_master_playlist, get_total_frames, get_video_quality, transcode_to_quality
from transcoder.ffmpeg.video_quality import VideoQuality
from transcoder.s3.storage import download_s3_file, upload_s3_folder
from config import (
    RABBITMQ_HOST,
    QUEUE_NAME,
    S3_BUCKET_NAME,
    S3_BUCKET_ENCODED_NAME,
    STATUS_QUEUE_NAME,
    s3_client
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

    # Create a pool of workers (one per transcoding task)
    with Pool(processes=len(qualities_to_process)) as pool:
        pool.starmap(transcode_to_quality, [(file_path, basePath, quality, actual_quality, videoId) for quality in qualities_to_process])


    # Create a master playlist for all qualities
    create_master_playlist(basePath, qualities_to_process, "master.m3u8")


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
    upload_s3_folder("./encoded/", object_id, S3_BUCKET_ENCODED_NAME)
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
        print(f"Error deleting file: {e}")


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