# ═══════════════════════════════════════════════════════════════════════════
# main.tf — Terraform & provider configuration
# ═══════════════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # S3 remote backend (commented out — using local state for this project).
  # Uncomment and run `terraform init -migrate-state` if you move to a team
  # setup or need state stored remotely. You must create the S3 bucket
  # manually before enabling this (AWS CLI commands in README).
  #
  # backend "s3" {
  #   bucket       = "inventoryms-terraform-state"
  #   key          = "prod/terraform.tfstate"
  #   region       = "ap-south-1"
  #   use_lockfile = true
  #   encrypt      = true
  # }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Convenience locals used across all files
locals {
  prefix = "${var.project}-${var.environment}"
  services = {
    auth         = { port = 8081, cpu = var.service_cpu, memory = var.service_memory }
    inventory    = { port = 8082, cpu = var.service_cpu, memory = var.service_memory }
    notification = { port = 8083, cpu = var.service_cpu, memory = var.service_memory }
    reporting    = { port = 8084, cpu = var.service_cpu, memory = var.service_memory }
    supplier     = { port = 8085, cpu = var.service_cpu, memory = var.service_memory }
    frontend     = { port = 80,   cpu = 256,             memory = 512              }
  }

  # Flat name -> port map, used to scope the ECS security group to exactly
  # the ports each service listens on instead of opening 0-65535.
  service_ports = { for name, svc in local.services : name => svc.port }
}
