# InventoryMS

*A production-style microservices inventory management system — portfolio and learning project demonstrating real-world AWS architecture, CI/CD automation, and full-stack distributed-systems engineering.*

Repository: `github.com/Farhans-Lair/inventory-system` &nbsp;|&nbsp; Region: AWS ap-south-1 (Mumbai) &nbsp;|&nbsp; Branch: `master`

---

## 1. Overview

InventoryMS addresses real distributed-systems concerns rather than a simple CRUD workflow: role-based access control, tab-isolated JWT authentication with refresh-token rotation, Module Federation micro-frontends, infrastructure hardening, observability, and deployment automation on AWS. The architecture and infrastructure choices reflect production engineering practices scoped to a cost-conscious deployment.

### Live deployment

The application runs on AWS ECS (EC2 launch type) in `ap-south-1`, fronted by an Application Load Balancer:

```
http://<project>-<environment>-alb-<id>.ap-south-1.elb.amazonaws.com/
```

> **Note on HTTPS:** HTTPS is optional and gated on a `domain_name` Terraform variable — when unset (the default), the ALB serves HTTP-only, since AWS will not issue an ACM certificate for a raw `*.elb.amazonaws.com` hostname and registering a domain incurs cost. When a domain is supplied, Terraform provisions an ACM certificate, Route 53 records, and an HTTPS listener automatically.

---

## 2. Architecture

Five independent Spring Boot microservices sit behind a single ALB with path-based routing, backed by one shared RDS MySQL instance using separate schemas per service. `reporting-service` reads `inventorydb` directly (read-only, via its own RDS read replica) and owns no schema of its own. `notification-service` is internal-only, invoked by `inventory-service` when stock thresholds are breached — it is never called from the frontend.

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
                              + dedicated read replica for reporting-service

           default route ──▶ frontend shell + 5 Module Federation MFEs
```

### Services overview

| Service | Port | Schema | Description |
|---|---|---|---|
| `auth-service` | 8081 | `authdb` | JWT issuance (session/access/refresh), OTP two-factor login & signup, refresh-token rotation with reuse detection, password reset, user management, 2-admin bootstrap |
| `inventory-service` | 8082 | `inventorydb` | Products, variants, locations, stock levels & movements, reservations, batch/lot tracking, cycle counts, UoM conversions, demand forecasting, barcode/QR, CSV import/export |
| `notification-service` | 8083 | `notificationdb` | Email/webhook alerts for low-stock, out-of-stock and overstock events; internal-only, called by `inventory-service` |
| `reporting-service` | 8084 | `inventorydb` (read-only, via RDS read replica) | Stock valuation, movement trend analytics, CSV export with S3 archival |
| `supplier-service` | 8085 | `supplierdb` | Suppliers, purchase orders, Goods Receipt Notes (GRN) with real stock-level integration into `inventory-service` |
| `frontend` (shell) | 80 | — | React shell + 5 Module Federation micro-frontends served by nginx |

All five backend services follow a strict Domain-Driven Design four-layer structure — `domain → application → infrastructure → interfaces` — with dependency direction enforced at the compiler level (inner layers never import outer layers).

---

## 3. Authentication & session model

Each browser **tab** maintains a fully independent session:

- **Access token** — stored in `sessionStorage`, sent as `Authorization: Bearer <token>`. Tab-scoped: logging in on one tab never affects another tab, even for the same user in the same browser.
- **Refresh token** — stored in an HttpOnly cookie scoped to `path=/api/auth/`, rotated on every use, with reuse detection: replaying an already-rotated-out refresh token revokes every session for that user, on the assumption the token has been compromised.
- **Three separate HS256 JWT secrets** — `JWT_SESSION_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — each bound to its own `JwtUtil` bean and a `"typ"` claim, so a token minted for one purpose is cryptographically rejected if replayed as another (defense-in-depth beyond just using different secrets).
- A short-lived **session token** (10-minute expiry) is issued when an OTP is first requested, and must be presented alongside the OTP on verify/reset — this proves the client actually completed the request-OTP step for that exact email and purpose before verification is accepted.
- On a 401, the shell's axios response interceptor silently calls `/api/auth/refresh` and retries the original request; concurrent 401s are queued so only one refresh call fires at a time.
- Unauthenticated requests return **401** (not 403) via a dedicated Spring Security `AuthenticationEntryPoint` — the axios interceptor only watches for 401, so this distinction is functionally load-bearing, not cosmetic.

### Roles & admin bootstrap

Three roles: `ADMIN`, `WAREHOUSE_MANAGER`, `STAKEHOLDER`.

- The signup page calls `GET /api/auth/admin-exists` (unauthenticated) on load. If no admin exists yet, the Administrator option is shown so the first user can bootstrap the system; once one admin exists, the option disappears from public signup permanently.
- A hard cap of **2 admin accounts** is enforced. After the first admin self-registers, every subsequent admin account must be created by an existing admin through the Users panel.
- Both rules are enforced server-side, independently of the UI — direct API calls cannot bypass them.

---

## 4. Frontend — Module Federation micro-frontends

