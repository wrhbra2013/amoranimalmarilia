#!/usr/bin/env bash
set -euo pipefail

# Simple PostgreSQL backup script for Amor Animal
# Places backups under ../amoranimal_uploads/backups by default
# Usage:
#   ./backup_db.sh           - Run backup now
#   ./backup_db.sh --cron    - Install cron job (runs every 3 days at 3am)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT_PATH="$SCRIPT_DIR/backup_db.sh"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_DIR/../amoranimal_uploads/backups}"

# Install cron job
if [[ "${1:-}" == "--cron" ]]; then
    echo "Installing cron job to run every 3 days at 3am..."
    
    CRONTAB="/usr/bin/crontab"
    
    # Remove existing backup cron entries
    $CRONTAB -l 2>/dev/null | grep -v "backup_db.sh" > /tmp/current_cron || true
    
    # Add new cron entry (every 3 days at 3:00 AM)
    echo "0 3 */3 * * PGPASSWORD=\${PGPASSWORD:-} $SCRIPT_PATH" >> /tmp/current_cron
    
    $CRONTAB /tmp/current_cron
    rm /tmp/current_cron
    
    echo "Cron job installed:"
    $CRONTAB -l | grep backup
    exit 0
fi

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
