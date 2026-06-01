# ═══════════════════════════════════════════════════════════════════════════
# outputs.tf — useful values printed after terraform apply
# ═══════════════════════════════════════════════════════════════════════════

output "alb_dns" {
  description = "Public URL of the Application Load Balancer"
  value       = "http://${aws_lb.main.dns_name}"
}

output "ecr_push_commands" {
  description = "Commands to authenticate and push all images to ECR"
  value = {
    login        = "aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${local.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
    auth_service = "docker build -t ${aws_ecr_repository.services["auth-service"].repository_url}:latest ./auth-service && docker push ${aws_ecr_repository.services["auth-service"].repository_url}:latest"
    inventory    = "docker build -t ${aws_ecr_repository.services["inventory-service"].repository_url}:latest ./inventory-service && docker push ${aws_ecr_repository.services["inventory-service"].repository_url}:latest"
    notification = "docker build -t ${aws_ecr_repository.services["notification-service"].repository_url}:latest ./notification-service && docker push ${aws_ecr_repository.services["notification-service"].repository_url}:latest"
    reporting    = "docker build -t ${aws_ecr_repository.services["reporting-service"].repository_url}:latest ./reporting-service && docker push ${aws_ecr_repository.services["reporting-service"].repository_url}:latest"
    supplier     = "docker build -t ${aws_ecr_repository.services["supplier-service"].repository_url}:latest ./supplier-service && docker push ${aws_ecr_repository.services["supplier-service"].repository_url}:latest"
    frontend     = "docker build -t ${aws_ecr_repository.services["frontend"].repository_url}:latest ./frontend/shell && docker push ${aws_ecr_repository.services["frontend"].repository_url}:latest"
  }
}

output "rds_endpoints" {
  description = "RDS MySQL endpoints (sensitive)"
  sensitive   = true
  value = {
    auth         = aws_db_instance.auth.address
    inventory    = aws_db_instance.inventory.address
    notification = aws_db_instance.notification.address
    supplier     = aws_db_instance.supplier.address
  }
}

output "ecs_cluster" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "s3_image_bucket" {
  description = "S3 bucket name for product images"
  value       = aws_s3_bucket.images.id
}

output "cloudwatch_logs" {
  description = "CloudWatch log group paths for each service"
  value = {
    for name, _ in local.services :
    name => "/ecs/${local.prefix}/${name}"
  }
}

output "https_next_steps" {
  description = "Steps to add HTTPS after deploying"
  value = <<-EOT
    1. Request a certificate in ACM:
       aws acm request-certificate --domain-name your-domain.com --validation-method DNS --region ${var.aws_region}

    2. Add HTTPS listener to ALB (in alb.tf):
       resource "aws_lb_listener" "https" {
         load_balancer_arn = aws_lb.main.arn
         port              = 443
         protocol          = "HTTPS"
         ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
         certificate_arn   = "<YOUR_ACM_CERT_ARN>"
         default_action { type = "forward"; target_group_arn = aws_lb_target_group.frontend.arn }
       }

    3. Set COOKIE_SECURE=true in terraform.tfvars and re-run terraform apply.

    4. Point your domain A record to: ${aws_lb.main.dns_name}
  EOT
}
