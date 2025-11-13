#!/usr/bin/env bash
# Simple Postgres backup wrapper
# Usage:
#   DATABASE_URL="postgres://user:pass@host:5432/dbname" ./scripts/backup_db.sh
# or set PGHOST/PGUSER/PGDATABASE/PGPORT and optionally PGPASSWORD

set -euo pipefail

TIMESTAMP=$(date -u +"%Y%m%d_%H%M%S")
OUT_DIR="$(pwd)/backups"
mkdir -p "$OUT_DIR"

if [[ -n "${DATABASE_URL:-}" ]]; then
  OUT_FILE="$OUT_DIR/backup-${TIMESTAMP}.dump"
  echo "Using DATABASE_URL; dumping to $OUT_FILE"
  pg_dump "$DATABASE_URL" -Fc -f "$OUT_FILE"
  echo "Backup written: $OUT_FILE"
  exit 0
fi

# Fallback to environment variables
if [[ -z "${PGHOST:-}" || -z "${PGUSER:-}" || -z "${PGDATABASE:-}" ]]; then
  echo "ERROR: Please set DATABASE_URL or PGHOST/PGUSER/PGDATABASE environment variables." >&2
  exit 2
fi

OUT_FILE="$OUT_DIR/backup-${TIMESTAMP}.dump"
echo "Using PGHOST/PGUSER/PGDATABASE; dumping to $OUT_FILE"
pg_dump -h "$PGHOST" -p "${PGPORT:-5432}" -U "$PGUSER" -Fc -f "$OUT_FILE" "$PGDATABASE"
echo "Backup written: $OUT_FILE"
