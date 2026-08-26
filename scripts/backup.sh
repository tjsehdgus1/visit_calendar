#!/bin/sh
set -e
BACKUP_DIR=/volume1/backup/visit_calendar
KEEP_DAYS=14
STAMP=$(date +%Y-%m-%d)
TMP="$BACKUP_DIR/$STAMP.sql"

mkdir -p "$BACKUP_DIR"
docker compose -f /volume1/docker/visit_calendar/docker-compose.yml exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$TMP"

[ -s "$TMP" ] || { echo "백업 실패: 덤프가 비어 있음" >&2; rm -f "$TMP"; exit 1; }
gzip -c "$TMP" > "$BACKUP_DIR/$STAMP.sql.gz" && rm -f "$TMP"

find "$BACKUP_DIR" -name '*.sql.gz' -mtime +$KEEP_DAYS -delete
echo "백업 완료: $BACKUP_DIR/$STAMP.sql.gz"
