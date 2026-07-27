# ═══════════════════════════════════════════════════════════════════════════
# ecs.tf — ECS cluster, task definitions, and services on EC2
#
# Changed from Fargate to EC2 launch type backed by the ASG in asg.tf.
# Network mode stays awsvpc so target groups use IP targets (same as Fargate).
# ═══════════════════════════════════════════════════════════════════════════

data "aws_caller_identity" "ecs" {}

# ── ECS Cluster ────────────────────────────────────────────────────────────
resource "aws_ecs_cluster" "main" {
  name = "${local.prefix}-cluster"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Link the EC2 capacity provider to the cluster
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = [aws_ecs_capacity_provider.ec2.name]

  default_capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
    base              = 1
  }
}

# ── CloudWatch Log Groups ──────────────────────────────────────────────────
resource "aws_cloudwatch_log_group" "services" {
  for_each          = local.services
  name              = "/ecs/${local.prefix}/${each.key}"
  retention_in_days = 30
}

locals {
  account_id = data.aws_caller_identity.ecs.account_id
  ecr_base   = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.prefix}"
}

# ═══════════════════════════════════════════════════════════════════════════
# auth-service
# ═══════════════════════════════════════════════════════════════════════════
resource "aws_ecs_task_definition" "auth" {
  family                   = "${local.prefix}-auth"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  cpu                      = local.services.auth.cpu
  memory                   = local.services.auth.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "auth-service"
    image     = "${local.ecr_base}/auth-service:${local.image_tag}"
    essential = true
    portMappings = [{ containerPort = 8081, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",       value = var.db_username },
      { name = "AUTH_DB_NAME",  value = "authdb" },
      # true only when var.domain_name is set and the ACM cert/HTTPS listener
      # (acm.tf, alb.tf) are actually provisioned — flipping this to "true"
      # without HTTPS in front of it is what caused the earlier logout-loop
      # (Spring Security returns a Secure cookie the browser refuses to store
      # over plain HTTP, which surfaced as swallowed 403s instead of 401s).
      { name = "COOKIE_SECURE", value = var.domain_name != "" ? "true" : "false" },
      { name = "MAIL_HOST",     value = "smtp.gmail.com" },
      { name = "MAIL_PORT",     value = "587" },
      { name = "MAIL_USERNAME", value = var.mail_username },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.shared.address}:3306/authdb?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
    ]
    # Sensitive values pulled from Secrets Manager at task launch — never
    # appear in plaintext in the task definition, ECS console, or CloudTrail.
    secrets = [
      { name = "DB_PASS",           valueFrom = "${aws_ssm_parameter.db_pass.arn}" },
      # Three separate keys — a leaked/rotated session or refresh secret no
      # longer implies the access-token secret is also compromised, and
      # vice versa. Only auth-service ever sees all three; other services
      # only get JWT_ACCESS_SECRET (they only validate access tokens).
      { name = "JWT_SESSION_SECRET", valueFrom = "${aws_ssm_parameter.jwt_session_secret.arn}" },
      { name = "JWT_ACCESS_SECRET",  valueFrom = "${aws_ssm_parameter.jwt_access_secret.arn}" },
      { name = "JWT_REFRESH_SECRET", valueFrom = "${aws_ssm_parameter.jwt_refresh_secret.arn}" },
      { name = "MAIL_PASSWORD",      valueFrom = "${aws_ssm_parameter.mail_password.arn}" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options   = {
        "awslogs-group"         = "/ecs/${local.prefix}/auth"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "auth"
      }
    }
  }])
}

resource "aws_ecs_service" "auth" {
  name                              = "${local.prefix}-auth"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.auth.arn
  # Runs 2 tasks instead of 1 — auth-service is on the critical path for
  # every page load (token validation). With desired_count=1, every
  # deployment had a window where the old task was stopping/stopped and the
  # new one hadn't passed its health check yet, causing a real availability
  # gap (this is what produced the logout-loop and 502s seen during earlier
  # deployments). minimum_healthy_percent=50 / maximum_percent=100 means ECS
  # replaces one task at a time without exceeding desired_count — the other
  # task keeps serving traffic throughout, so there's no extra ENI headroom
  # needed beyond the 2 already provisioned for this service.
  desired_count                     = 2
  health_check_grace_period_seconds = 180

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 100

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.auth.arn
    container_name   = "auth-service"
    container_port   = 8081
  }

  depends_on = [aws_lb_listener_rule.auth]
}

