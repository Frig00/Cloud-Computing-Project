import json
import os
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

# Environment variables
dynamodb_connections_table = os.environ.get("dynamodb_connections_table")
websocket_api_endpoint = os.environ.get("websocket_api_endpoint")
publish_lambda_name = os.environ.get("publish_lambda_name")

if not dynamodb_connections_table:
    raise ValueError("dynamodb_connections_table environment variable is required")
if not websocket_api_endpoint:
    raise ValueError("websocket_api_endpoint environment variable is required")

# Initialize AWS clients
dynamodb = boto3.resource("dynamodb")
lambda_client = boto3.client('lambda')
table = dynamodb.Table(dynamodb_connections_table)
apigatewaymanagementapi = boto3.client(
    'apigatewaymanagementapi',
    endpoint_url=websocket_api_endpoint
)

def get_connection_id(video_id):
    """Get connectionId for a given videoId from DynamoDB"""
    try:
        # Query using the videoId (GSI might be more efficient in production)
        response = table.scan(
            FilterExpression=Key('videoId').eq(video_id)
        )
        
        items = response.get('Items', [])
        if items:
            return items[0]['connectionId']
        return None
        
    except ClientError as e:
        print(f"DynamoDB error: {str(e)}")
        return None

def send_to_connection(connection_id, data):
    """Send data to a WebSocket connection"""
    try:
        apigatewaymanagementapi.post_to_connection(
            ConnectionId=connection_id,
            Data=json.dumps(data)
        )
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'GoneException':
            try:
                table.delete_item(
                    Key={'connectionId': connection_id}
                )
            except ClientError as del_error:
                print(f"Error deleting stale connection: {str(del_error)}")
        else:
            print(f"Error sending message: {str(e)}")
        return False

def invoke_completion_lambda(event_data):
    """Invoke the completion lambda function"""
    try:
        response = lambda_client.invoke(
            FunctionName=publish_lambda_name,
            InvocationType='Event', 
            Payload=json.dumps(event_data)
        )
        return True
    except ClientError as e:
        print(f"Error invoking completion lambda: {str(e)}")
        return False

def lambda_handler(event, context):
    try:
        if isinstance(event, str):
            event_data = json.loads(event)
        else:
            event_data = event
            
        video_id = event_data.get('videoId')
        if not video_id:
            raise ValueError("videoId is required in the event")

        # Check if status is COMPLETED and invoke the completion lambda
        if publish_lambda_name and event_data.get('status') == "COMPLETED":
            invoke_completion_lambda(event_data)

        connection_id = get_connection_id(video_id)
        if not connection_id:
            print(f"No connection found for videoId: {video_id}")
            return {
                'statusCode': 404,
                'body': json.dumps({
                    'message': 'No connection found for videoId',
                    'videoId': video_id
                })
            }

        success = send_to_connection(connection_id, event_data)
        
        if success:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Successfully sent message',
                    'videoId': video_id,
                    'connectionId': connection_id
                })
            }
        else:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'message': 'Failed to send message',
                    'videoId': video_id,
                    'connectionId': connection_id
                })
            }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error processing request',
                'error': str(e)
            })
        }