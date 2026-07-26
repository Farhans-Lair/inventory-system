
variable "aws_region"   { default = "ap-south-1" }
variable "project"      { default = "inventoryms" }
variable "environment"  { default = "prod" }

variable "vpc_cidr"             { default = "10.0.0.0/16" }
variable "public_subnet_cidrs"  { default = ["10.0.1.0/24", "10.0.2.0/24"] }
variable "private_subnet_cidrs" { default = ["10.0.10.0/24", "10.0.11.0/24"] }

variable "db_username"       { default = "inventoryadmin" }
variable "db_password" {
  description = "Master DB password — no @ / \" or spaces"
  sensitive   = true
}
variable "db_instance_class" {
  default = "db.t3.small"

}

variable "jwt_session_secret" {
  description = "HS256 signing key for session tokens (OTP flow). Generate with: openssl rand -base64 64"
  sensitive   = true
  validation {
    condition     = length(var.jwt_session_secret) >= 32
    error_message = "jwt_session_secret must be at least 32 characters (256 bits) — JJWT rejects anything shorter. Generate with: openssl rand -base64 64"
  }
}
variable "jwt_access_secret" {
  description = "HS256 signing key for access tokens. Must be different from jwt_session_secret and jwt_refresh_secret. Generate with: openssl rand -base64 64"
  sensitive   = true
  validation {
    condition     = length(var.jwt_access_secret) >= 32
    error_message = "jwt_access_secret must be at least 32 characters (256 bits) — JJWT rejects anything shorter. Generate with: openssl rand -base64 64"
  }
}
variable "jwt_refresh_secret" {
  description = "HS256 signing key for refresh tokens. Must be different from jwt_session_secret and jwt_access_secret. Generate with: openssl rand -base64 64"
  sensitive   = true
  validation {
    condition     = length(var.jwt_refresh_secret) >= 32
    error_message = "jwt_refresh_secret must be at least 32 characters (256 bits) — JJWT rejects anything shorter. Generate with: openssl rand -base64 64"
  }
}
variable "mail_username"    { default = "" }
variable "mail_password" {
  sensitive = true
  default   = ""
}
variable "alert_recipients" { default = "" }

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

variable "ec2_instance_type" {
  description = "EC2 instance type for ECS container instances"
  default     = "t3.large"

}

variable "ec2_min_instances" {
  description = "Minimum number of EC2 instances in the ECS ASG"
  default     = 1
}

variable "ec2_max_instances" {
  description = "Maximum number of EC2 instances the ASG can scale to"

  default     = 7
}

variable "ec2_desired_instances" {
  description = "Initial desired count (ASG takes over after first apply)"

  default     = 6
}

variable "image_bucket_name" {
  default = "inventoryms-product-images-prod"
}

variable "report_bucket_name" {
  description = "S3 bucket for compliance archival of generated report files (CSV exports etc.), organized into reports/<module>/ folders"
  default     = "inventoryms-reports-prod"
}

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