# ═══════════════════════════════════════════════════════════════════════════
# inventory-service
# ═══════════════════════════════════════════════════════════════════════════
resource "aws_ecs_task_definition" "inventory" {
  family                   = "${local.prefix}-inventory"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  cpu                      = local.services.inventory.cpu
  memory                   = local.services.inventory.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "inventory-service"
    image     = "${local.ecr_base}/inventory-service:${local.image_tag}"
    essential = true
    portMappings = [{ containerPort = 8082, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",           value = var.db_username },
      { name = "INVENTORY_DB_NAME", value = "inventorydb" },
      { name = "AWS_REGION",        value = var.aws_region },
      { name = "MINIO_BUCKET",      value = aws_s3_bucket.images.id },
      { name = "REPORTS_BUCKET",    value = aws_s3_bucket.reports.id },
      # Notification service URL — must go through the ALB on ECS (no Docker Compose DNS on AWS).
      # StockService uses this to send low-stock and overstock alerts.
      { name = "NOTIFICATION_SERVICE_URL",
        value = "http://${aws_lb.main.dns_name}" },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.shared.address}:3306/inventorydb?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
    ]
    secrets = [
      { name = "DB_PASS",          valueFrom = "${aws_ssm_parameter.db_pass.arn}" },
      { name = "JWT_ACCESS_SECRET", valueFrom = "${aws_ssm_parameter.jwt_access_secret.arn}" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options   = {
        "awslogs-group"         = "/ecs/${local.prefix}/inventory"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "inventory"
      }
    }
  }])
}

resource "aws_ecs_service" "inventory" {
  name                              = "${local.prefix}-inventory"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.inventory.arn
  # Same rationale as auth-service above — inventory-service backs the
  # dashboard and every stock/product page, so it gets the same 2-task
  # zero-downtime treatment.
  desired_count                     = 2
  health_check_grace_period_seconds = 180

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 100

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.inventory.arn
    container_name   = "inventory-service"
    container_port   = 8082
  }

  depends_on = [aws_lb_listener_rule.inventory]
}

# ═══════════════════════════════════════════════════════════════════════════
# notification-service
# ═══════════════════════════════════════════════════════════════════════════
resource "aws_ecs_task_definition" "notification" {
  family                   = "${local.prefix}-notification"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  cpu                      = local.services.notification.cpu
  memory                   = local.services.notification.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "notification-service"
    image     = "${local.ecr_base}/notification-service:${local.image_tag}"
    essential = true
    portMappings = [{ containerPort = 8083, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",              value = var.db_username },
      { name = "NOTIFICATION_DB_NAME", value = "notificationdb" },
      { name = "MAIL_HOST",            value = "smtp.gmail.com" },
      { name = "MAIL_PORT",            value = "587" },
      { name = "MAIL_USERNAME",        value = var.mail_username },
      { name = "ALERT_RECIPIENTS",     value = var.alert_recipients },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.shared.address}:3306/notificationdb?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
    ]
    secrets = [
      { name = "DB_PASS",           valueFrom = "${aws_ssm_parameter.db_pass.arn}" },
      # NOTE: notification-service has no JwtConfig/SecurityConfig — this
      # was already unused before the JWT_SECRET split (dangling config,
      # not something this change introduces). Kept for parity in case
      # auth gets added later; safe to remove if confirmed dead.
      { name = "JWT_ACCESS_SECRET", valueFrom = "${aws_ssm_parameter.jwt_access_secret.arn}" },
      { name = "MAIL_PASSWORD",     valueFrom = "${aws_ssm_parameter.mail_password.arn}" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options   = {
        "awslogs-group"         = "/ecs/${local.prefix}/notification"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "notification"
      }
    }
  }])
}

resource "aws_ecs_service" "notification" {
  name                              = "${local.prefix}-notification"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.notification.arn
  # Was desired_count=1 with no alarm coverage — a crash or bad deploy was a
  # silent outage. Now 2 tasks with the same rolling-replacement guarantee
  # as auth/inventory: one task always stays up during a deployment.
  desired_count                     = 2
  health_check_grace_period_seconds = 180

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 100

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.notification.arn
    container_name   = "notification-service"
    container_port   = 8083
  }

  depends_on = [aws_lb_listener_rule.notification]
}

