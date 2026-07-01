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
  # Must be >= ec2_desired_instances (now 4). Leaves room for one extra
  # instance during CPU-driven scale-out before hitting the ceiling.
  default     = 5
}

variable "ec2_desired_instances" {
  description = "Initial desired count (ASG takes over after first apply)"
  # 4 instances required: t3.large supports 3 ENIs per instance.
  # With awsvpc network mode each ECS task needs 1 ENI.
  # 4 instances × 3 ENIs = 12 slots - 4 for the instances themselves = 8 for tasks.
  # Steady-state task count is now 8: auth(2) + inventory(2) + notification(1) +
  # reporting(1) + supplier(1) + frontend(1). auth and inventory run desired_count=2
  # so a deployment can replace one task at a time while the other keeps serving
  # traffic — see deployment_minimum_healthy_percent on those two services in ecs.tf.
  default     = 4
}

# ── S3 ─────────────────────────────────────────────────────────────────────
variable "image_bucket_name" {
  default = "inventoryms-product-images-prod"
}

variable "report_bucket_name" {
  description = "S3 bucket for compliance archival of generated report files (CSV exports etc.), organized into reports/<module>/ folders"
  default     = "inventoryms-reports-prod"
}

# ── Image tag ──────────────────────────────────────────────────────────────
variable "image_tag" {
  description = <<-EOT
    Docker image tag used by all ECS task definitions. Defaults to "latest"
    for the initial Terraform apply (before any CI run has pushed a SHA-tagged
    image). After the first CI deploy, CI overrides this with the git commit
    SHA via -var="image_tag=<sha>" so each deployment is fully traceable and
    immutable. Because ECR repos are now IMMUTABLE, the same SHA tag can never
    be silently overwritten — a failed/malicious push cannot replace an image
    that ECS is already running.
  EOT
  default     = "latest"
}
