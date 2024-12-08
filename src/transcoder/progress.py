import enum
import json
import pika
from config import STATUS_QUEUE_NAME, RABBITMQ_CHANNEL, RABBITMQ_CONNECTION

class ProgressStatus(enum.Enum):
    TRANSCODING = 0
    UPLOADING = 1
    COMPLETED = 2
    ERROR = 3


def send_combined_progress(status: ProgressStatus, video_id=None, progress_dict=None, error=None):
    """Send combined transcoding progress for all qualities."""

    global RABBITMQ_CHANNEL
    if not RABBITMQ_CHANNEL.is_open:
        RABBITMQ_CHANNEL = RABBITMQ_CONNECTION.channel()

    message = {
        "videoId": video_id if video_id else None,
        "progress": progress_dict.copy() if progress_dict else None,  # Create a copy of the dict to avoid any threading issues
        "status": status.name,
        "error": error
    }

    if not isinstance(STATUS_QUEUE_NAME, str):
        raise ValueError("STATUS_QUEUE_NAME must be a string")

    RABBITMQ_CHANNEL.basic_publish(
        exchange='',
        routing_key=STATUS_QUEUE_NAME,
        body=json.dumps(message),
        properties=pika.BasicProperties(
            delivery_mode=2,
        )
    )
    print(f"Sent combined progress: {message}")