# DB Subnet Group
resource "aws_db_subnet_group" "db_subnet_group" {
  name       = "${var.project_name}-db-subnet-group-${var.environment}"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}


resource "aws_rds_cluster" "sunomi_db_cluster" {
  cluster_identifier      = "${var.project_name}-db-cluster"
  engine                  = "aurora-mysql"
  engine_version          = "8.0.mysql_aurora.3.05.2"
  database_name           = "${var.project_name}_database"

  # Network & Security
  db_subnet_group_name    = aws_db_subnet_group.db_subnet_group.name
  vpc_security_group_ids  = [aws_security_group.db_sg.id]

  # Credentials from Secrets Manager
  master_username         = jsondecode(aws_secretsmanager_secret_version.db_credentials_version.secret_string)["username"]
  master_password         = jsondecode(aws_secretsmanager_secret_version.db_credentials_version.secret_string)["password"]

  # Production settings
  backup_retention_period = 7
  preferred_backup_window = "02:00-03:00"
  skip_final_snapshot    = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot-${formatdate("YYYY-MM-DD-hh-mm", timestamp())}"
  storage_encrypted      = true

  tags = {
    Name = "${var.project_name}-db-cluster"
    Environment = "production"
  }
}

resource "aws_rds_cluster_instance" "cluster_instances" {
  count               = 3
  identifier          = "sunomi-db-${count.index + 1}"
  cluster_identifier  = aws_rds_cluster.sunomi_db_cluster.id
  instance_class      = "db.r5.large"
  engine              = aws_rds_cluster.sunomi_db_cluster.engine
  engine_version      = aws_rds_cluster.sunomi_db_cluster.engine_version
  
  # Ensure instances are in different AZs
  availability_zone   = element(data.aws_availability_zones.available.names, count.index)

  tags = {
    Name = "${var.project_name}-instance-${count.index + 1}"
    Role = count.index == 0 ? "writer" : "reader"
  }
}

# Get available AZs
data "aws_availability_zones" "available" {
  state = "available"
}
