
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
