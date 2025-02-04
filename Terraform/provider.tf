provider "aws" {
  alias = "eu_west_1"
  region = var.region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

provider "random" {}

resource "random_id" "hash" {
  byte_length = 4
}