# InventoryMS

A production-style microservices inventory management system built as a portfolio and learning project. The goal was to demonstrate real-world AWS architecture, CI/CD, and full-stack engineering skills — not a toy CRUD app, but a system that works through real distributed-systems problems: RBAC, tab-isolated JWT auth, Module Federation micro-frontends, infrastructure hardening, observability, and deployment automation.

## Live deployment

The app runs on AWS ECS in `ap-south-1` (Mumbai), fronted by an Application Load Balancer:

```
http://<project>-<environment>-alb-<id>.ap-south-1.elb.amazonaws.com/
```

> **Note on HTTPS:** The ALB currently only listens on HTTP (port 80). Adding HTTPS requires a custom domain and an ACM certificate — AWS will not issue a TLS certificate for the raw `*.elb.amazonaws.com` hostname. Since registering a domain incurs cost, HTTP is used for this portfolio project. The infrastructure is ready for HTTPS: once a domain is pointed at the ALB, adding an ACM certificate and an HTTPS listener is a one-time Terraform change.

---

## Architecture

```
                       ┌─────────────────────────────────┐
                       │    Application Load Balancer      │
                       │  + WAF (rate-limit /api/auth/*)   │
                       └──────────────┬───────────────────┘
       ┌──────────────┬───────────────┼───────────────┬──────────────┐
  /api/auth/*   /api/products,   /api/notifications /api/reports  /api/suppliers,
  /api/users*   /api/locations,                                    /api/purchase-orders
                /api/stock,
                /api/batch-lots,
                /api/cycle-counts
       ▼              ▼               ▼               ▼              ▼
  auth-service  inventory-service  notification-  reporting-    supplier-service
    :8081            :8082         service :8083  service :8084     :8085
       │              │               │               │              │
       └──────────────┴───────────────┴───────┬───────┴──────────────┘
                                               ▼
                              ONE shared RDS MySQL instance
                        (authdb · inventorydb · notificationdb · supplierdb)

           default route ──▶ frontend shell + 5 Module Federation MFEs
```

`reporting-service` reads directly from `inventorydb` (read-only). It has no schema of its own. `notification-service` is internal-only — called by `inventory-service` when stock thresholds are breached; it is never called from the frontend.

---

## Services overview

| Service | Port | Schema | Description |
|---|---|---|---|
| auth-service | 8081 | authdb | JWT issuance, OTP 2FA, refresh-token rotation, password reset, user management, admin bootstrap |
| inventory-service | 8082 | inventorydb | Products, locations, stock levels, movements, reservations, batch/lot tracking, cycle counts, UoM rules |
| notification-service | 8083 | notificationdb | Email/webhook alerts for low-stock, out-of-stock, and overstock events |
| reporting-service | 8084 | inventorydb (read-only) | Stock valuation, movement trends, CSV export |
| supplier-service | 8085 | supplierdb | Suppliers, purchase orders, GRN (goods receipt with real stock integration) |
| frontend (shell) | 80 | — | React shell + 5 Module Federation micro-frontends served by nginx |

All backend services follow a DDD four-layer structure: `domain → application → infrastructure → interfaces`.

---

## Authentication and session model

Each browser **tab** maintains its own independent session:

- **Access token** — stored in `sessionStorage`, sent as `Authorization: Bearer <token>`. Tab-scoped: logging in on one tab never affects another tab, even for the same browser.
- **Refresh token** — stored in an HttpOnly cookie (`path=/api/auth/`), rotated on every use. Never accessible to JavaScript.
- On a 401, the axios interceptor silently refreshes and retries the original request.
- Unauthenticated requests return **401** (not 403), handled by a dedicated `AuthenticationEntryPoint`.

### Roles and admin bootstrap

Three roles: `ADMIN`, `WAREHOUSE_MANAGER`, `STAKEHOLDER`.

- The signup page calls `GET /api/auth/admin-exists` (unauthenticated) on load. If no admin exists yet (fresh system), it shows the Administrator option so the first user can bootstrap the system. Once one admin exists, the option disappears from public signup permanently.
- A maximum of **2 admin accounts** can exist. After the first admin is created via public signup, all further admin accounts must be created by an existing admin through the Users panel.
- The backend enforces both rules independently of the UI — bypassing the frontend via direct API calls does not bypass the server-side checks.

---

## Module Federation

The frontend is a true micro-frontend setup — a shell app loads five independently-built remotes at runtime:

