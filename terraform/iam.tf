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
# JWT_SESSION_SECRET/JWT_ACCESS_SECRET/JWT_REFRESH_SECRET, or MAIL_PASSWORD
# from SSM Parameter Store and tasks fail to start.
resource "aws_iam_role_policy" "ecs_execution_secrets" {
  name = "${local.prefix}-ecs-execution-secrets"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "SSMParameterRead"
        Effect   = "Allow"
        # GetParameters (plural) is what ECS actually calls at task launch
        # when resolving `secrets: valueFrom` — GetParameter (singular)
        # alone is not sufficient and tasks will fail to start with it missing.
        Action   = ["ssm:GetParameters"]
        Resource = [
          aws_ssm_parameter.db_pass.arn,
          aws_ssm_parameter.jwt_session_secret.arn,
          aws_ssm_parameter.jwt_access_secret.arn,
          aws_ssm_parameter.jwt_refresh_secret.arn,
          aws_ssm_parameter.mail_password.arn,
        ]
      },
      {
        # SecureString parameters are encrypted with the default AWS-managed
        # "alias/aws/ssm" key (no key_id set in secrets.tf) — the execution
        # role needs kms:Decrypt on it or GetParameters succeeds but returns
        # ciphertext the container can't use.
        Sid      = "SSMDefaultKeyDecrypt"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [data.aws_kms_key.ssm_default.arn]
      }
    ]
  })
}

data "aws_kms_key" "ssm_default" {
  key_id = "alias/aws/ssm"
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

# Grants inventory-service and reporting-service (both run under this shared
# task role) write/read access to archive generated CSV reports. No delete
# permission here on purpose — reports are compliance records and the
# application has no business deleting them; only Put/Get/List are needed.
resource "aws_iam_role_policy" "ecs_task_s3_reports" {
  name = "${local.prefix}-ecs-s3-reports"
  role = aws_iam_role.ecs_task.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["s3:GetObject","s3:PutObject","s3:ListBucket"]
      Resource = [
        aws_s3_bucket.reports.arn,
        "${aws_s3_bucket.reports.arn}/*"
      ]
    }]
  })
}

# ── GitHub Actions OIDC (moved here from oidc.tf — same resources, same
# addresses, file location has no effect on Terraform state or behavior) ──

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
  tags            = { Name = "github-actions-oidc" }
}

resource "aws_iam_role" "github_actions" {
  name = "inventoryms-github-actions"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike   = { "token.actions.githubusercontent.com:sub" = "repo:Farhans-Lair/inventory-system:*" }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions" {
  name = "inventoryms-github-actions-policy"
  role = aws_iam_role.github_actions.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage",
          "ecr:DescribeRepositories",
          "ecr:DescribeImages"
        ]
        Resource = "*"
      },
      {
        Sid    = "ECSAccess"
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:ListServices",
          "ecs:DescribeClusters"
        ]
        Resource = "*"
      },
      {
        Sid      = "IAMPassRole"
        Effect   = "Allow"
        Action   = ["iam:PassRole"]
        Resource = [
          aws_iam_role.ecs_execution.arn,
          aws_iam_role.ecs_task.arn
        ]
      },
      {
        Sid      = "STSAccess"
        Effect   = "Allow"
        Action   = ["sts:GetCallerIdentity"]
        Resource = "*"
      }
    ]
  })
}

output "github_actions_role_arn" {
  value = aws_iam_role.github_actions.arn
}
