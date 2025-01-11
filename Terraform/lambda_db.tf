resource "aws_lambda_function" "db_init" {
  filename         = "lambda/out/create-tables.zip"
  function_name    = "initialize_database"
  role             = aws_iam_role.lambda_role.arn
  handler          = "main.lambda_handler"
  runtime          = "python3.13"

  vpc_config {
    subnet_ids         = [aws_subnet.private[0].id]  # Replace with your subnet IDs
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      DB_HOST     = aws_db_instance.free_db.address
      DB_NAME     = aws_db_instance.free_db.db_name
      DB_USER     = aws_db_instance.free_db.username
      DB_PASSWORD = aws_db_instance.free_db.password
    }
  }
}

resource "aws_lambda_invocation" "db_init" {
  function_name = aws_lambda_function.db_init.function_name
  input = jsonencode({
    action = "initialize"
  })
  depends_on = [ data.archive_file.packaging_dependecies ]
}

resource "local_file" "copy_main_py" {
  content = file("lambda/create-tables/main.py")
  filename = "lambda/create-tables/.venv/Lib/site-packages/main.py"
}

data "archive_file" "packaging_dependecies" {
  type        = "zip"
  output_path = "lambda/out/create-tables.zip"
  source_dir  = "lambda/create-tables/.venv/Lib/site-packages"

  depends_on = [local_file.copy_main_py]
}