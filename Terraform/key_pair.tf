# resource "aws_key_pair" "main" {
#   key_name   = "${var.project_name}-key"
#   public_key = file(".\\keys\\id_rsa.pub")
# }