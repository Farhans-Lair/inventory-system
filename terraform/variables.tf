# ═══════════════════════════════════════════════════════════════════════════
# variables.tf — all configurable values in one place
# ═══════════════════════════════════════════════════════════════════════════

variable "aws_region" {
  description = "AWS region to deploy into"
  default     = "ap-south-1"
}

variable "project" {
  description = "Short project name used as a prefix on every resource"
  default     = "inventoryms"
}

variable "environment" {
  description = "Deployment environment tag (dev / staging / prod)"
  default     = "prod"
}

# ── Networking ─────────────────────────────────────────────────────────────
variable "vpc_cidr"             { default = "10.0.0.0/16" }
variable "public_subnet_cidrs"  { default = ["10.0.1.0/24", "10.0.2.0/24"] }
variable "private_subnet_cidrs" { default = ["10.0.10.0/24", "10.0.11.0/24"] }

# ── Database ───────────────────────────────────────────────────────────────
variable "db_username"       { default = "admin" }
variable "db_password"       {
  description = "Master DB password — set via TF_VAR_db_password env var"
  sensitive   = true
}
variable "db_instance_class" { default = "db.t3.micro" }

# ── Secrets (sensitive — pass via env vars, never hardcode) ────────────────
variable "jwt_secret" {
  description = "JWT signing secret — set via TF_VAR_jwt_secret"
  sensitive   = true
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

# ── S3 image bucket ────────────────────────────────────────────────────────
variable "image_bucket_name" {
  description = "Must be globally unique. Change if name is taken."
  default     = "inventoryms-product-images"
}
