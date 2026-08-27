# visit_calendar 디자인 시스템 적용 리포트

브랜치: `feat/initial-implementation`
원본: `design-system/MASTER.md`

## 변경 파일 목록

### 폰트·토큰 (§1)
- `app/layout.tsx` — `next/font/google`로 Jua(`--font-jua`, weight 400)와 Noto Sans KR(`--font-sans-kr`, weight 400/500/700) 로드, `<html>`에 변수 클래스 적용. body 배경 `bg-cream`, 텍스트 `text-ink`.
- `app/globals.css` — `@theme`에 MASTER §2 컬러 토큰 13종(cream/card/ink/ink-soft/brand/brand-deep/brand-soft/cta/gold/gold-soft/line/ok/danger/info) 전부 정의, `--shadow-warm` 추가, `--font-display: var(--font-jua), "Jua", sans-serif`, `--font-sans: var(--font-sans-kr), ...` 앞단 배치. 기존 다크모드 `@media (prefers-color-scheme: dark)` 블록은 MASTER §8 금지사항(다크모드 미생성)에 따라 제거하고 정적 cream/ink 배경으로 교체.
  - 주의: Jua 변수명을 next/font `variable` 옵션과 Tailwind `@theme` 토큰명 둘 다 `--font-display`로 두면 자기참조(circular var) 문제가 생겨, next/font 쪽은 `--font-jua`로 분리하고 `@theme`에서 `--font-display: var(--font-jua), ...`로 매핑함.

### 패키지
- `package.json`/`package-lock.json` — `lucide-react` 설치.

### 컴포넌트
- `components/BottomNav.tsx` — `'use client'` 전환, `usePathname`으로 활성 탭 판정(`text-brand-deep` + strokeWidth 2 / 비활성 `text-ink-soft` + strokeWidth 1.5), lucide 아이콘(CalendarDays/Trophy/PenLine/User/CheckCheck/Settings)으로 이모지 대체, 안전영역 패딩(`pb-[env(safe-area-inset-bottom)]`), 터치 타깃 `min-h-12`, `active:scale-[0.97]`.
- `components/Calendar.tsx` — 오늘 `ring-2 ring-brand bg-brand-soft`, 방문일 `bg-brand-soft`, 날짜 숫자 `tabular-nums`, 토요일 `text-info`/일요일 `text-danger`(요일 헤더+날짜 숫자), 닉네임 텍스트 9px→11px 상향, active 스케일 피드백.
- `components/RankList.tsx` — 1/2/3위 시상대 카드 차등 스타일(금:`gold`테두리+`gold-soft`배경, 은:`stone-100`, 동:`brand-soft`계열), 내 행 `border-brand bg-brand-soft`, 점수 `font-display` + `tabular-nums` + `text-brand-deep`, 카드 `rounded-2xl shadow-warm`.
- `components/BadgeShelf.tsx` — 획득 뱃지 `border-gold bg-gold-soft`, 미획득 `opacity-40 grayscale` 유지, 10px→11px 텍스트 상향, `shadow-warm`.
- `components/VisitHeatmap.tsx` — 레벨 컬러를 `bg-line → bg-orange-300 → bg-brand → bg-orange-800` (MASTER `#F0E7DC→#FDBA74→#EA580C→#9A3412`)로 교체.

