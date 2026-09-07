# 머더미스터리 서재·플레이 기록 설계 (2026-09-07)

노션 "머더미스터리 플레이 기록" 데이터베이스를 앱으로 이식한다. 사용자 결정(2026-09-07):
플레이 기록은 **방문 기록(Visit)에 붙인다**, 별점·후기는 **판당 하나**, 서재 관리는 **호스트만**, 노션 기존 데이터는 **이관**.

## 1. 데이터 모델

```prisma
model MysteryGame {
  id          String   @id @default(cuid())
  title       String   @unique
  players     Int                         // 인원 (4/5/6, 그 외 값도 허용)
  playTime    String?                     // 예상 시간, 자유 텍스트 ("3시간", "2~3시간")
  secretTalk  Boolean  @default(false)    // 밀담 여부
  owner       String?                     // 소유자 이름 텍스트 (회원이 아닌 가족 포함)
  description String?  @db.Text           // 소개·출처 메모
  active      Boolean  @default(true)     // 삭제 대신 숨김 (태그와 같은 원칙)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  plays       MysteryPlay[]
}

model MysteryPlay {
  id          String   @id @default(cuid())
  gameId      String
  visitId     String?                     // 방문 기록에 붙은 플레이. 노션 이관분은 NULL
  playedOn    DateTime @db.Date           // 방문이 있으면 visitDate와 동일. 'YYYY-MM-DD' 문자열로만 다룬다
  rating      Int                         // 1~5
  review      String?                     // 한줄 후기 (200자)
  playersText String?                     // 이관분 전용: "동현, 성소, 혜민" (방문이 있으면 참석자로 계산)
  createdById String?
  createdAt   DateTime @default(now())
  game        MysteryGame @relation(fields: [gameId], references: [id])
  visit       Visit?      @relation(fields: [visitId], references: [id], onDelete: Cascade)
  createdBy   User?       @relation(fields: [createdById], references: [id])
  @@index([gameId])
  @@index([visitId])
}
```

- `Visit`에 `mysteryPlays MysteryPlay[]`, `User`에 `mysteryPlays MysteryPlay[]` 역관계 추가.
- "플레이 완료"는 저장하지 않는다. **유효한 플레이**(방문이 없거나 방문이 APPROVED)가 하나라도 있으면 완료.
- 활동 태그 `murder` "머더미스터리" 🔍 추가 (마이그레이션 SQL에서 `ON CONFLICT DO NOTHING`으로 삽입, 시드에도 추가).
- 한 방문에 여러 게임 플레이가 붙을 수 있지만, 기록 폼은 **한 번에 한 게임**만 받는다 (YAGNI).

## 2. 기록 흐름

1. 기록 폼(`/visits/new`)에서 머더미스터리 태그를 켜면 **게임 선택(필수)**, **별점(1~5, 필수)**, **한줄 후기(선택)** 칸이 열린다.
   게임 목록은 활성 게임만, "안 한 게임"이 위에, 그 다음 가나다순.
2. 제출 시 `createVisit` 트랜잭션 안에서 `MysteryPlay`를 함께 만든다 (`playedOn` = visitDate).
   머더미스터리 태그가 켜져 있는데 게임이 없으면 검증 오류. 태그가 꺼져 있으면 플레이 입력은 무시한다.
3. 방문 상세(`/visits/[id]`)에 🔍 게임명 · ⭐별점 · 후기를 표시한다.
4. 방문 승인/거절은 기존과 같다. 서재 통계는 유효한 플레이만 센다. 방문 삭제 시 플레이도 함께 삭제(Cascade).

## 3. 화면

- **서재 `/mystery`** (로그인한 모든 회원): 게임 카드 목록. 카드에 게임명, 인원, 시간, 밀담 표시, 소유자,
  플레이 횟수, 평균 별점(⭐ n.n) 또는 "아직 안 함". 상단 필터 칩: 전체 / 안 한 게임 / 4인 / 5인 / 6인.
  정렬: 안 한 게임 먼저, 그 다음 최근 플레이 순.
- **게임 상세 `/mystery/[id]`**: 소개 메모, 플레이 기록 목록(날짜, 함께한 사람, 별점, 후기).
  함께한 사람 = 방문이 있으면 참석자 닉네임 + 제출자(호스트 포함), 없으면 `playersText`.
- **서재 관리 `/admin/mystery`** (호스트): 게임 추가 폼(게임명·인원·시간·밀담·소유자·소개), 목록에서 수정·숨김/복구.
  `/admin`에 "머더미스터리 서재 관리" 링크.
- 진입: 캘린더(`/`) 상단에 "🔍 머더미스터리 서재" 링크. 하단 탭은 늘리지 않는다.
- 375px 우선, 기존 디자인 토큰(brand/cta/line/card) 그대로.

## 4. 노션 이관

- 원본: 노션 DB `머더미스터리 플레이 기록` (collection bf5b37ce-…). 필드 매핑:
  게임명→title, 인원→players, 플레이 시간→playTime, 밀담 여부→secretTalk, 소유자→owner, 페이지 본문→description.
  플레이 완료=true인 항목은 플레이 1건: 플레이 날짜→playedOn(없으면 노션 생성일), 별점(⭐ 개수)→rating(없으면 3),
  한줄 후기→review, 함께한 사람→playersText, visitId NULL.
- 방법: 노션 커넥터로 읽어 JSON을 만들고 `scripts/import-mystery.mjs`(JSON 파일 경로 인자)로 upsert.
  JSON은 저장소에 커밋하지 않는다 (개인 후기). NAS에서 `docker-compose exec -T app node scripts/import-mystery.mjs < data.json`.

## 5. 권한·검증

- 서재 조회·게임 상세: 로그인 필수. 게임 추가·수정·숨김: `requireHost`.
- 플레이 생성: 방문 기록 제출자(기존 규칙 그대로).
- zod: title 1~60자, players 2~12, playTime ≤30자, owner ≤20자, description ≤2000자, rating 1~5 정수, review ≤200자.

## 6. 범위 밖

- 점수·뱃지 연동(설계서 §4 배점 변경 필요), 플레이당 개인별 별점, 게임 사진, 노션 양방향 동기화.

## 7. 검증

- 순수 로직(유효 플레이 판정, 평균 별점, 정렬)은 `lib/mystery/` 순수 함수 + `tests/mystery.test.ts`.
- `npm run lint && npm run typecheck && npm run build && npm test` 통과.
- 375px: 서재 목록 → 게임 상세 → 기록 폼에서 머더미스터리 태그 켜고 게임·별점 입력 → 제출 → 상세 확인 → 승인 후 서재 통계 반영.
