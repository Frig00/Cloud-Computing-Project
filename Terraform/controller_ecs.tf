# ECS Cluster
resource "aws_ecs_cluster" "sunomi-ecs-cluster-controller" {
  name = "sunomi-ecs-cluster-controller"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}


# Task Definition
resource "aws_ecs_task_definition" "sunomi-ecs-tdf-controller" {
  family                   = "sunomi-ecs-tdf-controller"
  requires_compatibilities = ["FARGATE"]
  network_mode            = "awsvpc"
  cpu                     = 1024  # 1 vCPU
  memory                  = 3072  # 3 GB
  execution_role_arn      = aws_iam_role.ecs_task_execution_role.arn
  #task_role_arn           = aws_iam_role.ecs_task_execution_role.arn

  container_definitions = jsonencode([
    {
      name      = "controller"
      image     = var.ecr_controller
      essential = true
      portMappings = [
        {
          containerPort = 80
          hostPort     = 80
          protocol     = "tcp"
          appProtocol = "http"
          name         = "controller-80-tcp"
        }
      ]
      environment = [
        {
          name  = "DB_CONNECTION"
          value = ""
        },
        {
          name  = "PORT"
          value = "80"

        }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/demo-controller"
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