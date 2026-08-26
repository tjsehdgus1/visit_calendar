# visit_calendar 설계서

- 작성일: 2026-08-26
- 상태: 사용자 승인 완료 (브레인스토밍 → 설계)
- 다음 단계: 구현 계획(plan) 작성

---

## 1. 개요

집에 놀러 오는 지인들의 **방문 기록을 캘린더로 남기고, 게임 요소로 즐기는 비공개 웹앱**.

- 사용자: 집주인(호스트) 1명 + 지인 손님 수십 명
- 손님이 직접 방문을 기록하고, 호스트가 승인하면 점수·랭킹·뱃지에 반영된다
- 트래픽은 사실상 없음 (동시 접속 한 자릿수 가정)
- 배포: 자택 Synology NAS의 Docker

### 성공 기준

1. 손님이 폰에서 초대코드로 가입하고 방문을 기록할 수 있다
2. 호스트가 승인하면 점수·랭킹·뱃지가 즉시 갱신된다
3. 캘린더에서 "언제 누가 와서 뭘 했는지"를 한눈에 되돌아볼 수 있다
4. NAS에서 HTTPS로 외부 접속되고, 검색엔진에 노출되지 않는다

### 범위에서 의도적으로 제외 (YAGNI)

- 이메일 발송(회원가입 인증·비번 재설정 메일) — NAS에 메일 서버 없음
- 소셜 로그인(카카오 등) — 도메인 검증·앱 등록 부담
- 푸시 알림, 모바일 네이티브 앱
- 다중 호스트 / 여러 집 지원 — **집은 하나**라는 전제로 설계
- 벽걸이 디스플레이 전용 화면 — 별도 후속 과제 (§10)

---

## 2. 기술 스택

| 항목 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js 16 (App Router)** + React 19 + TypeScript | 미들웨어는 `proxy.ts` (Next 16) |
| 스타일 | **Tailwind CSS 4** | |
| ORM | **Prisma 7** | |
| DB | **PostgreSQL 17 (NAS 내 컨테이너)** | 연결문자열 교체만으로 Neon 이전 가능 |
| 인증 | **NextAuth (Auth.js v5) Credentials** | 아이디 + 비밀번호 |
| 검증 | **zod** | |
| 이미지 처리 | **sharp** | 업로드 리사이즈·EXIF 제거 |
| 배포 | **Docker Compose (Synology Container Manager)** | Next.js `output: 'standalone'` |

기존 프로젝트 `E:\DEV\gangbuk-baekmac-festival-2026`과 동일 계열 스택이므로, 설정 파일·패턴을 참고한다.

### 벤더 종속 회피 (필수 원칙)

- Prisma 외의 DB 전용 API를 쓰지 않는다
- 파일 저장은 파일시스템 추상화 한 겹(`lib/storage.ts`)을 거친다 — 나중에 S3류로 교체 가능하게

---

## 3. 도메인 모델

### 3.1 핵심 결정: 기록의 단위는 "모임"

개인별 방문이 아니라 **모임(Visit) 1건에 참석자 여러 명**이 붙는 구조.

- 같은 날 모임이 사람 수만큼 쪼개지지 않는다
- 호스트는 모임당 한 번만 승인하면 된다
- 점수는 참석자 각자에게 동일하게 부여된다

### 3.2 스키마 (Prisma 초안)

