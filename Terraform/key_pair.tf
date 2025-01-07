resource "aws_key_pair" "main" {
  key_name   = "${var.project_name}-key"
  public_key = file("C:\\Users\\andre\\.ssh_old\\id_rsa.pub")
}