import os
import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError

def lambda_handler(event, context):
    try:
        sns_message = json.loads(event['Records'][0]['Sns']['Message'])
        record = sns_message['Records'][0]
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
            launchType="FARGATE", 
            networkConfiguration={
                "awsvpcConfiguration": {
                    "subnets": subnets,  
                    "securityGroups": security_groups, 
                    "assignPublicIp": "DISABLED",
                }
            },
        )

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