```prisma
enum Role        { HOST GUEST }
enum UserStatus  { ACTIVE SUSPENDED }
enum TimeSlot    { DAY EVENING OVERNIGHT }
enum VisitStatus { PENDING APPROVED REJECTED }

model User {
  id              String     @id @default(cuid())
  loginId         String     @unique
  passwordHash    String
  nickname        String
  avatarPath      String?
  role            Role       @default(GUEST)
  status          UserStatus @default(ACTIVE)
  invitedByCodeId String?
  createdAt       DateTime   @default(now())

  attended      VisitAttendee[]
  submitted     Visit[]        @relation("submittedBy")
  reviewed      Visit[]        @relation("reviewedBy")
  badges        UserBadge[]
  seasonResults SeasonResult[]
}

model InviteCode {
  id          String    @id @default(cuid())
  code        String    @unique
  memo        String?
  maxUses     Int       @default(1)
  usedCount   Int       @default(0)
  expiresAt   DateTime?
  revokedAt   DateTime?
  createdById String
  createdAt   DateTime  @default(now())
}

model Visit {
  id            String      @id @default(cuid())
  visitDate     DateTime    @db.Date
  timeSlot      TimeSlot
  memo          String?     @db.Text
  status        VisitStatus @default(PENDING)
  submittedById String
  reviewedById  String?
  reviewedAt    DateTime?
  rejectReason  String?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  submittedBy User  @relation("submittedBy", fields: [submittedById], references: [id])
  reviewedBy  User? @relation("reviewedBy",  fields: [reviewedById],  references: [id])
  attendees   VisitAttendee[]
  tags        VisitTag[]
  photos      VisitPhoto[]

  @@index([visitDate])
  @@index([status])
}

model VisitAttendee {
  visitId String
  userId  String
  visit   Visit @relation(fields: [visitId], references: [id], onDelete: Cascade)
  user    User  @relation(fields: [userId],  references: [id])
  @@id([visitId, userId])
  @@index([userId])
}

model Tag {
  id        String  @id @default(cuid())
  slug      String  @unique
  label     String
  emoji     String
  sortOrder Int     @default(0)
  active    Boolean @default(true)
  visits    VisitTag[]
}

model VisitTag {
  visitId String
  tagId   String
  visit   Visit @relation(fields: [visitId], references: [id], onDelete: Cascade)
  tag     Tag   @relation(fields: [tagId],   references: [id])
  @@id([visitId, tagId])
  @@index([tagId])
}

model VisitPhoto {
  id           String   @id @default(cuid())
  visitId      String
  filePath     String
  width        Int
  height       Int
  byteSize     Int
  uploadedById String
  createdAt    DateTime @default(now())
  visit        Visit @relation(fields: [visitId], references: [id], onDelete: Cascade)
  @@index([visitId])
}

model Badge {
  code        String  @id
  label       String
  emoji       String
  description String
  repeatable  Boolean @default(false)
  sortOrder   Int     @default(0)
  earned      UserBadge[]
}

model UserBadge {
  id        String   @id @default(cuid())
  userId    String
  badgeCode String
  seasonKey String   @default("-")
  visitId   String?
  earnedAt  DateTime @default(now())
  user  User  @relation(fields: [userId],    references: [id], onDelete: Cascade)
  badge Badge @relation(fields: [badgeCode], references: [code])
  @@unique([userId, badgeCode, seasonKey])
  @@index([userId])
}

model Season {
  id        String    @id @default(cuid())
  name      String
  startDate DateTime  @db.Date
  endDate   DateTime  @db.Date
  closedAt  DateTime?
  results   SeasonResult[]
  champions SeasonTagChampion[]
  @@unique([startDate, endDate])
}

model SeasonResult {
  id         String @id @default(cuid())
  seasonId   String
  userId     String
  rank       Int
  points     Int
  visitCount Int
  season Season @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  user   User   @relation(fields: [userId],   references: [id])
  @@unique([seasonId, userId])
}

model SeasonTagChampion {
  seasonId String
  tagId    String
  userId   String
  count    Int
  season Season @relation(fields: [seasonId], references: [id], onDelete: Cascade)
  @@id([seasonId, tagId])
}
```

필드 의미 보충:

- `InviteCode.code` — 사람이 불러줄 수 있는 8자, 혼동 문자(0/O, 1/I/l) 제외
- `InviteCode.memo` — "민수 주려고" 같은 용도 메모
- `Season.name` — "2026 3분기"
- `Badge.description` — 미획득 상태에서 노출할 획득 조건 문구
- `VisitPhoto.filePath` — uploads 볼륨 기준 상대경로

### 3.3 스키마 주의사항 (구현 시 반드시 지킬 것)

