import boto3
import json
import os
import pymysql

def lambda_handler(event, context):
    rekognition = boto3.client('rekognition')
    
    # Parse SNS message
    message = json.loads(event['Records'][0]['Sns']['Message'])
    job_id = message['JobId']
    status = message['JobStatus']
    
    if status == 'SUCCEEDED':
        try:
            # Get the moderation analysis results
            response = rekognition.get_content_moderation(
                JobId=job_id
            )
            
            # Process moderation labels
            moderation_labels = response['ModerationLabels']
            
            s3_object_name = message['Video']['S3Object']['Name']
            video_id = s3_object_name.split('/')[0]
            
            db_host = os.environ['DB_HOST']
            db_name = os.environ['DB_NAME']
            db_user = os.environ['DB_USER']
            db_password = os.environ['DB_PASSWORD']
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