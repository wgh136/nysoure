#!/bin/bash

set -e

# Configuration
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/local"
APP_DATA_DIR="/backup/app_data"
BACKUP_DATE=$(date +%Y-%m-%d)

# S3 configuration
S3_ENDPOINT="${S3_ENDPOINT}"
S3_BUCKET="${S3_BUCKET}"
S3_ACCESS_KEY="${S3_ACCESS_KEY}"
S3_SECRET_KEY="${S3_SECRET_KEY}"
S3_REGION="${S3_REGION:-us-east-1}"

# Retention
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# State file for incremental backups
STATE_FILE="${BACKUP_DIR}/last_backup_state.txt"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Configure rclone for S3
configure_rclone() {
    mkdir -p ~/.config/rclone
    cat > ~/.config/rclone/rclone.conf <<EOF
[s3]
type = s3
provider = AWS
env_auth = false
access_key_id = ${S3_ACCESS_KEY}
secret_access_key = ${S3_SECRET_KEY}
region = ${S3_REGION}
endpoint = ${S3_ENDPOINT}
acl = private
EOF
}

# Backup database
backup_database() {
    log "Starting database backup..."
    
    DB_BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sql.gz"
    
    mysqldump -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} \
        --single-transaction \
        --quick \
        --lock-tables=false \
        --databases ${DB_NAME} | gzip > ${DB_BACKUP_FILE}
    
    log "Database backup completed: ${DB_BACKUP_FILE}"
    
    # Upload to S3
    rclone copy ${DB_BACKUP_FILE} s3:${S3_BUCKET}/database/ --progress
    
    log "Database backup uploaded to S3"
    
    # Clean up local backup file after successful upload
    rm -f ${DB_BACKUP_FILE}
}

# Backup config.json
backup_config() {
    log "Backing up config.json..."
    
    if [ -f "${APP_DATA_DIR}/config.json" ]; then
        CONFIG_BACKUP="${BACKUP_DIR}/config_${TIMESTAMP}.json"
        cp "${APP_DATA_DIR}/config.json" ${CONFIG_BACKUP}
        
        # Upload to S3
        rclone copy ${CONFIG_BACKUP} s3:${S3_BUCKET}/config/ --progress
        
        log "Config backup uploaded to S3"
        rm -f ${CONFIG_BACKUP}
    else
        log "Warning: config.json not found"
    fi
}

# Incremental backup for images using rclone sync with checksums
backup_images() {
    log "Starting incremental image backup..."
    
    # Backup images directory
    if [ -d "${APP_DATA_DIR}/images" ]; then
        log "Syncing images directory (incremental)..."
        # Using rclone sync with --checksum for efficient incremental backup
        # Only uploads new or modified files
        rclone sync "${APP_DATA_DIR}/images" s3:${S3_BUCKET}/images \
            --checksum \
            --transfers 8 \
            --checkers 16 \
            --fast-list \
            --progress \
            --log-file="${BACKUP_DIR}/images_sync_${TIMESTAMP}.log"
        
        log "Images backup completed"
    else
        log "Warning: images directory not found"
    fi
}

# Backup avatars
backup_avatars() {
    log "Starting avatar backup..."
    
    if [ -d "${APP_DATA_DIR}/avatar" ]; then
        log "Syncing avatar directory..."
        # Avatar directory is usually smaller, but still use incremental sync
        rclone sync "${APP_DATA_DIR}/avatar" s3:${S3_BUCKET}/avatar \
            --checksum \
            --transfers 4 \
            --progress \
            --log-file="${BACKUP_DIR}/avatar_sync_${TIMESTAMP}.log"
        
        log "Avatar backup completed"
    else
        log "Warning: avatar directory not found"
    fi
}

# Clean up old database backups from S3
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    
    # Delete old database backups
    rclone delete s3:${S3_BUCKET}/database \
        --min-age ${RETENTION_DAYS}d \
        --progress || true
    
    # Delete old config backups
    rclone delete s3:${S3_BUCKET}/config \
        --min-age ${RETENTION_DAYS}d \
        --progress || true
    
    # Clean up local logs
    find ${BACKUP_DIR} -name "*.log" -mtime +7 -delete || true
    
    log "Cleanup completed"
}

# Create backup state file
create_state_file() {
    echo "LAST_BACKUP_DATE=${BACKUP_DATE}" > ${STATE_FILE}
    echo "LAST_BACKUP_TIMESTAMP=${TIMESTAMP}" >> ${STATE_FILE}
}

# Main backup function
run_backup() {
    log "=========================================="
    log "Starting backup process..."
    log "=========================================="
    
    # Create backup directory
    mkdir -p ${BACKUP_DIR}
    
    # Configure rclone
    configure_rclone
    
    # Test S3 connection
    log "Testing S3 connection..."
    if ! rclone lsd s3:${S3_BUCKET} > /dev/null 2>&1; then
        log "Error: Cannot connect to S3 bucket. Please check your credentials."
        exit 1
    fi
    
    # Perform backups
    backup_database
    backup_config
    backup_images
    backup_avatars
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Update state file
    create_state_file
    
    log "=========================================="
    log "Backup process completed successfully!"
    log "=========================================="
}

# Run backup
run_backup
