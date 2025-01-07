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
        connectionId = event["requestContext"]["connectionId"]

        table.delete_item(
            Key={
                'connectionId': connectionId
            }
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Successfully disconnected',
                'connectionId': connectionId
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Failed to disconnect',
                'error': str(e)
            })
        }