# Inventory Management System v2.0

Microservices-based inventory management with a React micro-frontend shell, Spring Boot backends, and MySQL databases — containerised with Docker Compose for local development, and deployed to **AWS ECS (EC2 launch type)** behind an Application Load Balancer via Terraform.

## Live deployment

The application runs on AWS ECS in `ap-south-1`, fronted by an Application Load Balancer that path-routes every request to the correct service. There is no custom domain — the app is served directly from the ALB's DNS name over HTTP (see [HTTPS](#https) below for why a domain is required to change that).

```
http://<project>-<environment>-alb-<id>.ap-south-1.elb.amazonaws.com/
```

## Architecture

```
                         ┌─────────────────────────────┐
                         │   Application Load Balancer  │
                         │     (path-based routing)     │
                         └──────────────┬────────────────┘
         ┌──────────────┬───────────────┼───────────────┬──────────────┐
         │              │               │               │              │
   /api/auth/*    /api/products,  /api/notifications  /api/reports  /api/suppliers,
   /api/users*    /api/stock/*,                                     /api/purchase-orders
         │        /api/batch-lots/*,        │               │              │
         │        /api/cycle-counts/*       │               │              │
         ▼              ▼               ▼               ▼              ▼
   auth-service   inventory-service  notification-   reporting-     supplier-service
      :8081           :8082         service :8083   service :8084      :8085
         │              │               │               │              │
      auth-db      inventory-db   notification-db   (reads from    supplier-db
                                                       inventory-db)
                         │
                  (everything else)
                         ▼
                  frontend (shell + 5 Module Federation MFEs)
                         :80
```

The frontend itself is a micro-frontend architecture: a shell application that loads five independently-built remotes at runtime via Module Federation, each served from its own path on the same nginx container (`/mfe/dashboard/`, `/mfe/products/`, etc).

## Services overview

| Service | Port | Database | Description |
|---|---|---|---|
| auth-service | 8081 | auth-db | JWT issuance, OTP-based 2FA, refresh token rotation, password reset, user management |
| inventory-service | 8082 | inventory-db | Products, locations, stock levels, movements, batch/lot tracking, cycle counts |
| notification-service | 8083 | notification-db | Email/webhook alerts triggered by inventory-service, notification log |
| reporting-service | 8084 | inventory-db (read-only) | Stock valuation, movement trend, CSV export — no schema of its own |
| supplier-service | 8085 | supplier-db | Suppliers, purchase orders, goods receipt notes (GRN) |
| frontend (shell) | 80 | — | React shell + 5 Module Federation micro-frontends |

`reporting-service` deliberately has no database of its own — it reads directly from `inventory-service`'s database with `ddl-auto=none`, since its endpoints are 100% read-only aggregation queries. `notification-service` and `reporting-service` have no role-based authorization on their endpoints — notification is internal-only (called server-to-server, never from the frontend) and reporting is fully read-only, so neither has anything to protect.

## Authentication & session model

Each browser **tab** maintains its own independent session:

- **Access token** — stored in `sessionStorage`, sent as `Authorization: Bearer <token>` on every API request. Tab-scoped: logging in or out on one tab never affects another tab, even for different users in the same browser.
- **Refresh token** — stored in an HttpOnly cookie (`path=/api/auth/`), never accessible to JavaScript. Rotated on every use; a stolen refresh token is invalidated the next time it's used.
- On a 401, the axios interceptor automatically calls `/api/auth/refresh`, stores the new access token, and retries the original request.

Backend `JwtAuthFilter` reads the `Authorization` header first, falling back to a cookie for local Docker Compose compatibility.

## Role permissions

Enforced at the backend (`@PreAuthorize` / `SecurityConfig` rules) — the actual source of truth, not just the UI:

| Resource | Read | Write |
|---|---|---|
| Products, Locations, Stock, Batch/Lots, Cycle Counts | ADMIN, WAREHOUSE_MANAGER, STAKEHOLDER | ADMIN, WAREHOUSE_MANAGER |
| Suppliers, Purchase Orders | ADMIN, WAREHOUSE_MANAGER, STAKEHOLDER | ADMIN, WAREHOUSE_MANAGER |
| Reports | ADMIN, WAREHOUSE_MANAGER, STAKEHOLDER | — (read-only resource) |
| Users | ADMIN only | ADMIN only |

