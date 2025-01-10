resource "aws_s3_bucket" "video_bucket" {
  bucket = "${var.project_name}-${var.bucket_name}"
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