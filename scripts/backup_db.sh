#!/usr/bin/env bash
set -euo pipefail

# Simple PostgreSQL backup script for Amor Animal
# Places backups under ../amoranimal_uploads/backups by default

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/../amoranimal_uploads/backups}"

mkdir -p "$BACKUP_DIR"
chmod 750 "$BACKUP_DIR" || true

TS=$(date +'%Y%m%d-%H%M%S')
DB=${PGDATABASE:-espelho}
HOST=${PGHOST:-localhost}
PORT=${PGPORT:-5432}
USER=${PGUSER:-postgres}

DUMP_FILE="$BACKUP_DIR/${DB}_$TS.dump"

echo "Starting backup of database '$DB' to $DUMP_FILE"

if [ -z "${PGPASSWORD:-}" ]; then
  echo "Warning: PGPASSWORD not set. Ensure .pgpass or other auth method is available."
fi

# Use pg_dump custom format for efficient restore with pg_restore
PGPASSWORD=${PGPASSWORD:-} pg_dump -h "$HOST" -p "$PORT" -U "$USER" -F c -b -v -f "$DUMP_FILE" "$DB"

echo "Compressing backup..."
gzip -9 "$DUMP_FILE"

# Rotation: remove old backups (default 30 days)
RETENTION_DAYS=${RETENTION_DAYS:-30}
echo "Removing backups older than $RETENTION_DAYS days in $BACKUP_DIR"
find "$BACKUP_DIR" -type f -name "${DB}_*.dump.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

echo "Backup completed: ${DUMP_FILE}.gz"
echo "Location: $BACKUP_DIR"

exit 0
