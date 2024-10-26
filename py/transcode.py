import pika
import json

def callback(ch, method, properties, body):
    # Decode the JSON message
    message = json.loads(body)
    video_path = message.get("video_path")

    print(f"Received video: {video_path}")
    # Add your video processing code here for quality 'a'
    # Example: transcode_to_quality_a(video_path)

# RabbitMQ connection
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()

# Queue name for quality 'a'
queue_name = 'video.transcode.a'

# Start consuming messages from the queue
channel.basic_consume(queue=queue_name, on_message_callback=callback, auto_ack=True)
print(f"Listening for messages on queue: {queue_name}")
channel.start_consuming()
