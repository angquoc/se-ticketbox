#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# reset-db.sh — Drop all tables, re-run migrations, and seed demo data.
#
# Usage:
#   ./data/scripts/reset-db.sh [--no-seed]
#
# Options:
#   --no-seed    Skip seeding (only reset schema)
#
# ⚠️  This will DESTROY all data in the database.
#
# Requirements: same as init-db.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/src/backend"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Source the environment file first:" >&2
  echo "  cd $BACKEND_DIR && source .env" >&2
  exit 1
fi

echo "⚠️  WARNING: This will drop ALL data in the database."
echo "   Press Ctrl+C to abort, or Enter to continue..."
read -r

echo "==> Dropping schema..."
cd "$BACKEND_DIR"
npx prisma migrate reset --force

DO_SEED=true
if [[ "${1:-}" == "--no-seed" ]]; then
  DO_SEED=false
fi

if $DO_SEED; then
  echo "==> Seeding database..."
  npx ts-node -r tsconfig-paths/register ../data/seed/seed.ts
  echo "==> Seed complete."
fi

echo ""
echo "Database reset complete."
