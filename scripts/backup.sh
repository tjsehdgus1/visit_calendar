#!/bin/sh
set -e
# DSM 작업 스케줄러(root)의 PATH에는 docker가 없다
export PATH=/usr/local/bin:/var/packages/ContainerManager/target/usr/bin:$PATH
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

APP_DIR=/volume1/docker/visit_calendar
# 별도 backup 공유 폴더가 없어 docker 공유 폴더 안에 둔다 (Hyper Backup 대상)
BACKUP_DIR=/volume1/docker/visit_calendar-backup
KEEP_DAYS=14
STAMP=$(date +%Y-%m-%d)
TMP="$BACKUP_DIR/$STAMP.sql"

mkdir -p "$BACKUP_DIR"
$DC -f "$APP_DIR/docker-compose.yml" --env-file "$APP_DIR/.env" exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$TMP"

[ -s "$TMP" ] || { echo "백업 실패: 덤프가 비어 있음" >&2; rm -f "$TMP"; exit 1; }
gzip -c "$TMP" > "$BACKUP_DIR/$STAMP.sql.gz" && rm -f "$TMP"

find "$BACKUP_DIR" -name '*.sql.gz' -mtime +$KEEP_DAYS -delete
echo "백업 완료: $BACKUP_DIR/$STAMP.sql.gz"
