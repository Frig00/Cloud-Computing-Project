import json
import os
from datetime import datetime
import boto3

dynamodb_connections_table = os.environ.get("dynamodb_connections_table")
if not dynamodb_connections_table:
    raise ValueError("dynamodb_connections_table environment variable is required")


dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(dynamodb_connections_table)

def lambda_handler(event, context):
    try:
        videoId = event["queryStringParameters"]["videoId"]
        connectionId = event["requestContext"]["connectionId"]

        timestamp = datetime.utcnow().isoformat()

        table.put_item(
            Item={
                'connectionId': connectionId,
                'videoId': videoId,
                'timestamp': timestamp
            }
        )

   
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Successfully subscribed',
                'connectionId': connectionId,
                'videoId': videoId
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Failed to subscribe',
                'error': str(e)
            })
        }