Stakeholder is read-only everywhere except Users, which it cannot see at all. A small number of frontend pages (Batch/Lots, Cycle Counts, Movements, Suppliers, Purchase Orders) still render their write forms for Stakeholder — submitting them correctly fails with a backend `403`, but hiding the buttons for those roles is a pending cosmetic improvement, not a security gap.

## Module Federation architecture note

Each MFE page that needs authentication context is exposed via a thin `*Federated.jsx` wrapper, not the raw page component directly. Module Federation does not share React Context across remote boundaries — the shell and each MFE have their own separate `AuthContext`, so a page mounted without its own `AuthProvider` would always see safe defaults (`canWrite: false`) regardless of who's logged in. The wrapper re-supplies the MFE's own `AuthProvider` so `useAuth()` resolves correctly however the page is mounted.

## Local development

```bash
# Start everything with Docker Compose
docker-compose up --build

# Open the shell
open http://localhost:3000
```

For frontend-only development without Docker, each MFE can run standalone on its own dev port (see [Module Federation remotes](#module-federation-remotes-dev) below) while pointing at services running via Docker Compose.

## AWS deployment

Infrastructure is provisioned with Terraform; application images are built and deployed via GitHub Actions on every push to `master`.

```bash
cd terraform
terraform init
terraform apply
```

This provisions: VPC with public/private subnets across 2 AZs, NAT gateways, an Application Load Balancer with path-based routing rules for all 5 backend services plus a default rule to the frontend, an ECS cluster on EC2 (`t3.large × up to 3 instances`, auto-scaling group), one RDS MySQL instance per service that needs one, an S3 bucket for product images, and ECR repositories for all 6 images.

CI/CD (`.github/workflows/deploy.yml`) builds and pushes Docker images to ECR and triggers an ECS rolling deployment for whichever services changed, using `npm ci` and `mvn` with pinned dependency versions to keep builds reproducible.

### Infrastructure sizing

6 services run as 1 task each (`desired_count = 1`), comfortably within the 3× `t3.large` cluster capacity (~54% CPU headroom, ~77% memory headroom at full deployment). RDS instances run single-AZ (`multi_az = false`) — an accepted cost/resilience trade-off for a non-production workload.

### HTTPS

The ALB currently only listens on HTTP (port 80). AWS does not allow issuing a TLS certificate for an `*.elb.amazonaws.com` DNS name — HTTPS requires owning a custom domain, requesting a free certificate via AWS Certificate Manager, adding an HTTPS listener to the ALB, and pointing the domain's DNS at the ALB. Without a domain, HTTP is the only option.

## Environment variables

| Variable | Service(s) | Description |
|---|---|---|
| MAIL_USERNAME | auth, notification | SMTP sender address (leave blank for dev OTP returned in API response) |
| MAIL_PASSWORD | auth, notification | SMTP password |
| ALERT_RECIPIENTS | notification | Comma-separated alert email list |
| JWT_SECRET | auth, inventory, supplier | Base64 HS256 signing key — shared across all services that validate JWTs |
| NOTIFICATION_SERVICE_URL | inventory | Override for the notification service's base URL. Defaults to the Docker Compose hostname locally; set to the ALB's DNS name in production since there is no service-discovery DNS on ECS |

## Module Federation remotes (dev)

| MFE remote | Port | Owns |
|---|---|---|
| dashboardMfe | 3001 | Dashboard page + trend chart |
| productsMfe | 3002 | Products, Locations, Batch/Lots, Cycle Counts, UoM Rules |
| stockMfe | 3003 | Stock Levels, Movements |
| supplierMfe | 3004 | Suppliers, Purchase Orders |
| reportingMfe | 3005 | Reports, Users |

In production all five are built with `base: '/mfe/<name>/'` and served from the shell's own nginx container — no separate containers or ports are involved at runtime, only during local development.
