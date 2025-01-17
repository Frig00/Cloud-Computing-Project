import json

def lambda_handler(event, context):
    # Print the full event object
    print("Received event:")
    print(json.dumps(event, indent=2))
    print("EXTRACTED OBJECT:")
    print(event["Records"][0]["s3"]["object"]["key"])
    
    # Return a successful response
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Event successfully logged',
            'event': event
        })
    }