import boto3
import json

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
            
            print("Moderation Labels Found:")
            for label in moderation_labels:
                print(f"Timestamp: {label['Timestamp']}ms")
                print(f"Label: {label['ModerationLabel']['Name']}")
                print(f"Confidence: {label['ModerationLabel']['Confidence']:.2f}%")
                print("---")
            
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