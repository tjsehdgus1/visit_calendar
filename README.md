# visit_calendar

집에 놀러 오는 지인들의 방문 기록을 캘린더로 남기고, 게임 요소(점수·칭호·뱃지)로 즐기는 비공개 웹앱.

- 스택: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS 4, Prisma 7, PostgreSQL 17, NextAuth (Auth.js v5)
- 설계 문서: [`docs/superpowers/specs/2026-08-26-visit-calendar-design.md`](docs/superpowers/specs/2026-08-26-visit-calendar-design.md)

## 로컬 개발 환경

### 1. 환경변수

```bash
cp .env.example .env
```

`.env`의 `AUTH_SECRET`은 암호학적으로 안전한 랜덤 값으로 채운다.

### 2. 데이터베이스

DB는 두 가지 방식 중 하나로 준비한다.

**A. 이 PC에 이미 설치된 로컬 PostgreSQL 사용 (기본, 포트 5432)**

`.env.example`의 `DATABASE_URL`은 로컬 PostgreSQL(5432)을 가리킨다. 아래 계정/DB가 미리 준비되어 있어야 한다 (없으면 관리자 권한으로 1회 생성).

- 유저: `visit` / 비밀번호: `visit_local_dev`
- 데이터베이스: `visit_calendar` (owner: `visit`)
- `prisma migrate dev`는 shadow database를 생성하므로 `visit` 계정에 `CREATEDB` 권한이 필요하다.

**B. Docker 컨테이너 사용 (Docker Desktop이 있는 머신, 포트 5433)**

```bash
npm run db:up
```

이 경우 `.env`의 `DATABASE_URL` 포트를 `5433`으로 바꿔야 한다 (`docker-compose.dev.yml` 참고).

### 3. 마이그레이션 및 시드

```bash
npm run db:migrate -- --name init
npm run db:seed
```

### 4. 개발 서버

```bash
npm run dev
```

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 (Prisma Client 생성 포함) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm test` | 단위 테스트 (`node:test`, `tests/`) |
| `npm run db:migrate` | 마이그레이션 생성/적용 (dev) |
| `npm run db:deploy` | 마이그레이션 적용 (운영) |
| `npm run db:seed` | 시드 실행 |
| `npm run db:studio` | Prisma Studio |
| `npm run db:up` / `db:down` | 개발용 Docker DB 컨테이너 기동/중지 |
| `npm run smoke` | 승인 플로우 스모크 테스트 (`scripts/smoke-approval.ts`) |

## NAS 배포 (DSM 7.2, 2026-09 검증)

DSM 제어판에서 `docker` 그룹을 만들어 admin을 넣고 Container Manager를 재시작하면 docker 소켓이
`root:docker`가 되어 admin이 sudo 없이 docker를 쓸 수 있다 (2026-09-07 적용). 그 전까지는 root 권한이
필요해 DSM 작업 스케줄러(root)로 `scripts/nas-deploy.sh`를 돌렸다 — 최초 구축·시드용으로 남겨 둔다.

### 최초 1회
1. 패키지 센터에서 **Container Manager**, **Git Server** 설치. 제어판 → 사용자 및 그룹 → 고급 → 사용자 홈 서비스 활성화
2. 제어판 → 터미널 및 SNMP → SSH 활성화. 공유기에서 외부 포트 → NAS 22 포워딩(외부 22는 막힐 수 있어 2222 권장)
3. 배포 PC에서 SSH 키를 만들어 `~/.ssh/authorized_keys`에 등록 (`chmod 755 ~`, `700 ~/.ssh`, `600 authorized_keys`)
4. SSH(admin)로 `/volume1/docker/visit_calendar`에 clone. `.env.production.example`을 `.env`로 복사해 채우고 `chmod 600`
   (`POSTGRES_PASSWORD`·`AUTH_SECRET`은 `openssl rand`로 생성. `AUTH_URL`은 두지 않는다 — 요청 호스트 신뢰)
5. `/volume1/docker/vc-ops/first-deploy.sh`를 만들어 `exec sh /volume1/docker/visit_calendar/scripts/nas-deploy.sh` 한 줄을 넣는다
6. 호스트 초기 비밀번호를 `/volume1/docker/vc-ops/host-init-password`(권한 600)에 저장한다. 채팅·명령줄에 남기지 않도록
   `read`로 입력받아 쓴다. 시드가 끝나면 스크립트가 이 파일을 지운다
7. 제어판 → 작업 스케줄러 → 사용자 정의 스크립트 `visit-deploy` (사용자 root, 반복 없음):
   `sh /volume1/docker/vc-ops/first-deploy.sh` → 실행. 로그는 `/volume1/docker/vc-ops/first-deploy.log`
8. 제어판 → 로그인 포털 → 고급 → **역방향 프록시** 규칙 2개
   - 바깥용: HTTPS `visit.<DDNS>` 443 → HTTP `localhost` 3000
   - 집 안용: HTTP `*` 8080 → HTTP `localhost` 3000 (통신사 공유기가 NAT 루프백을 지원하지 않아 집 와이파이에서는
     `http://<NAS IP>:8080`으로 접속한다. 공유기에 8080 포워딩은 하지 않는다)
9. 제어판 → 보안 → 인증서에서 **Let's Encrypt** 발급 (도메인 `<DDNS>`, SAN `visit.<DDNS>`) 후 위 항목에 지정
10. 작업 스케줄러에 `sh /volume1/docker/visit_calendar/scripts/backup.sh`를 매일 새벽 4시(admin, docker 그룹)로 등록
11. Hyper Backup에 `/volume1/docker/visit_calendar-backup`과 `/volume1/docker/visit_calendar/uploads`를 백업 대상으로 추가
    (**`pgdata` 디렉터리는 백업하지 않는다** — 실행 중 스냅샷은 복구가 보장되지 않는다)

### 코드 갱신 배포
SSH(admin)에서 한 줄. 빌드가 10분 안팎이라 세션과 분리해 돌리고 로그를 본다.
```bash
cd /volume1/docker/visit_calendar && setsid nohup sh scripts/deploy.sh > /volume1/docker/vc-ops/deploy.log 2>&1 < /dev/null &
```
`.dockerignore`가 `pgdata`·`uploads`를 제외하므로 admin 권한으로도 빌드 컨텍스트를 읽을 수 있다.
호스트 계정 생성·비밀번호 변경은 `prisma/set-host.mjs` (`docker-compose exec -e HOST_LOGIN_ID=<이름> -e HOST_PASSWORD=<숫자4자리> [-e HOST_FROM=<현재이름>] app node prisma/set-host.mjs`). 호스트는 여러 명일 수 있다.

### Docker 이미지 주의점
- `prisma.config.ts`가 빌드 시에도 `DATABASE_URL`을 요구해 builder 단계에 자리표시자를 준다
- Prisma CLI·시드 의존성은 `migrate-deps` 단계에서 통째로 설치한다 (개별 복사는 누락이 생긴다)
- Synology 공유 폴더의 파일 권한이 이미지에 그대로 복사되므로 runner에서 `chmod`로 읽기·실행 권한을 강제한다
- 바인드 마운트 폴더(`pgdata`, `uploads`)는 자동 생성되지 않아 스크립트가 만든다
