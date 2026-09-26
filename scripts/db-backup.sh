#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
MONGO_URI="${MONGO_URI:-mongodb://mongo:27017/backend_template}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/${TIMESTAMP}"

mkdir -p "${BACKUP_PATH}"

echo "[$(date)] Starting mongodump..."
mongodump --uri="${MONGO_URI}" --out="${BACKUP_PATH}" --gzip
echo "[$(date)] Backup completed: ${BACKUP_PATH}"

# Compress the backup
tar -czf "${BACKUP_PATH}.tar.gz" -C "${BACKUP_DIR}" "${TIMESTAMP}"
rm -rf "${BACKUP_PATH}"

# Remove backups older than retention days
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "[$(date)] Old backups cleaned (retention: ${RETENTION_DAYS} days)"

echo "[$(date)] Latest backup: ${BACKUP_PATH}.tar.gz"
