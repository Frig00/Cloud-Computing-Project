import os
import pymysql
import json

def lambda_handler(event, context):
    # Get database connection details from environment variables
    db_host = os.environ['DB_HOST']
    db_name = os.environ['DB_NAME']
    db_user = os.environ['DB_USER']
    db_password = os.environ['DB_PASSWORD']


    if isinstance(event, str):
        event_data = json.loads(event)
    else:
        event_data = event
        
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