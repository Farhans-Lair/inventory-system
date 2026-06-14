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
    image     = "${local.ecr_base}/auth-service:latest"
    essential = true
    portMappings = [{ containerPort = 8081, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",       value = var.db_username },
      { name = "DB_PASS",       value = var.db_password },
      { name = "AUTH_DB_NAME",  value = "authdb" },
      { name = "JWT_SECRET",    value = var.jwt_secret },
      { name = "COOKIE_SECURE", value = "true" },
      { name = "MAIL_HOST",     value = "smtp.gmail.com" },
      { name = "MAIL_PORT",     value = "587" },
      { name = "MAIL_USERNAME", value = var.mail_username },
      { name = "MAIL_PASSWORD", value = var.mail_password },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.auth.address}:3306/authdb?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
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
  desired_count                     = 1
  health_check_grace_period_seconds = 180

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
    image     = "${local.ecr_base}/inventory-service:latest"
    essential = true
    portMappings = [{ containerPort = 8082, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",           value = var.db_username },
      { name = "DB_PASS",           value = var.db_password },
      { name = "INVENTORY_DB_NAME", value = "inventorydb" },
      { name = "JWT_SECRET",        value = var.jwt_secret },
      { name = "AWS_REGION",        value = var.aws_region },
      { name = "MINIO_BUCKET",      value = aws_s3_bucket.images.id },
      # Notification service URL — must go through the ALB on ECS (no Docker Compose DNS on AWS).
      # StockService uses this to send low-stock and overstock alerts.
      { name = "NOTIFICATION_SERVICE_URL",
        value = "http://${aws_lb.main.dns_name}" },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.inventory.address}:3306/inventorydb?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
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
  desired_count                     = 1
  health_check_grace_period_seconds = 180

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
    image     = "${local.ecr_base}/notification-service:latest"
    essential = true
    portMappings = [{ containerPort = 8083, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",              value = var.db_username },
      { name = "DB_PASS",              value = var.db_password },
      { name = "NOTIFICATION_DB_NAME", value = "notificationdb" },
      { name = "JWT_SECRET",           value = var.jwt_secret },
      { name = "MAIL_HOST",            value = "smtp.gmail.com" },
      { name = "MAIL_PORT",            value = "587" },
      { name = "MAIL_USERNAME",        value = var.mail_username },
      { name = "MAIL_PASSWORD",        value = var.mail_password },
      { name = "ALERT_RECIPIENTS",     value = var.alert_recipients },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.notification.address}:3306/notificationdb?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
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
  desired_count                     = 1
  health_check_grace_period_seconds = 180

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
    image     = "${local.ecr_base}/reporting-service:latest"
    essential = true
    portMappings = [{ containerPort = 8084, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",           value = var.db_username },
      { name = "DB_PASS",           value = var.db_password },
      { name = "INVENTORY_DB_NAME", value = "inventorydb" },
      { name = "JWT_SECRET",        value = var.jwt_secret },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.inventory.address}:3306/inventorydb?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
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
  desired_count                     = 1
  health_check_grace_period_seconds = 180

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
    image     = "${local.ecr_base}/supplier-service:latest"
    essential = true
    portMappings = [{ containerPort = 8085, protocol = "tcp" }]
    environment = [
      { name = "DB_USER",          value = var.db_username },
      { name = "DB_PASS",          value = var.db_password },
      { name = "SUPPLIER_DB_NAME", value = "supplierdb" },
      { name = "JWT_SECRET",       value = var.jwt_secret },
      { name = "spring.datasource.url",
        value = "jdbc:mysql://${aws_db_instance.supplier.address}:3306/supplierdb?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC" },
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
  desired_count                     = 1
  health_check_grace_period_seconds = 180

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
    image     = "${local.ecr_base}/frontend:latest"
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
