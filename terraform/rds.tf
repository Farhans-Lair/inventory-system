# ═══════════════════════════════════════════════════════════════════════════
# rds.tf — single shared RDS MySQL instance, one schema per service
#
# COST CHANGE: previously 4 separate db.t3.micro instances (auth, inventory,
# notification, supplier) — each billed 24/7 with its own storage, backups,
# and monitoring overhead, on top of reporting-service which already reads
# directly from the inventory schema. Consolidated to ONE instance with 4
# schemas, each created on first connect via createDatabaseIfNotExist=true
# in the JDBC URL. This is the right tradeoff at this project's traffic
# scale — true per-service DB isolation matters more once you have
# production load where one service's queries could starve another's
# connection pool. If/when that becomes a real constraint, splitting back
# out is a matter of re-adding aws_db_instance resources and migrating
# schemas with mysqldump.
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

# Single shared instance for all 4 schemas (authdb, inventorydb,
# notificationdb, supplierdb). Sized one tier up from db.t3.micro since it
# now serves what was previously spread across 4 instances — still far
# cheaper than running 4 separate instances around the clock.
resource "aws_db_instance" "shared" {
  identifier              = "${local.prefix}-shared-db"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  allocated_storage       = 30
  max_allocated_storage   = 300
  # No single db_name — each service creates its own schema on first
  # connect via createDatabaseIfNotExist=true in its JDBC URL (see ecs.tf).
  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  parameter_group_name    = aws_db_parameter_group.mysql8.name
  skip_final_snapshot     = false
  final_snapshot_identifier = "${local.prefix}-shared-db-final-snapshot"
  backup_retention_period = 7       # 7 days of automated daily backups + PITR (free up to 100% of DB size)
  deletion_protection     = true    # Prevents accidental terraform destroy from wiping data
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-shared-db" }
}
