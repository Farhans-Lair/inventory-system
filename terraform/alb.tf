# ═══════════════════════════════════════════════════════════════════════════
# alb.tf — Application Load Balancer with path-based routing
# Mirrors exactly what nginx.conf does in the Docker setup
# ═══════════════════════════════════════════════════════════════════════════

# ── ALB ────────────────────────────────────────────────────────────────────
resource "aws_lb" "main" {
  name               = "${local.prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id
  tags               = { Name = "${local.prefix}-alb" }
}

# ── Target groups (one per service) ───────────────────────────────────────
resource "aws_lb_target_group" "frontend" {
  name        = "${local.prefix}-tg-frontend"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
  }
}

resource "aws_lb_target_group" "auth" {
  name        = "${local.prefix}-tg-auth"
  port        = 8081
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/actuator/health/readiness"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "inventory" {
  name        = "${local.prefix}-tg-inventory"
  port        = 8082
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/actuator/health/readiness"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "notification" {
  name        = "${local.prefix}-tg-notification"
  port        = 8083
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/actuator/health/readiness"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "reporting" {
  name        = "${local.prefix}-tg-reporting"
  port        = 8084
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/actuator/health/readiness"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }
}

resource "aws_lb_target_group" "supplier" {
  name        = "${local.prefix}-tg-supplier"
  port        = 8085
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check {
    path                = "/actuator/health/readiness"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    timeout             = 10
    matcher             = "200"
  }
}

# ── HTTP listener with path-based rules ───────────────────────────────────
# (Add HTTPS listener after ACM cert is issued — see outputs.tf)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Default → frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# auth-service paths: /api/auth/* and /api/users*
resource "aws_lb_listener_rule" "auth" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 10
  condition {
    path_pattern { values = ["/api/auth/*", "/api/users*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.auth.arn
  }
}

# inventory-service paths
resource "aws_lb_listener_rule" "inventory" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 20
  condition {
    path_pattern {
      values = [
        "/api/products*",
        "/api/locations*",
        "/api/stock*",
        "/api/batch-lots*",
        "/api/cycle-counts*",
      ]
    }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.inventory.arn
  }
}

# notification-service paths
resource "aws_lb_listener_rule" "notification" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 30
  condition {
    path_pattern { values = ["/api/notifications*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.notification.arn
  }
}

# reporting-service paths
resource "aws_lb_listener_rule" "reporting" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 40
  condition {
    path_pattern { values = ["/api/reports*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.reporting.arn
  }
}

# supplier-service paths
resource "aws_lb_listener_rule" "supplier" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 50
  condition {
    path_pattern { values = ["/api/suppliers*", "/api/purchase-orders*"] }
  }
  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.supplier.arn
  }
}