| MFE | Dev port | Owns |
|---|---|---|
| dashboardMfe | 3001 | Dashboard, trend charts |
| productsMfe | 3002 | Products, Locations, Batch/Lots, Cycle Counts, UoM Rules |
| stockMfe | 3003 | Stock Levels, Movements, Reservations |
| supplierMfe | 3004 | Suppliers, Purchase Orders, Goods Receipt |
| reportingMfe | 3005 | Reports, Users |

In production, all five MFEs are built with `base: '/mfe/<name>/'` and served from the shell's own nginx container — no separate containers at runtime.

**Auth context isolation:** Each MFE that needs authentication is exposed via a `*Federated.jsx` wrapper that re-supplies its own `AuthProvider`. Module Federation does not share React Context across remote boundaries, so the wrapper pattern is required to prevent `useAuth()` from returning stale defaults.

---

## Local development

```bash
# Start all services + MinIO (local S3) + MySQL
docker-compose up --build

# Shell
open http://localhost:3000
```

Docker Compose runs a **MinIO** container as an S3-compatible store for product images — no AWS credentials needed locally. The same code path talks to real S3 on ECS using the task IAM role (`DefaultCredentialsProvider`).

---

## AWS deployment

Infrastructure is provisioned with Terraform and applications are deployed via GitHub Actions on every push to `master`, or manually via `workflow_dispatch`.

### First-time setup

```bash
cd terraform
terraform init
terraform apply
```

### What Terraform provisions

