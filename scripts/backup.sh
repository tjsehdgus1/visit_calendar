#!/bin/sh
set -e
BACKUP_DIR=/volume1/backup/visit_calendar
KEEP_DAYS=14
STAMP=$(date +%Y-%m-%d)

mkdir -p "$BACKUP_DIR"
docker compose -f /volume1/docker/visit_calendar/docker-compose.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$BACKUP_DIR/$STAMP.sql.gz"

find "$BACKUP_DIR" -name '*.sql.gz' -mtime +$KEEP_DAYS -delete
echo "백업 완료: $BACKUP_DIR/$STAMP.sql.gz"
