# ═══════════════════════════════════════════════════════════════════════════
# vpc_flow_logs.tf — capture all VPC network traffic metadata to S3
#
# Flow logs record: source IP, dest IP, ports, protocol, bytes, action
# (ACCEPT/REJECT) for every network connection through the VPC. They don't
# capture payload — just the connection metadata — so storage is small.
#
# Cost: ~$0.025/GB stored. At this project's traffic level expect < 2GB/month
# = ~$0.05/month. Far cheaper than CloudWatch Logs ingestion ($0.50/GB).
#
# Retention: 90 days — long enough to investigate any security incident.
# Increase to 365 for compliance requirements.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_s3_bucket" "flow_logs" {
  bucket        = "${local.prefix}-vpc-flow-logs"
  force_destroy = true   # allows destroy even with logs present
  tags          = { Name = "${local.prefix}-vpc-flow-logs" }
}

resource "aws_s3_bucket_public_access_block" "flow_logs" {
  bucket                  = aws_s3_bucket.flow_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id
  rule {
    id     = "expire-flow-logs"
    status = "Enabled"
    filter {}
    expiration { days = 90 }
    abort_incomplete_multipart_upload { days_after_initiation = 7 }
  }
}

# IAM: allow VPC flow logs service to write to the bucket
resource "aws_s3_bucket_policy" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AWSLogDeliveryWrite"
        Effect = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.flow_logs.arn}/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
        Condition = {
          StringEquals = {
            "s3:x-amz-acl"        = "bucket-owner-full-control"
            "aws:SourceAccount"   = data.aws_caller_identity.current.account_id
          }
        }
      },
      {
        Sid    = "AWSLogDeliveryAclCheck"
        Effect = "Allow"
        Principal = { Service = "delivery.logs.amazonaws.com" }
        Action   = "s3:GetBucketAcl"
        Resource = aws_s3_bucket.flow_logs.arn
        Condition = {
          StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id }
        }
      }
    ]
  })
}

# Capture all traffic (ACCEPT + REJECT) for the entire VPC
resource "aws_flow_log" "vpc" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  iam_role_arn         = aws_iam_role.flow_logs.arn
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"

  # Parquet format: compressed columnar storage, ~80% smaller than plain text.
  # Queryable directly with Athena if you need to investigate traffic patterns.
  destination_options {
    file_format        = "parquet"
    per_hour_partition = true
  }

  tags = { Name = "${local.prefix}-vpc-flow-log" }
}

# IAM role for flow logs delivery
resource "aws_iam_role" "flow_logs" {
  name = "${local.prefix}-vpc-flow-logs-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "flow_logs" {
  name = "${local.prefix}-vpc-flow-logs-policy"
  role = aws_iam_role.flow_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["s3:PutObject"]
      Resource = "${aws_s3_bucket.flow_logs.arn}/*"
    }]
  })
}

# Needed for the flow_logs bucket policy account ID reference
data "aws_caller_identity" "current" {}
