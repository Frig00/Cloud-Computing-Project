# Create a WebSocket API Gateway
resource "aws_apigatewayv2_api" "sunomi-ws" {
  name                       = "sunomi-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.action"
}

# Production stage for the WebSocket API
resource "aws_apigatewayv2_stage" "sunomi-ws-stage" {
  api_id      = aws_apigatewayv2_api.sunomi-ws.id
  name        = "production"
  auto_deploy = true
}

# DynamoDB table to store WebSocket connection IDs
resource "aws_dynamodb_table" "sunomi-ws-connections" {
  name         = "sunomi-ws-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  tags = {
    Name   = "sunomi-ws-connections"
    deploy = "terraform"
  }
}

# Zip the connect lambda function code
data "archive_file" "connect-lambda" {
  type        = "zip"
  source_file = "lambda/ws-connect/main.py"
  output_path = "lambda/out/ws-connect.zip"
}

# Zip the disconnect lambda function code
data "archive_file" "disconnect-lambda" {
  type        = "zip"
  source_file = "lambda/ws-disconnect/main.py"
  output_path = "lambda/out/ws-disconnect.zip"
}

data "archive_file" "notify-lambda" {
  type        = "zip"
  source_file = "lambda/ws-notify/main.py"
  output_path = "lambda/out/ws-notify.zip"
}

# IAM policy for Lambda functions to access DynamoDB
resource "aws_iam_policy" "sunomi-ws-connect-lambda-policy" {
  name = "sunomi-ws-connect-dynamodb-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "VisualEditor0"
        Effect = "Allow"
        Action = [
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:GetItem"
        ]
        Resource = aws_dynamodb_table.sunomi-ws-connections.arn
      }
    ]
  })
}

# IAM role for Lambda functions
resource "aws_iam_role" "sunomi-ws-connect-lambda-role" {
  name = "sunomi-ws-connect-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role" "sunomi-ws-notify-lambda-role" {
  name = "sunomi-ws-notify-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "sunomi-ws-notify-lambda-policy" {
  name = "sunomi-ws-notify-dynamodb-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "VisualEditor0"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:Scan",
          "execute-api:ManageConnections",
          "execute-api:Invoke",
          "sns:Subscribe"
        ]
        Resource = [
          aws_dynamodb_table.sunomi-ws-connections.arn,
          "${aws_apigatewayv2_api.sunomi-ws.execution_arn}/*",
          aws_sns_topic.transcoder_status.arn
        ]
      }
    ]
  })
}

# Attach the DynamoDB policy to the Lambda role
resource "aws_iam_role_policy_attachment" "sunomi-ws-connect-lambda-policy-attachment" {
  role       = aws_iam_role.sunomi-ws-connect-lambda-role.name
  policy_arn = aws_iam_policy.sunomi-ws-connect-lambda-policy.arn
}

resource "aws_iam_role_policy_attachment" "sunomi-ws-notify-lambda-policy-attachment" {
  role       = aws_iam_role.sunomi-ws-notify-lambda-role.name
  policy_arn = aws_iam_policy.sunomi-ws-notify-lambda-policy.arn
}

# Lambda function to handle WebSocket connect events
resource "aws_lambda_function" "sunomi-ws-lambda-connect" {
  filename      = data.archive_file.connect-lambda.output_path
  function_name = "sunomi-ws-lambda-connect"
  role          = aws_iam_role.sunomi-ws-connect-lambda-role.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.13"

  environment {
    variables = {
      dynamodb_connections_table = aws_dynamodb_table.sunomi-ws-connections.name
    }
  }
}

# Lambda function to handle WebSocket disconnect events
resource "aws_lambda_function" "sunomi-ws-lambda-disconnect" {
  filename      = data.archive_file.disconnect-lambda.output_path
  function_name = "sunomi-ws-lambda-disconnect"
  role          = aws_iam_role.sunomi-ws-connect-lambda-role.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.13"

  environment {
    variables = {
      dynamodb_connections_table = aws_dynamodb_table.sunomi-ws-connections.name
    }
  }
}

resource "aws_lambda_function" "sunomi-ws-lambda-notify" {
  filename      = data.archive_file.notify-lambda.output_path
  function_name = "sunomi-ws-lambda-notify"
  role          = aws_iam_role.sunomi-ws-notify-lambda-role.arn
  handler       = "main.lambda_handler"
  runtime       = "python3.13"

  environment {
    variables = {
      dynamodb_connections_table = aws_dynamodb_table.sunomi-ws-connections.name,
      websocket_api_endpoint = "https://${aws_apigatewayv2_api.sunomi-ws.id}.execute-api.${var.region}.amazonaws.com/${aws_apigatewayv2_stage.sunomi-ws-stage.name}/",
      publish_lambda_name = aws_lambda_function.publish_video.function_name
    }
  }
}

