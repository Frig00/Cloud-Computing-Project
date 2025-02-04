resource "aws_secretsmanager_secret" "db_credentials" {
  name = "${var.project_name}-db-credentials-${random_id.hash.hex}"
}


resource "random_password" "db_password" {
  length           = 16
  special          = true
  upper           = true
  lower           = true
  numeric         = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "aws_secretsmanager_secret_version" "db_credentials_version" {
  secret_id     = aws_secretsmanager_secret.db_credentials.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.db_password.result
  })
}


resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}-jwt-secret-${random_id.hash.hex}"
}

resource "random_password" "jwt_secret" {
  length           = 16
  special          = true
  upper           = true
  lower           = true
  numeric         = true
}

resource "aws_secretsmanager_secret_version" "jwt_secret_version" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}