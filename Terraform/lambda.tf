resource "aws_lambda_function" "initialize_db" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "initialize_db"
  runtime          = "python3.9"
  handler          = "lambda_function.lambda_handler"
  role             = aws_iam_role.lambda_role.arn

  environment {
    variables = {
      SECRET_NAME = aws_secretsmanager_secret.db_credentials.name
      REGION      = var.region
      DB_ENDPOINT = aws_rds_cluster.sunomi_db_cluster.endpoint
      DB_NAME     = aws_rds_cluster.sunomi_db_cluster.database_name
    }
  }
}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file  = "lambda/create-tables/create_tables.py"
  output_path = "lambda/out/lambda.zip"
}