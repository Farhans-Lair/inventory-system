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

# CORS: allow the frontend domain to PUT/GET images
resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST"]
    allowed_origins = ["*"]   # restrict to your ALB domain in production
    max_age_seconds = 3600
  }
}
