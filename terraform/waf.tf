# ═══════════════════════════════════════════════════════════════════════════
# waf.tf — AWS WAF v2 rate-based rule on the ALB
#
# Scope: REGIONAL (ALB, not CloudFront). One Web ACL with a single
# rate-based rule targeting /api/auth/* endpoints. This is the minimal,
# ~$6/month configuration — just the rate limiter, no managed rule groups.
#
# What it protects:
#   - OTP brute-force (signup / login / forgot-password all require OTP)
#   - Password spray / credential stuffing against /api/auth/login
#   - Token endpoint abuse against /api/auth/refresh
#
# The 100-request-per-5-minute limit per IP is deliberately generous for
# legitimate use (a human can't click that fast) but tight enough to stop
# automated attacks. Adjust threshold as traffic grows.
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_wafv2_web_acl" "main" {
  name  = "${local.prefix}-waf"
  scope = "REGIONAL"   # must be REGIONAL for ALB (use CLOUDFRONT for CF distributions)

  default_action {
    allow {}   # allow all traffic by default; rules below only block when triggered
  }

  # ── Rate-limit: /api/auth/* ───────────────────────────────────────────
  # Blocks any single IP that sends more than 100 requests to /api/auth/*
  # within any 5-minute sliding window. Unblocks automatically once the
  # request rate drops below the threshold.
  rule {
    name     = "RateLimitAuthEndpoints"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 100
        aggregate_key_type = "IP"

        scope_down_statement {
          byte_match_statement {
            search_string         = "/api/auth/"
            positional_constraint = "STARTS_WITH"
            field_to_match {
              uri_path {}
            }
            text_transformation {
              priority = 0
              type     = "LOWERCASE"
            }
          }
        }
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${local.prefix}-rate-limit-auth"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.prefix}-waf"
    sampled_requests_enabled   = true
  }

  tags = { Name = "${local.prefix}-waf" }
}

# Attach the Web ACL to the ALB
resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}

# ── Logging: WAF blocked requests → CloudWatch Logs ─────────────────────
# Captures every blocked request with IP, path, and rule name — useful
# for investigating attacks. Log group name MUST start with
# "aws-waf-logs-" (AWS requirement).
resource "aws_cloudwatch_log_group" "waf" {
  name              = "aws-waf-logs-${local.prefix}"
  retention_in_days = 30
}

resource "aws_wafv2_web_acl_logging_configuration" "main" {
  log_destination_configs = [aws_cloudwatch_log_group.waf.arn]
  resource_arn            = aws_wafv2_web_acl.main.arn
}
