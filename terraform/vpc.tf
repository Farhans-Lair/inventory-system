# ═══════════════════════════════════════════════════════════════════════════
# vpc.tf — VPC, subnets, routing
# ═══════════════════════════════════════════════════════════════════════════

# ── Availability zones ─────────────────────────────────────────────────────
data "aws_availability_zones" "available" { state = "available" }

# ── VPC ────────────────────────────────────────────────────────────────────
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "${local.prefix}-vpc" }
}

# ── Public subnets (ALB lives here) ───────────────────────────────────────
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags = { Name = "${local.prefix}-public-${count.index + 1}" }
}

# ── Private subnets (ECS tasks + RDS live here) ────────────────────────────
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags = { Name = "${local.prefix}-private-${count.index + 1}" }
}

# ── Internet Gateway (public subnets) ─────────────────────────────────────
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.prefix}-igw" }
}

# ── Elastic IP + single NAT Gateway ─────────────────────────────────────────
# COST TRADEOFF: one NAT Gateway (in public subnet AZ #1) instead of one per AZ.
# Saves ~half the NAT Gateway hourly charge plus data processing fees, at the
# cost of: if that AZ has an outage, private-subnet egress (ECR pulls, outbound
# mail, etc.) breaks for BOTH private subnets, not just one. For a project at
# this traffic scale that's an acceptable tradeoff; for production-grade
# multi-AZ resilience, revert to one NAT GW per AZ (see git history).
resource "aws_eip" "nat" {
  domain = "vpc"
  tags   = { Name = "${local.prefix}-eip-nat" }
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  tags          = { Name = "${local.prefix}-nat" }
  depends_on    = [aws_internet_gateway.main]
}

# ── Route table — public ───────────────────────────────────────────────────
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${local.prefix}-rt-public" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# ── Route table — private (single table, both AZs route through the one NAT) ─
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main.id
  }
  tags = { Name = "${local.prefix}-rt-private" }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}
