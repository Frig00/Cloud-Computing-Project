# resource "aws_secretsmanager_secret" "db_credentials" {
#   name = "${var.project_name}-db-credentials-${var.environment}-unipv-cloud-new8"
#   force_overwrite_replica_secret = true
# }

# resource "aws_secretsmanager_secret_version" "db_credentials_version" {
#   secret_id     = aws_secretsmanager_secret.db_credentials.id
#   secret_string = jsonencode({
#     username = var.db_master_credentials.username
#     password = var.db_master_credentials.password
#   })
# }

# resource "aws_db_subnet_group" "sunomi_db_subnet_group" {
#   name       = "${var.project_name}-db-subnet-group"
#   subnet_ids = aws_subnet.private[*].id

#   tags = {
#     Name = "${var.project_name}-db-subnet-group"
#   }
# }


# resource "aws_rds_cluster" "sunomi_db_cluster" {
#   cluster_identifier      = "${var.project_name}-db-cluster-unipv-cloud-new8"
#   engine                  = "mysql"
#   engine_version          = "8.0.39"
#   allocated_storage       = "200"
#   storage_type            = "gp3"
#   db_cluster_instance_class = var.db_instance_class
#   master_username         = jsondecode(aws_secretsmanager_secret_version.db_credentials_version.secret_string)["username"]
#   master_password         = jsondecode(aws_secretsmanager_secret_version.db_credentials_version.secret_string)["password"]
#   database_name           = "${var.project_name}_db"
#   db_subnet_group_name    = aws_db_subnet_group.sunomi_db_subnet_group.name
#   vpc_security_group_ids  = [aws_security_group.db.id]
#   storage_encrypted       = true
#   skip_final_snapshot     = true
#   apply_immediately       = true
#   availability_zones      = [for az in var.availability_zones : "${var.region}${az}"]
#   serverlessv2_scaling_configuration {
#     min_capacity = 0.5
#     max_capacity = 1.0
#   }

#   tags = {
#     Name = "${var.project_name}-db-cluster"
#   }
# }