#!/bin/sh
set -e
echo "마이그레이션 적용 중…"
node node_modules/prisma/build/index.js migrate deploy
echo "서버 시작"
exec node server.js
