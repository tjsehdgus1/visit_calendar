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

## NAS 배포

1. DSM → 패키지 센터에서 **Container Manager** 설치
2. SSH 접속 후 `/volume1/docker/visit_calendar`에 리포를 clone
3. `.env.production.example`을 `.env`로 복사하고 값을 채움
   - `AUTH_SECRET`은 `npx auth secret`으로 생성
   - 첫 배포 시 `docker compose config`로 compose 파일 문법을 확인한다
4. `sh scripts/deploy.sh`
5. 첫 배포 후 시드 실행:
   `docker compose exec app node node_modules/.bin/tsx prisma/seed.ts`
   (HOST_LOGIN_ID / HOST_PASSWORD 환경변수를 함께 전달)
6. DSM → 제어판 → 로그인 포털 → 고급 → **역방향 프록시**
   - 원본: `https` / `visit.<DDNS>.synology.me` / 443
   - 대상: `http` / `localhost` / 3000
7. DSM → 제어판 → 보안 → 인증서에서 **Let's Encrypt** 발급 후 위 도메인에 적용
8. DSM → 제어판 → 보안 → 방화벽에서 **443만 개방**
9. DSM → 제어판 → 작업 스케줄러에 `scripts/backup.sh`를 매일 새벽 4시로 등록
10. Hyper Backup에 `/volume1/backup/visit_calendar`와
    `/volume1/docker/visit_calendar/uploads`를 백업 대상으로 추가
    (**`pgdata` 디렉터리는 백업하지 않는다** — 실행 중 스냅샷은 복구가 보장되지 않는다)
