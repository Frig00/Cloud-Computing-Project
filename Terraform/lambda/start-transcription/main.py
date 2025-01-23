import json
import boto3
from botocore.exceptions import BotoCoreError, ClientError

def lambda_handler(event, context):
    try:
        sns_message = json.loads(event['Records'][0]['Sns']['Message'])
        record = sns_message['Records'][0]
        bucket_name = record['s3']['bucket']['name']
        object_key = record['s3']['object']['key']

        video_id = object_key.split('/')[0]
        s3_bucket_name = bucket_name

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
            'status': response['TranscriptionJob']['TranscriptionJobStatus'],
            "body": json.dumps({
                "message": "Transcription job started successfully"
            })
        }

    except (BotoCoreError, ClientError) as e:
        error_message = f"Error interacting with AWS: {str(e)}"
        print(error_message)
        return {"statusCode": 500, "body": error_message}

    except Exception as e:
        error_message = f"Unexpected error: {str(e)}"
        print(error_message)
        return {"statusCode": 500, "body": error_message}
