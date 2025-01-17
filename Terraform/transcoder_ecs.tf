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

# Task Definition
resource "aws_ecs_task_definition" "sunomi-ecs-tdf-transcoder" {
  family                   = "sunomi-ecs-tdf-transcoder"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 1024  # 1 vCPU
  memory                  = 3072  # 3 GB
  execution_role_arn      = aws_iam_role.sunomi-ecs-task-role.arn
  #task_role_arn          = aws_iam_role.sunomi-ecs-task-role.arn

  container_definitions = jsonencode([
    {
      name      = "transcoder"
      image     = var.ecr_transcoder
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort     = 80
          protocol     = "tcp"
          name         = "http-port"
        }
      ]
      environment = [
        {
          name  = "TEST_KEY"
          value = "TEST_VALUE"
        }
      ]
    }
  ])
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