1. **`UserBadge.seasonKey`는 NULL을 쓰지 않는다.** Postgres는 NULL을 서로 다른 값으로 취급하므로, NULL이면 `@@unique`가 중복 획득을 막지 못한다. 값 규칙은 다음과 같다.

   | 뱃지 | `seasonKey` 값 | 이유 |
   |---|---|---|
   | 비시즌 뱃지 10종 | `"-"` | 생애 1회 획득 |
   | `SEASON_CHAMPION` | `<seasonId>` | 시즌마다 1회 |
   | `TAG_KING` | `<seasonId>:<tagSlug>` | **한 시즌에 여러 부문 동시 석권 가능**. 시즌 id만 쓰면 두 번째 부문왕이 유니크 제약에 막힌다 |
2. **`Visit.visitDate`는 `@db.Date`** — 시각 없이 날짜만 저장해 KST 자정 문제를 원천 차단한다. 문자열 `YYYY-MM-DD`로 다루고, `new Date("YYYY-MM-DD")` 형태의 UTC 파싱은 금지한다.
3. **점수·랭킹 테이블은 만들지 않는다** (하이브리드 설계). 점수는 승인된 `Visit`에서 매번 계산하고, **뱃지 획득과 시즌 결과만** 저장한다.
4. `Tag`·`Badge`는 시드 데이터로 초기 투입한다.

---

## 4. 점수·칭호·뱃지 규칙

### 4.1 점수 (`APPROVED` 상태의 모임만 집계)

**모임 단건 점수** — 참석자 각자에게 동일하게 부여

| 항목 | 점수 |
|---|---|
| 방문(참석) | +10 |
| 시간대 DAY | +0 |
| 시간대 EVENING | +3 |
| 시간대 OVERNIGHT | +7 |
| 메모가 있음 | +3 |
| 사진 1장 이상 | +5 |
| 동반자 수 | (참석자 수 − 1) × 1, **최대 +3** |

**누적 보너스** — 사용자 이력 전체에서 계산

| 항목 | 점수 |
|---|---|
| 생애 첫 방문 | +20 (1회) |
| 4주 연속 방문 | 승인된 방문을 ISO 주 단위로 묶어 연속 구간을 구한 뒤, **각 구간의 (연속 주 수 ÷ 4) 몫 × 15점** |

> 예: 9주 연속 방문 → 9 ÷ 4 = 2 → +30점

**총점 = Σ(모임 단건 점수) + 누적 보너스**

시즌 점수는 같은 공식을 해당 시즌 기간의 모임에만 적용한다. 단 **첫 방문 보너스는 통산에만** 적용한다.

### 4.2 칭호 (통산 누적 점수)

| 점수 | 칭호 |
|---|---|
| 0 ~ 49 | 잠깐손님 |
| 50 ~ 149 | 눈도장 |
| 150 ~ 349 | 단골 |
| 350 ~ 699 | 터줏대감 |
| 700 ~ 1499 | 이집사람 |
| 1500 ~ | 세대주 |

### 4.3 뱃지 12종

| code | 표시 | 조건 | 반복 획득 |
|---|---|---|---|
| `FIRST_VISIT` | 🎉 개시 | 첫 방문 | — |
| `VISIT_10` | 🔟 출석왕 | 통산 10회 방문 | — |
| `VISIT_50` | 💯 백번손님 | 통산 50회 방문 | — |
| `OVERNIGHT_3` | 🌅 새벽 생존자 | OVERNIGHT 3회 | — |
| `STREAK_4W` | 📅 정기구독 | 4주 연속 방문 | — |
| `ALL_TAGS` | 🎲 만능 엔터테이너 | 활성 태그 전부 1회 이상 경험 | — |
| `PHOTO_30` | 📸 사진사 | 사진 30장 업로드 | — |
| `MEMO_20` | ✍️ 작가 | 메모 20건 작성 | — |
| `SOLO_5` | 🧍 독고다이 | 참석자 1명인 모임 5회 | — |
| `CROWD_5` | 👥 인싸 | 참석자 4명 이상 모임 5회 | — |
| `SEASON_CHAMPION` | 🏆 시즌 챔피언 | 시즌 1위 | **O** |
| `TAG_KING` | 🥇 부문왕 | 시즌 내 특정 태그 1위 | **O** |

- 판정 시점: **모임 승인 직후** 해당 모임 참석자 전원에 대해 재판정. `SEASON_CHAMPION`·`TAG_KING`은 시즌 마감 시 부여
- 판정 로직은 순수 함수(`lib/scoring/badges.ts`)로 분리해 단위 테스트한다

