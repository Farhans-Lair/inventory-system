# ═══════════════════════════════════════════════════════════════════════════
# secrets.tf — AWS Secrets Manager for actual sensitive values only
#
# Previously this file defined 3 secrets (app_secrets, db_endpoints,
# s3_secrets) but ecs.tf never referenced any of their ARNs — every
# credential was passed as plaintext `environment` in the task definitions
# instead of `secrets`, meaning these were paying for nothing and the
# sensitive values (DB password, JWT secret, mail password) were visible
# in plaintext to anyone with ecs:DescribeTaskDefinition, in the ECS
# console, and in CloudTrail.
#
# This version keeps ONE secret holding only the values that are actually
# sensitive, and ecs.tf now references it via `secrets:` (valueFrom) for
# every service instead of `environment:`. The other two secrets are
# removed: db_endpoints held only hostnames (not sensitive — already
# visible in the `rds_endpoints` terraform output), and s3_secrets held
# empty strings (S3 access is via the ECS task IAM role, no static keys).
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${local.prefix}/app-secrets"
  description             = "DB password, JWT secret, mail password — referenced by ECS task defs via valueFrom"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DB_PASS       = var.db_password
    JWT_SECRET    = var.jwt_secret
    MAIL_PASSWORD = var.mail_password
  })
}
