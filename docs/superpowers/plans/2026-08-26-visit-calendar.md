# visit_calendar 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 집에 놀러 온 지인들의 방문을 캘린더에 기록하고, 점수·랭킹·뱃지로 즐기는 비공개 웹앱을 자택 Synology NAS의 Docker에 배포한다.

**Architecture:** 기록의 단위는 개인 방문이 아니라 **모임(Visit) 1건 + 참석자 다수**다. 점수와 랭킹은 승인된 모임에서 **매번 계산**하고(테이블 없음), **뱃지 획득과 시즌 결과만 저장**한다. 점수·뱃지 판정은 DB를 모르는 순수 함수로 분리해 단위 테스트하고, Prisma 레이어가 그 함수에 넣을 데이터를 모아준다.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL 17 · NextAuth (Auth.js v5) Credentials · zod · sharp · node:test + tsx · Docker Compose

**Spec:** `docs/superpowers/specs/2026-08-26-visit-calendar-design.md`

## Global Constraints

- Node.js 22 이상. 패키지 매니저는 npm
- 응답·커밋 메시지·주석·UI 문구는 **한글**. 코드 식별자와 DB 컬럼은 영문
- 커밋 접두: `feat:` `fix:` `docs:` `chore:` `test:` + 한글 본문
- 커밋 메시지 말미에 `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`
- **`Visit.visitDate`는 `@db.Date`** (시각 없음). 앱 안에서는 `'YYYY-MM-DD'` 문자열로만 다룬다. **`new Date('YYYY-MM-DD')` 사용 금지** (UTC로 파싱되어 KST에서 하루 밀린다)
- **`UserBadge.seasonKey`에 NULL 금지.** 비시즌 뱃지 `"-"`, `SEASON_CHAMPION`은 `<seasonId>`, `TAG_KING`은 `<seasonId>:<tagSlug>`
- **점수·랭킹 테이블을 만들지 않는다.** 계산형 유지
- 권한 검사는 **서버 액션·API 라우트에서 매번** 수행. 화면 숨김만으로 막지 않는다
- Prisma 외의 DB 전용 API 금지. 파일 저장은 `lib/storage.ts`만 경유 (Neon·S3 이전 가능성 유지)
- `.env`는 커밋 금지. `.env.example`만 리포에 둔다
- 사용자 입력은 텍스트로만 렌더링. `dangerouslySetInnerHTML` 금지
- UI는 **모바일 우선 375px 기준**. 다크모드 없음
- 점수 배점·뱃지 조건·칭호 구간은 스펙 §4가 유일한 원본. 임의 변경 금지

## 파일 구조

| 파일 | 책임 |
|---|---|
| `prisma/schema.prisma` | 스키마 (스펙 §3.2 그대로) |
| `prisma/seed.ts` | Tag 8종, Badge 12종, 호스트 계정, 현재 시즌 시드 |
| `lib/date.ts` | KST 날짜 문자열·ISO 주 계산. **DB를 모른다** |
| `lib/scoring/points.ts` | 점수 계산 순수 함수. **DB를 모른다** |
| `lib/scoring/titles.ts` | 칭호 구간 판정. **DB를 모른다** |
| `lib/scoring/badges.ts` | 뱃지 획득 판정 순수 함수. **DB를 모른다** |
| `lib/scoring/collect.ts` | Prisma → 위 순수 함수들의 입력 타입으로 변환 |
| `lib/db.ts` | PrismaClient 싱글턴 |
| `lib/storage.ts` | 파일 저장·읽기 추상화 |
| `lib/auth/config.ts` | NextAuth 설정 |
| `lib/auth/guard.ts` | `requireUser()` / `requireHost()` |
| `lib/invite.ts` | 초대코드 생성·검증 |
| `proxy.ts` | 라우트 가드 (Next 16 미들웨어) |
| `app/(guest)/…` | 캘린더·랭킹·기록하기·프로필·명예의전당 |
| `app/admin/…` | 승인함·관리 |
| `app/api/photos/[id]/route.ts` | 사진 인증 서빙 |
| `tests/*.test.ts` | 순수 함수 단위 테스트 |
| `docker-compose.yml` / `Dockerfile` | 배포 |

**핵심 경계:** `lib/date.ts`, `lib/scoring/*` (collect 제외) 는 Prisma를 import 하지 않는다. 그래야 DB 없이 테스트가 돌고, 규칙을 마음껏 수정할 수 있다.

---

# Phase 0 — 기반

### Task 1: 프로젝트 스캐폴딩 + DB + 스키마 + 시드

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/globals.css`, `app/layout.tsx`, `app/page.tsx`
- Create: `docker-compose.dev.yml`, `.env.example`, `.env`
- Create: `prisma/schema.prisma`, `prisma/seed.ts`, `lib/db.ts`
- Create: `README.md`

**Interfaces:**
- Consumes: 없음 (첫 작업)
- Produces: `prisma`(PrismaClient 싱글턴, `lib/db.ts`의 named export), 시드된 Tag 8종 / Badge 12종 / 호스트 계정 / 현재 시즌

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd E:/DEV/visit_calendar
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm
```

`.git`과 `docs/`가 이미 있으므로 덮어쓸지 물으면 **유지**를 택한다. 생성 후 `.gitignore`가 덮어써졌다면 기존 항목(`uploads/`, `backup/`, `*.sql.gz`)을 다시 추가한다.

- [ ] **Step 2: 의존성 추가**

```bash
npm i @prisma/client@^7 @prisma/adapter-pg pg next-auth@beta bcryptjs zod sharp
npm i -D prisma@^7 tsx @types/bcryptjs @types/pg
```

- [ ] **Step 3: npm 스크립트 작성**

`package.json`의 `scripts`를 아래로 교체한다.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "prisma generate && next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit",
    "test": "node --import tsx --test tests/",
    "postinstall": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:deploy": "prisma migrate deploy",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio",
    "db:up": "docker compose -f docker-compose.dev.yml up -d",
    "db:down": "docker compose -f docker-compose.dev.yml down"
  }
}
```

- [ ] **Step 4: 로컬 개발용 DB 컨테이너**

`docker-compose.dev.yml`:

```yaml
services:
  db:
    image: postgres:17-alpine
    container_name: visit_calendar_dev_db
    environment:
      POSTGRES_USER: visit
      POSTGRES_PASSWORD: visit_local_dev
      POSTGRES_DB: visit_calendar
    ports:
      - "5433:5432"
    volumes:
      - ./.devdata/pgdata:/var/lib/postgresql/data
```

> 호스트 포트를 5433으로 두는 이유: 이 PC에 PostgreSQL 17이 5432로 이미 설치되어 있어 충돌한다.

`.gitignore`에 `.devdata/` 추가.

- [ ] **Step 5: 환경변수 파일**

`.env.example`:

```
DATABASE_URL="postgresql://visit:visit_local_dev@localhost:5433/visit_calendar?schema=public"
AUTH_SECRET=""
AUTH_URL="http://localhost:3000"
UPLOAD_DIR="./.devdata/uploads"
HOST_LOGIN_ID="silver"
HOST_PASSWORD="change-me-on-first-login"
HOST_NICKNAME="집주인"
```

`.env`는 위를 복사하고 `AUTH_SECRET`을 `npx auth secret`으로 채운다.

- [ ] **Step 6: Prisma 스키마 작성**

`prisma/schema.prisma` — **스펙 §3.2의 스키마를 그대로 옮긴다.** 상단에 다음을 둔다.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

스펙 §3.3의 주의사항 4가지를 스키마 주석으로 남긴다. 특히 `UserBadge.seasonKey`에는 다음 주석을 붙인다.

```prisma
  /// NULL 금지. 비시즌="-", SEASON_CHAMPION="<seasonId>", TAG_KING="<seasonId>:<tagSlug>"
  /// Postgres는 NULL을 서로 다른 값으로 취급해 @@unique가 무력화된다.
  seasonKey String @default("-")
```

- [ ] **Step 7: Prisma 클라이언트 싱글턴**

`lib/db.ts`:

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 8: 마이그레이션 실행**

```bash
npm run db:up
npm run db:migrate -- --name init
```

Expected: `prisma/migrations/*_init/` 생성, 테이블 12개 생성 성공

- [ ] **Step 9: 시드 스크립트**

`prisma/seed.ts`:

```ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const TAGS = [
  { slug: 'meal',      label: '밥',       emoji: '🍚', sortOrder: 1 },
  { slug: 'drink',     label: '술',       emoji: '🍺', sortOrder: 2 },
  { slug: 'boardgame', label: '보드게임', emoji: '🎲', sortOrder: 3 },
  { slug: 'movie',     label: '영화',     emoji: '🎬', sortOrder: 4 },
  { slug: 'game',      label: '게임',     emoji: '🎮', sortOrder: 5 },
  { slug: 'chat',      label: '수다',     emoji: '💬', sortOrder: 6 },
  { slug: 'cook',      label: '요리',     emoji: '👨‍🍳', sortOrder: 7 },
  { slug: 'sleepover', label: '자고감',   emoji: '🛏️', sortOrder: 8 },
]

const BADGES = [
  { code: 'FIRST_VISIT',     label: '개시',            emoji: '🎉', description: '처음으로 놀러왔을 때',                 repeatable: false, sortOrder: 1 },
  { code: 'VISIT_10',        label: '출석왕',          emoji: '🔟', description: '통산 10회 방문',                       repeatable: false, sortOrder: 2 },
  { code: 'VISIT_50',        label: '백번손님',        emoji: '💯', description: '통산 50회 방문',                       repeatable: false, sortOrder: 3 },
  { code: 'OVERNIGHT_3',     label: '새벽 생존자',     emoji: '🌅', description: '밤새 놀다 간 날 3회',                  repeatable: false, sortOrder: 4 },
  { code: 'STREAK_4W',       label: '정기구독',        emoji: '📅', description: '4주 연속 방문',                        repeatable: false, sortOrder: 5 },
  { code: 'ALL_TAGS',        label: '만능 엔터테이너', emoji: '🎲', description: '모든 활동을 한 번씩 경험',             repeatable: false, sortOrder: 6 },
  { code: 'PHOTO_30',        label: '사진사',          emoji: '📸', description: '사진 30장 업로드',                     repeatable: false, sortOrder: 7 },
  { code: 'MEMO_20',         label: '작가',            emoji: '✍️', description: '한 줄 메모 20건 작성',                 repeatable: false, sortOrder: 8 },
  { code: 'SOLO_5',          label: '독고다이',        emoji: '🧍', description: '혼자 방문 5회',                        repeatable: false, sortOrder: 9 },
  { code: 'CROWD_5',         label: '인싸',            emoji: '👥', description: '4명 이상 모인 자리 5회',               repeatable: false, sortOrder: 10 },
  { code: 'SEASON_CHAMPION', label: '시즌 챔피언',     emoji: '🏆', description: '시즌 랭킹 1위',                        repeatable: true,  sortOrder: 11 },
  { code: 'TAG_KING',        label: '부문왕',          emoji: '🥇', description: '시즌 내 특정 활동 1위',                repeatable: true,  sortOrder: 12 },
]

function currentQuarter(now: Date) {
  const y = now.getFullYear()
  const q = Math.floor(now.getMonth() / 3)
  const startMonth = q * 3
  const pad = (n: number) => String(n).padStart(2, '0')
  const endDay = [31, 30, 30, 31][q]
  return {
    name: `${y} ${q + 1}분기`,
    startDate: new Date(`${y}-${pad(startMonth + 1)}-01T00:00:00.000Z`),
    endDate: new Date(`${y}-${pad(startMonth + 3)}-${endDay}T00:00:00.000Z`),
  }
}

async function main() {
  for (const t of TAGS) {
    await prisma.tag.upsert({ where: { slug: t.slug }, update: t, create: t })
  }
  for (const b of BADGES) {
    await prisma.badge.upsert({ where: { code: b.code }, update: b, create: b })
  }

  const loginId = process.env.HOST_LOGIN_ID
  const password = process.env.HOST_PASSWORD
  if (!loginId || !password) throw new Error('HOST_LOGIN_ID / HOST_PASSWORD 환경변수가 필요합니다')

  await prisma.user.upsert({
    where: { loginId },
    update: { role: 'HOST' },
    create: {
      loginId,
      passwordHash: await bcrypt.hash(password, 12),
      nickname: process.env.HOST_NICKNAME ?? '집주인',
      role: 'HOST',
    },
  })

  const q = currentQuarter(new Date())
  await prisma.season.upsert({
    where: { startDate_endDate: { startDate: q.startDate, endDate: q.endDate } },
    update: { name: q.name },
    create: q,
  })

  console.log('시드 완료:', { tags: TAGS.length, badges: BADGES.length, host: loginId, season: q.name })
}

main().finally(() => prisma.$disconnect())
```

> `currentQuarter`의 `endDay`가 `[31, 30, 30, 31]`인 이유: 각 분기의 마지막 달은 3월(31일)·6월(30일)·9월(30일)·12월(31일)이다.

- [ ] **Step 10: 시드 실행 및 확인**

```bash
npm run db:seed
```

Expected: `시드 완료: { tags: 8, badges: 12, host: 'silver', season: '2026 3분기' }`

- [ ] **Step 11: 검증 후 커밋**

```bash
npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "feat: 프로젝트 스캐폴딩 및 DB 스키마·시드 구성

Next.js 16 + Prisma 7 + Postgres 17 기반 마련.
Tag 8종, Badge 12종, 호스트 계정, 현재 분기 시즌 시드 포함.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 1 — 순수 로직 (TDD)

> 이 단계의 파일들은 **Prisma를 import 하지 않는다.** DB 없이 테스트가 돌아야 한다.

### Task 2: 날짜 유틸

**Files:**
- Create: `lib/date.ts`
- Test: `tests/date.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `todayKst(): string` — 오늘 날짜 `'YYYY-MM-DD'` (KST 기준)
  - `toDateOnly(ymd: string): Date` — `@db.Date` 저장용 Date (UTC 자정)
  - `fromDateOnly(d: Date): string` — DB의 Date → `'YYYY-MM-DD'`
  - `isoWeekKey(ymd: string): string` — `'2026-W35'`
  - `consecutiveWeekRuns(weekKeys: string[]): number[]` — 연속 구간 길이 배열

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/date.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toDateOnly, fromDateOnly, isoWeekKey, consecutiveWeekRuns } from '../lib/date'

test('toDateOnly는 UTC 자정 Date를 만든다', () => {
  const d = toDateOnly('2026-08-26')
  assert.equal(d.toISOString(), '2026-08-26T00:00:00.000Z')
})

test('fromDateOnly는 toDateOnly의 역함수다', () => {
  assert.equal(fromDateOnly(toDateOnly('2026-01-01')), '2026-01-01')
  assert.equal(fromDateOnly(toDateOnly('2026-12-31')), '2026-12-31')
})

test('isoWeekKey는 ISO 주차를 반환한다', () => {
  // 2026-08-26은 수요일, ISO 35주차
  assert.equal(isoWeekKey('2026-08-26'), '2026-W35')
  // ISO 주는 월요일 시작 — 일요일은 직전 주에 속한다
  assert.equal(isoWeekKey('2026-08-30'), '2026-W35') // 일요일
  assert.equal(isoWeekKey('2026-08-31'), '2026-W36') // 월요일
})

test('isoWeekKey는 연말연시 경계에서 ISO 규칙을 따른다', () => {
  // 2027-01-01은 금요일 → 2026-W53에 속한다
  assert.equal(isoWeekKey('2027-01-01'), '2026-W53')
})

test('consecutiveWeekRuns는 연속 구간 길이를 반환한다', () => {
  assert.deepEqual(consecutiveWeekRuns(['2026-W01', '2026-W02', '2026-W03']), [3])
  assert.deepEqual(consecutiveWeekRuns(['2026-W01', '2026-W03']), [1, 1])
  assert.deepEqual(consecutiveWeekRuns([]), [])
})

test('consecutiveWeekRuns는 중복을 제거하고 정렬한다', () => {
  assert.deepEqual(consecutiveWeekRuns(['2026-W02', '2026-W01', '2026-W02']), [2])
})

test('consecutiveWeekRuns는 연도 경계를 넘어 이어진다', () => {
  // 2026년은 ISO 53주까지 있다
  assert.deepEqual(consecutiveWeekRuns(['2026-W52', '2026-W53', '2027-W01']), [3])
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/date'`

- [ ] **Step 3: 구현**

`lib/date.ts`:

```ts
/**
 * 날짜는 전부 'YYYY-MM-DD' 문자열로 다룬다.
 * new Date('YYYY-MM-DD')는 UTC로 파싱되어 KST에서 하루 밀리므로 직접 쓰지 않는다.
 */

