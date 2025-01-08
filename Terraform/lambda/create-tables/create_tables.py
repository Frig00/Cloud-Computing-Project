import pymysql
import boto3
import os

# SQL script embedded as a string
SQL_SCRIPT = """
CREATE TABLE IF NOT EXISTS users (
    userId VARCHAR(255) NOT NULL PRIMARY KEY,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    profilePictureUrl TINYTEXT NULL
);

CREATE TABLE IF NOT EXISTS githubUsers (
    userId VARCHAR(255) NOT NULL PRIMARY KEY,
    githubId INT NOT NULL,
    CONSTRAINT githubUsers_users_userId_fk FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    subscriberId VARCHAR(255) NOT NULL,
    subscribedToId VARCHAR(255) NOT NULL,
    PRIMARY KEY (subscriberId, subscribedToId),
    CONSTRAINT subscriptions_ibfk_1 FOREIGN KEY (subscriberId) REFERENCES users (userId) ON DELETE CASCADE,
    CONSTRAINT subscriptions_ibfk_2 FOREIGN KEY (subscribedToId) REFERENCES users (userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS videos (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    uploadDate DATETIME NOT NULL,
    status ENUM ('PROCESSING', 'PUBLIC') NOT NULL,
    description TEXT NULL,
    CONSTRAINT videos_ibfk_1 FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    videoId VARCHAR(255) NOT NULL,
    userId VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    date DATETIME NOT NULL,
    CONSTRAINT comments_ibfk_1 FOREIGN KEY (videoId) REFERENCES videos (id) ON DELETE CASCADE,
    CONSTRAINT comments_ibfk_2 FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS likes (
    videoId VARCHAR(255) NOT NULL,
    userId VARCHAR(255) NOT NULL,
    PRIMARY KEY (videoId, userId),
    CONSTRAINT likes_ibfk_1 FOREIGN KEY (videoId) REFERENCES videos (id) ON DELETE CASCADE,
    CONSTRAINT likes_ibfk_2 FOREIGN KEY (userId) REFERENCES users (userId) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS views (
    videoId VARCHAR(255) NOT NULL,
    userId VARCHAR(255) NOT NULL,
    PRIMARY KEY (videoId, userId),
    CONSTRAINT views_ibfk_1 FOREIGN KEY (videoId) REFERENCES videos (id) ON DELETE CASCADE,
    CONSTRAINT views_ibfk_2 FOREIGN KEY (userId) REFERENCES users (userId)
);
"""

def lambda_handler(event, context):
    # Fetch database credentials from Secrets Manager
    secret_name = os.environ['SECRET_NAME']
    region_name = os.environ['REGION']

    session = boto3.session.Session()
    client = session.client(service_name='secretsmanager', region_name=region_name)
    secret_response = client.get_secret_value(SecretId=secret_name)
    secret = eval(secret_response['SecretString'])  # Use json.loads if you prefer

    # RDS connection details
    db_endpoint = os.environ['DB_ENDPOINT']
    db_name = os.environ['DB_NAME']

    connection = pymysql.connect(
        host=db_endpoint,
        user=secret['username'],
        password=secret['password'],
        database=db_name
    )

    # Execute the SQL script
    with connection.cursor() as cursor:
        for statement in SQL_SCRIPT.split(';'):
            if statement.strip():
                cursor.execute(statement)
    connection.commit()
    connection.close()

    return {"statusCode": 200, "body": "Tables created successfully"}
