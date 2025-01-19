# ECS Cluster
resource "aws_ecs_cluster" "sunomi-ecs-cluster-transcoder" {
  name = "sunomi-ecs-cluster-transcoder"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "sunomi-ecs-task-role" {
  name = "sunomi-ecs-task-role"

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

# Add after the existing role definition
resource "aws_iam_role_policy" "ecs-ecr-policy" {
  name = "sunomi-ecs-ecr-policy"
  role = aws_iam_role.sunomi-ecs-task-role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:CreateLogGroup",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "lambda:InvokeFunction"
        ]
        Resource = "arn:aws:lambda:eu-west-1:886436942768:function:debug-upload" # TODO: Link to arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:HeadObject",
          "s3:ListBucket",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.video_bucket.arn}/*",
          aws_s3_bucket.video_bucket.arn
        ]
      }
    ]
  })
}


variable "sunomi-ecs-tdf-transcoder-container-name" {
  default = "transcoder"
}

# Task Definition
resource "aws_ecs_task_definition" "sunomi-ecs-tdf-transcoder" {
  family                   = "sunomi-ecs-tdf-transcoder"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 4096  # 4 vCPU
  memory                  = 8192  # 8 GB = 8192 MB
  execution_role_arn      = aws_iam_role.sunomi-ecs-task-role.arn
  task_role_arn          = aws_iam_role.sunomi-ecs-task-role.arn

  container_definitions = jsonencode([
    {
      name      = var.sunomi-ecs-tdf-transcoder-container-name
      image     = var.ecr_transcoder
      essential = true
      environment = [
        {
          name  = "S3_BUCKET_NAME"
          value = ""
        },
        {
          name  = "VIDEO_ID"
          value = ""
        },
        {
          name  = "STATUS_LAMBDA"
          value = ""
        },
        {
          name  = "VIDEO_PATH"
          value = ""
        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/transcoder"
          "mode"                  = "non-blocking"
          "awslogs-create-group"  = "true"
          "max-buffer-size"       = "25m"
          "awslogs-region"        = "eu-west-1"
          "awslogs-stream-prefix" = "ecs"
        }
      }
    }
  ])
}

# Security Group
resource "aws_security_group" "sunomi-ecs-sg-transcoder" {
  name        = "sunomi-ecs-sg-transcoder"
  description = "Allow outbound traffic for S3 access"
  vpc_id      = aws_vpc.main.id

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# # ECS Service
# resource "aws_ecs_service" "transcoder" {
#   name            = "transcoder"
#   cluster         = aws_ecs_cluster.main.id
#   task_definition = aws_ecs_task_definition.transcoder.arn
#   desired_count   = 1
#   launch_type     = "FARGATE"

#   network_configuration {
#     subnets          = var.subnet_ids
#     security_groups  = [aws_security_group.ecs_tasks.id]
#     assign_public_ip = true  # Set to false for private subnets
#   }
# }