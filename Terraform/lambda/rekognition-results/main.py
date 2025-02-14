import boto3
import json
import os
import pymysql
from botocore.exceptions import ClientError

def get_secret(secret_name, region_name):

    # Create a Secrets Manager client
    client = boto3.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
        secret = get_secret_value_response["SecretString"]
        return json.loads(secret)  # Convert JSON string to dictionary
    except ClientError as e:
        print(f"Error retrieving secret: {e}")
        raise e

def lambda_handler(event, context):
    rekognition = boto3.client('rekognition')
    
    # Parse SNS message
    message = json.loads(event['Records'][0]['Sns']['Message'])
    job_id = message['JobId']
    status = message['Status']
    
    if status == 'SUCCEEDED':
        try:
            # Get the moderation analysis results
            response = rekognition.get_content_moderation(
                JobId=job_id
            )
            
            # Process moderation labels
            moderation_labels = response['ModerationLabels']
            
            s3_object_name = message['Video']['S3ObjectName']
            video_id = s3_object_name.split('/')[0]
            
            db_host = os.environ['DB_HOST']
            db_name = os.environ['DB_NAME']
            secret_name = os.environ['SECRET_NAME']
            region_name = os.environ['REGION_NAME']

            secret = get_secret(secret_name, region_name)
            db_user = secret["username"]
            db_password = secret["password"]
            conn = pymysql.connect(host=db_host, user=db_user, password=db_password, database=db_name)
            try:
                with conn.cursor() as cursor:
                    found_labels = set()
                    for label in moderation_labels:
                        if label['ModerationLabel']['Confidence'] >= 95:
                            label_name = label['ModerationLabel']['Name']
                            if label_name not in found_labels:
                                found_labels.add(label_name)
                                cursor.execute("""
                                    INSERT IGNORE INTO video_moderation (videoId, type) 
                                    VALUES (%s, %s)
                                """, (video_id, label_name))
                conn.commit()
            finally:
                conn.close()
        
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'JobId': job_id,
                    'NumberOfLabels': len(moderation_labels)
                })
            }
            
        except Exception as e:
            print(f"Error: {str(e)}")
            raise e
    else:
        print(f"Job failed with status: {status}")
        raise Exception(f"Rekognition job failed: {job_id}")