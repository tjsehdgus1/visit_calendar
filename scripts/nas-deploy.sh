#!/bin/sh
# NAS 배포 (DSM 작업 스케줄러에서 root로 실행): 폴더 준비 → 빌드·기동 → 호스트 비밀번호 파일이 있으면 시드 후 삭제
# 코드 갱신(git pull)은 admin 계정으로 SSH에서 먼저 한다 (root가 pull 하면 파일 소유권이 꼬인다)
# 로그: /volume1/docker/vc-ops/first-deploy.log
OPS=/volume1/docker/vc-ops
export PATH=/usr/local/bin:/var/packages/ContainerManager/target/usr/bin:$PATH
PWFILE=$OPS/host-init-password
exec > $OPS/first-deploy.log 2>&1
trap 'echo "=== app 로그 (마지막 80줄) ==="; $DC logs --tail 80 app 2>&1 || true' EXIT
set -e
echo "=== 시작 $(date) ==="
cd /volume1/docker/visit_calendar
mkdir -p /volume1/docker/visit_calendar/pgdata /volume1/docker/visit_calendar/uploads
chown -R 1001:1001 /volume1/docker/visit_calendar/uploads
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="/var/packages/ContainerManager/target/usr/bin/docker-compose"; fi
$DC config -q && echo "compose 문법 OK"
$DC up -d --build
$DC ps
if [ -s "$PWFILE" ]; then
  echo "=== 시드 실행 ==="
  HPW=$(cat "$PWFILE")
  for i in $(seq 1 30); do
    $DC exec -T app node -e "require(\"net\").connect(3000,\"127.0.0.1\").on(\"connect\",()=>process.exit(0)).on(\"error\",()=>process.exit(1))" && break
    sleep 5
  done
  $DC exec -T -e HOST_LOGIN_ID=silver -e HOST_PASSWORD="$HPW" -e HOST_NICKNAME=집주인 app node prisma/seed.mjs
  rm -f "$PWFILE"
  echo "=== 시드 완료 (비밀번호 파일 삭제됨) ==="
else
  echo "비밀번호 파일 없음 → 시드 생략"
fi

# 호스트 계정 변경: $OPS/host-reset 파일(1행 로그인ID, 2행 비밀번호)이 있으면 적용 후 삭제
RESETFILE=$OPS/host-reset
if [ -s "$RESETFILE" ]; then
  echo "=== 호스트 계정 갱신 ==="
  RID=$(sed -n 1p "$RESETFILE"); RPW=$(sed -n 2p "$RESETFILE")
  for i in $(seq 1 30); do
    $DC exec -T app node -e "require(\"net\").connect(3000,\"127.0.0.1\").on(\"connect\",()=>process.exit(0)).on(\"error\",()=>process.exit(1))" && break
    sleep 5
  done
  $DC exec -T -e HOST_LOGIN_ID="$RID" -e HOST_PASSWORD="$RPW" app node prisma/set-host.mjs
  rm -f "$RESETFILE"
  echo "=== 호스트 계정 갱신 완료 (파일 삭제됨) ==="
fi
echo "=== 배포 완료 $(date) ==="
