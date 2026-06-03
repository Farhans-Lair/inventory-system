# ═══════════════════════════════════════════════════════════════════════════
# rds.tf — one RDS MySQL instance per bounded context
#
# deletion_protection = false (dev) — set true before going to production
#
# To destroy: run destroy.ps1 first, then terraform destroy
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
  deletion_protection     = false
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-auth-db" }
}

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
  deletion_protection     = false
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-inventory-db" }
}

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
  deletion_protection     = false
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-notification-db" }
}

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
  deletion_protection     = false
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-supplier-db" }
}
