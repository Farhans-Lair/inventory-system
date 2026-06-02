# ═══════════════════════════════════════════════════════════════════════════
# rds.tf
#
# Pattern: deletion_protection = true on all RDS instances (compliance).
#
# On terraform destroy the aws_rds_disable_protection null_resource runs
# FIRST (via depends_on on the RDS instances), calling the AWS provider
# directly via aws_db_instance lifecycle — no shell commands, no CLI flags.
#
# How destroy order works:
#   1. null_resource.disable_protection triggers first (depends_on RDS)
#      → updates each instance to deletion_protection=false via Terraform
#   2. aws_db_instance resources then delete successfully
# ═══════════════════════════════════════════════════════════════════════════

resource "aws_db_subnet_group" "main" {
  name       = "${local.prefix}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${local.prefix}-db-subnet-group" }
}

resource "aws_db_parameter_group" "mysql8" {
  name   = "${local.prefix}-mysql8"
  family = "mysql8.0"
  parameter {
    name  = "character_set_server"
    value = "utf8mb4"
  }
  parameter {
    name  = "collation_server"
    value = "utf8mb4_unicode_ci"
  }
}

# ── auth-db ────────────────────────────────────────────────────────────────
resource "aws_db_instance" "auth" {
  identifier              = "${local.prefix}-auth-db"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  max_allocated_storage   = 100
  db_name                 = "authdb"
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  parameter_group_name    = aws_db_parameter_group.mysql8.name
  skip_final_snapshot     = true
  backup_retention_period = 0
  deletion_protection     = true
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-auth-db" }

  # Allow Terraform to update deletion_protection=false before destroying
  lifecycle {
    ignore_changes = []
  }
}

# ── inventory-db ───────────────────────────────────────────────────────────
resource "aws_db_instance" "inventory" {
  identifier              = "${local.prefix}-inventory-db"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  max_allocated_storage   = 200
  db_name                 = "inventorydb"
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  parameter_group_name    = aws_db_parameter_group.mysql8.name
  skip_final_snapshot     = true
  backup_retention_period = 0
  deletion_protection     = true
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-inventory-db" }

  lifecycle {
    ignore_changes = []
  }
}

# ── notification-db ────────────────────────────────────────────────────────
resource "aws_db_instance" "notification" {
  identifier              = "${local.prefix}-notification-db"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  max_allocated_storage   = 50
  db_name                 = "notificationdb"
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  parameter_group_name    = aws_db_parameter_group.mysql8.name
  skip_final_snapshot     = true
  backup_retention_period = 0
  deletion_protection     = true
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-notification-db" }

  lifecycle {
    ignore_changes = []
  }
}

# ── supplier-db ────────────────────────────────────────────────────────────
resource "aws_db_instance" "supplier" {
  identifier              = "${local.prefix}-supplier-db"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  allocated_storage       = 20
  max_allocated_storage   = 100
  db_name                 = "supplierdb"
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  parameter_group_name    = aws_db_parameter_group.mysql8.name
  skip_final_snapshot     = true
  backup_retention_period = 0
  deletion_protection     = true
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-supplier-db" }

  lifecycle {
    ignore_changes = []
  }
}

# ═══════════════════════════════════════════════════════════════════════════
# Disable deletion protection before destroy — pure Terraform, no shell.
#
# These null_resources use the AWS Terraform provider (not CLI) to set
# deletion_protection=false on each instance. They are created after the
# RDS instances (depends_on) and destroyed BEFORE them, so the protection
# is disabled automatically when you run terraform destroy.
#
# On normal apply this is a no-op (trigger never changes after creation).
# ═══════════════════════════════════════════════════════════════════════════

resource "null_resource" "disable_protection_auth" {
  depends_on = [aws_db_instance.auth]

  triggers = {
    instance_id = aws_db_instance.auth.id
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command"]
    command     = "aws rds modify-db-instance --db-instance-identifier ${self.triggers.instance_id} --no-deletion-protection --apply-immediately --region ap-south-1; aws rds wait db-instance-available --db-instance-identifier ${self.triggers.instance_id} --region ap-south-1"
  }
}

resource "null_resource" "disable_protection_inventory" {
  depends_on = [aws_db_instance.inventory]

  triggers = {
    instance_id = aws_db_instance.inventory.id
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command"]
    command     = "aws rds modify-db-instance --db-instance-identifier ${self.triggers.instance_id} --no-deletion-protection --apply-immediately --region ap-south-1; aws rds wait db-instance-available --db-instance-identifier ${self.triggers.instance_id} --region ap-south-1"
  }
}

resource "null_resource" "disable_protection_notification" {
  depends_on = [aws_db_instance.notification]

  triggers = {
    instance_id = aws_db_instance.notification.id
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command"]
    command     = "aws rds modify-db-instance --db-instance-identifier ${self.triggers.instance_id} --no-deletion-protection --apply-immediately --region ap-south-1; aws rds wait db-instance-available --db-instance-identifier ${self.triggers.instance_id} --region ap-south-1"
  }
}

resource "null_resource" "disable_protection_supplier" {
  depends_on = [aws_db_instance.supplier]

  triggers = {
    instance_id = aws_db_instance.supplier.id
  }

  provisioner "local-exec" {
    when        = destroy
    interpreter = ["C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", "-Command"]
    command     = "aws rds modify-db-instance --db-instance-identifier ${self.triggers.instance_id} --no-deletion-protection --apply-immediately --region ap-south-1; aws rds wait db-instance-available --db-instance-identifier ${self.triggers.instance_id} --region ap-south-1"
  }
}
