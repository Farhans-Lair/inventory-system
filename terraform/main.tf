
terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

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

locals {
  prefix = "${var.project}-${var.environment}"

  services = {
    auth         = { port = 8081, cpu = 256, memory = 512  }
    inventory    = { port = 8082, cpu = 512, memory = 1024 }
    notification = { port = 8083, cpu = 256, memory = 512  }
    reporting    = { port = 8084, cpu = 512, memory = 1024 }
    supplier     = { port = 8085, cpu = 256, memory = 512  }
    frontend     = { port = 80,   cpu = 256, memory = 512  }
  }

  service_ports = { for name, svc in local.services : name => svc.port }
}