The frontend is a true runtime micro-frontend architecture: a shell application loads five independently built and versioned remotes over the network, not at build time.

| MFE | Dev port | Owns |
|---|---|---|
| `dashboardMfe` | 3001 | Dashboard overview, summary tiles |
| `productsMfe` | 3002 | Products, Locations, Batch/Lots, Cycle Counts, UoM Rules |
| `stockMfe` | 3003 | Stock Levels, Movements, Reservations |
| `supplierMfe` | 3004 | Suppliers, Purchase Orders, Goods Receipt |
| `reportingMfe` | 3005 | Reports, Users (admin) |

In production, all five MFEs are built with `base: '/mfe/<name>/'` and served from the shell's own nginx container — there are no separate MFE containers at runtime, only at build/CI time.

**Auth context isolation:** Module Federation does not share React Context across remote boundaries, so each MFE component that needs auth state is exposed through a `*Federated.jsx` wrapper that re-supplies that MFE's own `AuthProvider`. Without this wrapper, `useAuth()` inside a federated component falls back to safe defaults (`canWrite: false`) regardless of the logged-in user's actual role.

Each page also has its own React error boundary (`MfeErrorBoundary` in the shell) so a single failed remote (e.g. a 404 on `remoteEntry.js`) degrades to a retry-able error card instead of crashing the whole application.

---

## 5. Local development

```bash
# Start all services + MinIO (local S3) + MySQL
docker-compose up --build

# Shell
open http://localhost:3000
```

Docker Compose runs a **MinIO** container as an S3-compatible object store for product images, so no AWS credentials are required locally. In production, the same code path talks to real S3 using the ECS task's IAM role via AWS SDK's `DefaultCredentialsProvider` — image uploads gracefully no-op if neither is available.

---

## 6. AWS infrastructure (Terraform)

Infrastructure is provisioned with Terraform (`terraform/` directory) and applications are deployed via GitHub Actions on every push to `master`, or manually via `workflow_dispatch`.

### What Terraform provisions

