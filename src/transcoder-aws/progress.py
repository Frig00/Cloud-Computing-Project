import enum
import json
import boto3
from config import STATUS_LAMBDA

class ProgressStatus(enum.Enum):
    TRANSCODING = 0
    UPLOADING = 1
    COMPLETED = 2
    ERROR = 3


def send_combined_progress(status: ProgressStatus, video_id=None, progress_dict=None, error=None):
    """Send combined transcoding progress for all qualities."""

    lambda_client = boto3.client('lambda')

    message = {
        "videoId": video_id if video_id else None,
        "progress": progress_dict.copy() if progress_dict else None,  # Create a copy of the dict to avoid any threading issues
        "status": status.name,
        "error": error
    }

    try:
        lambda_client.invoke(
            FunctionName=STATUS_LAMBDA,
            InvocationType='Event',
            Payload=json.dumps(message)
        )
    except Exception as e:
        print(f"Error sending WebSocket message: {str(e)}")