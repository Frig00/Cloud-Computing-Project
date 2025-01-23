import boto3
import os
import json

def lambda_handler(event, context):
    rekognition = boto3.client('rekognition')
    s3 = boto3.client('s3')
    

    sns_message = json.loads(event['Records'][0]['Sns']['Message'])
    bucket = sns_message['Records'][0]['s3']['bucket']['name']
    video = sns_message['Records'][0]['s3']['object']['key']
    
    try:
        response = rekognition.start_content_moderation(
            Video={
                'S3Object': {
                    'Bucket': bucket,
                    'Name': video
                }
            },
            NotificationChannel={
                'SNSTopicArn': os.environ['SNS_TOPIC_ARN'],
                'RoleArn': os.environ['REKOGNITION_ROLE_ARN']
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'JobId': response['JobId']
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise e