#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# init-db.sh — Run database migrations and seed demo data.
#
# Usage:
#   ./data/scripts/init-db.sh [--seed]
#
# Options:
#   --no-seed    Skip seeding (only run migrations)
#
# Requirements:
#   - Docker containers (postgres, redis, minio) must be running
#   - Environment variables must be available (from src/backend/.env or
#     docker compose exec backend printenv)
#   - Node.js and npm must be available on the host, OR run inside the
#     backend container with: docker compose exec backend ./data/scripts/init-db.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/src/backend"

run_migrations() {
  echo "==> Running database migrations..."
  cd "$BACKEND_DIR"
  npx prisma migrate deploy
  echo "==> Migrations applied."
}

run_seed() {
  echo "==> Seeding database with demo data..."
  cd "$BACKEND_DIR"
  npx ts-node -r tsconfig-paths/register ../data/seed/seed.ts
  echo "==> Seed complete."
}

DO_SEED=true
if [[ "${1:-}" == "--no-seed" ]]; then
  DO_SEED=false
fi

# Check DATABASE_URL is set
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set." >&2
  echo "Source the environment file first:" >&2
  echo "  cd $BACKEND_DIR && source .env" >&2
  exit 1
fi

run_migrations

if $DO_SEED; then
  run_seed
fi

echo ""
echo "Database initialization complete."
