import os
import pymysql
import json
import boto3
from botocore.exceptions import ClientError

def get_secret(secret_name, region_name):


    # Create a Secrets Manager client
    client = boto3.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        raise e

    secret = get_secret_value_response['SecretString']
    return secret

def lambda_handler(event, context):
    # Get database connection details from environment variables
    db_host = os.environ['DB_HOST']
    db_name = os.environ['DB_NAME']
    secret_name = os.environ['SECRET_NAME']
    region_name = os.environ['REGION_NAME']

    secret = get_secret(secret_name, region_name)
    secret_dict = json.loads(secret)  # Convert JSON string to a dictionary
    db_user = secret_dict["username"]
    db_password = secret_dict["password"]


    message = json.loads(event['Records'][0]['Sns']['Message'])
    if isinstance(message, str):
        event_data = json.loads(message)
    else:
        event_data = message
        
    video_id = event_data.get('videoId')
    if not video_id:
        raise ValueError("videoId is required in the event")
        

    # Connect to the database
    conn = pymysql.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name
    )

    try:
        with conn.cursor() as cursor:
            
            cursor.execute("""
                UPDATE videos 
                SET status = 'PUBLIC' 
                WHERE id = %s
                """, (video_id,))


        conn.commit()
        return {"statusCode": 200, "body": "Status updated successfully"}
    except Exception as e:
        return {"statusCode": 500, "body": f"Error updating video status: {str(e)}"}
    finally:
        conn.close()