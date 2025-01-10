provider "aws" {
  region = var.region
}

provider "random" {}

resource "random_id" "hash" {
  byte_length = 4
}