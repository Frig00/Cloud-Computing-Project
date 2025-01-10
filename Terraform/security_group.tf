resource "aws_security_group" "public" {
  vpc_id = aws_vpc.main.id

  name_prefix = "${var.project_name}-sg-public"

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg-public"
  }
}

resource "aws_security_group" "db" {
  name = "${var.project_name}-db-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-db-sg"
  }
}

resource "aws_security_group" "lambda_sg" {
  name        = "lambda_db_init_sg"
  description = "Security group for Lambda function to access RDS"
  vpc_id      = aws_vpc.main.id  # Replace with your VPC ID

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# Allow the Lambda security group to access the RDS instance
resource "aws_security_group_rule" "lambda_to_rds" {
  type                     = "ingress"
  from_port                = 3306
  to_port                  = 3306
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda_sg.id
  security_group_id        = aws_security_group.db.id  # Replace with your RDS security group
}