# DB Subnet Group
resource "aws_db_subnet_group" "free_db_subnet_group" {
  name       = "${var.project_name}-free-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-free-db-subnet-group"
  }
}

# Security Group for RDS
resource "aws_security_group" "free_db_sg" {
  name        = "${var.project_name}-free-db-sg"
  description = "Security group for free tier RDS instance"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    cidr_blocks     = [var.vpc_cidr]
  }

  tags = {
    Name = "${var.project_name}-free-db-sg"
  }
}

# RDS Instance
resource "aws_db_instance" "free_db" {
  identifier           = "${var.project_name}-free-db"
  engine              = "mysql"
  engine_version      = "8.0.39"
  instance_class      = "db.t4g.micro"
  allocated_storage   = 20
  storage_type        = "gp2"
  
  db_name             = "${var.project_name}_database"
  username            = "admin"
  password            = "sunomi2025!" # Replace with secure password

  db_subnet_group_name   = aws_db_subnet_group.free_db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.free_db_sg.id]
  
  publicly_accessible    = false
  skip_final_snapshot    = true
  
  tags = {
    Name = "${var.project_name}-free-db"
  }
}