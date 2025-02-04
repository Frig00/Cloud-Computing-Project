resource "aws_s3_bucket" "video_bucket" {
  bucket = "sunomi-video-bucket"
}

resource "aws_s3_bucket_public_access_block" "video_public_access" {
  bucket = aws_s3_bucket.video_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}


resource "aws_s3_bucket_server_side_encryption_configuration" "video_bucket_encryption" {
  bucket = aws_s3_bucket.video_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_policy" "video_bucket_policy" {
  bucket = aws_s3_bucket.video_bucket.id
  policy = jsonencode({
    Version = "2008-10-17"
    Id      = "PolicyForCloudFrontPrivateContent"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.video_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn_video.arn
          }
        }
      }
    ]
  })
}



resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.region}.s3"
  vpc_endpoint_type = "Gateway"

  route_table_ids = [aws_route_table.private.id]

  tags = {
    Name   = "${var.project_name}-s3-endpoint"
    deploy = "terraform"
  }
}

resource "aws_s3_bucket" "frontend_bucket" {
  bucket = "sunomi-frontend-bucket"
}

resource "aws_s3_bucket_public_access_block" "frontend_public_access" {
  bucket = aws_s3_bucket.frontend_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend_bucket_encryption" {
  bucket = aws_s3_bucket.frontend_bucket.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_policy" "frontend_bucket_policy" {
  bucket = aws_s3_bucket.frontend_bucket.id
  policy = jsonencode({
    Version = "2008-10-17"
    Id      = "PolicyForCloudFrontPrivateContent"
    Statement = [
      {
        Sid    = "AllowCloudFrontServicePrincipal"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.frontend_bucket.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.cdn_frontend.arn
          }
        }
      }
    ]
  })
}

## Enable static website hosting
#resource "aws_s3_bucket_website_configuration" "frontend_website" {
#  bucket = aws_s3_bucket.frontend_bucket.id
#
#  index_document {
#    suffix = "index.html"
#  }
#
#  error_document {
#    key = "index.html"
#  }
#}
#
## Add CORS configuration
#resource "aws_s3_bucket_cors_configuration" "frontend_cors" {
#  bucket = aws_s3_bucket.frontend_bucket.id
#
#  cors_rule {
#    allowed_headers = ["*"]
#    allowed_methods = ["GET", "HEAD"]
#    allowed_origins = ["*"]
#    expose_headers  = []
#    max_age_seconds = 3000
#  }
#}