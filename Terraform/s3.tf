<<<<<<< HEAD
# resource "aws_s3_bucket" "example_bucket" {
#   bucket = "${var.project_name}-${var.bucket_name}"
# }
=======
resource "aws_s3_bucket" "video_bucket" {
  bucket = "${var.project_name}-${var.bucket_name}"
}
>>>>>>> ff5db9b (🔧Add terraform files for database)
