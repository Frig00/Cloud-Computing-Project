# ECS Cluster
resource "aws_ecs_cluster" "sunomi-ecs-cluster-controller" {
  name = "sunomi-ecs-cluster-controller"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
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

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Task Definition
resource "aws_ecs_task_definition" "sunomi-ecs-tdf-controller" {
  family                   = "sunomi-ecs-tdf-controller"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 1024  # 1 vCPU
  memory                  = 3072  # 3 GB
  execution_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn           = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "controller"
      image     = var.ecr_controller
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort     = 3000
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

# Security Group
resource "aws_security_group" "sunomi-ecs-sg-controller" {
  name        = "sunomi-ecs-sg-controller"
  description = "Allow inbound HTTP traffic"
  vpc_id      = aws_vpc.main.id

  ingress {
    protocol    = "tcp"
    from_port   = 3000
    to_port     = 3000
    cidr_blocks = ["0.0.0.0/0"]
  }

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