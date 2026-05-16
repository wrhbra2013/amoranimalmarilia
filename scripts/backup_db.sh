#!/usr/bin/env bash
set -euo pipefail

# PostgreSQL backup script for Amor Animal
# Places backup under ../amoranimal_uploads/backups by default
# Usage:
#   ./backup_db.sh               - Run manual backup
#   ./backup_db.sh --cron        - Run backup with timestamp (for cron)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/../amoranimal_uploads/backups}"

mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR" || true

DB=${PGDATABASE:-espelho}
HOST=${PGHOST:-localhost}
PORT=${PGPORT:-5432}
USER=${PGUSER:-postgres}

MODE="${1:-manual}"

if [ "$MODE" = "--cron" ]; then
  TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
  DUMP_FILE="$BACKUP_DIR/${DB}_${TIMESTAMP}.dump"
  echo "Running cron backup: $DUMP_FILE"
else
  DUMP_FILE="$BACKUP_DIR/${DB}_manual.dump"
  echo "Running manual backup: $DUMP_FILE"
fi

if [ -z "${PGPASSWORD:-}" ]; then
  echo "Warning: PGPASSWORD not set. Ensure .pgpass or other auth method is available."
fi

PGPASSWORD=${PGPASSWORD:-} pg_dump -h "$HOST" -p "$PORT" -U "$USER" -F c -b -v -f "$DUMP_FILE" "$DB"

echo "Compressing backup..."
gzip -9 -f "$DUMP_FILE"

echo "Backup completed: ${DUMP_FILE}.gz"
echo "Location: $BACKUP_DIR"

exit 0
