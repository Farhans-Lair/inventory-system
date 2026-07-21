# ═══════════════════════════════════════════════════════════════════════════
# secrets.tf — SSM Parameter Store (SecureString) for actual sensitive values
#
# One parameter per secret, not one combined JSON blob — ECS task defs
# reference `secrets: valueFrom` with a plain parameter ARN for SSM
# (unlike Secrets Manager, there's no ":JSON_KEY::" suffix syntax here).
# All five are SecureString, encrypted with the default AWS-managed
# "alias/aws/ssm" KMS key — see iam.tf for the matching kms:Decrypt grant
# the execution role needs to actually read them at task launch.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_ssm_parameter" "db_pass" {
  name        = "/${local.prefix}/DB_PASS"
  description = "RDS master password — referenced by ECS task defs via valueFrom"
  type        = "SecureString"
  value       = var.db_password
}

resource "aws_ssm_parameter" "jwt_session_secret" {
  name        = "/${local.prefix}/JWT_SESSION_SECRET"
  description = "JWT signing secret for pre-auth OTP session tokens (auth-service only)"
  type        = "SecureString"
  value       = var.jwt_session_secret
}

resource "aws_ssm_parameter" "jwt_access_secret" {
  name        = "/${local.prefix}/JWT_ACCESS_SECRET"
  description = "JWT signing secret for access tokens — validated by every backend service"
  type        = "SecureString"
  value       = var.jwt_access_secret
}

resource "aws_ssm_parameter" "jwt_refresh_secret" {
  name        = "/${local.prefix}/JWT_REFRESH_SECRET"
  description = "JWT signing secret for refresh tokens (auth-service only)"
  type        = "SecureString"
  value       = var.jwt_refresh_secret
}

resource "aws_ssm_parameter" "mail_password" {
  name        = "/${local.prefix}/MAIL_PASSWORD"
  description = "SMTP password — referenced by ECS task defs via valueFrom"
  type        = "SecureString"
  value       = var.mail_password
}
