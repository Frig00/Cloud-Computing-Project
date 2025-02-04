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
  network_mode             = "awsvpc"
  cpu                      = 1024 # 1 vCPU
  memory                   = 3072 # 3 GB
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_execution_role.arn



  container_definitions = jsonencode([
    {
      name      = "controller"
      image     = var.ecr_controller
      essential = true
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
          appProtocol   = "http"
          name          = "controller-3000-tcp"
        }
      ]
      environment = [
        {
          name  = "DB_HOST"
          value = "${aws_db_instance.free_db.address}:${aws_db_instance.free_db.port}"
        },
        { name  = "DB_NAME",
          value = aws_db_instance.free_db.db_name
        },
        {
          name  = "S3_BUCKET_NAME"
          value = aws_s3_bucket.video_bucket.bucket
        },
        {
          name  = "DB_SECRET"
          value = aws_secretsmanager_secret.db_credentials.name
        },
        {
          name  = "AWS_REGION"
          value = var.region
        },
        {
          name  = "JWT_SECRET"
          value = aws_secretsmanager_secret.jwt_secret.name
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

# Application Load Balancer
resource "aws_lb" "controller" {
  name               = "sunomi-controller-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public.*.id
}

# ALB Listener
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.controller.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      host        = "#{host}"
      path        = "/#{path}"
      query       = "#{query}"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.controller.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn = aws_acm_certificate_validation.cert_controller_validation.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.controller.arn
  }
}

# Target Group
resource "aws_lb_target_group" "controller" {
  name        = "sunomi-controller-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/"
    healthy_threshold   = 2
    unhealthy_threshold = 10
  }
}

# Updated ECS Service
resource "aws_ecs_service" "sunomi-controller" {
  name                               = "sunomi-controller"
  cluster                            = aws_ecs_cluster.sunomi-ecs-cluster-controller.id
  task_definition                    = aws_ecs_task_definition.sunomi-ecs-tdf-controller.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 300
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  network_configuration {
    subnets          = aws_subnet.public.*.id
    security_groups  = [aws_security_group.sunomi-ecs-sg-controller.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.controller.arn
    container_name   = "controller"
    container_port   = 3000
  }

  deployment_controller {
    type = "ECS"
  }
}

# Auto Scaling Target
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 5
  min_capacity       = 1
  resource_id        = "service/${aws_ecs_cluster.sunomi-ecs-cluster-controller.name}/${aws_ecs_service.sunomi-controller.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

# Auto Scaling Policy
resource "aws_appautoscaling_policy" "ecs_policy" {
  name               = "cpu-tracking"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    target_value       = 80.0
    scale_in_cooldown  = 300
    scale_out_cooldown = 300

    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
  }
}
