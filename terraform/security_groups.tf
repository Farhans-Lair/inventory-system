# ═══════════════════════════════════════════════════════════════════════════
# security_groups.tf - firewall rules for every component
# ═══════════════════════════════════════════════════════════════════════════

# ── ALB: accepts HTTP(S) from the internet ─────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${local.prefix}-sg-alb"
  description = "ALB - inbound HTTP/HTTPS from internet"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── ECS tasks: only accept traffic from the ALB, only on the ports the ─────
# services actually listen on. Each service exposes exactly one container
# port (80 for frontend, 8081-8085 for the backend services) — opening the
# full 0-65535 range gave the ALB (and every other task) reachability to any
# port a container might ever bind, intentionally or not. Scoping this down
# means an unexpected listener inside a container is not reachable at all.
resource "aws_security_group" "ecs" {
  name        = "${local.prefix}-sg-ecs"
  description = "ECS tasks - inbound from ALB only, scoped to service ports"
  vpc_id      = aws_vpc.main.id

  dynamic "ingress" {
    for_each = local.service_ports
    content {
      description     = "${ingress.key} from ALB"
      from_port       = ingress.value
      to_port         = ingress.value
      protocol        = "tcp"
      security_groups = [aws_security_group.alb.id]
    }
  }

  # Allow ECS tasks to talk to each other on service ports only
  # (notification-service alerts are triggered by inventory-service).
  dynamic "ingress" {
    for_each = local.service_ports
    content {
      description = "${ingress.key} inter-service"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      self        = true
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── RDS: only accept connections from ECS tasks ───────────────────────────
resource "aws_security_group" "rds" {
  name        = "${local.prefix}-sg-rds"
  description = "RDS MySQL - inbound from ECS tasks only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from ECS"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
