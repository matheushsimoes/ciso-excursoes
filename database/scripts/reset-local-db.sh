#!/usr/bin/env bash
# Recreates a local database from scratch and applies all migrations.
#
# Usage:   database/scripts/reset-local-db.sh <database-name>
# Example: database/scripts/reset-local-db.sh ciso_excursoes_test
#
# Development only: it DROPS the given database. Never run it against a
# database with real data — use a new migration instead.
set -euo pipefail

DB_NAME="${1:?Usage: $0 <database-name>}"
CONTAINER="${POSTGRES_CONTAINER:-ciso-excursoes-postgres}"
ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

docker exec -i "$CONTAINER" psql -U ciso -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
  -c "CREATE DATABASE \"$DB_NAME\";"

cd "$ROOT_DIR/backend"
DATABASE_URL="postgresql://ciso:ciso@localhost:5432/$DB_NAME" node scripts/migrate.mjs

echo "Database $DB_NAME is ready."