const DAY_MS = 86_400_000

/** 오늘 날짜(KST) */
export function todayKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** @db.Date 컬럼에 저장할 Date (UTC 자정) */
export function toDateOnly(ymd: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) throw new Error(`날짜 형식이 잘못되었습니다: ${ymd}`)
  return new Date(`${ymd}T00:00:00.000Z`)
}

/** DB의 Date → 'YYYY-MM-DD' */
export function fromDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** ISO-8601 주차 키. 월요일 시작, 목요일이 속한 해가 그 주의 연도 */
export function isoWeekKey(ymd: string): string {
  const d = toDateOnly(ymd)
  // getUTCDay(): 일=0 → 7로 바꿔 월=1..일=7
  const dayNum = d.getUTCDay() || 7
  // 그 주의 목요일로 이동
  const thursday = new Date(d.getTime() + (4 - dayNum) * DAY_MS)
  const year = thursday.getUTCFullYear()
  const jan1 = new Date(Date.UTC(year, 0, 1))
  const week = Math.floor((thursday.getTime() - jan1.getTime()) / (7 * DAY_MS)) + 1
  return `${year}-W${String(week).padStart(2, '0')}`
}

/** 주차 키 목록에서 연속 구간의 길이들을 구한다 */
export function consecutiveWeekRuns(weekKeys: string[]): number[] {
  const unique = [...new Set(weekKeys)].sort()
  if (unique.length === 0) return []

  const runs: number[] = []
  let current = 1
  for (let i = 1; i < unique.length; i++) {
    if (isNextWeek(unique[i - 1], unique[i])) current++
    else {
      runs.push(current)
      current = 1
    }
  }
  runs.push(current)
  return runs
}

/** b가 a의 바로 다음 주인가 (연도 경계 포함) */
function isNextWeek(a: string, b: string): boolean {
  return isoWeekKey(mondayOf(a, 7)) === b
}

/** 주차 키의 월요일에서 offsetDays 만큼 이동한 날짜 문자열 */
function mondayOf(weekKey: string, offsetDays = 0): string {
  const [yearStr, weekStr] = weekKey.split('-W')
  const year = Number(yearStr)
  const week = Number(weekStr)
  // 1월 4일은 항상 ISO 1주차에 속한다
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const jan4Day = jan4.getUTCDay() || 7
  const week1Monday = jan4.getTime() - (jan4Day - 1) * DAY_MS
  const monday = new Date(week1Monday + (week - 1) * 7 * DAY_MS + offsetDays * DAY_MS)
  return monday.toISOString().slice(0, 10)
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 6개 테스트 전부 통과

- [ ] **Step 5: 커밋**

```bash
git add lib/date.ts tests/date.test.ts
git commit -m "feat: KST 날짜·ISO 주차 유틸 추가

new Date('YYYY-MM-DD')의 UTC 파싱으로 인한 하루 밀림을 원천 차단.
연속 방문 보너스 계산에 쓸 consecutiveWeekRuns 포함.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: 점수 계산 엔진

**Files:**
- Create: `lib/scoring/points.ts`, `lib/scoring/titles.ts`
- Test: `tests/points.test.ts`, `tests/titles.test.ts`

**Interfaces:**
- Consumes: `lib/date.ts`의 `isoWeekKey`, `consecutiveWeekRuns`
- Produces:
  - `type TimeSlot = 'DAY' | 'EVENING' | 'OVERNIGHT'`
  - `type ScorableVisit = { visitDate: string; timeSlot: TimeSlot; hasMemo: boolean; photoCount: number; attendeeCount: number }`
  - `visitPoints(v: ScorableVisit): number` — 모임 단건 점수
  - `streakBonus(visits: { visitDate: string }[]): number`
  - `totalPoints(visits: ScorableVisit[], opts: { includeFirstVisitBonus: boolean }): number`
  - `titleFor(points: number): { label: string; min: number; next: { label: string; min: number } | null }`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/points.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { visitPoints, streakBonus, totalPoints, type ScorableVisit } from '../lib/scoring/points'

const base: ScorableVisit = {
  visitDate: '2026-08-26',
  timeSlot: 'DAY',
  hasMemo: false,
  photoCount: 0,
  attendeeCount: 1,
}

test('낮에 혼자 와서 아무 기록도 안 남기면 10점', () => {
  assert.equal(visitPoints(base), 10)
})

test('시간대 가산: 낮 +0, 저녁 +3, 밤새 +7', () => {
  assert.equal(visitPoints({ ...base, timeSlot: 'DAY' }), 10)
  assert.equal(visitPoints({ ...base, timeSlot: 'EVENING' }), 13)
  assert.equal(visitPoints({ ...base, timeSlot: 'OVERNIGHT' }), 17)
})

test('메모 +3, 사진 +5 (장수와 무관하게 1회)', () => {
  assert.equal(visitPoints({ ...base, hasMemo: true }), 13)
  assert.equal(visitPoints({ ...base, photoCount: 1 }), 15)
  assert.equal(visitPoints({ ...base, photoCount: 9 }), 15)
})

test('동반자 가산은 (참석자수-1)이며 최대 3점', () => {
  assert.equal(visitPoints({ ...base, attendeeCount: 1 }), 10)
  assert.equal(visitPoints({ ...base, attendeeCount: 2 }), 11)
  assert.equal(visitPoints({ ...base, attendeeCount: 4 }), 13)
  assert.equal(visitPoints({ ...base, attendeeCount: 9 }), 13) // 상한
})

test('밤새 + 메모 + 사진 + 4명이면 25점', () => {
  assert.equal(
    visitPoints({ ...base, timeSlot: 'OVERNIGHT', hasMemo: true, photoCount: 2, attendeeCount: 4 }),
    25,
  )
})

test('연속 보너스는 4주 묶음마다 15점', () => {
  const weeks = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      visitDate: addDays('2026-01-05', i * 7), // 2026-01-05는 월요일
    }))

  assert.equal(streakBonus(weeks(3)), 0)
  assert.equal(streakBonus(weeks(4)), 15)
  assert.equal(streakBonus(weeks(8)), 30)
  assert.equal(streakBonus(weeks(9)), 30)
})

test('같은 주에 여러 번 와도 한 주로 센다', () => {
  const sameWeek = [
    { visitDate: '2026-01-05' },
    { visitDate: '2026-01-06' },
    { visitDate: '2026-01-07' },
    { visitDate: '2026-01-08' },
  ]
  assert.equal(streakBonus(sameWeek), 0)
})

test('연속이 끊기면 구간별로 따로 센다', () => {
  const run1 = [0, 1, 2, 3].map((i) => ({ visitDate: addDays('2026-01-05', i * 7) }))
  const run2 = [0, 1, 2, 3].map((i) => ({ visitDate: addDays('2026-04-06', i * 7) }))
  assert.equal(streakBonus([...run1, ...run2]), 30)
})

test('totalPoints는 첫 방문 보너스 20점을 통산에만 더한다', () => {
  const one = [base]
  assert.equal(totalPoints(one, { includeFirstVisitBonus: true }), 30)
  assert.equal(totalPoints(one, { includeFirstVisitBonus: false }), 10)
})

test('방문이 없으면 첫 방문 보너스도 없다', () => {
  assert.equal(totalPoints([], { includeFirstVisitBonus: true }), 0)
})

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00.000Z`)
  return new Date(d.getTime() + days * 86_400_000).toISOString().slice(0, 10)
}
```

`tests/titles.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { titleFor } from '../lib/scoring/titles'

test('구간별 칭호를 반환한다', () => {
  assert.equal(titleFor(0).label, '잠깐손님')
  assert.equal(titleFor(49).label, '잠깐손님')
  assert.equal(titleFor(50).label, '눈도장')
  assert.equal(titleFor(150).label, '단골')
  assert.equal(titleFor(350).label, '터줏대감')
  assert.equal(titleFor(700).label, '이집사람')
  assert.equal(titleFor(1500).label, '세대주')
  assert.equal(titleFor(99999).label, '세대주')
})

test('다음 칭호와 그 문턱을 알려준다', () => {
  assert.deepEqual(titleFor(10).next, { label: '눈도장', min: 50 })
})

