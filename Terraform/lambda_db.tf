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
#  depends_on = [ data.archive_file.packaging_dependecies ]
}

#data "archive_file" "packaging_dependecies" {
#  type = "zip"
#  source {
#    content = file("./lambda/create-tables/main.py")
#    filename = "main.py"
#  }
#
#  dynamic "source" {
#    for_each = fileset("./lambda/create-tables/.venv/Lib/site-packages", "**/*")
#    content {
#      content = filebase64sha256("./lambda/create-tables/.venv/Lib/site-packages/${source.value}")
#      filename = source.value
#    }
#    
#  }
#
#  output_path = "./lambda/out/create-tables.zip"
#}