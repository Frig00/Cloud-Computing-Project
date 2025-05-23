variable "region" {
  default = "eu-west-1"
}

variable "vpc_cidr" {
  default = "10.0.0.0/16"
}

variable "availability_zones" {
  default = ["a", "b", "c"]
}

variable "private_subnet_cidrs" {
  default = [
    "100.0.0.0/24",
    "100.0.1.0/24",
    "100.0.2.0/24"
  ]
}

variable "public_subnet_cidrs" {
  default = [
    "100.0.128.0/24",
    "100.0.129.0/24",
    "100.0.130.0/24"
  ]
}

variable "route53_hosted_zone_id" {
  default = "Z05564128L0HRRR5IZVP"
}


variable "project_name" {
    default = "sunomi"
}

variable "environment" {
    default = "demo"
}

variable "ecr_transcoder" {
  default = "886436942768.dkr.ecr.eu-west-1.amazonaws.com/transcoder-aws:latest"
}

variable "ecr_controller" {
  default = "886436942768.dkr.ecr.eu-west-1.amazonaws.com/controller:latest"
}

variable "use_free_db" {
  default = true
}