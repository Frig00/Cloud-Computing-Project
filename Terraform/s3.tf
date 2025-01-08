resource "aws_s3_bucket" "video_bucket" {
  bucket = "${var.project_name}-${var.bucket_name}"
}