### 4.4 시즌

- **분기제**: 1–3월 / 4–6월 / 7–9월 / 10–12월
- 시즌 랭킹은 분기마다 리셋, **통산 랭킹은 영구 집계** (둘 다 노출)
- 마감 시 `SeasonResult`(전원 순위·점수·방문수)와 `SeasonTagChampion`(태그별 1위)을 **스냅샷으로 저장**하고 `Season.closedAt`을 찍는다
- 마감은 호스트가 관리 화면에서 수동 실행한다 (크론 불필요, 실수 복구가 쉬움)
- **마감 후 점수 공식을 바꿔도 과거 시즌 결과는 변하지 않는다** — 스냅샷을 두는 이유

---

## 5. 인증·권한

### 5.1 가입

1. 호스트가 관리 화면에서 **초대코드 발급** (메모·사용 한도·만료일 지정)
2. 손님이 코드를 입력하고 아이디·비밀번호·닉네임으로 가입
3. 코드 검증: 미만료 + 미폐기 + `usedCount < maxUses`. 성공 시 **트랜잭션 안에서** `usedCount` 증가

### 5.2 로그인

- **아이디 + 비밀번호** (bcrypt, cost 12). 이메일 없음
- NextAuth Credentials + JWT 세션
- 비밀번호 분실 → **호스트가 관리 화면에서 임시 비밀번호 발급**, 다음 로그인 시 변경 강제
- 로그인 실패 5회 시 해당 계정 10분 잠금

### 5.3 권한

| 행위 | 손님 | 호스트 |
|---|---|---|
| 캘린더·랭킹·명예의 전당 열람 | O | O |
| 모임 기록 제출 | O (PENDING) | O (즉시 APPROVED) |
| 자기가 올린 PENDING 모임 수정·삭제 | O | O |
| 승인된 모임 수정·삭제 | X | O |
| 승인 / 반려 | X | O |
| 초대코드·회원·태그·시즌 관리 | X | O |

- **비로그인 사용자는 로그인·가입 페이지 외 모든 경로 접근 불가** (`proxy.ts`에서 차단)
- 권한 검사는 **서버 액션·API 라우트에서 매번** 수행한다. 화면 숨김만으로 막지 않는다

---

## 6. 화면 명세

### 손님 화면

| 경로 | 화면 | 내용 |
|---|---|---|
| `/` | **캘린더** | 월 달력. 방문한 날 칸에 참석자 프로필 동그라미 + 활동 이모지. 날짜 클릭 시 그날 모임 상세(사진·메모·참석자·시간대) |
| `/ranking` | **랭킹** | 탭 3개: `이번 시즌` / `통산` / `부문왕`. 1~3위 시상대 연출, 내 순위 하단 고정 |
| `/visits/new` | **기록하기** | 날짜 → 시간대 → 활동 태그(다중) → 같이 온 사람(다중) → 한 줄 메모 → 사진. 제출 후 "승인 대기 중" |
| `/me` | **내 프로필** | 칭호·점수·다음 레벨 게이지, 뱃지 진열장(미획득은 회색 실루엣 + 조건 문구), 연간 방문 히트맵 |
| `/hall-of-fame` | **명예의 전당** | 역대 시즌 우승자·부문왕 |

### 호스트 전용

| 경로 | 화면 | 내용 |
|---|---|---|
| `/admin/approvals` | **승인함** | PENDING 모임 카드 목록 → 승인 / 반려(사유). 승인 시 획득 뱃지 표시 |
| `/admin` | **관리** | 초대코드 발급·폐기, 회원 목록(임시비번·정지), 활동 태그 편집, 시즌 마감 |

### 연출 (재미의 실체 — 구현 시 생략 금지)

1. 승인 순간 점수 획득 애니메이션 + 뱃지 획득 팝업
2. 미획득 뱃지를 회색 실루엣 + 조건 문구로 노출 (동기 부여의 핵심)
3. 시즌 종료 D-7부터 랭킹 상단에 "마감 임박" 배너

### UI 원칙

