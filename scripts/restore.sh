#!/bin/sh
# Geri yükleme: ./scripts/restore.sh storage/backups/db-YYYYMMDD-HHMMSS.dump [storage/backups/uploads-….tar.gz]
# DİKKAT: Mevcut veritabanı içeriğinin üzerine yazar.
set -eu
[ -f "${1:-}" ] || { echo "Kullanım: $0 <db-dosyası.dump> [uploads.tar.gz]"; exit 1; }
DB_URL="$(echo "$DATABASE_URL" | sed 's/?schema=public//')"
pg_restore --clean --if-exists --no-owner --dbname="$DB_URL" "$1"
if [ -n "${2:-}" ]; then mkdir -p "${UPLOAD_DIR:-./storage/uploads}" && tar -xzf "$2" -C "${UPLOAD_DIR:-./storage/uploads}"; fi
echo "✓ Geri yükleme tamamlandı."
