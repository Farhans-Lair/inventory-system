# ═══════════════════════════════════════════════════════════════════════════
# ecr.tf — one ECR repository per service (private Docker registry)
# ═══════════════════════════════════════════════════════════════════════════

locals {
  ecr_repos = [
    "auth-service",
    "inventory-service",
    "notification-service",
    "reporting-service",
    "supplier-service",
    "frontend",
  ]
}

resource "aws_ecr_repository" "services" {
  for_each             = toset(local.ecr_repos)
  name                 = "${local.prefix}/${each.key}"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true   # free vulnerability scanning on every push
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = { Name = "${local.prefix}/${each.key}" }
}

# ── Lifecycle policy: keep only the 10 most recent images per repo ─────────
resource "aws_ecr_lifecycle_policy" "cleanup" {
  for_each   = aws_ecr_repository.services
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 10 images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