- **VPC** — 2 AZs, public + private subnets, **1 NAT gateway** (single NAT is an accepted cost trade-off for a portfolio project; the only downside is loss of outbound internet in the second AZ if that NAT's AZ goes down)
- **ALB** — path-based routing to all 5 backend services, default route to the frontend; HTTPS/ACM/Route 53 provisioned only when `domain_name` is set
- **WAF** — a rate-based rule (100 req / 5 min / IP) on `/api/auth/*` to block credential stuffing, plus three AWS managed rule groups: `CommonRuleSet`, `SQLiRuleSet`, and `KnownBadInputsRuleSet`
- **ECS cluster** — EC2 launch type, `t3.large` instances, ECS Capacity Provider target tracking at `target_capacity=80` (replacing an earlier step-based CPU alarm approach)
- **RDS MySQL** — one shared `db.t3.small` primary instance (single-AZ, 7-day backup retention, deletion protection enabled) consolidating what was previously 4 separate per-service database instances, plus a dedicated **read replica** for `reporting-service` so analytical queries never compete with transactional load
- **ECR** — 6 repositories with **IMMUTABLE** image tags; each CI deploy pushes a new git-SHA-tagged image, and re-pushing an existing tag is rejected by design
- **S3** — product images bucket (versioned, 30-day noncurrent expiry), compliance reports bucket (versioned, no expiry), and VPC flow-logs bucket (90-day expiry, Parquet format)
- **SSM Parameter Store** — 5 individual SecureString parameters (`DB_PASS`, `JWT_SESSION_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MAIL_PASSWORD`), each encrypted with the AWS-managed `alias/aws/ssm` KMS key and referenced by ECS task definitions via `secrets`/`valueFrom` — no plaintext secrets in task definitions or in the repository
- **CloudWatch alarms** — ALB 5xx/4xx rate, ALB P95 latency, RDS CPU/connections/free storage, per-service ECS task-count alarms (all 5 backend services), WAF blocked-request rate — all routing to an SNS topic
- **VPC Flow Logs** — all traffic (ACCEPT + REJECT) to S3 in Parquet format, 90-day retention
- **AWS X-Ray** — distributed tracing across all 5 backend services via a non-blocking servlet filter (tracing failures never affect request handling)

### Terraform state

State is stored **locally** (`terraform.tfstate`). An S3 backend requires the target bucket to already exist before `terraform init` can use it, and is not required for a single-contributor deployment.

### Infrastructure sizing rationale

**EC2 (`t3.large`, 6 desired instances):** each instance provides 3 ENIs; with `awsvpc` networking each ECS task consumes one ENI, so the usable task-slot formula is `(instances × 3 ENIs) − instances`. All 5 backend services now run `desired_count=2` (frontend runs `desired_count=1`) for zero-gap rolling deployments, which raised the steady-state task count enough that the EC2 fleet was increased from the original 4 instances to 6 to avoid the ENI-exhaustion "no registered targets" failure mode encountered earlier in the project.

**RDS (`db.t3.small`):** sized one tier above `db.t3.micro` to serve what was previously 4 separate database instances, now consolidated into one shared instance with 4 schemas, plus a read replica dedicated to `reporting-service`.

---

## 7. CI/CD

`.github/workflows/deploy.yml` authenticates to AWS via **GitHub OIDC** (no long-lived AWS keys stored in GitHub), runs on `ubuntu-latest`, and:

- Guards every deploy job behind an `infra-check` step that gracefully skips deployment when the underlying Terraform infrastructure isn't bootstrapped yet, resolving a chicken-and-egg ordering problem between infra and app deploys
- Detects which services changed per commit using `dorny/paths-filter` — only changed services are rebuilt and redeployed
- Builds a multi-stage Docker image per service (`maven:3.9-eclipse-temurin-21` → `eclipse-temurin:21-jre-alpine`)
- Tags each image with the **git commit SHA** (never `:latest`) and pushes to ECR
- Fetches the current ECS task definition, swaps in the new image, registers a new task-definition revision, and deploys it — required because ECR IMMUTABLE tags mean `:latest` can never be overwritten and a bare force-new-deployment would redeploy the same image
- Supports `workflow_dispatch` with a `deploy_all` input to force a full redeploy of every service
- Supports a `[skip ci]` commit-message convention for controlled deployment sequencing

---

## 8. Database migrations

All four writable services use **Flyway** for schema management, replacing the earlier `hibernate.ddl-auto=update`:

- `spring.jpa.hibernate.ddl-auto=none` — Hibernate no longer touches the schema
- `spring.flyway.baseline-on-migrate=true` — safe to apply to existing databases
- Migration files live at `src/main/resources/db/migration/V1__Initial_schema.sql` per service; future changes go in `V2__*.sql`, `V3__*.sql`, etc.
- `reporting-service` has no migrations of its own — it connects to `inventorydb` read-only and never modifies the schema

> Boolean columns are declared `TINYINT(1)` in every migration, not `BIT(1)` — Hibernate 6 fails at startup with a `SchemaManagementException` against `BIT(1)` columns on MySQL.

---

## 9. Caching

Two services use **Caffeine** in-process caching to reduce database load:

- `inventory-service` — a 30-second TTL `products` cache on `ProductService.getAll()` and the stock-summary/levels reads in `StockService`, evicted on any write
- `reporting-service` — a 60-second TTL `valuation` cache on `ReportingService.getStockValuation()`, read-only (no eviction needed since `reporting-service` never writes)

---

## 10. Report archival

Every CSV export (products, stock valuation) is archived to S3 under a module-specific folder for compliance:

```
reports/inventory-service/products-export-<timestamp>.csv
reports/reporting-service/valuation-export-<timestamp>.csv
```

Archival is fire-and-forget — a failed S3 upload never blocks the user's download.

---

## 11. Shared library

`shared-lib` is a Maven module providing `JwtUtil` (HS256 JWT sign/validate/parse using JJWT 0.12.5) and the `JwtTokenType` enum. Every `JwtUtil` instance is bound to exactly one signing secret and one token type, and rejects any token whose `typ` claim doesn't match at validation time. `auth-service` registers three qualified beans (session/access/refresh); `inventory-service` and `supplier-service`, which only ever validate incoming access tokens, wire up just the access-typed bean. This consolidates what were previously three independent, hand-duplicated `JwtTokenProvider` classes into one shared implementation.

---

## 12. Environment variables

| Variable | Service(s) | Description |
|---|---|---|
| `JWT_SESSION_SECRET` / `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | auth (all three); inventory, supplier (access only) | HS256 signing keys — one per token type, generated independently (`openssl rand -base64 64`), must be identical across every service that validates that token type |
| `DB_PASS` | all 5 backend services | Shared RDS MySQL password |
| `COOKIE_SECURE` | auth-service | Must match whether the ALB terminates HTTPS — `true` blocks the refresh cookie from ever being sent over a plain-HTTP ALB, which silently logs every user out after their access token first expires |
| `MAIL_USERNAME` / `MAIL_PASSWORD` | auth, notification | SMTP sender credentials — OTPs and alerts fall back to container logs when unset |
| `ALERT_RECIPIENTS` | notification | Comma-separated alert email list |
| `AWS_REGION`, `MINIO_BUCKET` / `REPORTS_BUCKET` | inventory, reporting | S3/MinIO bucket and region for image storage and report archival |

In production, all secret values are stored in **SSM Parameter Store** and injected into ECS task definitions at container-launch time via `secrets`/`valueFrom` — no secrets are ever stored in the repository or baked into ECR images.

---

## 13. Known gaps

Current limitations, tracked for future iterations:

- `shared-lib` currently exposes only `JwtUtil`/`JwtTokenType` — the earlier `ApiResponse` and shared exception classes were identified as dead code and removed; each service still owns its own exception-handling implementation, which is an acceptable and intentional scope for the shared module today.
- Terraform state remains local rather than S3-backed; the S3 backend configuration exists commented-out in `main.tf` for future migration.
- HTTPS/custom domain support is implemented in Terraform but inactive by default (gated on `domain_name`) since registering a domain has an ongoing cost outside the scope of a free-tier portfolio budget.
