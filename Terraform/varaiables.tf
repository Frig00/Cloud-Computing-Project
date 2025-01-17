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

variable "bucket_name" {
  default = "unipv-cloud-sunomi-video-bucket"
  
}

variable "ami_id" {
  default = "ami-075449515af5df0d1"
}

variable "instance_type" {
  default = "t3.micro"
}

variable "project_name" {
    default = "sunomi"
}

variable "environment" {
    default = "demo"
}

variable "db_master_credentials" {
  default = {
    username = "admin"
    password = "password"
  }
}

variable "db_instance_class" {
  default = "db.c6gd.medium"
}

variable "ecr_transcoder" {
  default = "886436942768.dkr.ecr.eu-west-1.amazonaws.com/transcoder:latest"
}

variable "ecr_controller" {
  default = "886436942768.dkr.ecr.eu-west-1.amazonaws.com/controller:latest"
}