#!/bin/bash

set -e

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Default schedule: daily at 2 AM
BACKUP_SCHEDULE="${BACKUP_SCHEDULE:-0 2 * * *}"

log "Backup container starting..."
log "Backup schedule: ${BACKUP_SCHEDULE}"

# Wait for database to be ready
log "Waiting for database to be ready..."
for i in {1..30}; do
    if mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} -e "SELECT 1" > /dev/null 2>&1; then
        log "Database is ready!"
        break
    fi
    log "Waiting for database... (${i}/30)"
    sleep 2
done

# Validate S3 configuration
if [ -z "${S3_BUCKET}" ] || [ -z "${S3_ACCESS_KEY}" ] || [ -z "${S3_SECRET_KEY}" ]; then
    log "ERROR: S3 configuration is incomplete!"
    log "Please set S3_BUCKET, S3_ACCESS_KEY, and S3_SECRET_KEY environment variables."
    exit 1
fi

# Run initial backup
log "Running initial backup..."
/usr/local/bin/backup.sh

# Create crontab
echo "${BACKUP_SCHEDULE} /bin/bash /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" > /tmp/crontab

log "Starting scheduled backups with supercronic..."
log "Logs will be written to /var/log/backup.log"

# Run supercronic with the crontab
exec supercronic /tmp/crontab