test('최고 칭호에서는 next가 null이다', () => {
  assert.equal(titleFor(2000).next, null)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/scoring/points'`

- [ ] **Step 3: 구현**

`lib/scoring/points.ts`:

```ts
import { isoWeekKey, consecutiveWeekRuns } from '../date'

export type TimeSlot = 'DAY' | 'EVENING' | 'OVERNIGHT'

export type ScorableVisit = {
  visitDate: string
  timeSlot: TimeSlot
  hasMemo: boolean
  photoCount: number
  attendeeCount: number
}

/** 스펙 §4.1 — 배점은 여기가 유일한 원본 */
export const POINTS = {
  VISIT: 10,
  SLOT: { DAY: 0, EVENING: 3, OVERNIGHT: 7 } as Record<TimeSlot, number>,
  MEMO: 3,
  PHOTO: 5,
  COMPANION_PER_HEAD: 1,
  COMPANION_CAP: 3,
  FIRST_VISIT: 20,
  STREAK_WEEKS: 4,
  STREAK_REWARD: 15,
} as const

/** 모임 단건 점수 (참석자 각자에게 동일하게 부여) */
export function visitPoints(v: ScorableVisit): number {
  const companions = Math.min(
    Math.max(v.attendeeCount - 1, 0) * POINTS.COMPANION_PER_HEAD,
    POINTS.COMPANION_CAP,
  )
  return (
    POINTS.VISIT +
    POINTS.SLOT[v.timeSlot] +
    (v.hasMemo ? POINTS.MEMO : 0) +
    (v.photoCount > 0 ? POINTS.PHOTO : 0) +
    companions
  )
}

/** 연속 방문 보너스: 각 연속 구간의 (주 수 ÷ 4) 몫 × 15점 */
export function streakBonus(visits: { visitDate: string }[]): number {
  const runs = consecutiveWeekRuns(visits.map((v) => isoWeekKey(v.visitDate)))
  return runs.reduce(
    (sum, run) => sum + Math.floor(run / POINTS.STREAK_WEEKS) * POINTS.STREAK_REWARD,
    0,
  )
}

export function totalPoints(
  visits: ScorableVisit[],
  opts: { includeFirstVisitBonus: boolean },
): number {
  const base = visits.reduce((sum, v) => sum + visitPoints(v), 0)
  const first = opts.includeFirstVisitBonus && visits.length > 0 ? POINTS.FIRST_VISIT : 0
  return base + first + streakBonus(visits)
}
```

`lib/scoring/titles.ts`:

```ts
/** 스펙 §4.2 — 통산 누적 점수 기준 칭호 */
export const TITLES = [
  { min: 0, label: '잠깐손님' },
  { min: 50, label: '눈도장' },
  { min: 150, label: '단골' },
  { min: 350, label: '터줏대감' },
  { min: 700, label: '이집사람' },
  { min: 1500, label: '세대주' },
] as const

export type Title = { label: string; min: number; next: { label: string; min: number } | null }

export function titleFor(points: number): Title {
  let index = 0
  for (let i = 0; i < TITLES.length; i++) {
    if (points >= TITLES[i].min) index = i
  }
  const current = TITLES[index]
  const upcoming = TITLES[index + 1]
  return {
    label: current.label,
    min: current.min,
    next: upcoming ? { label: upcoming.label, min: upcoming.min } : null,
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — date 6개 + points 10개 + titles 3개 = 19개 통과

- [ ] **Step 5: 커밋**

```bash
git add lib/scoring tests/points.test.ts tests/titles.test.ts
git commit -m "feat: 점수 계산 엔진과 칭호 판정 추가

스펙 §4.1/§4.2 배점을 POINTS·TITLES 상수 한 곳에 모음.
DB를 모르는 순수 함수라 규칙 변경이 자유롭다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: 뱃지 판정 엔진

**Files:**
- Create: `lib/scoring/badges.ts`
- Test: `tests/badges.test.ts`

**Interfaces:**
- Consumes: `lib/date.ts`, `lib/scoring/points.ts`의 `ScorableVisit`
- Produces:
  - `type BadgeContext = { visits: ScorableVisit[]; visitTagSlugs: string[][]; activeTagSlugs: string[]; uploadedPhotoCount: number; authoredMemoCount: number }`
  - `earnedBadgeCodes(ctx: BadgeContext): string[]` — 비시즌 뱃지 10종만 판정 (시즌 뱃지는 Task 13에서 별도)
  - `seasonKeyFor(code: string, seasonId?: string, tagSlug?: string): string`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/badges.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { earnedBadgeCodes, seasonKeyFor, type BadgeContext } from '../lib/scoring/badges'
import type { ScorableVisit } from '../lib/scoring/points'

function visit(over: Partial<ScorableVisit> = {}): ScorableVisit {
  return {
    visitDate: '2026-08-26',
    timeSlot: 'DAY',
    hasMemo: false,
    photoCount: 0,
    attendeeCount: 1,
    ...over,
  }
}

function ctx(over: Partial<BadgeContext> = {}): BadgeContext {
  return {
    visits: [],
    visitTagSlugs: [],
    activeTagSlugs: ['meal', 'drink'],
    uploadedPhotoCount: 0,
    authoredMemoCount: 0,
    ...over,
  }
}

test('방문이 없으면 아무 뱃지도 없다', () => {
  assert.deepEqual(earnedBadgeCodes(ctx()), [])
})

test('첫 방문에 FIRST_VISIT', () => {
  const got = earnedBadgeCodes(ctx({ visits: [visit()], visitTagSlugs: [[]] }))
  assert.ok(got.includes('FIRST_VISIT'))
})

test('10회·50회 문턱', () => {
  const nine = ctx({ visits: Array.from({ length: 9 }, () => visit()) })
  assert.ok(!earnedBadgeCodes(nine).includes('VISIT_10'))

  const ten = ctx({ visits: Array.from({ length: 10 }, () => visit()) })
  assert.ok(earnedBadgeCodes(ten).includes('VISIT_10'))
  assert.ok(!earnedBadgeCodes(ten).includes('VISIT_50'))

  const fifty = ctx({ visits: Array.from({ length: 50 }, () => visit()) })
  assert.ok(earnedBadgeCodes(fifty).includes('VISIT_50'))
})

test('밤샘 3회에 OVERNIGHT_3', () => {
  const two = ctx({ visits: [visit({ timeSlot: 'OVERNIGHT' }), visit({ timeSlot: 'OVERNIGHT' })] })
  assert.ok(!earnedBadgeCodes(two).includes('OVERNIGHT_3'))

  const three = ctx({ visits: Array.from({ length: 3 }, () => visit({ timeSlot: 'OVERNIGHT' })) })
  assert.ok(earnedBadgeCodes(three).includes('OVERNIGHT_3'))
})

test('4주 연속에 STREAK_4W', () => {
  const dates = ['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']
  const c = ctx({ visits: dates.map((d) => visit({ visitDate: d })) })
  assert.ok(earnedBadgeCodes(c).includes('STREAK_4W'))
})

test('활성 태그를 모두 경험해야 ALL_TAGS', () => {
  const partial = ctx({ visits: [visit()], visitTagSlugs: [['meal']] })
  assert.ok(!earnedBadgeCodes(partial).includes('ALL_TAGS'))

  const full = ctx({ visits: [visit(), visit()], visitTagSlugs: [['meal'], ['drink']] })
  assert.ok(earnedBadgeCodes(full).includes('ALL_TAGS'))
})

test('비활성 태그는 ALL_TAGS 조건에 포함되지 않는다', () => {
  const c = ctx({
    visits: [visit()],
    visitTagSlugs: [['meal', 'drink']],
    activeTagSlugs: ['meal', 'drink'],
  })
  assert.ok(earnedBadgeCodes(c).includes('ALL_TAGS'))
})

test('사진 30장에 PHOTO_30, 메모 20건에 MEMO_20', () => {
  const c = ctx({ visits: [visit()], uploadedPhotoCount: 30, authoredMemoCount: 20 })
  const got = earnedBadgeCodes(c)
  assert.ok(got.includes('PHOTO_30'))
  assert.ok(got.includes('MEMO_20'))
})

test('혼자 5회에 SOLO_5, 4명 이상 5회에 CROWD_5', () => {
  const solo = ctx({ visits: Array.from({ length: 5 }, () => visit({ attendeeCount: 1 })) })
  assert.ok(earnedBadgeCodes(solo).includes('SOLO_5'))

  const crowd = ctx({ visits: Array.from({ length: 5 }, () => visit({ attendeeCount: 4 })) })
  assert.ok(earnedBadgeCodes(crowd).includes('CROWD_5'))
  assert.ok(!earnedBadgeCodes(crowd).includes('SOLO_5'))
})

test('시즌 뱃지는 여기서 판정하지 않는다', () => {
  const many = ctx({ visits: Array.from({ length: 50 }, () => visit()) })
  const got = earnedBadgeCodes(many)
  assert.ok(!got.includes('SEASON_CHAMPION'))
  assert.ok(!got.includes('TAG_KING'))
})

test('seasonKeyFor: 비시즌 뱃지는 "-", 시즌 뱃지는 규칙대로', () => {
  assert.equal(seasonKeyFor('VISIT_10'), '-')
  assert.equal(seasonKeyFor('SEASON_CHAMPION', 'season1'), 'season1')
  assert.equal(seasonKeyFor('TAG_KING', 'season1', 'meal'), 'season1:meal')
})

test('seasonKeyFor: TAG_KING은 부문마다 다른 키를 만든다', () => {
  // 한 시즌에 여러 부문을 석권해도 유니크 제약에 막히지 않아야 한다
  assert.notEqual(
    seasonKeyFor('TAG_KING', 'season1', 'meal'),
    seasonKeyFor('TAG_KING', 'season1', 'drink'),
  )
})

test('seasonKeyFor: 시즌 뱃지에 seasonId가 없으면 예외', () => {
  assert.throws(() => seasonKeyFor('SEASON_CHAMPION'))
  assert.throws(() => seasonKeyFor('TAG_KING', 'season1'))
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/scoring/badges'`

- [ ] **Step 3: 구현**

`lib/scoring/badges.ts`:

```ts
import { isoWeekKey, consecutiveWeekRuns } from '../date'
import type { ScorableVisit } from './points'

export type BadgeContext = {
  /** 승인된 방문 전체 */
  visits: ScorableVisit[]
  /** visits와 같은 순서·같은 길이. 각 모임의 태그 slug 목록 */
  visitTagSlugs: string[][]
  /** 현재 활성 태그 slug 목록 (ALL_TAGS 판정 기준) */
  activeTagSlugs: string[]
  /** 이 사용자가 업로드한 사진 총 수 */
  uploadedPhotoCount: number
  /** 이 사용자가 제출자로서 메모를 남긴 승인 모임 수 */
  authoredMemoCount: number
}

const STREAK_WEEKS = 4

/**
 * 비시즌 뱃지 10종을 판정한다.
 * SEASON_CHAMPION / TAG_KING은 시즌 마감 로직에서 따로 부여한다.
 */
export function earnedBadgeCodes(ctx: BadgeContext): string[] {
  const { visits, visitTagSlugs, activeTagSlugs, uploadedPhotoCount, authoredMemoCount } = ctx
  const codes: string[] = []
  const count = visits.length
  if (count === 0) return codes

  codes.push('FIRST_VISIT')
  if (count >= 10) codes.push('VISIT_10')
  if (count >= 50) codes.push('VISIT_50')

  if (visits.filter((v) => v.timeSlot === 'OVERNIGHT').length >= 3) codes.push('OVERNIGHT_3')

  const runs = consecutiveWeekRuns(visits.map((v) => isoWeekKey(v.visitDate)))
  if (runs.some((r) => r >= STREAK_WEEKS)) codes.push('STREAK_4W')

  const experienced = new Set(visitTagSlugs.flat())
  if (activeTagSlugs.length > 0 && activeTagSlugs.every((slug) => experienced.has(slug))) {
    codes.push('ALL_TAGS')
  }

  if (uploadedPhotoCount >= 30) codes.push('PHOTO_30')
  if (authoredMemoCount >= 20) codes.push('MEMO_20')

  if (visits.filter((v) => v.attendeeCount === 1).length >= 5) codes.push('SOLO_5')
  if (visits.filter((v) => v.attendeeCount >= 4).length >= 5) codes.push('CROWD_5')

  return codes
}

/**
 * UserBadge.seasonKey 값을 만든다.
 * NULL을 쓰면 Postgres가 NULL을 서로 다른 값으로 취급해 @@unique가 무력화된다.
 */
export function seasonKeyFor(code: string, seasonId?: string, tagSlug?: string): string {
  if (code === 'SEASON_CHAMPION') {
    if (!seasonId) throw new Error('SEASON_CHAMPION에는 seasonId가 필요합니다')
    return seasonId
  }
  if (code === 'TAG_KING') {
    if (!seasonId || !tagSlug) throw new Error('TAG_KING에는 seasonId와 tagSlug가 필요합니다')
    return `${seasonId}:${tagSlug}`
  }
  return '-'
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 총 33개 통과

- [ ] **Step 5: 커밋**

```bash
git add lib/scoring/badges.ts tests/badges.test.ts
git commit -m "feat: 뱃지 판정 엔진 추가

비시즌 뱃지 10종 판정 + seasonKey 생성 규칙.
TAG_KING은 <seasonId>:<tagSlug> 형태로 부문 동시 석권을 허용한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 2 — 인증

### Task 5: 초대코드 발급·검증 + 가입

**Files:**
- Create: `lib/invite.ts`, `lib/validation.ts`, `app/(auth)/signup/page.tsx`, `app/(auth)/signup/actions.ts`
- Test: `tests/invite.test.ts`

**Interfaces:**
- Consumes: `lib/db.ts`의 `prisma`
- Produces:
  - `generateInviteCode(): string` — 혼동 문자 제외 8자
  - `redeemInviteCode(tx, code): Promise<string>` — 코드 id 반환, 실패 시 throw
  - `signupSchema` (zod), `signup(formData)` 서버 액션

- [ ] **Step 1: 코드 생성기 테스트**

`tests/invite.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { generateInviteCode, INVITE_ALPHABET } from '../lib/invite'

test('초대코드는 8자다', () => {
  assert.equal(generateInviteCode().length, 8)
})

test('초대코드에 혼동 문자(0 O 1 I L)가 없다', () => {
  for (let i = 0; i < 200; i++) {
    assert.ok(!/[0O1IL]/.test(generateInviteCode()))
  }
})

test('알파벳은 허용 문자만 담는다', () => {
  assert.ok(!/[0O1IL]/.test(INVITE_ALPHABET))
  assert.ok(INVITE_ALPHABET.length >= 20)
})

test('연속 생성 시 사실상 중복되지 않는다', () => {
  const set = new Set(Array.from({ length: 500 }, () => generateInviteCode()))
  assert.equal(set.size, 500)
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/invite'`

- [ ] **Step 3: 구현**

`lib/invite.ts`:

```ts
import { randomInt } from 'node:crypto'
import type { Prisma } from '@prisma/client'

/** 0/O, 1/I/L 처럼 눈으로 헷갈리는 글자를 뺀다 (전화로 불러줄 수 있어야 함) */
export const INVITE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

export function generateInviteCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) code += INVITE_ALPHABET[randomInt(INVITE_ALPHABET.length)]
  return code
}

export class InviteError extends Error {}

/**
 * 초대코드를 사용 처리한다. 반드시 트랜잭션 안에서 호출할 것.
 * updateMany의 조건부 갱신으로 동시 가입 시 한도 초과를 막는다.
 */
export async function redeemInviteCode(
  tx: Prisma.TransactionClient,
  code: string,
): Promise<string> {
  const invite = await tx.inviteCode.findUnique({ where: { code: code.trim().toUpperCase() } })
  if (!invite) throw new InviteError('초대코드가 올바르지 않습니다.')
  if (invite.revokedAt) throw new InviteError('사용이 중지된 초대코드입니다.')
  if (invite.expiresAt && invite.expiresAt < new Date()) throw new InviteError('만료된 초대코드입니다.')

  const updated = await tx.inviteCode.updateMany({
    where: { id: invite.id, usedCount: { lt: invite.maxUses }, revokedAt: null },
    data: { usedCount: { increment: 1 } },
  })
  if (updated.count === 0) throw new InviteError('이미 다 사용된 초대코드입니다.')

  return invite.id
}
```

`lib/validation.ts`:

```ts
import { z } from 'zod'

export const signupSchema = z.object({
  inviteCode: z.string().trim().min(1, '초대코드를 입력해 주세요.'),
  loginId: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9_]{4,20}$/, '아이디는 영문·숫자·밑줄 4~20자여야 합니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.'),
  nickname: z.string().trim().min(1, '닉네임을 입력해 주세요.').max(20, '닉네임은 20자 이하여야 합니다.'),
})

export const visitSchema = z.object({
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식이 올바르지 않습니다.'),
  timeSlot: z.enum(['DAY', 'EVENING', 'OVERNIGHT']),
  memo: z.string().trim().max(200, '메모는 200자 이하여야 합니다.').optional(),
  tagIds: z.array(z.string()).min(1, '활동을 하나 이상 선택해 주세요.'),
  attendeeIds: z.array(z.string()).min(1, '참석자를 한 명 이상 선택해 주세요.'),
})
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 총 37개 통과

- [ ] **Step 5: 가입 서버 액션**

`app/(auth)/signup/actions.ts`:

```ts
'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { redeemInviteCode, InviteError } from '@/lib/invite'
import { signupSchema } from '@/lib/validation'

export type SignupState = { error?: string }

export async function signup(_prev: SignupState, formData: FormData): Promise<SignupState> {
  const parsed = signupSchema.safeParse({
    inviteCode: formData.get('inviteCode'),
    loginId: formData.get('loginId'),
    password: formData.get('password'),
    nickname: formData.get('nickname'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { inviteCode, loginId, password, nickname } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      const exists = await tx.user.findUnique({ where: { loginId } })
      if (exists) throw new InviteError('이미 사용 중인 아이디입니다.')

      const inviteId = await redeemInviteCode(tx, inviteCode)
      await tx.user.create({
        data: {
          loginId,
          passwordHash: await bcrypt.hash(password, 12),
          nickname,
          role: 'GUEST',
          invitedByCodeId: inviteId,
        },
      })
    })
  } catch (e) {
    if (e instanceof InviteError) return { error: e.message }
    return { error: '가입 처리 중 문제가 발생했습니다.' }
  }

  redirect('/login?signup=1')
}
```

- [ ] **Step 6: 가입 화면**

`app/(auth)/signup/page.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup, type SignupState } from './actions'

export default function SignupPage() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {})

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">가입하기</h1>
      <p className="mb-6 text-sm text-neutral-500">집주인에게 받은 초대코드가 필요합니다.</p>

      <form action={action} className="flex flex-col gap-3">
        <input name="inviteCode" placeholder="초대코드" autoCapitalize="characters" required className="rounded-lg border px-3 py-3" />
        <input name="loginId" placeholder="아이디 (영문·숫자 4~20자)" autoCapitalize="none" required className="rounded-lg border px-3 py-3" />
        <input name="password" type="password" placeholder="비밀번호 (8자 이상)" required className="rounded-lg border px-3 py-3" />
        <input name="nickname" placeholder="닉네임" required className="rounded-lg border px-3 py-3" />

        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="mt-2 rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50">
          {pending ? '가입 중…' : '가입하기'}
        </button>
      </form>

      <Link href="/login" className="mt-6 text-center text-sm text-neutral-500 underline">
        이미 계정이 있어요
      </Link>
    </main>
  )
}
```

- [ ] **Step 7: 검증 후 커밋**

```bash
npm test && npm run lint && npm run typecheck
git add -A
git commit -m "feat: 초대코드 기반 회원가입 구현