### 화면
- `app/(guest)/page.tsx` — 배너를 카드+`shadow-warm` 톤으로, 월 타이틀 `font-display`, 이전/다음 달 버튼 active 스케일.
- `app/(guest)/ranking/page.tsx` — 타이틀 `font-display`, D-7 배너 `rounded-xl`+`shadow-warm`, 탭 `rounded-full` pill(활성 `bg-cta` / 비활성 `border-line`), 부문왕 리스트 카드화, 명예의전당 링크 `text-brand-deep`.
- `app/(guest)/me/page.tsx` — 칭호 카드 `rounded-2xl shadow-warm`, 게이지 트랙 `bg-line` + 채움 `bg-brand`, 점수/칭호 `font-display`.
- `app/(guest)/visits/new/form.tsx` — 입력 필드 `h-12 rounded-xl focus:ring-2 ring-brand`, 시간대/태그/참석자 칩 선택 시 `bg-cta text-white` 미선택 `border-line`, primary 버튼 `bg-cta rounded-xl h-12 font-bold`.
- `app/(guest)/visits/[id]/page.tsx`, `app/(guest)/hall-of-fame/page.tsx` — 카드화(`rounded-2xl border-line shadow-warm`), 타이틀 `font-display`, 보조텍스트 `text-ink-soft`, 링크 `text-brand-deep`.
- `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx` — cream 배경 위 카드(`rounded-2xl shadow-warm`), 타이틀 `font-display text-brand-deep`, 입력 `h-12 rounded-xl focus:ring-brand`, primary 버튼 `bg-cta`.
- `app/admin/page.tsx`, `app/admin/approvals/page.tsx` — 카드화, 승인 대기 카드 좌측 `border-l-4 border-l-brand` 액센트, 각 입력/버튼 터치 타깃 44px 이상.
- `app/admin/SeasonCloseForm.tsx`, `app/admin/approvals/ApproveButton.tsx` — 카드화, 승인 성공 메시지 `bg-gold-soft` 축하 톤, destructive 버튼 `border-danger text-danger`.

## 공통 규칙 적용
- 모든 카드: `rounded-2xl` + `shadow-warm` + `border-line`
- 탭 가능 요소: `active:scale-[0.97] transition-transform duration-150 motion-reduce:transition-none`
- 점수·순위 숫자: `tabular-nums`
- 9~10px 텍스트 전건 11px 이상으로 상향 (Calendar 닉네임, BadgeShelf 설명)
- 포커스 링: 모든 입력 필드 `focus:ring-2 ring-brand`
- raw hex 미사용, 이모지는 콘텐츠(활동 태그/뱃지)로만 유지, UI 아이콘은 BottomNav만 lucide 적용 대상(다른 화면엔 아이콘 요구 없어 텍스트/화살표 유지)

## 미변경 확인
- 서버 액션(`actions.ts`), `lib/`, prisma, `next.config.ts`, 테스트 파일 — 미수정
- form의 `name`/`action`, 링크 `href` 등 동작 속성 — 전건 유지

## 검증 결과

```
npm run typecheck   → 통과 (next typegen + tsc --noEmit, 에러 0)
npm run lint         → 통과 (eslint, 경고/에러 0)
npm test             → 통과 (54/54 테스트, tests/**/*.test.ts)
npm run build        → 성공 (Turbopack 프로덕션 빌드; lib/storage.ts의 동적 fs 접근 경고 2건은
                         본 작업과 무관한 기존 코드 — 손대지 않음)
```

### dev 서버 확인 (편차 있음)
`PORT=3200 npm run dev`를 실행했으나, 동일 프로젝트 디렉터리에서 이미 다른 dev 서버(포트 3002, 세션 외부에서 기동됨)가 실행 중이어서 Next.js 락 파일 충돌로 3200 인스턴스가 즉시 종료됨(`Another next dev server is already running`). 같은 코드베이스를 서빙 중인 기존 인스턴스(포트 3002)로 대신 확인:
- `GET http://localhost:3002/login` → **200**, 응답 HTML에 `bg-cream`, `font-display`, "우리집 방문일지" 확인됨
- `GET http://localhost:3002/` → 307 (미인증 리다이렉트, 기존 동작 그대로)

## 우려 사항
- BottomNav를 클라이언트 컴포넌트로 전환(요구사항 §3)했으나, 기존에는 서버 컴포넌트였음. `usePathname` 사용을 위한 필수 전환이며 기능적 영향 없음(순수 표시용 활성 탭 판정).
- dev 서버 검증이 요청된 포트(3200)가 아닌 기존 실행 중이던 포트(3002)에서 이루어짐 — 락 파일 충돌로 인한 불가피한 대안. 코드는 동일 디렉터리이므로 검증 유효성에는 문제 없음.
