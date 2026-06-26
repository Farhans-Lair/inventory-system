# ═══════════════════════════════════════════════════════════════════════════
# iam.tf — IAM roles for ECS tasks and EC2 instances
# ═══════════════════════════════════════════════════════════════════════════

data "aws_caller_identity" "current" {}

# ── ECS Task Execution Role (pull ECR images + write CloudWatch logs) ──────
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

# Lets the execution role resolve `secrets: valueFrom` entries in task
# definitions at launch time — without this, ECS cannot pull DB_PASS,
# JWT_SECRET, or MAIL_PASSWORD from Secrets Manager and tasks fail to start.
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${local.prefix}-ecs-execution-secrets"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = [aws_secretsmanager_secret.app_secrets.arn]
    }]
  })
}

# ── ECS Task Role (runtime permissions: S3 only) ──────────────────────────
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

# NOTE: there is no CloudWatch Logs policy on the task role. Container log
# shipping via the `awslogs` log driver (configured per-service in ecs.tf)
# is handled by the ECS agent using the EXECUTION role's
# AmazonECSTaskExecutionRolePolicy (attached above) — the task role is only
# for permissions the *application code* needs at runtime via the AWS SDK.
# Nothing in this codebase calls CloudWatch Logs APIs directly, so the
# previous CloudWatchLogsFullAccess attachment here was both over-permissioned
# (account-wide access to every log group) and unused.

resource "aws_iam_role_policy" "ecs_task_s3" {
  name = "${local.prefix}-ecs-s3-images"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject","s3:PutObject","s3:DeleteObject","s3:ListBucket"]
      Resource = [
        aws_s3_bucket.images.arn,
        "${aws_s3_bucket.images.arn}/*"
      ]
    }]
  })
}