혼동 문자를 뺀 8자 코드, 트랜잭션 안 조건부 갱신으로 동시 가입 시
사용 한도 초과를 방지한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: 로그인 + 라우트 가드

**Files:**
- Create: `lib/auth/config.ts`, `lib/auth/guard.ts`, `auth.ts`, `proxy.ts`
- Create: `app/(auth)/login/page.tsx`, `app/(auth)/login/actions.ts`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `prisma`, `lib/validation.ts`
- Produces:
  - `auth()` — 서버에서 세션 조회 (`auth.ts`의 named export)
  - `requireUser(): Promise<SessionUser>` — 비로그인 시 `/login`으로 redirect
  - `requireHost(): Promise<SessionUser>` — 호스트 아니면 `/`로 redirect
  - `type SessionUser = { id: string; loginId: string; nickname: string; role: 'HOST' | 'GUEST' }`

- [ ] **Step 1: NextAuth 설정**

`lib/auth/config.ts`:

```ts
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const MAX_FAILURES = 5
const LOCK_MS = 10 * 60 * 1000
const failures = new Map<string, { count: number; until: number }>()

function isLocked(loginId: string): boolean {
  const f = failures.get(loginId)
  if (!f) return false
  if (Date.now() > f.until) {
    failures.delete(loginId)
    return false
  }
  return f.count >= MAX_FAILURES
}

function recordFailure(loginId: string) {
  const f = failures.get(loginId) ?? { count: 0, until: 0 }
  failures.set(loginId, { count: f.count + 1, until: Date.now() + LOCK_MS })
}

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { loginId: {}, password: {} },
      async authorize(raw) {
        const loginId = String(raw?.loginId ?? '').trim()
        const password = String(raw?.password ?? '')
        if (!loginId || !password) return null
        if (isLocked(loginId)) return null

        const user = await prisma.user.findUnique({ where: { loginId } })
        if (!user || user.status !== 'ACTIVE') {
          recordFailure(loginId)
          return null
        }
        if (!(await bcrypt.compare(password, user.passwordHash))) {
          recordFailure(loginId)
          return null
        }

        failures.delete(loginId)
        return { id: user.id, loginId: user.loginId, nickname: user.nickname, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id
        token.loginId = (user as { loginId: string }).loginId
        token.nickname = (user as { nickname: string }).nickname
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        id: String(token.uid),
        loginId: String(token.loginId),
        nickname: String(token.nickname),
        role: token.role as 'HOST' | 'GUEST',
      }
      return session
    },
  },
}
```

> 실패 카운터를 메모리에 두는 이유: 컨테이너 1대 운영이고 재시작 시 초기화돼도 무방하다. 여러 대로 늘릴 계획이 없으므로 DB 테이블을 만들지 않는다(YAGNI).

`auth.ts` (프로젝트 루트):

```ts
import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth/config'

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
```

`app/api/auth/[...nextauth]/route.ts`:

```ts
export { GET, POST } from '@/auth'
```

- [ ] **Step 2: 권한 가드**

`lib/auth/guard.ts`:

```ts
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export type SessionUser = {
  id: string
  loginId: string
  nickname: string
  role: 'HOST' | 'GUEST'
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth()
  const u = session?.user as SessionUser | undefined
  return u?.id ? u : null
}

/** 로그인 필수. 서버 액션·페이지에서 매번 호출한다 */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser()
  if (!user) redirect('/login')
  return user
}

/** 호스트 전용 */
export async function requireHost(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'HOST') redirect('/')
  return user
}
```

- [ ] **Step 3: 라우트 가드 (Next 16은 `proxy.ts`)**

`proxy.ts`:

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/auth'

const PUBLIC_PATHS = ['/login', '/signup']

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const session = await auth()
  if (!session?.user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)'],
}
```

> 여기서 막는 것은 1차 방어일 뿐이다. **각 서버 액션에서 `requireUser()`/`requireHost()`를 반드시 다시 호출한다.**

- [ ] **Step 4: 로그인 화면**

`app/(auth)/login/actions.ts`:

```ts
'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn('credentials', {
      loginId: String(formData.get('loginId') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: '/',
    })
    return {}
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
    }
    throw e // redirect 예외는 그대로 통과시켜야 한다
  }
}
```

`app/(auth)/login/page.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, type LoginState } from './actions'

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">우리집 방문일지</h1>

      <form action={action} className="flex flex-col gap-3">
        <input name="loginId" placeholder="아이디" autoCapitalize="none" required className="rounded-lg border px-3 py-3" />
        <input name="password" type="password" placeholder="비밀번호" required className="rounded-lg border px-3 py-3" />

        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="mt-2 rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50">
          {pending ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <Link href="/signup" className="mt-6 text-center text-sm text-neutral-500 underline">
        초대코드로 가입하기
      </Link>
    </main>
  )
}
```

- [ ] **Step 5: 수동 확인**

```bash
npm run dev
```

1. `http://localhost:3000/` 접속 → `/login`으로 리다이렉트되는지
2. 시드한 호스트 계정으로 로그인 → `/`로 이동하는지
3. 틀린 비밀번호 5회 → 6번째부터 맞는 비밀번호로도 실패하는지 (10분 잠금)

- [ ] **Step 6: 검증 후 커밋**

```bash
npm test && npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "feat: 아이디·비밀번호 로그인과 라우트 가드 구현

NextAuth Credentials + JWT 세션. 로그인 5회 실패 시 10분 잠금.
proxy.ts는 1차 방어이며 서버 액션에서 requireUser로 재검증한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 3 — 방문 기록과 승인

### Task 7: 파일 저장 추상화 + 사진 업로드·서빙

**Files:**
- Create: `lib/storage.ts`, `app/api/photos/[id]/route.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: 없음 (파일시스템만)
- Produces:
  - `savePhoto(buffer: Buffer): Promise<{ filePath: string; width: number; height: number; byteSize: number }>`
  - `readPhoto(filePath: string): Promise<Buffer>`
  - `deletePhoto(filePath: string): Promise<void>`
  - `photoRelPath(now: Date, id: string): string` — `'2026/08/<id>.webp'`

- [ ] **Step 1: 경로 규칙 테스트**

`tests/storage.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { photoRelPath, assertSafeRelPath } from '../lib/storage'

test('사진 경로는 연/월 폴더로 나뉜다', () => {
  assert.equal(photoRelPath(new Date('2026-08-26T00:00:00Z'), 'abc123'), '2026/08/abc123.webp')
  assert.equal(photoRelPath(new Date('2026-01-05T00:00:00Z'), 'x'), '2026/01/x.webp')
})

test('상위 경로 탈출을 막는다', () => {
  assert.throws(() => assertSafeRelPath('../../etc/passwd'))
  assert.throws(() => assertSafeRelPath('/etc/passwd'))
  assert.throws(() => assertSafeRelPath('2026/../../secret.webp'))
  assert.doesNotThrow(() => assertSafeRelPath('2026/08/abc.webp'))
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/storage'`

- [ ] **Step 3: 구현**

`lib/storage.ts`:

```ts
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

const ROOT = path.resolve(process.env.UPLOAD_DIR ?? './.devdata/uploads')
const MAX_EDGE = 1600

export function photoRelPath(now: Date, id: string): string {
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}/${m}/${id}.webp`
}

/** 볼륨 밖으로 나가는 경로를 거부한다 */
export function assertSafeRelPath(relPath: string): void {
  if (path.isAbsolute(relPath)) throw new Error('잘못된 파일 경로입니다.')
  const resolved = path.resolve(ROOT, relPath)
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error('잘못된 파일 경로입니다.')
  }
}

/** 리사이즈 + EXIF 제거 + WebP 변환 후 저장 */
export async function savePhoto(buffer: Buffer) {
  const image = sharp(buffer, { failOn: 'error' }).rotate() // rotate()가 EXIF 방향을 반영하고 메타를 떨군다
  const resized = await image
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true })

  const relPath = photoRelPath(new Date(), randomUUID())
  assertSafeRelPath(relPath)
  const abs = path.resolve(ROOT, relPath)
  await mkdir(path.dirname(abs), { recursive: true })
  await writeFile(abs, resized.data)

  return {
    filePath: relPath,
    width: resized.info.width,
    height: resized.info.height,
    byteSize: resized.data.byteLength,
  }
}

export async function readPhoto(relPath: string): Promise<Buffer> {
  assertSafeRelPath(relPath)
  return readFile(path.resolve(ROOT, relPath))
}

