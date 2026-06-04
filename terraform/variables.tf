# ═══════════════════════════════════════════════════════════════════════════
# variables.tf — all configurable values in one place
# ═══════════════════════════════════════════════════════════════════════════

variable "aws_region"   { default = "ap-south-1" }
variable "project"      { default = "inventoryms" }
variable "environment"  { default = "prod" }

# ── Networking ─────────────────────────────────────────────────────────────
variable "vpc_cidr"             { default = "10.0.0.0/16" }
variable "public_subnet_cidrs"  { default = ["10.0.1.0/24", "10.0.2.0/24"] }
variable "private_subnet_cidrs" { default = ["10.0.10.0/24", "10.0.11.0/24"] }

# ── Database ───────────────────────────────────────────────────────────────
variable "db_username"       { default = "inventoryadmin" }
variable "db_password" {
  description = "Master DB password — no @ / \" or spaces"
  sensitive   = true
}
variable "db_instance_class" { default = "db.t3.micro" }

# ── Secrets ────────────────────────────────────────────────────────────────
variable "jwt_secret" {
  sensitive = true
}
variable "mail_username"    { default = "" }
variable "mail_password" {
  sensitive = true
  default   = ""
}
variable "alert_recipients" { default = "" }

# ── Container sizing ───────────────────────────────────────────────────────
variable "service_cpu"    { default = 512  }
variable "service_memory" { default = 1024 }

# ── EC2 ECS instances ──────────────────────────────────────────────────────
variable "ec2_instance_type" {
  description = "EC2 instance type for ECS container instances"
  default     = "t3.large"
  # t3.large = 2 vCPU / 8 GB — fits all 6 services with 40% headroom
  # t3.xlarge = 4 vCPU / 16 GB — recommended for production with buffer
}

variable "ec2_min_instances" {
  description = "Minimum number of EC2 instances in the ECS ASG"
  default     = 1
}

variable "ec2_max_instances" {
  description = "Maximum number of EC2 instances the ASG can scale to"
  default     = 3
}

variable "ec2_desired_instances" {
  description = "Initial desired count (ASG takes over after first apply)"
  default     = 2
}

# ── S3 ─────────────────────────────────────────────────────────────────────
variable "image_bucket_name" {
  default = "inventoryms-product-images-prod"
}
