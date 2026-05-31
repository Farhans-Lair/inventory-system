# ═══════════════════════════════════════════════════════════════════════════
# iam.tf — ECS task execution role + task role
# Execution role: lets ECS pull images from ECR and read secrets
# Task role:      lets running containers access S3 and CloudWatch
# ═══════════════════════════════════════════════════════════════════════════

data "aws_caller_identity" "current" {}

# ── ECS Task Execution Role ────────────────────────────────────────────────
resource "aws_iam_role" "ecs_execution" {
  name = "${local.prefix}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_execution_basic" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Allow execution role to read from Secrets Manager
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${local.prefix}-ecs-read-secrets"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ]
      Resource = [
        aws_secretsmanager_secret.app_secrets.arn,
        aws_secretsmanager_secret.db_endpoints.arn,
        aws_secretsmanager_secret.s3_secrets.arn,
      ]
    }]
  })
}

# ── ECS Task Role (runtime permissions for running containers) ─────────────
resource "aws_iam_role" "ecs_task" {
  name = "${local.prefix}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

# Allow task containers to write to CloudWatch Logs
resource "aws_iam_role_policy_attachment" "ecs_task_cloudwatch" {
  role       = aws_iam_role.ecs_task.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

# Allow inventory-service to read/write S3 images bucket
resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "${local.prefix}-ecs-s3-images"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.images.arn,
        "${aws_s3_bucket.images.arn}/*"
      ]
    }]
  })
}
