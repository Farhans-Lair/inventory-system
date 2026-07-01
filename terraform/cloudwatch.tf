# ═══════════════════════════════════════════════════════════════════════════
# cloudwatch.tf — application-level alarms
#
# All alarms below send to an SNS topic. Set the email variable in
# terraform.tfvars to receive email notifications. The first 10 alarms are
# free; beyond that it's $0.10/alarm/month — this file defines 8 alarms,
# staying in the free tier.
# ═══════════════════════════════════════════════════════════════════════════

variable "alarm_email" {
  description = "Email address for CloudWatch alarm notifications (leave blank to skip)"
  default     = ""
}

resource "aws_sns_topic" "alarms" {
  name = "${local.prefix}-alarms"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alarm_email != "" ? 1 : 0
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ── 1. ALB 5xx error rate ─────────────────────────────────────────────────
# Fires when more than 10 server-side errors occur in any 5-minute window.
# Most useful alarm in the set — catches broken deployments instantly.
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${local.prefix}-alb-5xx-high"
  alarm_description   = "ALB is returning 5xx errors — backend service may be down or crashing"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 10
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# ── 2. ALB 4xx error rate ─────────────────────────────────────────────────
# Spikes here often indicate a broken frontend build or CORS misconfiguration.
resource "aws_cloudwatch_metric_alarm" "alb_4xx" {
  alarm_name          = "${local.prefix}-alb-4xx-high"
  alarm_description   = "ALB 4xx rate is high — possible bad request flood or misconfiguration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_4XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 100
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# ── 3. ALB target response time (latency) ────────────────────────────────
# P95 latency > 3 seconds means users are experiencing slow responses.
resource "aws_cloudwatch_metric_alarm" "alb_latency" {
  alarm_name          = "${local.prefix}-alb-latency-high"
  alarm_description   = "ALB P95 response time > 3s — backend service may be under load or hanging"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  extended_statistic  = "p95"
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  threshold           = 3
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  dimensions = {
    LoadBalancer = aws_lb.main.arn_suffix
  }
}

# ── 4. RDS CPU ────────────────────────────────────────────────────────────
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${local.prefix}-rds-cpu-high"
  alarm_description   = "RDS CPU > 80% — consider query optimisation or instance upgrade"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 120
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.shared.identifier
  }
}

# ── 5. RDS connection count ───────────────────────────────────────────────
# db.t3.small max_connections ≈ 150. Alarm at 120 gives you early warning.
resource "aws_cloudwatch_metric_alarm" "rds_connections" {
  alarm_name          = "${local.prefix}-rds-connections-high"
  alarm_description   = "RDS connection count > 120 — approaching db.t3.small limit of ~150"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = 120
  statistic           = "Average"
  threshold           = 120
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.shared.identifier
  }
}

# ── 6. RDS free storage ───────────────────────────────────────────────────
# Alarm when less than 5GB remains (out of 30GB allocated + 300GB autoscaling).
resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${local.prefix}-rds-storage-low"
  alarm_description   = "RDS free storage < 5GB — autoscaling should kick in, but verify"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000   # 5 GB in bytes
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.shared.identifier
  }
}

# ── 7. ECS service task count (auth-service) ─────────────────────────────
# Fires if the number of running tasks drops below desired. Catches
# crash-loops, OOM kills, and failed deployments that don't self-heal.
resource "aws_cloudwatch_metric_alarm" "ecs_tasks_auth" {
  alarm_name          = "${local.prefix}-ecs-auth-tasks-low"
  alarm_description   = "auth-service running task count < 1 — service may be crashing"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RunningTaskCount"
  namespace           = "ECS/ContainerInsights"
  period              = 60
  statistic           = "Average"
  threshold           = 1
  treat_missing_data  = "breaching"   # missing = bad; task is probably gone
  alarm_actions       = [aws_sns_topic.alarms.arn]
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = "${local.prefix}-auth"
  }
}

# ── 8. WAF blocked requests ───────────────────────────────────────────────
# Spike here means an active attack is being blocked — worth knowing about.
resource "aws_cloudwatch_metric_alarm" "waf_blocked" {
  alarm_name          = "${local.prefix}-waf-blocks-high"
  alarm_description   = "WAF blocked > 50 requests in 5 minutes — possible active attack on auth endpoints"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "BlockedRequests"
  namespace           = "AWS/WAFV2"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
  dimensions = {
    WebACL = aws_wafv2_web_acl.main.name
    Region = var.aws_region
    Rule   = "RateLimitAuthEndpoints"
  }
}

output "sns_alarm_topic" {
  description = "SNS topic ARN for CloudWatch alarms — subscribe additional endpoints here"
  value       = aws_sns_topic.alarms.arn
}