- **VPC** — 2 AZs, public + private subnets, **1 NAT gateway** (one-per-AZ would double NAT cost; single NAT is an accepted trade-off for a portfolio project — the only impact is loss of outbound internet in the second AZ if the NAT's AZ goes down)
- **ALB** — path-based routing for all 5 backend services + default to frontend
- **WAF** — rate-based rule: 100 requests per 5 minutes per IP to `/api/auth/*`, blocking credential stuffing
- **ECS cluster** — EC2 launch type, `t3.large` instances, ECS Capacity Provider target tracking at `target_capacity=80`
- **RDS MySQL** — single `db.t3.small` instance, 7-day automated backup retention, deletion protection enabled

  > **Note on RDS Multi-AZ:** Multi-AZ is not enabled (`multi_az = false`). Enabling it would add a synchronous standby in the second AZ for automatic ~60s failover, but it also doubles RDS cost. For a portfolio project that can tolerate a short manual recovery window, single-AZ is an accepted trade-off.

- **ECR** — 6 repositories with **IMMUTABLE** image tags (each CI deploy pushes a new git-SHA-tagged image; re-pushing the same tag is rejected by design)
- **S3** — product images bucket (versioned, 30-day noncurrent expiry) + compliance reports bucket (versioned, no expiry) + VPC flow logs bucket (90-day expiry, Parquet format)
- **Secrets Manager** — `DB_PASS`, `JWT_SECRET`, `MAIL_PASSWORD`
- **CloudWatch alarms** — ALB 5xx rate, ALB 4xx rate, ALB P95 latency, RDS CPU, RDS connection count, RDS free storage, ECS auth-service task count, WAF blocked requests — all routing to an SNS topic (set `alarm_email` in `terraform.tfvars` to receive email alerts)
- **VPC Flow Logs** — all traffic (ACCEPT + REJECT) to S3 in Parquet format, 90-day retention
- **AWS X-Ray** — distributed tracing enabled across all 5 backend services via a non-blocking servlet filter (tracing failures never affect request handling)

### Terraform state

State is stored locally (`terraform.tfstate` in the `terraform/` directory). This is a deliberate choice for a solo portfolio project — local state is simpler and has no ongoing cost.

For team use or CI-managed infrastructure, the S3 backend is already written in `main.tf` (commented out). To enable it:

1. Create the state bucket:
```bash
aws s3api create-bucket \
  --bucket inventoryms-terraform-state \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

aws s3api put-bucket-versioning \
  --bucket inventoryms-terraform-state \
  --versioning-configuration Status=Enabled
```

2. Uncomment the `backend "s3"` block in `main.tf`
3. Run `terraform init -migrate-state`

> Terraform requires the S3 bucket to exist **before** `terraform init` — it cannot create the bucket on first run because it needs state storage to already be working. This chicken-and-egg problem is why local state is more practical for solo projects.

---

## CI/CD

`.github/workflows/deploy.yml` authenticates to AWS via **GitHub OIDC** (no long-lived AWS keys stored in GitHub), runs on `ubuntu-latest`, and:

- Detects which services changed per commit using `dorny/paths-filter` — only changed services are rebuilt and redeployed
- Builds a multi-stage Docker image per service using `maven:3.9-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine`
- Tags the image with the **git commit SHA** (not `:latest`) and pushes to ECR
- Fetches the current ECS task definition, swaps the container image to the new SHA, registers a new task definition revision, and deploys it — this is required for ECR IMMUTABLE tags since `:latest` can never be overwritten
- Supports `workflow_dispatch` with a `deploy_all` input to force a full redeploy of every service

---

## Database migrations

All four writable services use **Flyway** for schema management, replacing the previous `hibernate.ddl-auto=update`.

- `spring.jpa.hibernate.ddl-auto=none` — Hibernate no longer touches the schema
- `spring.flyway.baseline-on-migrate=true` — safe to apply to existing databases; Flyway records the current schema as the baseline without running V1 again
- Migration files live at `src/main/resources/db/migration/V1__Initial_schema.sql` per service
- Future schema changes go in `V2__*.sql`, `V3__*.sql`, etc.

`reporting-service` has no migrations — it connects to `inventorydb` in read-only mode and never modifies the schema.

---

## Caching

Two services use **Caffeine** in-process caching to reduce database load:

- `inventory-service` — `products` cache (30s TTL) on `ProductService.getAll()` and `StockService.getAllLevels()/getSummary()`, evicted on any write
- `reporting-service` — `valuation` cache (60s TTL) on `ReportingService.getStockValuation()`, read-only (no eviction needed)

---

## Report archival

Every CSV export is archived to S3 under a module-specific folder for compliance:

```
reports/inventory-service/products-export-<timestamp>.csv
reports/reporting-service/valuation-export-<timestamp>.csv
```

Archival is fire-and-forget — a failed S3 upload never blocks the user's download.

---

## Shared library

`shared-lib` is a Maven module providing `JwtUtil` (HS256 JWT sign/validate using JJWT 0.12.5). All three services that handle JWTs (`auth-service`, `inventory-service`, `supplier-service`) use this shared implementation via a `JwtConfig` bean, replacing three previously hand-copied `JwtTokenProvider` classes.

---

## Environment variables

| Variable | Service(s) | Description |
|---|---|---|
| `JWT_SECRET` | auth, inventory, supplier | Base64 HS256 signing key — must be identical across all three |
| `DB_PASS` | all 5 backend services | RDS MySQL password |
| `MAIL_USERNAME` | auth, notification | SMTP sender address |
| `MAIL_PASSWORD` | auth, notification | SMTP password |
| `ALERT_RECIPIENTS` | notification | Comma-separated alert email list |
| `NOTIFICATION_SERVICE_URL` | inventory | ALB DNS name in production; Docker Compose hostname locally |
| `INVENTORY_SERVICE_URL` | supplier | ALB DNS name in production; Docker Compose hostname locally |
| `REPORTS_BUCKET` | inventory, reporting | S3 bucket name for CSV archival |
| `AWS_REGION` | inventory, reporting | AWS region for S3 client |

In production, `JWT_SECRET`, `DB_PASS`, and `MAIL_PASSWORD` are stored in AWS Secrets Manager and injected into ECS task definitions at runtime. No secrets are stored in the repository or in ECR images.

---

## Infrastructure sizing rationale

**EC2 — 4 × `t3.large`:** Each instance provides 3 ENIs. With `awsvpc` networking, each ECS task consumes one ENI. Steady-state task count is 8 (`auth×2 + inventory×2 + notification×1 + reporting×1 + supplier×1 + frontend×1`). Formula: `(instances × 3 ENIs) − instances = available task slots`. 4 instances → 8 slots, exactly fitting 8 tasks. `auth-service` and `inventory-service` run `desired_count=2` so rolling deployments replace one task at a time without a service gap.

**RDS — `db.t3.small`:** Sized one tier above `db.t3.micro` to handle what was previously 4 separate database instances (one per service), now consolidated into a single shared instance with one schema each.

**NAT Gateway — 1:** A second NAT in the second AZ would give AZ-level redundancy for outbound internet but doubles the NAT cost for a risk that is statistically rare. Single NAT is the accepted trade-off for this project.
