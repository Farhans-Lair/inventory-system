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
variable "db_instance_class" {
  default = "db.t3.small"
  # Previously db.t3.micro × 4 separate instances (one per service). Now a
  # single instance serves all 4 schemas, so it needs more headroom than a
  # micro instance gave any one service before — db.t3.small (2 vCPU, 2GB)
  # still costs less in total than 4 micro instances did combined.
}

# ── Secrets ────────────────────────────────────────────────────────────────
# Three separate JWT signing secrets — session (pre-auth OTP flow), access
# (API auth, validated by every backend service), and refresh (rotated on
# every /api/auth/refresh call). Generate each independently, e.g.:
#   openssl rand -base64 64
variable "jwt_session_secret" {
  sensitive = true
}
variable "jwt_access_secret" {
  sensitive = true
}
variable "jwt_refresh_secret" {
  sensitive = true
}
variable "mail_username"    { default = "" }
variable "mail_password" {
  sensitive = true
  default   = ""
}
variable "alert_recipients" { default = "" }

# ── HTTPS (optional) ────────────────────────────────────────────────────────
variable "domain_name" {
  description = <<-EOT
    Custom domain for the ALB, e.g. "inventoryms.example.com". Leave blank
    (default) to keep the ALB HTTP-only, as before. When set, requires an
    existing Route53 public hosted zone for the domain — acm.tf provisions
    a DNS-validated ACM cert and alb.tf adds an HTTPS listener using it.
    Setting this also flips COOKIE_SECURE to "true" in ecs.tf.
  EOT
  default     = ""
}

# ── EC2 ECS instances ──────────────────────────────────────────────────────
variable "ec2_instance_type" {
  description = "EC2 instance type for ECS container instances"
  default     = "t3.large"
  # t3.large = 2 vCPU / 8 GB, 3 ENIs per instance. See ec2_desired_instances
  # below for how many instances are needed at this size for the current
  # task count.
  # t3.xlarge = 4 vCPU / 16 GB — recommended for production with buffer
}

variable "ec2_min_instances" {
  description = "Minimum number of EC2 instances in the ECS ASG"
  default     = 1
}

variable "ec2_max_instances" {
  description = "Maximum number of EC2 instances the ASG can scale to"
  # Must be >= ec2_desired_instances (now 6). Leaves room for one extra
  # instance during CPU-driven scale-out before hitting the ceiling.
  default     = 7
}

variable "ec2_desired_instances" {
  description = "Initial desired count (ASG takes over after first apply)"
  # 6 instances required: t3.large supports 3 ENIs per instance, 1 of which
  # is the host's own primary ENI, leaving 2 usable task slots per instance.
  # 6 instances × 2 task slots = 12 task slots.
  # Steady-state task count is now 11: auth(2) + inventory(2) + notification(2) +
  # reporting(2) + supplier(2) + frontend(1). All five backend services now
  # run desired_count=2 with deployment_minimum_healthy_percent=50 so a
  # deployment can replace one task at a time while the other keeps serving
  # traffic (previously notification/reporting/supplier ran a single
  # unmonitored task each — see ecs.tf and cloudwatch.tf).
  default     = 6
}

# ── S3 ─────────────────────────────────────────────────────────────────────
variable "image_bucket_name" {
  default = "inventoryms-product-images-prod"
}

variable "report_bucket_name" {
  description = "S3 bucket for compliance archival of generated report files (CSV exports etc.), organized into reports/<module>/ folders"
  default     = "inventoryms-reports-prod"
}
