#!/bin/sh
# NAS 배포 (admin 계정, SSH에서 실행). admin은 docker 그룹에 속해 sudo가 필요 없다.
# 로그: /volume1/docker/vc-ops/deploy.log
set -e
cd "$(dirname "$0")/.."
export PATH=/usr/local/bin:/var/packages/ContainerManager/target/usr/bin:$PATH
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi
git pull
$DC up -d --build
$DC ps
echo "배포 완료 $(date)"
