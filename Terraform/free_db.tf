locals {
  db_name = "${var.project_name}_database"
}

# RDS Instance
resource "aws_db_instance" "free_db" {

  lifecycle {
    create_before_destroy = true
  }

  count             = var.use_free_db ? 1 : 0
  identifier        = "${var.project_name}-free-db"
  engine            = "mysql"
  engine_version    = "8.0.39"
  instance_class    = "db.t4g.micro"
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = local.db_name
  username = jsondecode(aws_secretsmanager_secret_version.db_credentials_version.secret_string)["username"]
  password = jsondecode(aws_secretsmanager_secret_version.db_credentials_version.secret_string)["password"]

  db_subnet_group_name   = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids = [aws_security_group.db_sg.id]

  publicly_accessible = false
  skip_final_snapshot = true

  tags = {
    Name = "${var.project_name}-free-db"
  }
}

locals {
  db_host = var.use_free_db ? aws_db_instance.free_db[0].address : aws_rds_cluster.sunomi_db_cluster[0].endpoint
}
