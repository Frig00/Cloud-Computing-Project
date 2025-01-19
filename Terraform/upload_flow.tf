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

data "archive_file" "sunomi-upload-flow" {
  type        = "zip"
  source_file = "lambda/upload-flow/main.py"
  output_path = "lambda/out/upload-flow.zip"
}

resource "aws_lambda_function" "sunomi-upload-flow" {
  filename      = data.archive_file.sunomi-upload-flow.output_path
  function_name = "sunomi-upload-flow"
  role          = aws_iam_role.sunomi-upload-flow-role.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.13"

  environment {
    variables = {
      STATUS_LAMBDA           = "debug-upload"
      ECS_CLUSTER_NAME        = aws_ecs_cluster.sunomi-ecs-cluster-transcoder.name
      ECS_TASK_DEFINITION     = aws_ecs_task_definition.sunomi-ecs-tdf-transcoder.arn
      ECS_TASK_CONTAINER_NAME = var.sunomi-ecs-tdf-transcoder-container-name
      SUBNETS                 = join(",", aws_subnet.private[*].id)
      SECURITY_GROUPS         = aws_security_group.sunomi-ecs-sg-transcoder.id
    }

  }
}

resource "aws_iam_role" "sunomi-upload-flow-role" {
  name = "sunomi-upload-flow-role"

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

resource "aws_iam_role_policy" "sunomi-upload-flow-policy" {
  name = "sunomi-upload-flow-policy"
  role = aws_iam_role.sunomi-upload-flow-role.id

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

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.video_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.sunomi-upload-flow.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = "original.mp4"
  }
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-upload-flow.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.video_bucket.arn
}