- **모바일 우선** (375px 기준). 손님은 전원 폰으로 쓴다
- 다크모드는 하지 않는다 (YAGNI)

---

## 7. 사진 처리

- 업로드 시 sharp로 **긴 변 1600px 리사이즈 + EXIF(위치정보) 제거 + WebP 변환**
- 저장 경로: `uploads/YYYY/MM/<cuid>.webp` (볼륨 기준 상대경로)
- 서빙: `/api/photos/[id]` — **세션 검증 후** 스트리밍. 정적 경로 직접 노출 금지
- 모임당 최대 10장, 장당 원본 10MB 제한
- 파일 접근은 `lib/storage.ts` 한 겹을 통해서만 (교체 가능성 유지)

---

## 8. 배포 구조

```
Synology NAS
├─ Container Manager (docker compose)
│   ├─ app : Next.js standalone  (내부 3000)
│   └─ db  : postgres:17-alpine  (내부 5432, 외부 미개방)
├─ 볼륨
│   ├─ /volume1/docker/visit_calendar/pgdata
│   └─ /volume1/docker/visit_calendar/uploads
└─ DSM 리버스 프록시 + Let's Encrypt
    visit.<DDNS>.synology.me → app:3000
```

- `next.config.ts`에 `output: 'standalone'` — 이미지 크기 최소화
- **DB 컨테이너 포트는 호스트에 노출하지 않는다.** compose 내부 네트워크로만 통신
- HTTPS: 시놀로지 DDNS(무료) + DSM 내장 Let's Encrypt 자동 갱신
- 방화벽: 443만 개방
- 배포: NAS에서 `git pull && docker compose up -d --build` (`scripts/deploy.sh`로 제공)
- 마이그레이션: 컨테이너 기동 시 `prisma migrate deploy` 실행

### 백업

- DSM 작업 스케줄러로 매일 새벽 `pg_dump` → `/volume1/backup/visit_calendar/YYYY-MM-DD.sql.gz` (14일 보관)
- Hyper Backup이 위 덤프 + `uploads` 폴더를 외부로 백업 (pgdata 디렉터리 자체를 백업하지 않는다 — 실행 중 스냅샷은 복구 보장이 안 된다)

### 보안

- `robots.txt` 전면 차단 + `X-Robots-Tag: noindex` (검색 노출 방지)
- 보안 헤더(CSP·HSTS·X-Frame-Options) 적용
- `.env`는 커밋 금지. `.env.example`만 리포에 둔다
- 사용자 입력 메모는 **텍스트로만 렌더링** (innerHTML 금지)

---

## 9. 검증 기준

완료 선언 전에 아래를 모두 통과해야 한다.

```bash
npm run lint
npm run typecheck
npm run build
npm test
```

- **점수·뱃지 판정 로직은 단위 테스트 필수** (`node:test`). 규칙이 많고 눈으로 검증하기 어렵다
- 브라우저 375px 뷰포트에서 주요 플로우(가입 → 기록 → 승인 → 랭킹 반영) 수동 확인
- 날짜 경계 테스트: 자정 직전·직후 기록이 올바른 날짜로 저장되는지

---

## 10. 후속 과제 (이번 범위 아님)

- **벽걸이 디스플레이 전용 화면** (`/wall`) — 조작 없이 캘린더·랭킹을 순환 표시. 하드웨어는 중고 안드로이드 태블릿 + Fully Kiosk Browser 안이 유력
- 연말 결산 페이지 (한 해 방문 요약)
- 뱃지 추가·점수 공식 튜닝 (운영하며 조정)

---

## 11. 확정된 결정 사항 (임의 변경 금지)

1. 기록 단위는 **모임(Visit) + 참석자 다수** — 개인별 방문 기록으로 되돌리지 않는다
2. 점수·랭킹은 **계산형**, 뱃지 획득과 시즌 결과만 **저장형** (하이브리드)
3. 로그인은 **아이디 + 비밀번호**, 이메일·소셜 로그인 없음
4. 가입은 **초대코드 필수**
5. 방문은 **호스트 승인** 후에만 점수에 반영
6. DB는 **NAS 내 Postgres 컨테이너**. 단 Neon 이전이 가능하도록 벤더 종속 코드 금지
