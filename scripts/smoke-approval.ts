/**
 * 방문 승인·뱃지 부여 스모크 테스트.
 *
 * DB 통합 테스트 하네스는 이 프로젝트 범위 밖이므로, 로컬 .env가 가리키는 DB에 대해
 * 직접 실행해 승인 플로우와 뱃지 중복 방지를 확인하는 용도다.
 *
 * 절차: 임시 게스트 생성 → PENDING 모임 생성 → approveVisit → FIRST_VISIT 부여 확인
 *       → 동일 visitId 재승인 no-op 확인 → UserBadge 중복 없음 확인 → 레코드 전부 정리
 *
 * 각 단계 OK/FAIL을 출력하고, 실패가 하나라도 있으면 exit 1.
 * 실행: npm run smoke
 */
import 'dotenv/config'
import { prisma } from '../lib/db'
import { createVisit, approveVisit, grantBadgesForVisit } from '../lib/visits'
import type { SessionUser } from '../lib/auth/guard'

let failures = 0

function ok(label: string) {
  console.log(`OK   - ${label}`)
}

function fail(label: string, detail?: unknown) {
  failures++
  console.error(`FAIL - ${label}${detail !== undefined ? `: ${String(detail)}` : ''}`)
}

function check(label: string, condition: boolean, detail?: unknown) {
  if (condition) ok(label)
  else fail(label, detail)
}

async function main() {
  console.log('--- DB 연결 확인 ---')
  const userCount = await prisma.user.count()
  check('DB 연결', Number.isFinite(userCount), `user count=${userCount}`)

  const host = await prisma.user.findFirst({ where: { role: 'HOST' } })
  if (!host) throw new Error('호스트 유저가 없습니다. 시드를 먼저 실행하세요 (npm run db:seed).')
  console.log(`host: ${host.nickname} ${host.id}`)

  const tag = await prisma.tag.findFirst({ where: { active: true } })
  if (!tag) throw new Error('활성 태그가 없습니다. 시드를 먼저 실행하세요 (npm run db:seed).')
  console.log(`tag: ${tag.slug} ${tag.id}`)

  let guest = await prisma.user.findFirst({ where: { role: 'GUEST', status: 'ACTIVE' } })
  let createdTempGuest = false
  if (!guest) {
    guest = await prisma.user.create({
      data: {
        loginId: `smoke_guest_${Date.now()}`,
        passwordHash: 'x',
        nickname: '스모크게스트',
        role: 'GUEST',
      },
    })
    createdTempGuest = true
    console.log(`임시 게스트 생성: ${guest.nickname} ${guest.id}`)
  } else {
    console.log(`기존 게스트 사용: ${guest.nickname} ${guest.id}`)
  }

  const actor: SessionUser = {
    id: guest.id,
    loginId: guest.loginId,
    nickname: guest.nickname,
    role: 'GUEST',
  }

  let visitId: string | undefined

  try {
    console.log('\n--- 방문 생성 ---')
    visitId = await createVisit(
      {
        visitDate: '2026-08-20',
        timeSlot: 'EVENING',
        memo: '스모크 테스트용 방문',
        tagIds: [tag.id],
        attendeeIds: [guest.id, host.id],
      },
      actor,
    )
    console.log(`visitId: ${visitId}`)

    const created = await prisma.visit.findUnique({ where: { id: visitId }, select: { status: true } })
    check('게스트 제출 직후 status === PENDING', created?.status === 'PENDING', created?.status)

    console.log('\n--- 1차 승인 ---')
    const result1 = await approveVisit(visitId, host.id)
    console.log(`newBadges (1차): ${JSON.stringify(result1.newBadges)}`)

    const afterApprove = await prisma.visit.findUnique({ where: { id: visitId }, select: { status: true } })
    check('1차 승인 후 status === APPROVED', afterApprove?.status === 'APPROVED', afterApprove?.status)

    const badgesAfter1 = await prisma.userBadge.findMany({
      where: { visitId, badgeCode: 'FIRST_VISIT' },
      select: { userId: true, user: { select: { nickname: true } } },
    })
    check(
      'FIRST_VISIT이 참석자 2명 모두에게 부여됨',
      badgesAfter1.length === 2,
      `count=${badgesAfter1.length} (${badgesAfter1.map((b) => b.user.nickname).join(', ')})`,
    )

    console.log('\n--- 2차 승인 (중복 클릭 시뮬레이션) ---')
    const result2 = await approveVisit(visitId, host.id)
    check('2차 승인은 newBadges가 빈 객체', Object.keys(result2.newBadges).length === 0, JSON.stringify(result2.newBadges))

    const badgesAfter2 = await prisma.userBadge.findMany({ where: { visitId, badgeCode: 'FIRST_VISIT' } })
    check('2차 승인 후에도 FIRST_VISIT 뱃지 수가 그대로(2건)', badgesAfter2.length === 2, `count=${badgesAfter2.length}`)

    console.log('\n--- 뱃지 재판정 재호출도 중복 생성하지 않음 ---')
    const result3 = await grantBadgesForVisit(visitId)
    check('grantBadgesForVisit 재호출도 빈 결과', Object.keys(result3).length === 0, JSON.stringify(result3))
    const badgesAfter3 = await prisma.userBadge.findMany({ where: { visitId, badgeCode: 'FIRST_VISIT' } })
    check('grantBadgesForVisit 재호출 후에도 FIRST_VISIT 뱃지 수가 그대로(2건)', badgesAfter3.length === 2, `count=${badgesAfter3.length}`)

    const guestFirstVisitCount = await prisma.userBadge.count({ where: { userId: guest.id, badgeCode: 'FIRST_VISIT' } })
    check('게스트 FIRST_VISIT 전체 보유 수가 1건(중복 없음)', guestFirstVisitCount === 1, `count=${guestFirstVisitCount}`)
  } finally {
    console.log('\n--- 정리 ---')
    if (visitId) {
      const delBadges = await prisma.userBadge.deleteMany({ where: { visitId } })
      console.log(`삭제된 UserBadge 수: ${delBadges.count}`)
      await prisma.visit.delete({ where: { id: visitId } }).catch(() => {
        // 이미 삭제됐거나 생성되지 않은 경우 무시
      })
      console.log(`Visit 삭제 완료: ${visitId}`)
    }
    if (createdTempGuest) {
      await prisma.user.delete({ where: { id: guest.id } }).catch(() => {})
      console.log(`임시 게스트 삭제 완료: ${guest.id}`)
    }
  }
}

main()
  .catch((e) => {
    fail('스모크 테스트 실행 중 예외 발생', e instanceof Error ? e.message : e)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log(`\n${failures === 0 ? '전체 통과' : `${failures}건 실패`}`)
    process.exit(failures === 0 ? 0 : 1)
  })
