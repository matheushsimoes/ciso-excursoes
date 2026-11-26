#!/usr/bin/env bash
# Recreates a local database from scratch using the versioned migrations.
# Usage: database/scripts/reset-local-db.sh <database-name>
# Example: database/scripts/reset-local-db.sh ciso_excursoes_test
set -euo pipefail

DB_NAME="${1:?Usage: $0 <database-name>}"
CONTAINER="ciso-excursoes-postgres"
MIGRATIONS_DIR="$(cd "$(dirname "$0")/../migrations" && pwd)"

docker exec -i "$CONTAINER" psql -U ciso -d postgres -v ON_ERROR_STOP=1 \
  -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
  -c "CREATE DATABASE \"$DB_NAME\";"

for file in "$MIGRATIONS_DIR"/*.sql; do
  echo "Applying $(basename "$file")"
  docker exec -i "$CONTAINER" psql -U ciso -d "$DB_NAME" -v ON_ERROR_STOP=1 < "$file"
done

echo "Database $DB_NAME is ready."
