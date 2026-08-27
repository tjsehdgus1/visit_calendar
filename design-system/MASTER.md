# visit_calendar 디자인 시스템 — MASTER

> 전역 원본(Source of Truth). 화면별 예외는 `design-system/pages/<page>.md`가 우선한다 (현재 없음).
> 근거: ui-ux-pro-max 데이터베이스 (팔레트 #23 Playful orange 계열 변형, 폰트 페어링 #6 Playful 계열의 한글 대응, Claymorphism-lite 스타일)

## 1. 컨셉

**"따뜻한 집들이"** — 친구 집 거실의 따뜻함 + 보드게임의 장난기.
크림색 캔버스 위에 흰 카드, 주황 브랜드 액센트, 금색 메달. 둥글고 폭신하지만 유치하지 않게.

## 2. 컬러 토큰 (Tailwind 4 `@theme`)

| 토큰 | 값 | 용도 |
|---|---|---|
| `--color-cream` | `#FFF8F0` | 페이지 배경 (기존 흰색 대체) |
| `--color-card` | `#FFFFFF` | 카드·시트 표면 |
| `--color-ink` | `#292524` | 본문 텍스트 (stone-800) |
| `--color-ink-soft` | `#78716C` | 보조 텍스트 (stone-500) |
| `--color-brand` | `#EA580C` | 브랜드 주황 (orange-600) — 액센트·활성 상태·링 |
| `--color-brand-deep` | `#C2410C` | 흰 배경 위 주황 텍스트 (4.5:1 확보, orange-700) |
| `--color-brand-soft` | `#FFEDD5` | 주황 연한 배경 (orange-100) — 배지 칩·하이라이트 |
| `--color-cta` | `#1C1917` | 기본 버튼 배경 (stone-900, 흰 글자 최대 대비) |
| `--color-gold` | `#D97706` | 금메달·점수 강조 (amber-600) |
| `--color-gold-soft` | `#FEF3C7` | 금색 연한 배경 (amber-100) |
| `--color-line` | `#F0E7DC` | 경계선 (따뜻한 베이지, 기존 회색 border 대체) |
| `--color-ok` | `#16A34A` | 성공 |
| `--color-danger` | `#DC2626` | 반려·삭제·경고 |
| `--color-info` | `#2563EB` | 정보 |

규칙:
- 컴포넌트에 raw hex 금지 — 토큰(또는 대응 Tailwind 클래스)만 사용
- 작은 텍스트에 주황을 쓸 때는 `brand-deep`(#C2410C) — `brand`(#EA580C)는 흰 배경 위 소형 텍스트 대비 미달
- 색만으로 의미 전달 금지 (아이콘·텍스트 병행)

## 3. 타이포그래피

| 역할 | 폰트 | 비고 |
|---|---|---|
| 디스플레이 (페이지 제목, 점수 숫자, 칭호, 뱃지명) | **Jua** | 둥글고 장난기 있는 한글. `next/font/google` (self-host — CSP 무수정) |
| 본문·UI 전반 | **Noto Sans KR** 400/500/700 | `next/font/google` |

- 루트 layout에서 두 폰트를 로드해 CSS 변수(`--font-display`, `--font-sans`)로 연결. globals.css의 `--font-sans` 폴백 스택 뒤에 배치
- 점수·순위·통계 숫자는 **`tabular-nums`** 필수 (레이아웃 흔들림 방지)
- 본문 최소 16px, line-height 1.5~1.7. 12px 미만 금지 (기존 `text-[9px]`, `text-[10px]`는 11px 이상으로 상향)
- Jua는 단일 웨이트 — 크기로만 위계를 만든다

## 4. 형태·표면

- 카드: `rounded-2xl`(16px) + `bg-card` + `border border-line` + 그림자 `shadow-warm`
  - `--shadow-warm: 0 2px 12px rgba(146, 64, 14, 0.07)` (따뜻한 갈색 계열 그림자, 회색 그림자 금지)
- 칩·태그·아바타: `rounded-full`
- 입력 필드: `rounded-xl`, 높이 ≥ 48px(touch), `focus:ring-2 ring-brand` (포커스 링 제거 금지)
- 버튼 위계 (화면당 primary 1개):
  - Primary: `bg-cta text-white rounded-xl h-12 font-bold`
  - Secondary: `border border-line bg-card rounded-xl h-12`
  - Destructive: `text-danger border-danger` (승인 옆 반려처럼 병치 시 시각 분리)
- 눌림 피드백: `active:scale-[0.97] transition-transform duration-150` (모든 탭 가능 요소)

## 5. 모션

- 마이크로 인터랙션 150~300ms, `ease-out` 진입 / `ease-in` 퇴장
- 뱃지 획득·점수 표시 등 핵심 1~2개만 애니메이션 (과잉 금지)
- `prefers-reduced-motion` 존중: `motion-reduce:transition-none motion-reduce:animate-none`
- 레이아웃을 흔드는 속성(width/height) 애니메이션 금지 — transform/opacity만

## 6. 아이콘

- **UI 아이콘은 lucide-react** (BottomNav, 뒤로가기, 관리 화면 등) — 이모지 아이콘 금지
- 스트로크 1.5~2px 통일, 크기 토큰 20/24px
- **활동 태그의 이모지(🍚🍺🎲…)는 콘텐츠 데이터이므로 유지** — UI 아이콘이 아님
- 뱃지 이모지도 콘텐츠로 유지 (뱃지 정체성의 일부)

## 7. 컴포넌트별 지침

### BottomNav
- 활성 탭 표시 필수(`nav-state-active`): 활성 = `text-brand-deep` + 아이콘 채움/굵게, 비활성 = `text-ink-soft`
- lucide 아이콘 + 텍스트 라벨 병행, 터치 타깃 ≥ 48px
- `pb-[env(safe-area-inset-bottom)]` 안전 영역 대응, `backdrop-blur` 유지

### 캘린더
- 오늘: `ring-2 ring-brand` + 배경 `brand-soft`
- 방문 있는 날: 셀 배경 살짝 `brand-soft`, 이모지 크게
- 날짜 숫자 `tabular-nums`, 요일 헤더에 일요일 `text-danger` 토요일 `text-info`

### 랭킹
- 1~3위 시상대 카드: 금(`gold-soft` 배경+`gold` 테두리)·은(stone-100)·동(orange-50/브론즈 톤) 구분, 점수는 Jua + tabular
- 내 행: `border-brand bg-brand-soft` 강조
- D-7 배너: `bg-gold-soft text-amber-900` 유지하되 rounded-xl

### 프로필
- 칭호 게이지: `bg-brand` 채움, 트랙 `bg-line`, 높이 8px rounded-full
- 뱃지 진열장: 획득 = 카드에 `gold-soft` 은은한 배경, 미획득 = `opacity-40 grayscale` 유지 + 조건 문구
- 히트맵 레벨 색: `#F0E7DC → #FDBA74 → #EA580C → #9A3412` (주황 스케일)

### 폼 (기록하기)
- 선택 칩(시간대·태그·사람): 선택 시 `bg-cta text-white`, 미선택 `bg-card border-line`, 칩 높이 ≥ 44px
- 에러는 해당 필드 아래 `text-danger` + `role="alert"`

### 승인함 (호스트)
- 대기 카드에 좌측 `border-l-4 border-brand` 액센트
- 승인 성공 메시지(뱃지 획득)는 `bg-gold-soft` 축하 톤

## 8. 금지 사항 (Anti-patterns)

- 회색 계열 무채색 화면으로 회귀 금지 (기존 neutral 일변도가 이번 개편 대상)
- 포커스 링 제거, 이모지를 UI 내비 아이콘으로 사용, raw hex 하드코딩
- hover에만 의존하는 인터랙션 (모바일 우선)
- 12px 미만 본문, 300ms 초과 마이크로 인터랙션, 화면당 primary 버튼 2개 이상
- 다크모드는 **만들지 않는다** (스펙 YAGNI 유지)
