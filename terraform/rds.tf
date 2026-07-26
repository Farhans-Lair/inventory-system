
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

resource "aws_db_instance" "shared" {
  identifier              = "${local.prefix}-shared-db"
  engine                  = "mysql"
  engine_version          = "8.0"
  instance_class          = var.db_instance_class
  allocated_storage       = 30
  max_allocated_storage   = 300

  username                = var.db_username
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  parameter_group_name    = aws_db_parameter_group.mysql8.name
  skip_final_snapshot     = false
  final_snapshot_identifier = "${local.prefix}-shared-db-final-snapshot"
  backup_retention_period = 7
  deletion_protection     = true
  storage_encrypted       = true
  multi_az                = false
  tags                    = { Name = "${local.prefix}-shared-db" }
}

resource "aws_db_instance" "reporting_replica" {
  identifier              = "${local.prefix}-reporting-replica"
  replicate_source_db     = aws_db_instance.shared.identifier
  instance_class          = var.db_instance_class
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = false
  skip_final_snapshot     = true
  storage_encrypted       = true
  tags                    = { Name = "${local.prefix}-reporting-replica" }
}
