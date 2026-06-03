#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${SALES_CRM_APP_DIR:-/var/www/sales-zodo-crm}"
BRANCH="${SALES_CRM_BRANCH:-main}"
PM2_APP="${SALES_CRM_PM2_APP:-sales-zodo-crm-api}"

cd "$APP_DIR"

echo "Pulling latest Sales CRM code..."
git fetch origin "$BRANCH"
git reset --hard "origin/$BRANCH"

echo "Installing backend dependencies..."
cd "$APP_DIR/backend"
npm ci --include=dev

echo "Generating Prisma client and applying migrations..."
npm run prisma:generate
npm run prisma:migrate:prod

echo "Building backend..."
npm run build

echo "Installing frontend dependencies..."
cd "$APP_DIR/frontend"
npm ci

echo "Building frontend..."
npm run build

echo "Restarting API..."
pm2 restart "$PM2_APP"
pm2 save

echo "Sales CRM deployment complete."