export async function deletePhoto(relPath: string): Promise<void> {
  assertSafeRelPath(relPath)
  await unlink(path.resolve(ROOT, relPath)).catch(() => {})
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 총 39개 통과

- [ ] **Step 5: 인증 서빙 라우트**

`app/api/photos/[id]/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { readPhoto } from '@/lib/storage'
import { currentUser } from '@/lib/auth/guard'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { id } = await params
  const photo = await prisma.visitPhoto.findUnique({ where: { id } })
  if (!photo) return new NextResponse('Not Found', { status: 404 })

  try {
    const buffer = await readPhoto(photo.filePath)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
}
```

- [ ] **Step 6: 커밋**

```bash
npm test && npm run lint && npm run typecheck
git add -A
git commit -m "feat: 사진 저장 추상화와 인증 서빙 라우트 추가

sharp로 1600px 리사이즈·EXIF 제거·WebP 변환.
경로 탈출 방어 후 로그인 사용자에게만 스트리밍한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: 방문 기록 제출 + 승인·반려 + 뱃지 부여

**Files:**
- Create: `lib/scoring/collect.ts`, `lib/visits.ts`
- Create: `app/(guest)/visits/new/page.tsx`, `app/(guest)/visits/new/actions.ts`
- Create: `app/admin/approvals/page.tsx`, `app/admin/approvals/actions.ts`

**Interfaces:**
- Consumes: `prisma`, `requireUser`, `requireHost`, `savePhoto`, `visitSchema`, `earnedBadgeCodes`, `seasonKeyFor`, `toDateOnly`, `fromDateOnly`
- Produces:
  - `collectBadgeContext(userId: string): Promise<BadgeContext>`
  - `grantBadges(userId: string, visitId: string): Promise<string[]>` — 새로 딴 뱃지 코드 목록
  - `createVisit(input, submittedBy): Promise<string>`
  - `approveVisit(visitId, hostId): Promise<{ newBadges: Record<string, string[]> }>`
  - `rejectVisit(visitId, hostId, reason): Promise<void>`

- [ ] **Step 1: Prisma → 순수 함수 입력 변환**

`lib/scoring/collect.ts`:

```ts
import { prisma } from '@/lib/db'
import { fromDateOnly } from '@/lib/date'
import type { BadgeContext } from './badges'
import type { ScorableVisit } from './points'

/** 승인된 모임만 모아 순수 함수용 입력으로 바꾼다 */
export async function collectBadgeContext(userId: string): Promise<BadgeContext> {
  const [attended, activeTags, uploadedPhotoCount, authoredMemoCount] = await Promise.all([
    prisma.visit.findMany({
      where: { status: 'APPROVED', attendees: { some: { userId } } },
      select: {
        visitDate: true,
        timeSlot: true,
        memo: true,
        _count: { select: { attendees: true, photos: true } },
        tags: { select: { tag: { select: { slug: true } } } },
      },
      orderBy: { visitDate: 'asc' },
    }),
    prisma.tag.findMany({ where: { active: true }, select: { slug: true } }),
    prisma.visitPhoto.count({ where: { uploadedById: userId, visit: { status: 'APPROVED' } } }),
    prisma.visit.count({
      where: { status: 'APPROVED', submittedById: userId, memo: { not: null } },
    }),
  ])

  const visits: ScorableVisit[] = attended.map((v) => ({
    visitDate: fromDateOnly(v.visitDate),
    timeSlot: v.timeSlot,
    hasMemo: Boolean(v.memo && v.memo.trim()),
    photoCount: v._count.photos,
    attendeeCount: v._count.attendees,
  }))

  return {
    visits,
    visitTagSlugs: attended.map((v) => v.tags.map((t) => t.tag.slug)),
    activeTagSlugs: activeTags.map((t) => t.slug),
    uploadedPhotoCount,
    authoredMemoCount,
  }
}
```

- [ ] **Step 2: 방문 생성·승인 로직**

`lib/visits.ts`:

```ts
import { prisma } from '@/lib/db'
import { toDateOnly } from '@/lib/date'
import { earnedBadgeCodes, seasonKeyFor } from '@/lib/scoring/badges'
import { collectBadgeContext } from '@/lib/scoring/collect'
import type { SessionUser } from '@/lib/auth/guard'

export type VisitInput = {
  visitDate: string
  timeSlot: 'DAY' | 'EVENING' | 'OVERNIGHT'
  memo?: string
  tagIds: string[]
  attendeeIds: string[]
}

/** 호스트가 올리면 즉시 승인, 손님이 올리면 대기 */
export async function createVisit(input: VisitInput, actor: SessionUser): Promise<string> {
  const status = actor.role === 'HOST' ? 'APPROVED' : 'PENDING'

  const visit = await prisma.visit.create({
    data: {
      visitDate: toDateOnly(input.visitDate),
      timeSlot: input.timeSlot,
      memo: input.memo?.trim() || null,
      status,
      submittedById: actor.id,
      reviewedById: status === 'APPROVED' ? actor.id : null,
      reviewedAt: status === 'APPROVED' ? new Date() : null,
      attendees: { create: [...new Set(input.attendeeIds)].map((userId) => ({ userId })) },
      tags: { create: [...new Set(input.tagIds)].map((tagId) => ({ tagId })) },
    },
    select: { id: true },
  })

  if (status === 'APPROVED') await grantBadgesForVisit(visit.id)
  return visit.id
}

/** 이미 가진 뱃지는 건너뛰고, 새로 딴 것만 반환한다 */
export async function grantBadges(userId: string, visitId: string): Promise<string[]> {
  const ctx = await collectBadgeContext(userId)
  const eligible = earnedBadgeCodes(ctx)
  if (eligible.length === 0) return []

  const owned = await prisma.userBadge.findMany({
    where: { userId, badgeCode: { in: eligible }, seasonKey: '-' },
    select: { badgeCode: true },
  })
  const ownedSet = new Set(owned.map((o) => o.badgeCode))
  const fresh = eligible.filter((code) => !ownedSet.has(code))
  if (fresh.length === 0) return []

  await prisma.userBadge.createMany({
    data: fresh.map((code) => ({
      userId,
      badgeCode: code,
      seasonKey: seasonKeyFor(code),
      visitId,
    })),
    skipDuplicates: true,
  })
  return fresh
}

/** 모임 참석자 전원에 대해 뱃지를 재판정한다 */
export async function grantBadgesForVisit(visitId: string): Promise<Record<string, string[]>> {
  const attendees = await prisma.visitAttendee.findMany({
    where: { visitId },
    select: { userId: true, user: { select: { nickname: true } } },
  })

  const result: Record<string, string[]> = {}
  for (const a of attendees) {
    const fresh = await grantBadges(a.userId, visitId)
    if (fresh.length > 0) result[a.user.nickname] = fresh
  }
  return result
}

export async function approveVisit(visitId: string, hostId: string) {
  const updated = await prisma.visit.updateMany({
    where: { id: visitId, status: 'PENDING' },
    data: { status: 'APPROVED', reviewedById: hostId, reviewedAt: new Date() },
  })
  if (updated.count === 0) return { newBadges: {} } // 이미 처리됨 (중복 클릭)

  return { newBadges: await grantBadgesForVisit(visitId) }
}

export async function rejectVisit(visitId: string, hostId: string, reason: string) {
  await prisma.visit.updateMany({
    where: { id: visitId, status: 'PENDING' },
    data: {
      status: 'REJECTED',
      reviewedById: hostId,
      reviewedAt: new Date(),
      rejectReason: reason.trim() || null,
    },
  })
}
```

> `updateMany` + `status: 'PENDING'` 조건을 쓰는 이유: 승인 버튼을 두 번 누르면 뱃지 판정이 두 번 돌아 낭비된다. 조건부 갱신으로 첫 클릭만 통과시킨다.

- [ ] **Step 3: 기록 제출 서버 액션**

`app/(guest)/visits/new/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { visitSchema } from '@/lib/validation'
import { createVisit } from '@/lib/visits'
import { savePhoto } from '@/lib/storage'

const MAX_PHOTOS = 10
const MAX_BYTES = 10 * 1024 * 1024

export type NewVisitState = { error?: string }

export async function submitVisit(
  _prev: NewVisitState,
  formData: FormData,
): Promise<NewVisitState> {
  const user = await requireUser()

  const parsed = visitSchema.safeParse({
    visitDate: formData.get('visitDate'),
    timeSlot: formData.get('timeSlot'),
    memo: formData.get('memo') || undefined,
    tagIds: formData.getAll('tagIds').map(String),
    attendeeIds: formData.getAll('attendeeIds').map(String),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  // 제출자는 항상 참석자에 포함된다
  const attendeeIds = [...new Set([user.id, ...parsed.data.attendeeIds])]

  const photos = formData.getAll('photos').filter((f): f is File => f instanceof File && f.size > 0)
  if (photos.length > MAX_PHOTOS) return { error: `사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있습니다.` }
  if (photos.some((f) => f.size > MAX_BYTES)) return { error: '사진 한 장은 10MB 이하여야 합니다.' }

  let visitId: string
  try {
    visitId = await createVisit({ ...parsed.data, attendeeIds }, user)
  } catch {
    return { error: '기록 저장 중 문제가 발생했습니다.' }
  }

  for (const file of photos) {
    try {
      const saved = await savePhoto(Buffer.from(await file.arrayBuffer()))
      await prisma.visitPhoto.create({
        data: { visitId, uploadedById: user.id, ...saved },
      })
    } catch {
      // 사진 한 장이 실패해도 기록 자체는 남긴다
    }
  }

  revalidatePath('/')
  revalidatePath('/admin/approvals')
  redirect('/?submitted=1')
}
```

- [ ] **Step 4: 기록하기 화면**

`app/(guest)/visits/new/page.tsx` — 서버 컴포넌트가 태그·회원 목록을 조회해 클라이언트 폼에 넘긴다.

```tsx
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { todayKst } from '@/lib/date'
import NewVisitForm from './form'

export default async function NewVisitPage() {
  const user = await requireUser()
  const [tags, members] = await Promise.all([
    prisma.tag.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    prisma.user.findMany({
      where: { status: 'ACTIVE', id: { not: user.id } },
      select: { id: true, nickname: true },
      orderBy: { nickname: 'asc' },
    }),
  ])

  return <NewVisitForm tags={tags} members={members} today={todayKst()} />
}
```

`app/(guest)/visits/new/form.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { submitVisit, type NewVisitState } from './actions'

type Props = {
  tags: { id: string; label: string; emoji: string }[]
  members: { id: string; nickname: string }[]
  today: string
}

const SLOTS = [
  { value: 'DAY', label: '낮' },
  { value: 'EVENING', label: '저녁' },
  { value: 'OVERNIGHT', label: '밤새' },
]

export default function NewVisitForm({ tags, members, today }: Props) {
  const [state, action, pending] = useActionState<NewVisitState, FormData>(submitVisit, {})

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">놀러온 날 기록하기</h1>

      <form action={action} className="flex flex-col gap-6">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">언제</span>
          <input type="date" name="visitDate" defaultValue={today} max={today} required className="rounded-lg border px-3 py-3" />
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">얼마나 있었나</legend>
          <div className="flex gap-2">
            {SLOTS.map((s, i) => (
              <label key={s.value} className="flex-1">
                <input type="radio" name="timeSlot" value={s.value} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block cursor-pointer rounded-lg border py-3 text-center peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white">
                  {s.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">뭐 했나</legend>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <label key={t.id}>
                <input type="checkbox" name="tagIds" value={t.id} className="peer sr-only" />
                <span className="block cursor-pointer rounded-full border px-4 py-2 text-sm peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white">
                  {t.emoji} {t.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold">같이 온 사람</legend>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <label key={m.id}>
                <input type="checkbox" name="attendeeIds" value={m.id} className="peer sr-only" />
                <span className="block cursor-pointer rounded-full border px-4 py-2 text-sm peer-checked:border-neutral-900 peer-checked:bg-neutral-900 peer-checked:text-white">
                  {m.nickname}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">한 줄 메모</span>
          <input name="memo" maxLength={200} placeholder="라면 3개 끓임" className="rounded-lg border px-3 py-3" />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">사진 (최대 10장)</span>
          <input type="file" name="photos" accept="image/*" multiple className="text-sm" />
        </label>

        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="rounded-lg bg-neutral-900 py-4 font-semibold text-white disabled:opacity-50">
          {pending ? '올리는 중…' : '기록 올리기'}
        </button>
      </form>
    </main>
  )
}
```

> 제출자 본인은 서버에서 참석자에 자동 추가되므로 "같이 온 사람" 목록에서 제외한다.

- [ ] **Step 5: 승인함 서버 액션**

`app/admin/approvals/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireHost } from '@/lib/auth/guard'
import { approveVisit, rejectVisit } from '@/lib/visits'

export async function approve(formData: FormData) {
  const host = await requireHost()
  const visitId = String(formData.get('visitId') ?? '')
  const { newBadges } = await approveVisit(visitId, host.id)

  revalidatePath('/admin/approvals')
  revalidatePath('/')
  revalidatePath('/ranking')

  return { newBadges }
}

export async function reject(formData: FormData) {
  const host = await requireHost()
  await rejectVisit(
    String(formData.get('visitId') ?? ''),
    host.id,
    String(formData.get('reason') ?? ''),
  )
  revalidatePath('/admin/approvals')
}
```

- [ ] **Step 6: 승인함 화면**

`app/admin/approvals/page.tsx`:

```tsx
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { fromDateOnly } from '@/lib/date'
import { approve, reject } from './actions'

const SLOT_LABEL = { DAY: '낮', EVENING: '저녁', OVERNIGHT: '밤새' } as const

export default async function ApprovalsPage() {
  await requireHost()

  const pending = await prisma.visit.findMany({
    where: { status: 'PENDING' },
    include: {
      submittedBy: { select: { nickname: true } },
      attendees: { include: { user: { select: { nickname: true } } } },
      tags: { include: { tag: true } },
      photos: { select: { id: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="mb-6 text-xl font-bold">승인 대기 {pending.length}건</h1>

      {pending.length === 0 && <p className="text-neutral-500">대기 중인 기록이 없습니다.</p>}

      <div className="flex flex-col gap-4">
        {pending.map((v) => (
          <article key={v.id} className="rounded-xl border p-4">
            <p className="text-sm text-neutral-500">
              {v.submittedBy.nickname}님이 올림
            </p>
            <p className="mt-1 font-semibold">
              {fromDateOnly(v.visitDate)} · {SLOT_LABEL[v.timeSlot]}
            </p>
            <p className="mt-2 text-sm">
              {v.attendees.map((a) => a.user.nickname).join(', ')}
            </p>
            <p className="mt-1 text-sm">
              {v.tags.map((t) => `${t.tag.emoji} ${t.tag.label}`).join(' ')}
            </p>
            {v.memo && <p className="mt-2 rounded-lg bg-neutral-100 p-2 text-sm">{v.memo}</p>}
            {v.photos.length > 0 && (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {v.photos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={p.id} src={`/api/photos/${p.id}`} alt="" className="h-24 w-24 shrink-0 rounded-lg object-cover" />
                ))}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <form action={approve} className="flex-1">
                <input type="hidden" name="visitId" value={v.id} />
                <button className="w-full rounded-lg bg-neutral-900 py-3 font-semibold text-white">승인</button>
              </form>
              <form action={reject} className="flex-1">
                <input type="hidden" name="visitId" value={v.id} />
                <input type="hidden" name="reason" value="" />
                <button className="w-full rounded-lg border py-3 font-semibold">반려</button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 7: 수동 확인**

1. 손님 계정으로 기록 제출 → "승인 대기" 상태
2. 호스트 계정 `/admin/approvals`에서 승인
3. `npm run db:studio`로 `UserBadge`에 `FIRST_VISIT`이 참석자 수만큼 생겼는지 확인
4. 승인 버튼을 두 번 눌러도 뱃지가 중복 생성되지 않는지 확인

- [ ] **Step 8: 검증 후 커밋**

```bash
npm test && npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "feat: 모임 기록 제출과 호스트 승인·뱃지 부여 구현

승인 시 참석자 전원의 뱃지를 재판정한다.
updateMany 조건부 갱신으로 중복 승인 시 재계산을 막는다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: 캘린더 화면

**Files:**
- Create: `app/(guest)/layout.tsx`, `app/(guest)/page.tsx`, `components/Calendar.tsx`, `components/BottomNav.tsx`
- Create: `app/(guest)/visits/[id]/page.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `prisma`, `requireUser`, `fromDateOnly`, `todayKst`
- Produces: `<BottomNav />` — 캘린더·랭킹·기록·프로필 탭 (호스트에게만 승인함 배지 노출)

- [ ] **Step 1: 하단 내비게이션**

`components/BottomNav.tsx`:

```tsx
import Link from 'next/link'

type Props = { role: 'HOST' | 'GUEST'; pendingCount: number }

const TABS = [
  { href: '/', label: '캘린더', icon: '📅' },
  { href: '/ranking', label: '랭킹', icon: '🏆' },
  { href: '/visits/new', label: '기록', icon: '✏️' },
  { href: '/me', label: '내 기록', icon: '🙋' },
]

export default function BottomNav({ role, pendingCount }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <li key={t.href} className="flex-1">
            <Link href={t.href} className="flex flex-col items-center gap-0.5 py-2 text-xs">
              <span aria-hidden className="text-lg">{t.icon}</span>
              {t.label}
            </Link>
          </li>
        ))}
        {role === 'HOST' && (
          <li className="flex-1">
            <Link href="/admin/approvals" className="relative flex flex-col items-center gap-0.5 py-2 text-xs">
              <span aria-hidden className="text-lg">✅</span>
              승인함
              {pendingCount > 0 && (
                <span className="absolute right-3 top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 2: 손님 레이아웃**

`app/(guest)/layout.tsx`:

```tsx
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import BottomNav from '@/components/BottomNav'

export default async function GuestLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const pendingCount =
    user.role === 'HOST' ? await prisma.visit.count({ where: { status: 'PENDING' } }) : 0

  return (
    <>
      <div className="pb-16">{children}</div>
      <BottomNav role={user.role} pendingCount={pendingCount} />
    </>
  )
}
```

- [ ] **Step 3: 캘린더 컴포넌트**

`components/Calendar.tsx`:

```tsx
import Link from 'next/link'

export type CalendarDay = {
  date: string // 'YYYY-MM-DD'
  visits: { id: string; emojis: string[]; nicknames: string[] }[]
}

type Props = { year: number; month: number; days: CalendarDay[]; today: string }

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

export default function Calendar({ year, month, days, today }: Props) {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const first = new Date(Date.UTC(year, month - 1, 1))
  const firstWeekday = (first.getUTCDay() || 7) - 1 // 월=0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      return `${year}-${String(month).padStart(2, '0')}-${d}`
    }),
  ]

  return (
    <div>
      <div className="grid grid-cols-7 border-b pb-2 text-center text-xs text-neutral-500">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="aspect-square" />
          const day = byDate.get(date)
          const visit = day?.visits[0]
          const isToday = date === today

          const inner = (
            <div className={`flex h-full flex-col items-center gap-0.5 rounded-lg p-1 ${isToday ? 'ring-1 ring-neutral-900' : ''}`}>
              <span className="text-xs text-neutral-500">{Number(date.slice(8))}</span>
              {day && (
                <>
                  <span className="text-sm leading-none">{visit?.emojis.slice(0, 2).join('')}</span>
                  <span className="truncate text-[9px] leading-tight text-neutral-600">
                    {day.visits.flatMap((v) => v.nicknames).slice(0, 2).join(',')}
                  </span>
                </>
              )}
            </div>
          )

          return (
            <div key={date} className="aspect-square">
              {visit ? <Link href={`/visits/${visit.id}`} className="block h-full">{inner}</Link> : inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 캘린더 페이지**

`app/(guest)/page.tsx`:

```tsx
import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { fromDateOnly, toDateOnly, todayKst } from '@/lib/date'
import Calendar, { type CalendarDay } from '@/components/Calendar'

type Props = { searchParams: Promise<{ y?: string; m?: string }> }

export default async function CalendarPage({ searchParams }: Props) {
  await requireUser()
  const sp = await searchParams
  const today = todayKst()

  const year = Number(sp.y) || Number(today.slice(0, 4))
  const month = Number(sp.m) || Number(today.slice(5, 7))

  const pad = (n: number) => String(n).padStart(2, '0')
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const from = toDateOnly(`${year}-${pad(month)}-01`)
  const to = toDateOnly(`${year}-${pad(month)}-${pad(lastDay)}`)

  const visits = await prisma.visit.findMany({
    where: { status: 'APPROVED', visitDate: { gte: from, lte: to } },
    include: {
      attendees: { include: { user: { select: { nickname: true } } } },
      tags: { include: { tag: { select: { emoji: true } } } },
    },
    orderBy: { visitDate: 'asc' },
  })

  const grouped = new Map<string, CalendarDay>()
  for (const v of visits) {
    const key = fromDateOnly(v.visitDate)
    const entry = grouped.get(key) ?? { date: key, visits: [] }
    entry.visits.push({
      id: v.id,
      emojis: v.tags.map((t) => t.tag.emoji),
      nicknames: v.attendees.map((a) => a.user.nickname),
    })
    grouped.set(key, entry)
  }

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 }
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 }

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <header className="mb-4 flex items-center justify-between">
        <Link href={`/?y=${prev.y}&m=${prev.m}`} className="px-3 py-2 text-lg" aria-label="이전 달">‹</Link>
        <h1 className="text-lg font-bold">{year}년 {month}월</h1>
        <Link href={`/?y=${next.y}&m=${next.m}`} className="px-3 py-2 text-lg" aria-label="다음 달">›</Link>
      </header>

      <Calendar year={year} month={month} days={[...grouped.values()]} today={today} />

      <p className="mt-6 text-center text-sm text-neutral-500">
        이번 달 {visits.length}번 모였습니다
      </p>
    </main>
  )
}
```

- [ ] **Step 5: 모임 상세 페이지**

`app/(guest)/visits/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { fromDateOnly } from '@/lib/date'

const SLOT_LABEL = { DAY: '낮', EVENING: '저녁', OVERNIGHT: '밤새' } as const

export default async function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser()
  const { id } = await params

  const visit = await prisma.visit.findFirst({
    where: { id, status: 'APPROVED' },
    include: {
      attendees: { include: { user: { select: { nickname: true } } } },
      tags: { include: { tag: true } },
      photos: { select: { id: true } },
    },
  })
  if (!visit) notFound()

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">{fromDateOnly(visit.visitDate)}</h1>
      <p className="mt-1 text-sm text-neutral-500">{SLOT_LABEL[visit.timeSlot]}</p>

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-neutral-500">누가</h2>
        <p className="mt-1">{visit.attendees.map((a) => a.user.nickname).join(', ')}</p>
      </section>

      <section className="mt-4">
        <h2 className="text-sm font-semibold text-neutral-500">뭐 했나</h2>
        <p className="mt-1">{visit.tags.map((t) => `${t.tag.emoji} ${t.tag.label}`).join('  ')}</p>
      </section>

      {visit.memo && (
        <section className="mt-4">
          <h2 className="text-sm font-semibold text-neutral-500">한 줄</h2>
          <p className="mt-1 rounded-lg bg-neutral-100 p-3">{visit.memo}</p>
        </section>
      )}

      {visit.photos.length > 0 && (
        <section className="mt-4 grid grid-cols-2 gap-2">
          {visit.photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={`/api/photos/${p.id}`} alt="" className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </section>
      )}
    </main>
  )
}
```

- [ ] **Step 6: 수동 확인 (375px 뷰포트)**

브라우저 개발자도구를 375px로 두고 확인한다.

1. 캘린더에 승인된 모임이 이모지·닉네임과 함께 뜨는지
2. 이전/다음 달 이동이 연 경계(12월→1월)에서 올바른지
3. 날짜를 눌러 상세로 들어가지는지
4. 하단 탭이 콘텐츠를 가리지 않는지 (`pb-16`)

- [ ] **Step 7: 커밋**

```bash
npm test && npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "feat: 캘린더 화면과 모임 상세 페이지 구현

월 단위 조회, 하단 탭 내비게이션, 호스트 승인 대기 배지 포함.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 4 — 게임 요소

### Task 10: 랭킹 집계 + 랭킹 화면

**Files:**
- Create: `lib/ranking.ts`, `app/(guest)/ranking/page.tsx`, `components/RankList.tsx`
- Test: `tests/ranking.test.ts`

**Interfaces:**
- Consumes: `prisma`, `totalPoints`, `fromDateOnly`, `toDateOnly`
- Produces:
  - `type RankRow = { userId: string; nickname: string; points: number; visitCount: number; rank: number }`
  - `rankRows(entries: Omit<RankRow,'rank'>[]): RankRow[]` — 동점자 공동 순위 부여 (순수 함수)
  - `overallRanking(): Promise<RankRow[]>`
  - `seasonRanking(seasonId: string): Promise<RankRow[]>`
  - `tagKings(seasonId: string): Promise<{ tagSlug: string; tagLabel: string; emoji: string; nickname: string; count: number }[]>`

- [ ] **Step 1: 동점 처리 테스트**

`tests/ranking.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rankRows } from '../lib/ranking'

test('점수 내림차순으로 순위를 매긴다', () => {
  const rows = rankRows([
    { userId: 'a', nickname: 'A', points: 10, visitCount: 1 },
    { userId: 'b', nickname: 'B', points: 30, visitCount: 3 },
    { userId: 'c', nickname: 'C', points: 20, visitCount: 2 },
  ])
  assert.deepEqual(rows.map((r) => r.nickname), ['B', 'C', 'A'])
  assert.deepEqual(rows.map((r) => r.rank), [1, 2, 3])
})

test('동점은 공동 순위이며 다음 순위를 건너뛴다', () => {
  const rows = rankRows([
    { userId: 'a', nickname: 'A', points: 30, visitCount: 3 },
    { userId: 'b', nickname: 'B', points: 30, visitCount: 3 },
    { userId: 'c', nickname: 'C', points: 10, visitCount: 1 },
  ])
  assert.deepEqual(rows.map((r) => r.rank), [1, 1, 3])
})

test('0점인 사람도 목록에 남는다', () => {
  const rows = rankRows([{ userId: 'a', nickname: 'A', points: 0, visitCount: 0 }])
  assert.equal(rows.length, 1)
  assert.equal(rows[0].rank, 1)
})

test('빈 목록은 빈 배열', () => {
  assert.deepEqual(rankRows([]), [])
})
```

- [ ] **Step 2: 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../lib/ranking'`

- [ ] **Step 3: 구현**

`lib/ranking.ts`:

```ts
import { prisma } from '@/lib/db'
import { fromDateOnly } from '@/lib/date'
import { totalPoints, type ScorableVisit } from '@/lib/scoring/points'

export type RankRow = {
  userId: string
  nickname: string
  points: number
  visitCount: number
  rank: number
}

/** 동점은 공동 순위, 그다음은 인원수만큼 건너뛴다 (1,1,3) */
export function rankRows(entries: Omit<RankRow, 'rank'>[]): RankRow[] {
  const sorted = [...entries].sort(
    (a, b) => b.points - a.points || b.visitCount - a.visitCount || a.nickname.localeCompare(b.nickname),
  )
  let lastPoints = Number.NaN
  let lastRank = 0
  return sorted.map((e, i) => {
    const rank = e.points === lastPoints ? lastRank : i + 1
    lastPoints = e.points
    lastRank = rank
    return { ...e, rank }
  })
}

type Range = { from: Date; to: Date } | null

async function buildRanking(range: Range, includeFirstVisitBonus: boolean): Promise<RankRow[]> {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, nickname: true },
  })

  const visits = await prisma.visit.findMany({
    where: {
      status: 'APPROVED',
      ...(range ? { visitDate: { gte: range.from, lte: range.to } } : {}),
    },
    select: {
      visitDate: true,
      timeSlot: true,
      memo: true,
      _count: { select: { attendees: true, photos: true } },
      attendees: { select: { userId: true } },
    },
  })

  const byUser = new Map<string, ScorableVisit[]>()
  for (const v of visits) {
    const scorable: ScorableVisit = {
      visitDate: fromDateOnly(v.visitDate),
      timeSlot: v.timeSlot,
      hasMemo: Boolean(v.memo && v.memo.trim()),
      photoCount: v._count.photos,
      attendeeCount: v._count.attendees,
    }
    for (const a of v.attendees) {
      const list = byUser.get(a.userId) ?? []
      list.push(scorable)
      byUser.set(a.userId, list)
    }
  }

  return rankRows(
    users.map((u) => {
      const list = byUser.get(u.id) ?? []
      return {
        userId: u.id,
        nickname: u.nickname,
        visitCount: list.length,
        points: totalPoints(list, { includeFirstVisitBonus }),
      }
    }),
  )
}

/** 통산 랭킹 — 첫 방문 보너스 포함 */
export function overallRanking(): Promise<RankRow[]> {
  return buildRanking(null, true)
}

/** 시즌 랭킹 — 첫 방문 보너스 제외 (스펙 §4.1) */
export async function seasonRanking(seasonId: string): Promise<RankRow[]> {
  const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId } })
  return buildRanking({ from: season.startDate, to: season.endDate }, false)
}

/** 시즌 내 태그별 최다 참석자 */
export async function tagKings(seasonId: string) {
  const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId } })
  const tags = await prisma.tag.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } })

  const results = []
  for (const tag of tags) {
    const visits = await prisma.visit.findMany({
      where: {
        status: 'APPROVED',
        visitDate: { gte: season.startDate, lte: season.endDate },
        tags: { some: { tagId: tag.id } },
      },
      select: { attendees: { select: { user: { select: { id: true, nickname: true } } } } },
    })

    const counts = new Map<string, { nickname: string; count: number }>()
    for (const v of visits) {
      for (const a of v.attendees) {
        const c = counts.get(a.user.id) ?? { nickname: a.user.nickname, count: 0 }
        c.count++
        counts.set(a.user.id, c)
      }
    }

    const top = [...counts.entries()].sort(
      (a, b) => b[1].count - a[1].count || a[1].nickname.localeCompare(b[1].nickname),
    )[0]
    if (top) {
      results.push({
        tagSlug: tag.slug,
        tagLabel: tag.label,
        emoji: tag.emoji,
        userId: top[0],
        nickname: top[1].nickname,
        count: top[1].count,
      })
    }
  }
  return results
}

/** 오늘이 속한 시즌 */
export async function currentSeason() {
  const now = new Date()
  return prisma.season.findFirst({
    where: { startDate: { lte: now }, endDate: { gte: now } },
    orderBy: { startDate: 'desc' },
  })
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test`
Expected: PASS — 총 43개 통과

- [ ] **Step 5: 랭킹 화면**

`components/RankList.tsx`:

```tsx
import type { RankRow } from '@/lib/ranking'
import { titleFor } from '@/lib/scoring/titles'

const MEDALS = ['🥇', '🥈', '🥉']

export default function RankList({ rows, meId }: { rows: RankRow[]; meId: string }) {
  if (rows.length === 0) return <p className="py-10 text-center text-neutral-500">아직 기록이 없습니다.</p>

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r) => (
        <li
          key={r.userId}
          className={`flex items-center gap-3 rounded-xl border p-3 ${r.userId === meId ? 'border-neutral-900 bg-neutral-50' : ''}`}
        >
          <span className="w-8 shrink-0 text-center text-lg font-bold">
            {r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{r.nickname}</p>
            <p className="text-xs text-neutral-500">
              {titleFor(r.points).label} · {r.visitCount}회 방문
            </p>
          </div>
          <span className="shrink-0 font-bold tabular-nums">{r.points}점</span>
        </li>
      ))}
    </ol>
  )
}
```

`app/(guest)/ranking/page.tsx`:

```tsx
import Link from 'next/link'
import { requireUser } from '@/lib/auth/guard'
import { overallRanking, seasonRanking, tagKings, currentSeason } from '@/lib/ranking'
import { fromDateOnly } from '@/lib/date'
import RankList from '@/components/RankList'

type Props = { searchParams: Promise<{ tab?: string }> }

const TABS = [
  { key: 'season', label: '이번 시즌' },
  { key: 'overall', label: '통산' },
  { key: 'tag', label: '부문왕' },
]

export default async function RankingPage({ searchParams }: Props) {
  const user = await requireUser()
  const tab = (await searchParams).tab ?? 'season'
  const season = await currentSeason()

  const daysLeft = season
    ? Math.ceil((season.endDate.getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">랭킹</h1>
      {season && <p className="mt-1 text-sm text-neutral-500">{season.name}</p>}

      {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
        <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          🔥 시즌 마감 D-{daysLeft}
        </p>
      )}

      <nav className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/ranking?tab=${t.key}`}
            className={`flex-1 rounded-lg border py-2 text-center text-sm ${tab === t.key ? 'border-neutral-900 bg-neutral-900 text-white' : ''}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {tab === 'overall' && <RankList rows={await overallRanking()} meId={user.id} />}
        {tab === 'season' &&
          (season ? (
            <RankList rows={await seasonRanking(season.id)} meId={user.id} />
          ) : (
            <p className="py-10 text-center text-neutral-500">진행 중인 시즌이 없습니다.</p>
          ))}
        {tab === 'tag' &&
          (season ? (
            <ul className="flex flex-col gap-2">
              {(await tagKings(season.id)).map((k) => (
                <li key={k.tagSlug} className="flex items-center gap-3 rounded-xl border p-3">
                  <span className="text-2xl">{k.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500">{k.tagLabel}왕</p>
                    <p className="font-semibold">{k.nickname}</p>
                  </div>
                  <span className="text-sm text-neutral-500">{k.count}회</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-neutral-500">진행 중인 시즌이 없습니다.</p>
          ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 6: 커밋**

```bash
npm test && npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "feat: 시즌·통산·부문왕 랭킹 구현

동점자는 공동 순위로 처리하고 다음 순위를 건너뛴다.
시즌 랭킹에는 첫 방문 보너스를 넣지 않는다(스펙 §4.1).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 11: 내 프로필 — 칭호·뱃지 진열장·히트맵

**Files:**
- Create: `app/(guest)/me/page.tsx`, `components/BadgeShelf.tsx`, `components/VisitHeatmap.tsx`

**Interfaces:**
- Consumes: `prisma`, `requireUser`, `collectBadgeContext`, `totalPoints`, `titleFor`, `fromDateOnly`
- Produces: 없음 (말단 화면)

- [ ] **Step 1: 뱃지 진열장**

`components/BadgeShelf.tsx` — **미획득 뱃지를 회색 실루엣으로 보여주는 것이 이 화면의 핵심이다.** 뭘 해야 딸 수 있는지 보여야 하러 온다.

```tsx
type BadgeView = {
  code: string
  label: string
  emoji: string
  description: string
  earnedAt: Date | null
}

export default function BadgeShelf({ badges }: { badges: BadgeView[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3">
      {badges.map((b) => {
        const earned = b.earnedAt !== null
        return (
          <li
            key={b.code}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${earned ? '' : 'opacity-40 grayscale'}`}
          >
            <span className="text-3xl" aria-hidden>{b.emoji}</span>
            <span className="text-xs font-semibold">{b.label}</span>
            <span className="text-[10px] leading-tight text-neutral-500">
              {earned ? '획득' : b.description}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
```

- [ ] **Step 2: 방문 히트맵**

`components/VisitHeatmap.tsx`:

```tsx
type Props = { year: number; dates: string[] }

const LEVELS = ['bg-neutral-100', 'bg-neutral-300', 'bg-neutral-500', 'bg-neutral-800']

export default function VisitHeatmap({ year, dates }: Props) {
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1)

  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year, 11, 31)
  const cells: { date: string; level: number }[] = []
  for (let t = start; t <= end; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10)
    const c = counts.get(date) ?? 0
    cells.push({ date, level: c === 0 ? 0 : Math.min(c, 3) })
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-[2px]" style={{ width: 'max-content' }}>
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date} ${counts.get(c.date) ?? 0}회`}
            className={`h-2.5 w-2.5 rounded-[2px] ${LEVELS[c.level]}`}
          />
        ))}
      </div>
    </div>
  )
}
```

> 1월 1일이 무슨 요일이든 첫 열부터 채운다. 잔디 모양의 정확한 요일 정렬보다 "얼마나 자주 왔나"를 보여주는 게 목적이다.

- [ ] **Step 3: 프로필 페이지**

`app/(guest)/me/page.tsx`:

```tsx
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { collectBadgeContext } from '@/lib/scoring/collect'
import { totalPoints } from '@/lib/scoring/points'
import { titleFor } from '@/lib/scoring/titles'
import { todayKst } from '@/lib/date'
import BadgeShelf from '@/components/BadgeShelf'
import VisitHeatmap from '@/components/VisitHeatmap'

export default async function MePage() {
  const user = await requireUser()

  const [ctx, allBadges, earned] = await Promise.all([
    collectBadgeContext(user.id),
    prisma.badge.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.userBadge.findMany({ where: { userId: user.id }, select: { badgeCode: true, earnedAt: true } }),
  ])

  const points = totalPoints(ctx.visits, { includeFirstVisitBonus: true })
  const title = titleFor(points)
  const earnedMap = new Map(earned.map((e) => [e.badgeCode, e.earnedAt]))
  const year = Number(todayKst().slice(0, 4))

  const progress = title.next
    ? Math.min(100, Math.round(((points - title.min) / (title.next.min - title.min)) * 100))
    : 100

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">{user.nickname}</h1>

      <section className="mt-4 rounded-xl border p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold">{title.label}</span>
          <span className="text-2xl font-bold tabular-nums">{points}점</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full bg-neutral-900" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {title.next
            ? `${title.next.label}까지 ${title.next.min - points}점`
            : '최고 칭호에 도달했습니다'}
        </p>
        <p className="mt-1 text-xs text-neutral-500">{ctx.visits.length}번 놀러왔습니다</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">뱃지 {earned.length}/{allBadges.length}</h2>
        <BadgeShelf
          badges={allBadges.map((b) => ({
            code: b.code,
            label: b.label,
            emoji: b.emoji,
            description: b.description,
            earnedAt: earnedMap.get(b.code) ?? null,
          }))}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">{year}년 발자국</h2>
        <VisitHeatmap year={year} dates={ctx.visits.map((v) => v.visitDate)} />
      </section>
    </main>
  )
}
```

- [ ] **Step 4: 수동 확인**

1. 미획득 뱃지가 회색 + 조건 문구로 보이는지
2. 칭호 게이지가 실제 점수 비율과 맞는지
3. 히트맵이 375px에서 가로 스크롤되는지 (페이지 전체가 아니라 히트맵만)

- [ ] **Step 5: 커밋**

```bash
npm test && npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "feat: 내 프로필 화면 구현

칭호 게이지, 뱃지 진열장(미획득은 회색 실루엣+조건), 연간 방문 히트맵.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 12: 시즌 마감 + 명예의 전당

**Files:**
- Create: `lib/season.ts`, `app/(guest)/hall-of-fame/page.tsx`
- Modify: `app/admin/page.tsx` (Task 13에서 생성 — 이 작업이 먼저면 `app/admin/season-actions.ts`만 만들고 Task 13에서 화면에 연결)
- Create: `app/admin/season-actions.ts`

**Interfaces:**
- Consumes: `prisma`, `seasonRanking`, `tagKings`, `seasonKeyFor`, `requireHost`
- Produces:
  - `closeSeason(seasonId: string): Promise<{ champions: string[]; tagKings: number }>`
  - `nextSeasonAfter(season): { name, startDate, endDate }`

- [ ] **Step 1: 시즌 마감 로직**

`lib/season.ts`:

```ts
import { prisma } from '@/lib/db'
import { seasonRanking, tagKings } from '@/lib/ranking'
import { seasonKeyFor } from '@/lib/scoring/badges'

/**
 * 시즌을 마감한다.
 * - 전원의 순위·점수·방문수를 SeasonResult에 박제
 * - 태그별 1위를 SeasonTagChampion에 박제
 * - SEASON_CHAMPION / TAG_KING 뱃지 부여
 * - 다음 분기 시즌 생성
 *
 * 마감 후 점수 공식이 바뀌어도 이 결과는 변하지 않는다 (스펙 §4.4).
 */
export async function closeSeason(seasonId: string) {
  const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId } })
  if (season.closedAt) throw new Error('이미 마감된 시즌입니다.')

  const rows = await seasonRanking(seasonId)
  const kings = await tagKings(seasonId)
  const participants = rows.filter((r) => r.visitCount > 0)
  const champions = participants.filter((r) => r.rank === 1)

  await prisma.$transaction(async (tx) => {
    await tx.seasonResult.createMany({
      data: participants.map((r) => ({
        seasonId,
        userId: r.userId,
        rank: r.rank,
        points: r.points,
        visitCount: r.visitCount,
      })),
      skipDuplicates: true,
    })

    for (const k of kings) {
      const tag = await tx.tag.findUniqueOrThrow({ where: { slug: k.tagSlug } })
      await tx.seasonTagChampion.upsert({
        where: { seasonId_tagId: { seasonId, tagId: tag.id } },
        update: { userId: k.userId, count: k.count },
        create: { seasonId, tagId: tag.id, userId: k.userId, count: k.count },
      })
    }

    await tx.userBadge.createMany({
      data: [
        ...champions.map((c) => ({
          userId: c.userId,
          badgeCode: 'SEASON_CHAMPION',
          seasonKey: seasonKeyFor('SEASON_CHAMPION', seasonId),
        })),
        ...kings.map((k) => ({
          userId: k.userId,
          badgeCode: 'TAG_KING',
          seasonKey: seasonKeyFor('TAG_KING', seasonId, k.tagSlug),
        })),
      ],
      skipDuplicates: true,
    })

    await tx.season.update({ where: { id: seasonId }, data: { closedAt: new Date() } })

    const next = nextSeasonAfter(season)
    await tx.season.upsert({
      where: { startDate_endDate: { startDate: next.startDate, endDate: next.endDate } },
      update: {},
      create: next,
    })
  })

  return { champions: champions.map((c) => c.nickname), tagKings: kings.length }
}

/** 마감된 시즌의 다음 분기 */
export function nextSeasonAfter(season: { endDate: Date }) {
  const end = season.endDate
  const nextStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1))
  const y = nextStart.getUTCFullYear()
  const q = Math.floor(nextStart.getUTCMonth() / 3)
  const endDay = [31, 30, 30, 31][q]
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    name: `${y} ${q + 1}분기`,
    startDate: new Date(`${y}-${pad(q * 3 + 1)}-01T00:00:00.000Z`),
    endDate: new Date(`${y}-${pad(q * 3 + 3)}-${endDay}T00:00:00.000Z`),
  }
}
```

- [ ] **Step 2: 마감 서버 액션**

`app/admin/season-actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { requireHost } from '@/lib/auth/guard'
import { closeSeason } from '@/lib/season'

export type SeasonState = { message?: string; error?: string }

export async function closeSeasonAction(
  _prev: SeasonState,
  formData: FormData,
): Promise<SeasonState> {
  await requireHost()
  try {
    const result = await closeSeason(String(formData.get('seasonId') ?? ''))
    revalidatePath('/ranking')
    revalidatePath('/hall-of-fame')
    revalidatePath('/admin')
    return {
      message:
        result.champions.length > 0
          ? `시즌을 마감했습니다. 챔피언: ${result.champions.join(', ')} (부문왕 ${result.tagKings}명)`
          : '시즌을 마감했습니다. 참가자가 없어 챔피언은 없습니다.',
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '마감 처리에 실패했습니다.' }
  }
}
```

- [ ] **Step 3: 명예의 전당**

`app/(guest)/hall-of-fame/page.tsx`:

```tsx
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'

export default async function HallOfFamePage() {
  await requireUser()

  const seasons = await prisma.season.findMany({
    where: { closedAt: { not: null } },
    orderBy: { startDate: 'desc' },
    include: {
      results: {
        where: { rank: { lte: 3 } },
        orderBy: { rank: 'asc' },
        include: { user: { select: { nickname: true } } },
      },
      champions: { include: { season: false } },
    },
  })

  const tags = await prisma.tag.findMany({ select: { id: true, label: true, emoji: true } })
  const tagMap = new Map(tags.map((t) => [t.id, t]))
  const users = await prisma.user.findMany({ select: { id: true, nickname: true } })
  const userMap = new Map(users.map((u) => [u.id, u.nickname]))

  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">명예의 전당</h1>

      {seasons.length === 0 && (
        <p className="mt-10 text-center text-neutral-500">아직 마감된 시즌이 없습니다.</p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {seasons.map((s) => (
          <section key={s.id} className="rounded-xl border p-4">
            <h2 className="font-bold">{s.name}</h2>

            <ol className="mt-3 flex flex-col gap-1">
              {s.results.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm">
                  <span>{MEDALS[r.rank - 1] ?? r.rank}</span>
                  <span className="flex-1 font-semibold">{r.user.nickname}</span>
                  <span className="tabular-nums text-neutral-500">{r.points}점</span>
                </li>
              ))}
            </ol>

            {s.champions.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                {s.champions.map((c) => {
                  const tag = tagMap.get(c.tagId)
                  return (
                    <li key={c.tagId} className="rounded-full bg-neutral-100 px-3 py-1 text-xs">
                      {tag?.emoji} {tag?.label}왕 · {userMap.get(c.userId) ?? '?'}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: 수동 확인**

1. `db:studio`에서 현재 시즌의 `endDate`를 어제로 당긴 뒤 마감 실행
2. `SeasonResult`·`SeasonTagChampion`·`UserBadge`가 채워지는지
3. 다음 분기 시즌이 자동 생성되는지
4. **한 사람이 두 부문의 왕이어도 `TAG_KING` 뱃지가 둘 다 들어가는지** (seasonKey 규칙 검증)
5. 같은 시즌을 두 번 마감하려 하면 "이미 마감된 시즌입니다" 오류가 나는지

- [ ] **Step 5: 커밋**

```bash
npm test && npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "feat: 시즌 마감과 명예의 전당 구현

마감 시 순위·부문왕을 스냅샷으로 박제하고 뱃지를 부여한 뒤
다음 분기 시즌을 자동 생성한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

# Phase 5 — 운영과 배포

### Task 13: 호스트 관리 화면

**Files:**
- Create: `app/admin/page.tsx`, `app/admin/actions.ts`

**Interfaces:**
- Consumes: `prisma`, `requireHost`, `generateInviteCode`, `closeSeasonAction`
- Produces: 없음 (말단 화면)

- [ ] **Step 1: 관리 서버 액션**

`app/admin/actions.ts`:

```ts
'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { generateInviteCode } from '@/lib/invite'

export async function createInvite(formData: FormData) {
  const host = await requireHost()
  const memo = String(formData.get('memo') ?? '').trim() || null
  const maxUses = Math.max(1, Number(formData.get('maxUses')) || 1)
  const days = Number(formData.get('expiresInDays')) || 0

  await prisma.inviteCode.create({
    data: {
      code: generateInviteCode(),
      memo,
      maxUses,
      expiresAt: days > 0 ? new Date(Date.now() + days * 86_400_000) : null,
      createdById: host.id,
    },
  })
  revalidatePath('/admin')
}

export async function revokeInvite(formData: FormData) {
  await requireHost()
  await prisma.inviteCode.update({
    where: { id: String(formData.get('inviteId') ?? '') },
    data: { revokedAt: new Date() },
  })
  revalidatePath('/admin')
}

/** 비밀번호 분실 대응 — 메일 서버가 없으므로 호스트가 임시 비번을 발급한다 */
export async function resetPassword(formData: FormData) {
  await requireHost()
  const userId = String(formData.get('userId') ?? '')
  const temp = generateInviteCode(10)
  const user = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(temp, 12) },
    select: { loginId: true },
  })
  // 화면에 띄우면 어깨너머로 노출된다. 호스트가 컨테이너 로그에서 확인해 본인에게 전달한다.
  console.log(`[임시 비밀번호] ${user.loginId} → ${temp}`)
  revalidatePath('/admin')
}

export async function toggleUserStatus(formData: FormData) {
  const host = await requireHost()
  const userId = String(formData.get('userId') ?? '')
  if (userId === host.id) return // 자기 자신은 정지할 수 없다

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } })
  await prisma.user.update({
    where: { id: userId },
    data: { status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
  })
  revalidatePath('/admin')
}

export async function toggleTag(formData: FormData) {
  await requireHost()
  const tagId = String(formData.get('tagId') ?? '')
  const tag = await prisma.tag.findUniqueOrThrow({ where: { id: tagId } })
  await prisma.tag.update({ where: { id: tagId }, data: { active: !tag.active } })
  revalidatePath('/admin')
}

export async function addTag(formData: FormData) {
  await requireHost()
  const label = String(formData.get('label') ?? '').trim()
  const emoji = String(formData.get('emoji') ?? '').trim()
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase()
  if (!label || !emoji || !/^[a-z0-9_]+$/.test(slug)) return

  const max = await prisma.tag.aggregate({ _max: { sortOrder: true } })
  await prisma.tag.create({
    data: { slug, label, emoji, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  })
  revalidatePath('/admin')
}
```

> 태그는 **비활성화만 하고 삭제하지 않는다.** 삭제하면 과거 모임의 활동 기록이 사라진다.

- [ ] **Step 2: 관리 화면**

`app/admin/page.tsx`:

```tsx
import { prisma } from '@/lib/db'
import { requireHost } from '@/lib/auth/guard'
import { currentSeason } from '@/lib/ranking'
import { createInvite, revokeInvite, resetPassword, toggleUserStatus, toggleTag, addTag } from './actions'
import { closeSeasonAction } from './season-actions'

export default async function AdminPage() {
  await requireHost()

  const [invites, users, tags, season] = await Promise.all([
    prisma.inviteCode.findMany({ where: { revokedAt: null }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, loginId: true, nickname: true, role: true, status: true } }),
    prisma.tag.findMany({ orderBy: { sortOrder: 'asc' } }),
    currentSeason(),
  ])

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">관리</h1>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold">초대코드</h2>
        <form action={createInvite} className="flex flex-col gap-2 rounded-xl border p-3">
          <input name="memo" placeholder="메모 (예: 민수 주려고)" className="rounded-lg border px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input name="maxUses" type="number" min={1} defaultValue={1} className="w-24 rounded-lg border px-3 py-2 text-sm" aria-label="사용 한도" />
            <input name="expiresInDays" type="number" min={0} defaultValue={30} className="w-24 rounded-lg border px-3 py-2 text-sm" aria-label="유효 일수 (0=무기한)" />
            <button className="flex-1 rounded-lg bg-neutral-900 py-2 text-sm font-semibold text-white">발급</button>
          </div>
        </form>

        <ul className="mt-2 flex flex-col gap-1">
          {invites.map((i) => (
            <li key={i.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
              <code className="font-mono font-bold tracking-wider">{i.code}</code>
              <span className="flex-1 truncate text-xs text-neutral-500">
                {i.memo ?? '—'} · {i.usedCount}/{i.maxUses}
              </span>
              <form action={revokeInvite}>
                <input type="hidden" name="inviteId" value={i.id} />
                <button className="text-xs text-red-600 underline">중지</button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">회원 {users.length}명</h2>
        <ul className="flex flex-col gap-1">
          {users.map((u) => (
            <li key={u.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
              <span className="flex-1">
                {u.nickname}
                <span className="ml-1 text-xs text-neutral-500">@{u.loginId}</span>
                {u.role === 'HOST' && <span className="ml-1 text-xs">👑</span>}
                {u.status === 'SUSPENDED' && <span className="ml-1 text-xs text-red-600">정지</span>}
              </span>
              <form action={resetPassword}>
                <input type="hidden" name="userId" value={u.id} />
                <button className="text-xs underline">비번 초기화</button>
              </form>
              {u.role !== 'HOST' && (
                <form action={toggleUserStatus}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="text-xs text-red-600 underline">
                    {u.status === 'ACTIVE' ? '정지' : '해제'}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-neutral-500">
          비번을 초기화하면 서버 로그에 임시 비밀번호가 남습니다. 확인 후 본인에게 전달하세요.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold">활동 태그</h2>
        <ul className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.id}>
              <form action={toggleTag}>
                <input type="hidden" name="tagId" value={t.id} />
                <button className={`rounded-full border px-3 py-1 text-sm ${t.active ? '' : 'opacity-40 line-through'}`}>
                  {t.emoji} {t.label}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addTag} className="mt-2 flex gap-2">
          <input name="emoji" placeholder="🎯" className="w-14 rounded-lg border px-2 py-2 text-center text-sm" />
          <input name="label" placeholder="이름" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
          <input name="slug" placeholder="slug" className="w-24 rounded-lg border px-3 py-2 text-sm" />
          <button className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">추가</button>
        </form>
        <p className="mt-1 text-xs text-neutral-500">태그는 삭제하지 않고 비활성화합니다 (과거 기록 보존).</p>
      </section>

      {season && (
        <section className="mt-8 mb-10">
          <h2 className="mb-2 font-semibold">시즌</h2>
          <SeasonCloseForm seasonId={season.id} seasonName={season.name} />
        </section>
      )}
    </main>
  )
}
```

`app/admin/page.tsx` 상단 import에서 `closeSeasonAction` 대신 `SeasonCloseForm`을 가져온다.

```ts
import SeasonCloseForm from './SeasonCloseForm'
```

> `closeSeasonAction`을 `<form action>`에 직접 넣지 않는 이유: `useActionState`용 시그니처(`_prev, formData`)라 타입이 맞지 않고, 마감 결과 메시지를 화면에 띄울 수 없다. 클라이언트 컴포넌트로 감싼다.

- [ ] **Step 3: 시즌 마감 폼 (Step 2보다 먼저 만들어도 무방)**

`app/admin/SeasonCloseForm.tsx`:

```tsx
'use client'

import { useActionState } from 'react'
import { closeSeasonAction, type SeasonState } from './season-actions'

export default function SeasonCloseForm({ seasonId, seasonName }: { seasonId: string; seasonName: string }) {
  const [state, action, pending] = useActionState<SeasonState, FormData>(closeSeasonAction, {})

  return (
    <form action={action} className="rounded-xl border p-3">
      <input type="hidden" name="seasonId" value={seasonId} />
      <p className="text-sm">{seasonName} 진행 중</p>
      <button disabled={pending} className="mt-2 w-full rounded-lg border border-red-600 py-2 text-sm font-semibold text-red-600 disabled:opacity-50">
        {pending ? '마감 중…' : '시즌 마감하기'}
      </button>
      <p className="mt-1 text-xs text-neutral-500">마감하면 순위가 박제되고 되돌릴 수 없습니다.</p>
      {state.message && <p className="mt-2 text-sm font-semibold text-green-700">{state.message}</p>}
      {state.error && <p role="alert" className="mt-2 text-sm text-red-600">{state.error}</p>}
    </form>
  )
}
```

`app/admin/page.tsx`의 시즌 섹션을 `<SeasonCloseForm seasonId={season.id} seasonName={season.name} />`로 교체한다.

- [ ] **Step 4: 검증 후 커밋**

```bash
npm test && npm run lint && npm run typecheck && npm run build
git add -A
git commit -m "feat: 호스트 관리 화면 구현

초대코드 발급·중지, 회원 비번 초기화·정지, 활동 태그 편집, 시즌 마감.
태그는 삭제하지 않고 비활성화해 과거 기록을 보존한다.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 14: 보안 헤더 + 검색 차단

**Files:**
- Modify: `next.config.ts`
- Create: `app/robots.ts`, `app/(auth)/layout.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: robots 차단**

`app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: '*', disallow: '/' }] }
}
```

- [ ] **Step 2: 보안 헤더**

`next.config.ts`:

```ts
import type { NextConfig } from 'next'

const csp = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
    ]
  },
}

export default nextConfig
```

> `script-src`에 `'unsafe-inline'`이 필요한 이유: Next.js App Router가 하이드레이션 데이터를 인라인 스크립트로 심는다. nonce 기반으로 조이는 것은 이 규모에서 과하다(YAGNI).

- [ ] **Step 3: 루트 레이아웃 정리**

`app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '우리집 방문일지',
  description: '누가 언제 놀러왔는지 기록하는 곳',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: 헤더 확인**

```bash
npm run build && npm start
curl -I http://localhost:3000/login
```

Expected: 응답 헤더에 `X-Robots-Tag: noindex, nofollow`, `X-Frame-Options: DENY`, `Content-Security-Policy` 포함

- [ ] **Step 5: 커밋**

```bash
npm run lint && npm run typecheck
git add -A
git commit -m "chore: 보안 헤더와 검색엔진 차단 적용

CSP·HSTS·X-Frame-Options 전면 적용, robots.txt 전면 차단.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 15: Docker 배포 + 백업

**Files:**
- Create: `Dockerfile`, `.dockerignore`, `docker-compose.yml`, `docker-entrypoint.sh`
- Create: `scripts/backup.sh`, `scripts/deploy.sh`
- Create: `CLAUDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: 없음
- Produces: NAS에서 동작하는 배포 구성

- [ ] **Step 1: Dockerfile**

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl postgresql17-client
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
```

`docker-entrypoint.sh`:

```sh
#!/bin/sh
set -e
echo "마이그레이션 적용 중…"
node node_modules/prisma/build/index.js migrate deploy
echo "서버 시작"
exec node server.js
```

`.dockerignore`:

```
node_modules
.next
.git
.devdata
docs
*.md
.env
.env.*
```

- [ ] **Step 2: docker-compose.yml (NAS용)**

```yaml
services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - /volume1/docker/visit_calendar/pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    # 호스트 포트를 열지 않는다 — 내부 네트워크로만 접근

  app:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public
      AUTH_SECRET: ${AUTH_SECRET}
      AUTH_URL: ${AUTH_URL}
      AUTH_TRUST_HOST: "true"
      UPLOAD_DIR: /data/uploads
    volumes:
      - /volume1/docker/visit_calendar/uploads:/data/uploads
    ports:
      - "3000:3000"
```

> `AUTH_TRUST_HOST=true`가 필요한 이유: DSM 리버스 프록시 뒤에 있어 NextAuth가 원본 호스트를 신뢰해야 콜백 URL이 맞는다.

`.env.production.example` (NAS에 `.env`로 두고 커밋하지 않는다):

```
POSTGRES_USER=visit
POSTGRES_PASSWORD=<강한 비밀번호>
POSTGRES_DB=visit_calendar
AUTH_SECRET=<npx auth secret 결과>
AUTH_URL=https://visit.<내DDNS>.synology.me
```

- [ ] **Step 3: 배포·백업 스크립트**

`scripts/deploy.sh`:

```sh
#!/bin/sh
set -e
cd "$(dirname "$0")/.."
git pull
docker compose up -d --build
docker compose ps
echo "배포 완료"
```

`scripts/backup.sh` — DSM 작업 스케줄러에 매일 새벽 등록한다.

```sh
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
```

- [ ] **Step 4: NAS 배포 절차 (README.md에 기록)**

```markdown
## NAS 배포

1. DSM → 패키지 센터에서 **Container Manager** 설치
2. SSH 접속 후 `/volume1/docker/visit_calendar`에 리포를 clone
3. `.env.production.example`을 `.env`로 복사하고 값을 채움
   - `AUTH_SECRET`은 `npx auth secret`으로 생성
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
```

- [ ] **Step 5: 프로젝트 CLAUDE.md 작성**

`CLAUDE.md` — 다음 세션이 이 파일부터 읽는다.

```markdown
# CLAUDE.md — visit_calendar (우리집 방문일지)

지인들의 집 방문을 캘린더로 기록하고 점수·랭킹·뱃지로 즐기는 비공개 웹앱.
자택 Synology NAS의 Docker에 배포. 사용자는 호스트 1명 + 지인 수십 명.

- 설계서: `docs/superpowers/specs/2026-08-26-visit-calendar-design.md` (**착수 전 필독**)
- 구현 계획: `docs/superpowers/plans/2026-08-26-visit-calendar.md`

## 기술 스택
Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · Prisma 7 ·
PostgreSQL 17 (NAS 컨테이너) · NextAuth v5 Credentials · zod · sharp

## 명령어
\`\`\`bash
npm run db:up        # 로컬 개발용 Postgres 컨테이너 (호스트 5433)
npm run dev
npm test             # 점수·뱃지·날짜 순수 로직
npm run lint && npm run typecheck && npm run build   # 완료 기준
npm run db:migrate
npm run db:seed
\`\`\`

## 절대 원칙 (변경 전 사용자 확인 필수)
1. **기록 단위는 모임(Visit) + 참석자 다수** — 개인별 방문으로 되돌리지 않는다
2. **점수·랭킹 테이블을 만들지 않는다** — 계산형 유지. 저장하는 것은 뱃지 획득과 시즌 결과뿐
3. **`UserBadge.seasonKey`에 NULL 금지** — 비시즌 `"-"`, `SEASON_CHAMPION`=`<seasonId>`,
   `TAG_KING`=`<seasonId>:<tagSlug>`. NULL이면 Postgres가 유니크 제약을 무력화한다
4. **`Visit.visitDate`는 `@db.Date`**, 앱에서는 `'YYYY-MM-DD'` 문자열로만 다룬다.
   `new Date('YYYY-MM-DD')` 사용 금지 (KST에서 하루 밀린다)
5. **점수 배점·뱃지 조건·칭호 구간의 원본은 설계서 §4**. `lib/scoring/`의 상수와 항상 일치시킨다
6. **이메일·소셜 로그인 없음** — NAS에 메일 서버가 없다. 비번 분실은 호스트가 임시 비번 발급
7. **태그는 삭제하지 않고 비활성화** — 삭제하면 과거 모임의 활동 기록이 사라진다
8. 권한 검사는 서버 액션·API 라우트에서 매번. `proxy.ts`는 1차 방어일 뿐이다

## 구조
- `lib/date.ts`, `lib/scoring/{points,titles,badges}.ts` — **Prisma를 import 하지 않는 순수 함수**
- `lib/scoring/collect.ts` — Prisma → 순수 함수 입력으로 변환하는 유일한 지점
- `lib/visits.ts` — 모임 생성·승인·뱃지 부여
- `lib/ranking.ts` / `lib/season.ts` — 랭킹 집계 / 시즌 마감
- `app/(guest)/` 손님 화면, `app/admin/` 호스트 전용

## 검증
`npm run lint && npm run typecheck && npm run build && npm test` 전부 통과 +
375px 뷰포트에서 가입→기록→승인→랭킹 반영 수동 확인

## 후속 과제 (설계서 §10)
벽걸이 디스플레이 전용 화면 `/wall`, 연말 결산 페이지
```

- [ ] **Step 6: 전체 검증 후 커밋**

```bash
npm test && npm run lint && npm run typecheck && npm run build
docker compose -f docker-compose.yml config   # compose 문법 확인
git add -A
git commit -m "chore: Docker 배포 구성과 백업 스크립트 추가

NAS Container Manager용 compose, 마이그레이션 자동 적용 엔트리포인트,
pg_dump 일일 백업 스크립트, 프로젝트 CLAUDE.md 포함.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## 자체 검토 결과

계획을 스펙과 대조해 확인한 사항이다.

**스펙 커버리지** — §1~§11 전 항목이 작업에 배정되었다.

| 스펙 | 작업 |
|---|---|
| §2 기술 스택 | Task 1 |
| §3 도메인 모델 | Task 1 |
| §4.1 점수 / §4.2 칭호 | Task 3 |
| §4.3 뱃지 | Task 4, 8 (부여), 12 (시즌 뱃지) |
| §4.4 시즌 | Task 12 |
| §5 인증·권한 | Task 5, 6 |
| §6 화면 | Task 8~13 |
| §7 사진 처리 | Task 7 |
| §8 배포·백업·보안 | Task 14, 15 |
| §9 검증 기준 | 각 작업 마지막 스텝 |
| §10 후속 과제 | 범위 밖 — CLAUDE.md에 기록 |

**의도적으로 구현하지 않는 것**

- 랭킹 캐시·머티리얼라이즈드 뷰 — 지인 수십 명 규모에서 불필요 (스펙 §3.3)
- 로그인 실패 카운터의 DB 저장 — 컨테이너 1대 운영이므로 메모리로 충분
- 시즌 자동 마감 크론 — 호스트 수동 실행 (스펙 §4.4)

**드러난 위험 2가지**

1. **랭킹 계산이 전체 방문을 매번 읽는다.** 수십 명·수백 건 규모에선 문제없지만, 방문이 수천 건을 넘으면 `/ranking` 응답이 느려진다. 그때 `lib/ranking.ts` 안에서만 캐시를 넣으면 되도록 경계를 만들어 두었다.
2. **`resetPassword`가 임시 비밀번호를 서버 로그로만 알려준다.** 화면에 직접 띄우면 어깨너머로 보일 수 있어 로그로 뺐다. 운영해 보고 불편하면 화면 노출로 바꾼다 — 지인 대상이므로 위험이 낮다.
