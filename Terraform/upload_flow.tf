resource "aws_iam_role_policy" "lambda_policy" {
  name = "s3_lambda_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "${aws_s3_bucket.video_bucket.arn}/*",
          "arn:aws:logs:*:*:*"
        ]
      }
    ]
  })
}

data "archive_file" "sunomi-start-transcoder" {
  type        = "zip"
  source_file = "lambda/start-transcoder/main.py"
  output_path = "lambda/out/start-transcoder.zip"
}

data "archive_file" "sunomi-start-transcription" {
  type        = "zip"
  source_file = "lambda/start-transcription/main.py"
  output_path = "lambda/out/start-transcription.zip"
}

data "archive_file" "sunomi-start-rekognition" {
  type        = "zip"
  source_file = "lambda/start-rekognition/main.py"
  output_path = "lambda/out/start-rekognition.zip"
}

data "archive_file" "sunomi-rekognition-results" {
  type        = "zip"
  source_file = "lambda/rekognition-results/main.py"
  output_path = "lambda/out/rekognition-results.zip"
}


resource "aws_lambda_function" "sunomi-start-transcoder" {
  filename         = data.archive_file.sunomi-start-transcoder.output_path
  function_name    = "sunomi-start-transcoder"
  role             = aws_iam_role.sunomi-start-transcoder-role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = filebase64sha256(data.archive_file.sunomi-start-transcoder.output_path)

  timeout = 60

  environment {
    variables = {
      STATUS_TOPIC            = aws_sns_topic.transcoder_status.arn
      ECS_CLUSTER_NAME        = aws_ecs_cluster.sunomi-ecs-cluster-transcoder.name
      ECS_TASK_DEFINITION     = aws_ecs_task_definition.sunomi-ecs-tdf-transcoder.arn
      ECS_TASK_CONTAINER_NAME = var.sunomi-ecs-tdf-transcoder-container-name
      SUBNETS                 = join(",", aws_subnet.private[*].id)
      SECURITY_GROUPS         = aws_security_group.sunomi-ecs-sg-transcoder.id
    }
  }
}

resource "aws_lambda_function" "sunomi-start-transcription" {
  filename         = data.archive_file.sunomi-start-transcription.output_path
  function_name    = "sunomi-start-transcription"
  role             = aws_iam_role.sunomi-start-transcription-role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = filebase64sha256(data.archive_file.sunomi-start-transcription.output_path)

  timeout = 60
}

resource "aws_lambda_function" "sunomi-start-rekognition" {
  filename         = data.archive_file.sunomi-start-rekognition.output_path
  function_name    = "sunomi-start-rekognition"
  role             = aws_iam_role.sunomi-start-rekognition-role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = filebase64sha256(data.archive_file.sunomi-start-rekognition.output_path)

  timeout = 60

  environment {
    variables = {
      SNS_TOPIC_ARN         = aws_sns_topic.moderation_results.arn
      REKOGNITION_ROLE_ARN  = aws_iam_role.rekognition_role.arn
    }
  }
}

resource "aws_lambda_function" "sunomi-rekognition-results" {
  filename         = data.archive_file.sunomi-rekognition-results.output_path
  function_name    = "sunomi-rekognition-results"
  role             = aws_iam_role.sunomi-rekognition-results-role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = filebase64sha256(data.archive_file.sunomi-rekognition-results.output_path)
  timeout          = 60

  layers = [aws_lambda_layer_version.mysql_layer.arn]

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

   environment {
    variables = {
      #DB_HOST     = aws_db_instance.free_db.address
      #DB_NAME     = aws_db_instance.free_db.db_name
      DB_HOST     = local.db_host
      DB_NAME     = local.db_name
      REGION_NAME = var.region
      SECRET_NAME = aws_secretsmanager_secret.db_credentials.name
    }
  }
}


resource "aws_iam_role" "sunomi-start-transcoder-role" {
  name = "sunomi-start-transcoder-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role" "sunomi-start-transcription-role" {
  name = "sunomi-start-transcription-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role" "sunomi-start-rekognition-role" {
  name = "sunomi-start-rekognition-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role" "sunomi-rekognition-results-role" {
  name = "sunomi-rekognition-results-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access_rekognition_results" {
  role       = aws_iam_role.sunomi-rekognition-results-role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_rekognition_secrets_policy" {
  role       = aws_iam_role.sunomi-rekognition-results-role.name
  policy_arn = aws_iam_policy.secrets_manager_policy.arn
}


resource "aws_iam_role_policy" "sunomi-start-transcription-policy" {
  name = "sunomi-transcribe-policy"
  role = aws_iam_role.sunomi-start-transcription-role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "transcribe:StartTranscriptionJob",
          "transcribe:GetTranscriptionJob",
          "transcribe:ListTranscriptionJobs",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.video_bucket.bucket}",
          "arn:aws:s3:::${aws_s3_bucket.video_bucket.bucket}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.video_bucket.bucket}",
          "arn:aws:s3:::${aws_s3_bucket.video_bucket.bucket}/*"
        ]
      }
    ]
  })
}


resource "aws_iam_role_policy" "sunomi-start-transcoder-policy" {
  name = "sunomi-start-transcoder-policy"
  role = aws_iam_role.sunomi-start-transcoder-role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecs:RunTask",
          "ecs:DescribeTasks",
          "ecs:DescribeTaskDefinition",
          "ecs:ListTasks"
        ]
        Resource = [
          aws_ecs_cluster.sunomi-ecs-cluster-transcoder.arn,
          aws_ecs_task_definition.sunomi-ecs-tdf-transcoder.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = [
          aws_iam_role.sunomi-ecs-task-role.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "sunomi-start-rekognition-policy" {
  name = "sunomi-start-rekognition-policy"
  role = aws_iam_role.sunomi-start-rekognition-role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "s3:GetObject"
        Resource = [
          "arn:aws:s3:::${aws_s3_bucket.video_bucket.bucket}",
          "arn:aws:s3:::${aws_s3_bucket.video_bucket.bucket}/*"
        ]
      },
      {
        Effect   = "Allow"
        Action   = "rekognition:StartContentModeration"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iam:PassRole"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "sunomi-rekognition-results-policy" {
  name = "sunomi-rekognition-results-policy"
  role = aws_iam_role.sunomi-rekognition-results-role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sns:Subscribe",
          "sns:Receive"
        ]
        Resource = [
          aws_sns_topic.moderation_results.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "rekognition:GetContentModeration"
        ]
        Resource = [
          "*"
        ]
      }
    ]
  })
}


resource "aws_sns_topic" "video_upload_topic" {
  name = "video-upload-notifications"
}

resource "aws_sns_topic_policy" "default" {
  arn = aws_sns_topic.video_upload_topic.arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "AllowS3ToPublishToSNS"
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "SNS:Publish"
        Resource = aws_sns_topic.video_upload_topic.arn
        Condition = {
          ArnLike = {
            "aws:SourceArn": aws_s3_bucket.video_bucket.arn
          }
        }
      }
    ]
  })
}

# Single S3 Bucket Notification to SNS
resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.video_bucket.id

  topic {
    topic_arn     = aws_sns_topic.video_upload_topic.arn
    events        = ["s3:ObjectCreated:*"]
    filter_suffix = "original.mp4"
  }
}

# SNS Topic Subscriptions
resource "aws_sns_topic_subscription" "transcription" {
  topic_arn = aws_sns_topic.video_upload_topic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.sunomi-start-transcription.arn
}

resource "aws_sns_topic_subscription" "transcoder" {
  topic_arn = aws_sns_topic.video_upload_topic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.sunomi-start-transcoder.arn
}

resource "aws_sns_topic_subscription" "rekognition" {
  topic_arn = aws_sns_topic.video_upload_topic.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.sunomi-start-rekognition.arn
}

resource "aws_sns_topic_subscription" "rekognition_results" {
  topic_arn = aws_sns_topic.moderation_results.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.sunomi-rekognition-results.arn
}

# Lambda Permissions for SNS
resource "aws_lambda_permission" "with_sns_transcription" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-start-transcription.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.video_upload_topic.arn
}

resource "aws_lambda_permission" "with_sns_transcoder" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-start-transcoder.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.video_upload_topic.arn
}

resource "aws_lambda_permission" "with_sns_rekognition" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-start-rekognition.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.video_upload_topic.arn
}

resource "aws_lambda_permission" "with_sns_rekognition_results" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-rekognition-results.function_name
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.moderation_results.arn
}

locals {
  lambda_functions = [
    aws_lambda_function.sunomi-start-transcoder,
    aws_lambda_function.sunomi-start-transcription,
    aws_lambda_function.sunomi-start-rekognition
  ]
  lambda_roles = [
    aws_iam_role.sunomi-start-transcoder-role,
    aws_iam_role.sunomi-start-transcription-role,
    aws_iam_role.sunomi-start-rekognition-role,
    aws_iam_role.sunomi-rekognition-results-role
  ]
}

resource "aws_lambda_permission" "allow_s3" {
  count         = length(local.lambda_functions)
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = local.lambda_functions[count.index].function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.video_bucket.arn
}

# Add CloudWatch Logs policy to role
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  count      = length(local.lambda_roles)
  role       = local.lambda_roles[count.index].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_sns_topic" "moderation_results" {
  name = "video-moderation-results"
}

resource "aws_sns_topic_policy" "moderation_results" {
  arn = aws_sns_topic.moderation_results.arn
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowRekognitionToPublish"
        Effect = "Allow"
        Principal = {
          Service = "rekognition.amazonaws.com"
        }
        Action   = "SNS:Publish"
        Resource = aws_sns_topic.moderation_results.arn
      }
    ]
  })
}

# IAM Role for Rekognition
resource "aws_iam_role" "rekognition_role" {
  name = "rekognition-service-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "rekognition.amazonaws.com"
      }
    }]
  })
}

# IAM Role Policy for Rekognition
resource "aws_iam_role_policy" "rekognition_policy" {
  name = "rekognition-service-policy"
  role = aws_iam_role.rekognition_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "sns:Publish"
        ]
        Resource = [
          "${aws_s3_bucket.video_bucket.arn}/*",
          aws_sns_topic.moderation_results.arn
        ]
      }
    ]
  })
}

# Add SNS subscription for publish-video Lambda with filter policy
resource "aws_sns_topic_subscription" "publish_video_subscription" {
  topic_arn = aws_sns_topic.transcoder_status.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.publish_video.arn
  filter_policy = jsonencode({
    status = [
      {
        prefix = "COMPLETED"
      }
    ]
  })
  filter_policy_scope = "MessageBody"
}

# Add permission for SNS to invoke Lambda
resource "aws_lambda_permission" "allow_sns_publish_video" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.publish_video.arn
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.transcoder_status.arn
}