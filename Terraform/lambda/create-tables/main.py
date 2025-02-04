import os
import pymysql
import boto3
from botocore.exceptions import ClientError
import json

def get_secret(secret_name, region_name):


    # Create a Secrets Manager client
    client = boto3.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        raise e

    secret = get_secret_value_response['SecretString']
    return secret

def lambda_handler(event, context):
    secret_name = os.environ['SECRET_NAME']
    region_name = os.environ['REGION_NAME']
    db_host = os.environ['DB_HOST']
    db_name = os.environ['DB_NAME']

    secret = get_secret(secret_name, region_name)
    secret_dict = json.loads(secret)  # Convert JSON string to a dictionary
    db_user = secret_dict["username"]
    db_password = secret_dict["password"]



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