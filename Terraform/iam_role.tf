resource "aws_iam_role" "lambda_role" {
  name = "lambda_assume_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "secrets_manager_policy" {
  name = "lambda-secrets-manager-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_credentials.arn,
          aws_secretsmanager_secret.jwt_secret.arn,
          aws_secretsmanager_secret.github_secrets.arn
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_secrets_policy" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.secrets_manager_policy.arn
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_policy" "lambda_rds_access" {
  name        = "lambda_rds_access_policy"
  description = "IAM policy for Lambda to access RDS"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "rds-db:connect",
          "rds:DescribeDBInstances"
        ]
        Resource = aws_db_instance.free_db.arn
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_rds_access" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_rds_access.arn
}

resource "aws_iam_role_policy_attachment" "lambda_rds_access_rekognition_results" {
  role       = aws_iam_role.sunomi-rekognition-results-role.name
  policy_arn = aws_iam_policy.lambda_rds_access.arn
}

# ECS Task Execution Role
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "sunomi-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_controller_secrets_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.secrets_manager_policy.arn
}

# ECS policy attachment 
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# S3 access policy
resource "aws_iam_policy" "s3_access_policy" {
  name        = "controller-s3-access"
  description = "Policy to allow ECS tasks to access S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.video_bucket.arn,
          "${aws_s3_bucket.video_bucket.arn}/*"
        ]
      }
    ]
  })
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "s3_policy_attachment" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = aws_iam_policy.s3_access_policy.arn
}

resource "aws_iam_role_policy" "ecs_task_execution_cloudwatch_policy" {
  name = "sunomi-ecs-cloudwatch-policy"
  role = aws_iam_role.ecs_task_execution_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}