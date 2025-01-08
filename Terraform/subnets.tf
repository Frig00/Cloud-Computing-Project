resource "aws_subnet" "private" {
  count = length(var.private_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)
  availability_zone = "${var.region}${element(var.availability_zones, count.index)}"

  tags = {
    Name = "${var.project_name}-sn-private-${element(var.availability_zones, count.index)}"
    deploy = "terraform"
  }
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(aws_vpc.main.cidr_block, 8, count.index + 128)
  availability_zone = "${var.region}${element(var.availability_zones, count.index)}"

  tags = {
    Name = "${var.project_name}-sn-public-${element(var.availability_zones, count.index)}"
    deploy = "terraform"
  }
}