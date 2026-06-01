# ═══════════════════════════════════════════════════════════════════════════
# secrets.tf — AWS Secrets Manager stores all sensitive config
# ECS task definitions reference these ARNs instead of plain env vars
# ═══════════════════════════════════════════════════════════════════════════

# ── Master secret: credentials shared across all services ─────────────────
resource "aws_secretsmanager_secret" "app_secrets" {
  name                    = "${local.prefix}/app-secrets"
  description             = "JWT secret, mail credentials, and DB password"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app_secrets" {
  secret_id = aws_secretsmanager_secret.app_secrets.id
  secret_string = jsonencode({
    DB_USER        = var.db_username
    DB_PASS        = var.db_password
    JWT_SECRET     = var.jwt_secret
    COOKIE_SECURE  = "true"
    MAIL_HOST      = "smtp.gmail.com"
    MAIL_PORT      = "587"
    MAIL_USERNAME  = var.mail_username
    MAIL_PASSWORD  = var.mail_password
    ALERT_RECIPIENTS = var.alert_recipients
  })
}

# ── Per-service DB endpoints (non-sensitive but convenient to centralise) ──
resource "aws_secretsmanager_secret" "db_endpoints" {
  name                    = "${local.prefix}/db-endpoints"
  description             = "RDS endpoint hostnames for each service"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_endpoints" {
  secret_id = aws_secretsmanager_secret.db_endpoints.id
  secret_string = jsonencode({
    AUTH_DB_HOST         = aws_db_instance.auth.address
    INVENTORY_DB_HOST    = aws_db_instance.inventory.address
    NOTIFICATION_DB_HOST = aws_db_instance.notification.address
    SUPPLIER_DB_HOST     = aws_db_instance.supplier.address
    AUTH_DB_NAME         = aws_db_instance.auth.db_name
    INVENTORY_DB_NAME    = aws_db_instance.inventory.db_name
    NOTIFICATION_DB_NAME = aws_db_instance.notification.db_name
    SUPPLIER_DB_NAME     = aws_db_instance.supplier.db_name
  })
  depends_on = [
    aws_db_instance.auth,
    aws_db_instance.inventory,
    aws_db_instance.notification,
    aws_db_instance.supplier,
  ]
}

# ── S3 / MinIO replacement credentials ────────────────────────────────────
resource "aws_secretsmanager_secret" "s3_secrets" {
  name                    = "${local.prefix}/s3-secrets"
  description             = "S3 bucket config for product image storage"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "s3_secrets" {
  secret_id = aws_secretsmanager_secret.s3_secrets.id
  secret_string = jsonencode({
    MINIO_ENDPOINT   = "https://s3.${var.aws_region}.amazonaws.com"
    MINIO_BUCKET     = aws_s3_bucket.images.id
    # Access key and secret key come from the ECS task IAM role — no creds needed
    MINIO_ACCESS_KEY = ""
    MINIO_SECRET_KEY = ""
  })
  depends_on = [aws_s3_bucket.images]
}
