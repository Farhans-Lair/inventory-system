terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}

# ── Variables ──────────────────────────────────────────────────────────────
variable "jwt_secret" {
  default = "aW52ZW50b3J5TWFuYWdlbWVudFN5c3RlbVNlY3JldEtleUZvckhTMjU2QWxnb3JpdGhtMjAyNA=="
}
variable "mail_username"    { default = "" }
variable "mail_password"    { default = "" }
variable "alert_recipients" { default = "" }

# ── Network ────────────────────────────────────────────────────────────────
resource "docker_network" "inventory_net" {
  name = "inventory-net"
}

# ── Images ─────────────────────────────────────────────────────────────────
resource "docker_image" "mysql" { name = "mysql:8.0" }

# ── Volumes ────────────────────────────────────────────────────────────────
resource "docker_volume" "auth_db_data"         { name = "auth-db-data" }
resource "docker_volume" "inventory_db_data"    { name = "inventory-db-data" }
resource "docker_volume" "notification_db_data" { name = "notification-db-data" }
resource "docker_volume" "supplier_db_data"     { name = "supplier-db-data" }

# ── auth-db ────────────────────────────────────────────────────────────────
resource "docker_container" "auth_db" {
  name  = "auth-db"
  image = docker_image.mysql.image_id
  networks_advanced { name = docker_network.inventory_net.name }
  ports { internal = 3306; external = 3307 }
  env   = ["MYSQL_ROOT_PASSWORD=root", "MYSQL_DATABASE=authdb"]
  volumes { volume_name = docker_volume.auth_db_data.name; container_path = "/var/lib/mysql" }
}

# ── inventory-db ───────────────────────────────────────────────────────────
resource "docker_container" "inventory_db" {
  name  = "inventory-db"
  image = docker_image.mysql.image_id
  networks_advanced { name = docker_network.inventory_net.name }
  ports { internal = 3306; external = 3308 }
  env   = ["MYSQL_ROOT_PASSWORD=root", "MYSQL_DATABASE=inventorydb"]
  volumes { volume_name = docker_volume.inventory_db_data.name; container_path = "/var/lib/mysql" }
}

# ── notification-db ────────────────────────────────────────────────────────
resource "docker_container" "notification_db" {
  name  = "notification-db"
  image = docker_image.mysql.image_id
  networks_advanced { name = docker_network.inventory_net.name }
  ports { internal = 3306; external = 3309 }
  env   = ["MYSQL_ROOT_PASSWORD=root", "MYSQL_DATABASE=notificationdb"]
  volumes { volume_name = docker_volume.notification_db_data.name; container_path = "/var/lib/mysql" }
}

# ── supplier-db ────────────────────────────────────────────────────────────
resource "docker_container" "supplier_db" {
  name  = "supplier-db"
  image = docker_image.mysql.image_id
  networks_advanced { name = docker_network.inventory_net.name }
  ports { internal = 3306; external = 3310 }
  env   = ["MYSQL_ROOT_PASSWORD=root", "MYSQL_DATABASE=supplierdb"]
  volumes { volume_name = docker_volume.supplier_db_data.name; container_path = "/var/lib/mysql" }
}

# ── Outputs ────────────────────────────────────────────────────────────────
output "services" {
  value = {
    auth_service         = "http://localhost:8081"
    inventory_service    = "http://localhost:8082"
    notification_service = "http://localhost:8083"
    reporting_service    = "http://localhost:8084"
    supplier_service     = "http://localhost:8085"
    frontend             = "http://localhost:3000"
  }
}
