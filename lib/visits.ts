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
  /** 머더미스터리 태그를 켰을 때 함께 저장되는 플레이 (설계서 2026-09-07) */
  mysteryPlay?: { gameId: string; rating: number; review?: string }
}

/**
 * 누가 올리든 즉시 등록된다 — 승인 절차 폐지 (2026-09-27 사용자 결정).
 * 뱃지 판정은 여기서 하지 않는다 — 사진 저장 전에 판정하면 PHOTO_30 등 사진 수에 걸린
 * 뱃지가 그 순간 누락된다. 호출자가 사진 저장을 마친 뒤 grantBadgesForVisit을 불러야 한다.
 */
export async function createVisit(input: VisitInput, actor: SessionUser): Promise<string> {
  const visit = await prisma.visit.create({
    data: {
      visitDate: toDateOnly(input.visitDate),
      timeSlot: input.timeSlot,
      memo: input.memo?.trim() || null,
      status: 'APPROVED',
      submittedById: actor.id,
      attendees: { create: [...new Set(input.attendeeIds)].map((userId) => ({ userId })) },
      tags: { create: [...new Set(input.tagIds)].map((tagId) => ({ tagId })) },
      mysteryPlays: input.mysteryPlay
        ? {
            create: {
              gameId: input.mysteryPlay.gameId,
              playedOn: toDateOnly(input.visitDate),
              rating: input.mysteryPlay.rating,
              review: input.mysteryPlay.review?.trim() || null,
              createdById: actor.id,
            },
          }
        : undefined,
    },
    select: { id: true },
  })

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
