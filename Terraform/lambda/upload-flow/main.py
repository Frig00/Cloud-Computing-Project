import os
import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError

def start_transcription_job(video_id, s3_bucket_name):
    """
    Start an AWS Transcribe job with automatic language detection
    """
    try:
        transcribe_client = boto3.client('transcribe')

        job_name = f"transcribe-{video_id}"
        output_key = f"{video_id}/transcripts/transcription"
        input_s3_uri = f"s3://{s3_bucket_name}/{video_id}/original.mp4"

        response = transcribe_client.start_transcription_job(
            TranscriptionJobName=job_name,
            Media={'MediaFileUri': input_s3_uri},
            OutputBucketName=s3_bucket_name,
            OutputKey=output_key,
            IdentifyLanguage=True,
            Subtitles={
                'Formats': ['vtt']
            }
        )

        return {
            'statusCode': 200,
            'jobName': job_name,
            'status': response['TranscriptionJob']['TranscriptionJobStatus']
        }

    except ClientError as e:
        return {
            'statusCode': 500,
            'error': str(e)
        }



def lambda_handler(event, context):
    try:
        record = event['Records'][0]
        bucket_name = record['s3']['bucket']['name']
        object_key = record['s3']['object']['key']

        s3_bucket_name = bucket_name
        status_lambda = os.environ['STATUS_LAMBDA']
        cluster_name = os.environ['ECS_CLUSTER_NAME']
        task_definition = os.environ['ECS_TASK_DEFINITION']
        task_container_name = os.environ['ECS_TASK_CONTAINER_NAME']
        subnets = os.environ['SUBNETS'].split(',')
        security_groups = os.environ['SECURITY_GROUPS'].split(',')

        video_id = object_key.split('/')[0]

        ecs_client = boto3.client('ecs')
      
        container_overrides = [
            {
                "name": task_container_name,  
                "environment": [
                    {"name": "S3_BUCKET_NAME", "value": s3_bucket_name},
                    {"name": "VIDEO_ID", "value": video_id},
                    {"name": "STATUS_LAMBDA", "value": status_lambda},
                    {"name": "VIDEO_PATH", "value": object_key},
                ],
            }
        ]

        response = ecs_client.run_task(
            cluster=cluster_name,
            taskDefinition=task_definition,
            overrides={"containerOverrides": container_overrides},
            launchType="FARGATE",  # Change if using EC2 launch type
            networkConfiguration={
                "awsvpcConfiguration": {
                    "subnets": subnets,  
                    "securityGroups": security_groups, 
                    "assignPublicIp": "DISABLED",
                }
            },
        )

        start_transcription_job(video_id, s3_bucket_name)



        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "ECS task started successfully"
            })
        }

    except KeyError as e:
        error_message = f"Missing key in event or environment: {str(e)}"
        print(error_message)
        return {"statusCode": 400, "body": error_message}

    except (BotoCoreError, ClientError) as e:
        error_message = f"Error interacting with AWS: {str(e)}"
        print(error_message)
        return {"statusCode": 500, "body": error_message}

    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        print(error_message)
        return {"statusCode": 500, "body": error_message}
