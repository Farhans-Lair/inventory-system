# ═══════════════════════════════════════════════════════════════════════════
# rds.tf — one RDS MySQL instance per bounded context
#
# deletion_protection = true  (compliance / governance requirement)
#
# Two destroy provisioners per instance:
#   1. Disable deletion protection via AWS CLI
#   2. Wait for the change to propagate before Terraform deletes
#
# On terraform destroy this runs automatically — no Console steps needed.
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

  provisioner "local-exec" {
    when    = destroy
    command = "aws rds modify-db-instance --db-instance-identifier ${self.identifier} --deletion-protection false --apply-immediately --region ${var.aws_region}"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "aws rds wait db-instance-available --db-instance-identifier ${self.identifier} --region ${var.aws_region}"
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

  provisioner "local-exec" {
    when    = destroy
    command = "aws rds modify-db-instance --db-instance-identifier ${self.identifier} --deletion-protection false --apply-immediately --region ${var.aws_region}"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "aws rds wait db-instance-available --db-instance-identifier ${self.identifier} --region ${var.aws_region}"
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

  provisioner "local-exec" {
    when    = destroy
    command = "aws rds modify-db-instance --db-instance-identifier ${self.identifier} --deletion-protection false --apply-immediately --region ${var.aws_region}"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "aws rds wait db-instance-available --db-instance-identifier ${self.identifier} --region ${var.aws_region}"
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

  provisioner "local-exec" {
    when    = destroy
    command = "aws rds modify-db-instance --db-instance-identifier ${self.identifier} --deletion-protection false --apply-immediately --region ${var.aws_region}"
  }

  provisioner "local-exec" {
    when    = destroy
    command = "aws rds wait db-instance-available --db-instance-identifier ${self.identifier} --region ${var.aws_region}"
  }
}
