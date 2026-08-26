import { prisma } from '@/lib/db'
import { fromDateOnly, todayKst, toDateOnly } from '@/lib/date'
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
  // KST 실시각(new Date())을 @db.Date(UTC 자정) 컬럼과 직접 비교하면 시즌 시작일
  // 00:00~08:59(KST)에는 아직 시즌이 아닌 걸로, 종료일 09:00~23:59(KST)에는 이미
  // 끝난 걸로 오판한다. 반드시 KST 달력 날짜로 비교한다.
  const today = toDateOnly(todayKst())
  return prisma.season.findFirst({
    where: { startDate: { lte: today }, endDate: { gte: today }, closedAt: null },
    orderBy: { startDate: 'desc' },
  })
}
