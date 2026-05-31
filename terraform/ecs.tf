# ═══════════════════════════════════════════════════════════════════════════
# ecs.tf — ECS Fargate cluster, task definitions, and services
# One task definition + one service per microservice
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

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

# ── CloudWatch Log Groups (one per service) ────────────────────────────────
resource "aws_cloudwatch_log_group" "services" {
  for_each          = local.services
  name              = "/ecs/${local.prefix}/${each.key}"
  retention_in_days = 30
}

# ── Helper: ECR image URL for a service ───────────────────────────────────
locals {
  account_id = data.aws_caller_identity.ecs.account_id
  ecr_base   = "${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com/${local.prefix}"
}

# ═══════════════════════════════════════════════════════════════════════════
# auth-service
# ═══════════════════════════════════════════════════════════════════════════
resource "aws_ecs_task_definition" "auth" {
  family                   = "${local.prefix}-auth"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = local.services.auth.cpu
  memory                   = local.services.auth.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "auth-service"
    image     = "${local.ecr_base}/auth-service:latest"
    essential = true
    portMappings = [{ containerPort = 8081, protocol = "tcp" }]
    environment = [
      { name = "AUTH_DB_NAME",    value = "authdb" },
      { name = "COOKIE_SECURE",   value = "true" },
      { name = "MAIL_HOST",       value = "smtp.gmail.com" },
      { name = "MAIL_PORT",       value = "587" },
    ]
    secrets = [
      { name = "DB_USER",       valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_USER::" },
      { name = "DB_PASS",       valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_PASS::" },
      { name = "JWT_SECRET",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:JWT_SECRET::" },
      { name = "MAIL_USERNAME", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:MAIL_USERNAME::" },
      { name = "MAIL_PASSWORD", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:MAIL_PASSWORD::" },
      { name = "spring.datasource.url",
        valueFrom = "${aws_secretsmanager_secret.db_endpoints.arn}:AUTH_DB_HOST::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${local.prefix}/auth"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "auth"
      }
    }
  }])
}

resource "aws_ecs_service" "auth" {
  name                               = "${local.prefix}-auth"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.auth.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
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
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = local.services.inventory.cpu
  memory                   = local.services.inventory.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "inventory-service"
    image     = "${local.ecr_base}/inventory-service:latest"
    essential = true
    portMappings = [{ containerPort = 8082, protocol = "tcp" }]
    environment = [
      { name = "INVENTORY_DB_NAME", value = "inventorydb" },
      { name = "MINIO_ENDPOINT",    value = "https://s3.${var.aws_region}.amazonaws.com" },
      { name = "MINIO_BUCKET",      value = aws_s3_bucket.images.id },
      { name = "MINIO_ACCESS_KEY",  value = "" },
      { name = "MINIO_SECRET_KEY",  value = "" },
    ]
    secrets = [
      { name = "DB_USER",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_USER::" },
      { name = "DB_PASS",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_PASS::" },
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:JWT_SECRET::" },
      { name = "spring.datasource.url",
        valueFrom = "${aws_secretsmanager_secret.db_endpoints.arn}:INVENTORY_DB_HOST::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${local.prefix}/inventory"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "inventory"
      }
    }
  }])
}

resource "aws_ecs_service" "inventory" {
  name                               = "${local.prefix}-inventory"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.inventory.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
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
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = local.services.notification.cpu
  memory                   = local.services.notification.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "notification-service"
    image     = "${local.ecr_base}/notification-service:latest"
    essential = true
    portMappings = [{ containerPort = 8083, protocol = "tcp" }]
    environment = [
      { name = "NOTIFICATION_DB_NAME", value = "notificationdb" },
      { name = "MAIL_HOST",            value = "smtp.gmail.com" },
      { name = "MAIL_PORT",            value = "587" },
    ]
    secrets = [
      { name = "DB_USER",          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_USER::" },
      { name = "DB_PASS",          valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_PASS::" },
      { name = "JWT_SECRET",       valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:JWT_SECRET::" },
      { name = "MAIL_USERNAME",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:MAIL_USERNAME::" },
      { name = "MAIL_PASSWORD",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:MAIL_PASSWORD::" },
      { name = "ALERT_RECIPIENTS", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:ALERT_RECIPIENTS::" },
      { name = "spring.datasource.url",
        valueFrom = "${aws_secretsmanager_secret.db_endpoints.arn}:NOTIFICATION_DB_HOST::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${local.prefix}/notification"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "notification"
      }
    }
  }])
}

resource "aws_ecs_service" "notification" {
  name                               = "${local.prefix}-notification"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.notification.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
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
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = local.services.reporting.cpu
  memory                   = local.services.reporting.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "reporting-service"
    image     = "${local.ecr_base}/reporting-service:latest"
    essential = true
    portMappings = [{ containerPort = 8084, protocol = "tcp" }]
    environment = [
      { name = "INVENTORY_DB_NAME", value = "inventorydb" },
    ]
    secrets = [
      { name = "DB_USER",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_USER::" },
      { name = "DB_PASS",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_PASS::" },
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:JWT_SECRET::" },
      { name = "spring.datasource.url",
        valueFrom = "${aws_secretsmanager_secret.db_endpoints.arn}:INVENTORY_DB_HOST::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${local.prefix}/reporting"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "reporting"
      }
    }
  }])
}

resource "aws_ecs_service" "reporting" {
  name                               = "${local.prefix}-reporting"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.reporting.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
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
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = local.services.supplier.cpu
  memory                   = local.services.supplier.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "supplier-service"
    image     = "${local.ecr_base}/supplier-service:latest"
    essential = true
    portMappings = [{ containerPort = 8085, protocol = "tcp" }]
    environment = [
      { name = "SUPPLIER_DB_NAME", value = "supplierdb" },
    ]
    secrets = [
      { name = "DB_USER",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_USER::" },
      { name = "DB_PASS",    valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:DB_PASS::" },
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.app_secrets.arn}:JWT_SECRET::" },
      { name = "spring.datasource.url",
        valueFrom = "${aws_secretsmanager_secret.db_endpoints.arn}:SUPPLIER_DB_HOST::" },
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/${local.prefix}/supplier"
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "supplier"
      }
    }
  }])
}

resource "aws_ecs_service" "supplier" {
  name                               = "${local.prefix}-supplier"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.supplier.arn
  desired_count                      = 1
  launch_type                        = "FARGATE"
  health_check_grace_period_seconds  = 120

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
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
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = local.services.frontend.cpu
  memory                   = local.services.frontend.memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([{
    name      = "frontend"
    image     = "${local.ecr_base}/frontend:latest"
    essential = true
    portMappings = [{ containerPort = 80, protocol = "tcp" }]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
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
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 30

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.ecs.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.http]
}
