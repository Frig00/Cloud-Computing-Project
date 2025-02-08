resource "aws_lambda_function" "db_init" {
  filename         = data.archive_file.packaging_dependecies.output_path
  function_name    = "initialize_database"
  role             = aws_iam_role.lambda_role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.13"
  source_code_hash = filebase64sha256(data.archive_file.packaging_dependecies.output_path)
  timeout          = 60

  layers = [aws_lambda_layer_version.mysql_layer.arn]

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      #DB_HOST     = aws_db_instance.free_db.address
      #DB_NAME     = aws_db_instance.free_db.db_name
      DB_HOST     = aws_rds_cluster.sunomi_db_cluster.endpoint
      DB_NAME     = aws_rds_cluster.sunomi_db_cluster.database_name
      REGION_NAME = var.region
      SECRET_NAME = aws_secretsmanager_secret.db_credentials.name
    }
  }
}

resource "aws_lambda_invocation" "db_init" {
  function_name = aws_lambda_function.db_init.function_name
  input = jsonencode({
    action = "initialize"
  })
  depends_on = [data.archive_file.packaging_dependecies]
}

resource "null_resource" "copy_layer_files" {

  triggers = {
    always_run = "${timestamp()}"
  }

  provisioner "local-exec" {
    command = <<EOT
      $source = ".venv/Lib/site-packages/*"
      $destination = "layer/python"
      
      if (-not (Test-Path -Path $destination)) {
        New-Item -ItemType Directory -Force -Path $destination
      }
      
      Copy-Item -Path $source -Destination $destination -Recurse -Force
    EOT

    interpreter = ["PowerShell", "-Command"]
    working_dir = "lambda-layers/mysql"
  }

  depends_on = [null_resource.create_venv]
}

data "archive_file" "mysql-layer" {
  type        = "zip"
  output_path = "lambda/out/mysql-layer.zip"
  source_dir  = "lambda-layers/mysql/layer"

  depends_on = [null_resource.copy_layer_files]
}

resource "aws_lambda_layer_version" "mysql_layer" {
  filename            = data.archive_file.mysql-layer.output_path
  layer_name          = "mysql-layer"
  compatible_runtimes = ["python3.13"]
  description         = "Installs PyMySQL for Lambda functions"

//  source_code_hash = filebase64sha256(data.archive_file.mysql-layer.output_path)
}


data "archive_file" "packaging_dependecies" {
  type        = "zip"
  output_path = "lambda/out/create-tables.zip"
  source_dir  = "lambda/create-tables"
}



resource "aws_lambda_function" "publish_video" {
  filename      = data.archive_file.packaging_dependecies_publish_video.output_path
  function_name = "publish-video"
  role          = aws_iam_role.lambda_role.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.13"

  layers = [aws_lambda_layer_version.mysql_layer.arn]

  vpc_config {
    subnet_ids         = aws_subnet.private[*].id
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      #DB_HOST     = aws_db_instance.free_db.address
      #DB_NAME     = aws_db_instance.free_db.db_name
      DB_HOST     = aws_rds_cluster.sunomi_db_cluster.endpoint
      DB_NAME     = aws_rds_cluster.sunomi_db_cluster.database_name
      REGION_NAME = var.region
      SECRET_NAME = aws_secretsmanager_secret.db_credentials.name
    }
  }
}


data "archive_file" "packaging_dependecies_publish_video" {
  type        = "zip"
  source_file = "lambda/publish-video/main.py"
  output_path = "lambda/out/publish-video.zip"
}

resource "null_resource" "create_venv" {

  triggers = {
    always_run = "${timestamp()}"
  }

  provisioner "local-exec" {
    command     = <<EOT
      if (-not (Test-Path ".venv")) {
        python -m venv .venv
      }
      
      $env:Path = "$PWD\.venv\Scripts;$env:Path"
      
      python -m pip install -r requirements.txt

    EOT
    interpreter = ["PowerShell", "-Command"]
    working_dir = "lambda-layers/mysql"
  }
}

