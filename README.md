# Inventory Management System v2.0

Microservices-based inventory management with React frontend, Spring Boot backends, and MySQL databases — fully containerised with Docker Compose and provisioned via Terraform.

## Architecture

```
Frontend (React + Vite + Module Federation)  :3000
     │
     ├── /api/auth/*  ──────────────── auth-service        :8081  ←→ auth-db        :3307
     ├── /api/products, /api/stock/*── inventory-service   :8082  ←→ inventory-db   :3308
     ├── /api/notifications  ───────── notification-service :8083  ←→ notification-db:3309
     ├── /api/reports  ─────────────── reporting-service   :8084  (read-only on inventory-db)
     └── /api/suppliers, /api/purchase-orders── supplier-service :8085 ←→ supplier-db :3310
```

## Services overview

| Service              | Port | DB              | Description                                          |
|----------------------|------|-----------------|------------------------------------------------------|
| auth-service         | 8081 | auth-db         | JWT, OTP 2FA, refresh tokens, password reset         |
| inventory-service    | 8082 | inventory-db    | Products, locations, stock, movements, cycle counts  |
| notification-service | 8083 | notification-db | Email/webhook alerts, notification log               |
| reporting-service    | 8084 | inventory-db (RO) | Stock valuation, movement trend, CSV export        |
| supplier-service     | 8085 | supplier-db     | Suppliers, purchase orders, GRN                      |
| frontend             | 3000 | —               | React shell + Module Federation MFEs                 |

## New features in v2.0

### Auth service
- **Forgot / Reset password** — OTP-based password reset flow
- **Refresh token** — 7-day refresh tokens, 1-hour access tokens
- **Logout** — revokes refresh token server-side

### Inventory service
- **Product enhancements** — cost price, selling price, image URL, barcode value, expiry tracking flag
- **Bulk CSV import/export** — `POST /api/products/import`, `GET /api/products/export`
- **Overstock alerts** — `GET /api/stock/levels/overstock` (triggers when qty > maxQuantity)
- **Stock reservations** — hold stock against orders/reference IDs
- **Movement reason codes** — structured codes alongside free-text reasons
- **Demand forecasting** — `GET /api/stock/forecast/{productId}` — 30-day projection from outbound history
- **Batch / lot tracking** — lot numbers, manufacture/expiry dates per location
- **Cycle counts** — initiate → count → reconcile workflow with discrepancy flagging

### Notification service (new)
- Receives payloads from other services and fires email alerts
- Logs all notifications (sent and failed) to its own DB
- `POST /api/notifications/send`

### Reporting service (new)
- Stock valuation (cost × qty and selling × qty per product)
- Movement history with date-range filter
- 7/14/30/90-day trend by movement type
- CSV export of valuation

### Supplier service (new)
- Supplier directory with contact management
- Purchase orders with line items (DRAFT → SENT → CONFIRMED → RECEIVED)
- Goods Receipt Notes (GRN) — record received quantities per PO line

### Frontend
- **Recharts** trend chart on dashboard
- **New pages**: Reports, Suppliers, Purchase Orders, Batch Lots, Cycle Counts
- **Forgot password** page
- **Grouped sidebar** navigation
- **Module Federation** vite config for micro-frontend architecture
- Refresh token auto-retry in axios interceptor

## Quick start

```bash
# 1. Provision infrastructure (optional — Docker Compose also works standalone)
cd terraform && terraform init && terraform apply

# 2. Start all services
docker-compose up --build

# 3. Open
open http://localhost:3000
```

## Environment variables

| Variable          | Service(s)                     | Description                          |
|-------------------|--------------------------------|--------------------------------------|
| MAIL_USERNAME     | auth, notification             | SMTP sender address (leave blank for dev OTP in response) |
| MAIL_PASSWORD     | auth, notification             | SMTP password                        |
| ALERT_RECIPIENTS  | notification                   | Comma-separated alert email list     |
| JWT_SECRET        | auth, inventory, supplier      | Base64 HS256 key                     |

## Role permissions (updated)

| Feature                    | Admin | Warehouse Manager | Stakeholder |
|----------------------------|-------|-------------------|-------------|
| Dashboard / read all       | ✓     | ✓                 | ✓           |
| Create products            | ✓     | ✗                 | ✗           |
| Edit products              | ✓     | ✓                 | ✗           |
| CSV import/export          | ✓     | ✗                 | ✓ (export)  |
| Manage locations           | ✓     | ✗                 | ✗           |
| Record movements           | ✓     | ✓                 | ✗           |
| Batch lots / cycle counts  | ✓     | ✓                 | ✗           |
| Stock reservations         | ✓     | ✓                 | ✗           |
| Suppliers & POs            | ✓     | ✓                 | ✗           |
| Reports                    | ✓     | ✓                 | ✓           |
| User management            | ✓     | ✗                 | ✗           |

## Default credentials

| Role              | Email                     | Password    |
|-------------------|---------------------------|-------------|
| Admin             | admin@inventory.com       | admin123    |
| Warehouse Manager | manager@inventory.com     | manager123  |

## Module Federation remotes (dev)

| MFE remote   | Port  | Owns                        |
|--------------|-------|-----------------------------|
| dashboardMfe | 3001  | Dashboard page + charts     |
| productsMfe  | 3002  | Products + batch lots       |
| stockMfe     | 3003  | Stock levels + cycle counts |
| supplierMfe  | 3004  | Suppliers + POs             |
| reportingMfe | 3005  | Reports + valuation         |
