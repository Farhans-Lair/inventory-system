#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════
# deploy.sh — full deployment script
# Run from the project root: bash terraform/deploy.sh
# Requires terraform.tfvars to be filled in the terraform/ directory
# ═══════════════════════════════════════════════════════════════════════════
set -euo pipefail

REGION="ap-south-1"
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TF_DIR="$PROJECT_ROOT/terraform"

echo "=== InventoryMS AWS Deployment ==="
echo ""

# ── Step 1: Check terraform.tfvars exists and has no placeholder values ───
if [ ! -f "$TF_DIR/terraform.tfvars" ]; then
  echo "ERROR: terraform.tfvars not found in $TF_DIR"
  echo "Copy terraform.tfvars.example to terraform.tfvars and fill in your values."
  exit 1
fi

if grep -q "CHANGE_ME" "$TF_DIR/terraform.tfvars"; then
  echo "ERROR: terraform.tfvars still has placeholder values (CHANGE_ME)."
  echo "Edit the file and set all required values before deploying."
  exit 1
fi

# ── Step 2: Terraform init + apply ────────────────────────────────────────
echo "--- Running terraform apply ---"
cd "$TF_DIR"
terraform init -upgrade
terraform validate
terraform plan -out=tfplan
terraform apply tfplan

# ── Step 3: Capture ECR base URL ──────────────────────────────────────────
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_BASE="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/inventoryms-prod"

echo ""
echo "--- Authenticating with ECR ---"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com"

# ── Step 4: Build and push all images ─────────────────────────────────────
services=("auth-service" "inventory-service" "notification-service" "reporting-service" "supplier-service" "frontend")

for svc in "${services[@]}"; do
  echo ""
  echo "--- Building and pushing $svc ---"
  docker build -t "$ECR_BASE/$svc:latest" "$PROJECT_ROOT/$svc"
  docker push "$ECR_BASE/$svc:latest"
done

# ── Step 5: Force ECS to redeploy with new images ─────────────────────────
echo ""
echo "--- Redeploying ECS services ---"
cluster="inventoryms-prod-cluster"
ecs_services=("inventoryms-prod-auth" "inventoryms-prod-inventory" "inventoryms-prod-notification" "inventoryms-prod-reporting" "inventoryms-prod-supplier" "inventoryms-prod-frontend")

for svc in "${ecs_services[@]}"; do
  aws ecs update-service \
    --cluster "$cluster" \
    --service "$svc" \
    --force-new-deployment \
    --region "$REGION" \
    --output text --query 'service.serviceName'
done

# ── Step 6: Print the app URL ──────────────────────────────────────────────
ALB_DNS=$(terraform output -raw alb_dns)
echo ""
echo "============================================================"
echo "  Deployment complete!"
echo "  App URL: $ALB_DNS"
echo "  Logs:    AWS Console → CloudWatch → Log groups → /ecs/inventoryms-prod/*"
echo "============================================================"
