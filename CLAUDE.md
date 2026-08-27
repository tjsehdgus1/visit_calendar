# CLAUDE.md — visit_calendar (우리집 방문일지)

지인들의 집 방문을 캘린더로 기록하고 점수·랭킹·뱃지로 즐기는 비공개 웹앱.
자택 Synology NAS의 Docker에 배포. 사용자는 호스트 1명 + 지인 수십 명.

- 설계서: `docs/superpowers/specs/2026-08-26-visit-calendar-design.md` (**착수 전 필독**)
- 구현 계획: `docs/superpowers/plans/2026-08-26-visit-calendar.md`

## 기술 스택
Next.js 16 App Router · React 19 · TypeScript · Tailwind 4 · Prisma 7 ·
PostgreSQL 17 (NAS 컨테이너) · NextAuth v5 Credentials · zod · sharp

## 로컬 개발
이 PC에는 Docker가 없다. `npm run db:up`(Docker 컨테이너, 포트 5433)은 이 PC에서 쓰지 않는다.
로컬 DB는 `localhost:5432`에 이미 설치된 PostgreSQL 17을 그대로 쓴다
(role `visit` / db `visit_calendar`, `.env.example` 참고). Docker가 있는 머신에서는
`docker-compose.dev.yml` + `npm run db:up`으로 대체 가능.

## 명령어
```bash
npm run dev
npm test             # 점수·뱃지·날짜 순수 로직
npm run lint && npm run typecheck && npm run build   # 완료 기준 (typecheck 전 pretypecheck가 next typegen 자동 실행)
npm run smoke         # 승인 플로우 스모크 테스트 (scripts/smoke-approval.ts)
npm run db:migrate
npm run db:seed
```

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
9. **호스트(집주인)는 참석자·점수·랭킹 대상이 아니다** (2026-08-26 사용자 확정) — 기록 제출 시
   손님만 본인 자동 포함, 호스트는 온 사람만 선택. 랭킹 집계는 `role: GUEST`만

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

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
