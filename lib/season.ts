import { prisma } from '@/lib/db'
import { seasonRanking, tagKings } from '@/lib/ranking'
import { seasonKeyFor } from '@/lib/scoring/badges'

/**
 * 시즌을 마감한다.
 * - 전원의 순위·점수·방문수를 SeasonResult에 박제
 * - 태그별 1위를 SeasonTagChampion에 박제
 * - SEASON_CHAMPION / TAG_KING 뱃지 부여
 * - 다음 분기 시즌 생성
 *
 * 마감 후 점수 공식이 바뀌어도 이 결과는 변하지 않는다 (스펙 §4.4).
 */
export async function closeSeason(seasonId: string) {
  const season = await prisma.season.findUniqueOrThrow({ where: { id: seasonId } })
  if (season.closedAt) throw new Error('이미 마감된 시즌입니다.')

  const rows = await seasonRanking(seasonId)
  const kings = await tagKings(seasonId)
  const participants = rows.filter((r) => r.visitCount > 0)
  const champions = participants.filter((r) => r.rank === 1)

  await prisma.$transaction(async (tx) => {
    await tx.seasonResult.createMany({
      data: participants.map((r) => ({
        seasonId,
        userId: r.userId,
        rank: r.rank,
        points: r.points,
        visitCount: r.visitCount,
      })),
      skipDuplicates: true,
    })

    for (const k of kings) {
      const tag = await tx.tag.findUniqueOrThrow({ where: { slug: k.tagSlug } })
      await tx.seasonTagChampion.upsert({
        where: { seasonId_tagId: { seasonId, tagId: tag.id } },
        update: { userId: k.userId, count: k.count },
        create: { seasonId, tagId: tag.id, userId: k.userId, count: k.count },
      })
    }

    await tx.userBadge.createMany({
      data: [
        ...champions.map((c) => ({
          userId: c.userId,
          badgeCode: 'SEASON_CHAMPION',
          seasonKey: seasonKeyFor('SEASON_CHAMPION', seasonId),
        })),
        ...kings.map((k) => ({
          userId: k.userId,
          badgeCode: 'TAG_KING',
          seasonKey: seasonKeyFor('TAG_KING', seasonId, k.tagSlug),
        })),
      ],
      skipDuplicates: true,
    })

    await tx.season.update({ where: { id: seasonId }, data: { closedAt: new Date() } })

    const next = nextSeasonAfter(season)
    await tx.season.upsert({
      where: { startDate_endDate: { startDate: next.startDate, endDate: next.endDate } },
      update: {},
      create: next,
    })
  })

  return { champions: champions.map((c) => c.nickname), tagKings: kings.length }
}

/** 마감된 시즌의 다음 분기 */
export function nextSeasonAfter(season: { endDate: Date }) {
  const end = season.endDate
  const nextStart = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 1))
  const y = nextStart.getUTCFullYear()
  const q = Math.floor(nextStart.getUTCMonth() / 3)
  const endDay = [31, 30, 30, 31][q]
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    name: `${y} ${q + 1}분기`,
    startDate: new Date(`${y}-${pad(q * 3 + 1)}-01T00:00:00.000Z`),
    endDate: new Date(`${y}-${pad(q * 3 + 3)}-${endDay}T00:00:00.000Z`),
  }
}
