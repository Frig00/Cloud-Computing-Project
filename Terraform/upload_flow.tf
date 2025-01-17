resource "aws_iam_role_policy" "lambda_policy" {
  name = "s3_lambda_policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = [
          "${aws_s3_bucket.video_bucket.arn}/*",
          "arn:aws:logs:*:*:*"
        ]
      }
    ]
  })
}

data "archive_file" "sunomi-upload-flow" {
  type        = "zip"
  source_file = "lambda/upload-flow/main.py"
  output_path = "lambda/out/upload-flow.zip"
}

resource "aws_lambda_function" "sunomi-upload-flow" {
  filename         = data.archive_file.sunomi-upload-flow.output_path
  function_name    = "sunomi-upload-flow"
  role            = aws_iam_role.lambda_role.arn
  handler         = "main.lambda_handler"
  runtime         = "python3.13"
}

resource "aws_s3_bucket_notification" "bucket_notification" {
  bucket = aws_s3_bucket.video_bucket.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.sunomi-upload-flow.arn
    events              = ["s3:ObjectCreated:*"]
    filter_suffix       = "original.mp4"
  }
}

resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowS3Invoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.sunomi-upload-flow.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.video_bucket.arn
}

