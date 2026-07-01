# ═══════════════════════════════════════════════════════════════════════════
# s3.tf — S3 bucket replaces MinIO for product image storage
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_s3_bucket" "images" {
  bucket        = var.image_bucket_name
  force_destroy = false
  tags          = { Name = var.image_bucket_name }
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access — images are served via pre-signed URLs
resource "aws_s3_bucket_public_access_block" "images" {
  bucket                  = aws_s3_bucket.images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle: delete incomplete multipart uploads after 7 days
resource "aws_s3_bucket_lifecycle_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"
    filter {}   # empty filter = apply to all objects
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id
  # Versioning protects against accidental overwrites and deletes of product
  # images — a DELETE on a versioned object creates a delete marker rather
  # than erasing the file permanently, so you can recover within 30 days.
  versioning_configuration { status = "Enabled" }
}

# Non-current (overwritten/deleted) image versions expire after 30 days to
# avoid unbounded storage accumulation while still providing a recovery window.
resource "aws_s3_bucket_lifecycle_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    id     = "expire-old-image-versions"
    status = "Enabled"
    filter {}
    noncurrent_version_expiration { noncurrent_days = 30 }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

# CORS: allow only the ALB (or your custom domain, once added) to PUT/GET images.
# Previously allowed_origins = ["*"], meaning any website on the internet could
# issue PUT/POST requests against a leaked pre-signed URL. Pre-signed URLs are
# already time-limited and resource-scoped, but there is no reason to also let
# arbitrary origins use them — only the app itself ever needs to.
resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = [
      "http://${aws_lb.main.dns_name}",
      # Add your custom domain here once HTTPS is configured, e.g.:
      # "https://your-domain.com",
    ]
    max_age_seconds = 3600
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# Reports bucket — compliance archival of generated report files (CSV exports
# etc.). Separate from the images bucket: different access pattern (write-once
# from backend services only, never read directly by the browser), and a
# separate bucket keeps retention/lifecycle policy changes here from ever
# risking the product-images bucket.
#
# Object layout: reports/<module>/<reportName>-<timestamp>.<ext>
# e.g. reports/inventory-service/products-export-20260630-141200.csv
#      reports/reporting-service/valuation-export-20260630-141530.csv
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_s3_bucket" "reports" {
  bucket        = var.report_bucket_name
  force_destroy = false
  tags          = { Name = var.report_bucket_name }
}

resource "aws_s3_bucket_versioning" "reports" {
  bucket = aws_s3_bucket.reports.id
  # Versioning enabled — generated reports are never overwritten in practice
  # (each upload gets a unique timestamped key), but this guards against
  # accidental deletes for compliance retention.
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block all public access — reports are written by backend services only and
# are never served directly to browsers.
resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# No expiry/lifecycle rule on the report objects themselves — compliance
# archival means these are intentionally retained, not auto-deleted. Only
# clean up stray incomplete multipart uploads.
resource "aws_s3_bucket_lifecycle_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id
  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}
