import os
import pymysql

def lambda_handler(event, context):
    db_host = os.environ['DB_HOST']
    db_name = os.environ['DB_NAME']
    db_user = os.environ['DB_USER']
    db_password = os.environ['DB_PASSWORD']

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