# ═══════════════════════════════════════════════════════════════════════════
# reporting-service
# ═══════════════════════════════════════════════════════════════════════════
resource "aws_ecs_task_definition" "reporting" {
  family                   = "${local.prefix}-reporting"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  cpu                      = local.services.reporting.cpu
  memory                   = local.services.reporting.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "reporting-service"
    image     = "${local.ecr_base}/reporting-service:${local.image_tag}"
    essential = true
    portMappings = [{ containerPort = 8084, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",           value = var.db_username },
      { name = "INVENTORY_DB_NAME", value = "inventorydb" },
      { name = "AWS_REGION",        value = var.aws_region },
      { name = "REPORTS_BUCKET",    value = aws_s3_bucket.reports.id },
      # Points at the read replica, not the primary — reporting-service only
      # ever reads from inventorydb (report/valuation generation), so this
      # takes that load off the primary instance that inventory-service
      # writes to. If reporting-service ever needs to write, add a second
      # datasource pointing at aws_db_instance.shared for writes.
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.reporting_replica.address}:3306/inventorydb?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
    ]
    secrets = [
      { name = "DB_PASS",           valueFrom = "${aws_ssm_parameter.db_pass.arn}" },
      # NOTE: same as notification-service — no JwtConfig/SecurityConfig
      # here yet, this is dangling config kept for parity.
      { name = "JWT_ACCESS_SECRET", valueFrom = "${aws_ssm_parameter.jwt_access_secret.arn}" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options   = {
        "awslogs-group"         = "/ecs/${local.prefix}/reporting"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "reporting"
      }
    }
  }])
}

resource "aws_ecs_service" "reporting" {
  name                              = "${local.prefix}-reporting"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.reporting.arn
  desired_count                     = 2
  health_check_grace_period_seconds = 180

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 100

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.reporting.arn
    container_name   = "reporting-service"
    container_port   = 8084
  }

  depends_on = [aws_lb_listener_rule.reporting]
}

# ═══════════════════════════════════════════════════════════════════════════
# supplier-service
# ═══════════════════════════════════════════════════════════════════════════
resource "aws_ecs_task_definition" "supplier" {
  family                   = "${local.prefix}-supplier"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  cpu                      = local.services.supplier.cpu
  memory                   = local.services.supplier.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "supplier-service"
    image     = "${local.ecr_base}/supplier-service:${local.image_tag}"
    essential = true
    portMappings = [{ containerPort = 8085, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",          value = var.db_username },
      { name = "SUPPLIER_DB_NAME", value = "supplierdb" },
      # Used by receiveGoods() to push an INBOUND stock movement into
      # inventory-service when a GRN is recorded — must go through the ALB
      # since there is no service-discovery DNS on ECS.
      { name = "INVENTORY_SERVICE_URL",
        value = "http://${aws_lb.main.dns_name}" },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.shared.address}:3306/supplierdb?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
    ]
    secrets = [
      { name = "DB_PASS",          valueFrom = "${aws_ssm_parameter.db_pass.arn}" },
      { name = "JWT_ACCESS_SECRET", valueFrom = "${aws_ssm_parameter.jwt_access_secret.arn}" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options   = {
        "awslogs-group"         = "/ecs/${local.prefix}/supplier"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "supplier"
      }
    }
  }])
}

resource "aws_ecs_service" "supplier" {
  name                              = "${local.prefix}-supplier"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.supplier.arn
  desired_count                     = 2
  health_check_grace_period_seconds = 180

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 100

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.supplier.arn
    container_name   = "supplier-service"
    container_port   = 8085
  }

  depends_on = [aws_lb_listener_rule.supplier]
}

# ═══════════════════════════════════════════════════════════════════════════
# frontend
# ═══════════════════════════════════════════════════════════════════════════
resource "aws_ecs_task_definition" "frontend" {
  family                   = "${local.prefix}-frontend"
  requires_compatibilities = ["EC2"]
  network_mode             = "awsvpc"
  cpu                      = local.services.frontend.cpu
  memory                   = local.services.frontend.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "frontend"
    image     = "${local.ecr_base}/frontend:${local.image_tag}"
    essential = true
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options   = {
        "awslogs-group"         = "/ecs/${local.prefix}/frontend"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "frontend"
      }
    }
  }])
}

resource "aws_ecs_service" "frontend" {
  name                              = "${local.prefix}-frontend"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.frontend.arn
  desired_count                     = 1
  health_check_grace_period_seconds = 30

  capacity_provider_strategy {
    capacity_provider = aws_ecs_capacity_provider.ec2.name
    weight            = 1
  }

  network_configuration {
    subnets         = aws_subnet.private[*].id
    security_groups = [aws_security_group.ecs.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.http]
}