# API Gateway integration for connect Lambda
resource "aws_apigatewayv2_integration" "sunomi-ws-int-connect" {
  api_id           = aws_apigatewayv2_api.sunomi-ws.id
  integration_type = "AWS_PROXY"

  connection_type           = "INTERNET"
  content_handling_strategy = "CONVERT_TO_TEXT"
  description               = "Connect"
  integration_method        = "POST"
  integration_uri           = aws_lambda_function.sunomi-ws-lambda-connect.invoke_arn
  passthrough_behavior      = "WHEN_NO_MATCH"
}

# API Gateway integration for disconnect Lambda
resource "aws_apigatewayv2_integration" "sunomi-ws-int-disconnect" {
  api_id           = aws_apigatewayv2_api.sunomi-ws.id
  integration_type = "AWS_PROXY"

  connection_type           = "INTERNET"
  content_handling_strategy = "CONVERT_TO_TEXT"
  description               = "Connect"
  integration_method        = "POST"
  integration_uri           = aws_lambda_function.sunomi-ws-lambda-disconnect.invoke_arn
  passthrough_behavior      = "WHEN_NO_MATCH"
}

# Route for handling WebSocket connect events
resource "aws_apigatewayv2_route" "sunomi-ws-route-connect" {
  api_id    = aws_apigatewayv2_api.sunomi-ws.id
  route_key = "$connect"
  target    = "integrations/${aws_apigatewayv2_integration.sunomi-ws-int-connect.id}"
}

# Route for handling WebSocket disconnect events
resource "aws_apigatewayv2_route" "sunomi-ws-route-disconnect" {
  api_id    = aws_apigatewayv2_api.sunomi-ws.id
  route_key = "$disconnect"
  target    = "integrations/${aws_apigatewayv2_integration.sunomi-ws-int-disconnect.id}"
}

# Permission for API Gateway to invoke connect Lambda
resource "aws_lambda_permission" "sunomi-ws-connect-permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-ws-lambda-connect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.sunomi-ws.execution_arn}/*/*"
}

# Permission for API Gateway to invoke disconnect Lambda
resource "aws_lambda_permission" "sunomi-ws-disconnect-permission" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-ws-lambda-disconnect.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.sunomi-ws.execution_arn}/*/*"
}

# Add SNS subscription for notify Lambda
resource "aws_sns_topic_subscription" "lambda_notification" {
  topic_arn = aws_sns_topic.transcoder_status.arn
  protocol  = "lambda"
  endpoint  = aws_lambda_function.sunomi-ws-lambda-notify.arn
}

# Add permission for SNS to invoke Lambda
resource "aws_lambda_permission" "with_sns" {
  statement_id  = "AllowExecutionFromSNS"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-ws-lambda-notify.arn
  principal     = "sns.amazonaws.com"
  source_arn    = aws_sns_topic.transcoder_status.arn
}



### Setup WebSocket with custom domain name and Route 53

resource "aws_apigatewayv2_domain_name" "websocket_api" {
  domain_name = "ws.sunomi.eu"

  domain_name_configuration {
    certificate_arn = aws_acm_certificate_validation.cert_controller_validation.certificate_arn
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "websocket" {
  api_id          = aws_apigatewayv2_api.sunomi-ws.id
  domain_name     = aws_apigatewayv2_domain_name.websocket_api.id
  stage           = aws_apigatewayv2_stage.sunomi-ws-stage.id
}

resource "aws_route53_record" "ws" {
  zone_id = var.route53_hosted_zone_id
  name    = "ws.sunomi.eu"
  type    = "A"

  alias {
    name                   = aws_apigatewayv2_domain_name.websocket_api.domain_name_configuration[0].target_domain_name
    zone_id                = aws_apigatewayv2_domain_name.websocket_api.domain_name_configuration[0].hosted_zone_id
    evaluate_target_health = true
  }
}


output "target_domain_name" {
  value = aws_apigatewayv2_domain_name.websocket_api.domain_name_configuration[0].target_domain_name
}

output "hosted_zone_id" {
  value = aws_apigatewayv2_domain_name.websocket_api.domain_name_configuration[0].hosted_zone_id
}