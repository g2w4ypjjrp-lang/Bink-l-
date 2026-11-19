#!/bin/sh
# Günlük tam yedek: PostgreSQL (pg_dump, custom format) + yüklenen medya dosyaları.
# Ortam: DATABASE_URL, BACKUP_DIR (varsayılan ./storage/backups), UPLOAD_DIR, BACKUP_KEEP_DAYS (varsayılan 14)
set -eu
BACKUP_DIR="${BACKUP_DIR:-./storage/backups}"
UPLOAD_DIR="${UPLOAD_DIR:-./storage/uploads}"
KEEP="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
DB_URL="$(echo "$DATABASE_URL" | sed 's/?schema=public//')"
pg_dump --format=custom --no-owner --dbname="$DB_URL" --file="$BACKUP_DIR/db-$STAMP.dump"
tar -czf "$BACKUP_DIR/uploads-$STAMP.tar.gz" -C "$UPLOAD_DIR" .
find "$BACKUP_DIR" -type f \( -name 'db-*.dump' -o -name 'uploads-*.tar.gz' \) -mtime +"$KEEP" -delete
echo "✓ Yedek alındı: $BACKUP_DIR (db-$STAMP.dump, uploads-$STAMP.tar.gz)"
