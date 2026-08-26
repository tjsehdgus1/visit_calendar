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
