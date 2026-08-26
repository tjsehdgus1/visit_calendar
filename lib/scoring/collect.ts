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
