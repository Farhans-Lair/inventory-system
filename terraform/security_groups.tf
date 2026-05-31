# ═══════════════════════════════════════════════════════════════════════════
# security_groups.tf — firewall rules for every component
# ═══════════════════════════════════════════════════════════════════════════

# ── ALB: accepts HTTP(S) from the internet ─────────────────────────────────
resource "aws_security_group" "alb" {
  name        = "${local.prefix}-sg-alb"
  description = "ALB — inbound HTTP/HTTPS from internet"
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

# ── ECS tasks: only accept traffic from the ALB ───────────────────────────
resource "aws_security_group" "ecs" {
  name        = "${local.prefix}-sg-ecs"
  description = "ECS tasks — inbound from ALB only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "All ports from ALB"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }
  # Allow ECS tasks to talk to each other (for notification alerts)
  ingress {
    description = "Inter-service"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
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
  description = "RDS MySQL — inbound from ECS tasks only"
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
