import os
import pymysql
import boto3
from botocore.exceptions import ClientError
import json
import time
from functools import wraps

def retry_with_backoff(retries=3, backoff_in_seconds=1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            x = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except (pymysql.Error, pymysql.OperationalError) as e:
                    if x == retries:
                        raise
                    wait = (backoff_in_seconds * 2 ** x)
                    print(f"Database connection attempt {x + 1} failed. Retrying in {wait} seconds...")
                    time.sleep(wait)
                    x += 1
        return wrapper
    return decorator

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

@retry_with_backoff(retries=5, backoff_in_seconds=2)
def connect_to_database(host, user, password, database):
    return pymysql.connect(
        host=host,
        user=user,
        password=password,
        database=database
    )

def lambda_handler(event, context):
    secret_name = os.environ['SECRET_NAME']
    region_name = os.environ['REGION_NAME']
    db_host = os.environ['DB_HOST']
    db_name = os.environ['DB_NAME']

    secret = get_secret(secret_name, region_name)
    db_user = secret["username"]
    db_password = secret["password"]



    conn = pymysql.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name
    )

    try:
        with conn.cursor() as cursor:

            with open('init.sql', 'r') as file:
                sql = file.read()

                for statement in sql.split(';'):
                    if statement.strip():
                        cursor.execute(statement)
                        
                conn.commit()

        return {"statusCode": 200, "body": "Tables created successfully"}
    except Exception as e:
        return {"statusCode": 500, "body": f"Error creating tables: {str(e)}"}
    finally:
        conn.close()