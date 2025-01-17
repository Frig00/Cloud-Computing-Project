resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
    deploy = "terraform"
  }
}

resource "aws_eip" "nat" {
  domain = "vpc"

  tags = {
    Name   = "${var.project_name}-eip-nat"
    deploy = "terraform"
  }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id

  tags = {
    Name   = "${var.project_name}-nat"
    deploy = "terraform"
  }

  depends_on = [aws_internet_gateway.main]
}
