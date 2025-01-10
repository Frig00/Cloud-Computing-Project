import os
import pymysql

def lambda_handler(event, context):
    # Get database connection details from environment variables
    db_host = os.environ['DB_HOST']
    db_name = os.environ['DB_NAME']
    db_user = os.environ['DB_USER']
    db_password = os.environ['DB_PASSWORD']

    # Connect to the database
    conn = pymysql.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        database=db_name
    )

    try:
        with conn.cursor() as cursor:
            # Create users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    userId VARCHAR(255) NOT NULL PRIMARY KEY,
                    password VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    profilePictureUrl TINYTEXT NULL
                )
            """)

            # Create githubUsers table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS githubUsers (
                    userId VARCHAR(255) NOT NULL PRIMARY KEY,
                    githubId INT NOT NULL,
                    CONSTRAINT githubUsers_users_userId_fk
                        FOREIGN KEY (userId) REFERENCES users (userId)
                        ON DELETE CASCADE
                )
            """)

            # Create subscriptions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS subscriptions (
                    subscriberId VARCHAR(255) NOT NULL,
                    subscribedToId VARCHAR(255) NOT NULL,
                    PRIMARY KEY (subscriberId, subscribedToId),
                    CONSTRAINT subscriptions_ibfk_1
                        FOREIGN KEY (subscriberId) REFERENCES users (userId)
                        ON DELETE CASCADE,
                    CONSTRAINT subscriptions_ibfk_2
                        FOREIGN KEY (subscribedToId) REFERENCES users (userId)
                        ON DELETE CASCADE
                )
            """)

            # Create videos table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS videos (
                    id VARCHAR(255) NOT NULL PRIMARY KEY,
                    userId VARCHAR(255) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    uploadDate DATETIME NOT NULL,
                    status ENUM ('PROCESSING', 'PUBLIC') NOT NULL,
                    description TEXT NULL,
                    CONSTRAINT videos_ibfk_1
                        FOREIGN KEY (userId) REFERENCES users (userId)
                        ON DELETE CASCADE
                )
            """)

            # Create comments table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS comments (
                    id VARCHAR(255) NOT NULL PRIMARY KEY,
                    videoId VARCHAR(255) NOT NULL,
                    userId VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    date DATETIME NOT NULL,
                    CONSTRAINT comments_ibfk_1
                        FOREIGN KEY (videoId) REFERENCES videos (id)
                        ON DELETE CASCADE,
                    CONSTRAINT comments_ibfk_2
                        FOREIGN KEY (userId) REFERENCES users (userId)
                        ON DELETE CASCADE
                )
            """)

            # Create likes table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS likes (
                    videoId VARCHAR(255) NOT NULL,
                    userId VARCHAR(255) NOT NULL,
                    PRIMARY KEY (videoId, userId),
                    CONSTRAINT likes_ibfk_1
                        FOREIGN KEY (videoId) REFERENCES videos (id)
                        ON DELETE CASCADE,
                    CONSTRAINT likes_ibfk_2
                        FOREIGN KEY (userId) REFERENCES users (userId)
                        ON DELETE CASCADE
                )
            """)

            # Create views table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS views (
                    videoId VARCHAR(255) NOT NULL,
                    userId VARCHAR(255) NOT NULL,
                    PRIMARY KEY (videoId, userId),
                    CONSTRAINT views_ibfk_1
                        FOREIGN KEY (videoId) REFERENCES videos (id)
                        ON DELETE CASCADE,
                    CONSTRAINT views_ibfk_2
                        FOREIGN KEY (userId) REFERENCES users (userId)
                )
            """)

        conn.commit()
        return {"statusCode": 200, "body": "Tables created successfully"}
    except Exception as e:
        return {"statusCode": 500, "body": f"Error creating tables: {str(e)}"}
    finally:
        conn.close()