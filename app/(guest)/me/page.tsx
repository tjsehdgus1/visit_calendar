import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'
import { collectBadgeContext } from '@/lib/scoring/collect'
import { totalPoints } from '@/lib/scoring/points'
import { titleFor } from '@/lib/scoring/titles'
import { todayKst } from '@/lib/date'
import BadgeShelf from '@/components/BadgeShelf'
import VisitHeatmap from '@/components/VisitHeatmap'

export default async function MePage() {
  const user = await requireUser()

  const [ctx, allBadges, earned] = await Promise.all([
    collectBadgeContext(user.id),
    prisma.badge.findMany({ orderBy: { sortOrder: 'asc' } }),
    prisma.userBadge.findMany({ where: { userId: user.id }, select: { badgeCode: true, earnedAt: true } }),
  ])

  const points = totalPoints(ctx.visits, { includeFirstVisitBonus: true })
  const title = titleFor(points)
  const earnedMap = new Map(earned.map((e) => [e.badgeCode, e.earnedAt]))
  const year = Number(todayKst().slice(0, 4))

  const progress = title.next
    ? Math.min(100, Math.round(((points - title.min) / (title.next.min - title.min)) * 100))
    : 100

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="text-xl font-bold">{user.nickname}</h1>

      <section className="mt-4 rounded-xl border p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold">{title.label}</span>
          <span className="text-2xl font-bold tabular-nums">{points}점</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full bg-neutral-900" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          {title.next
            ? `${title.next.label}까지 ${title.next.min - points}점`
            : '최고 칭호에 도달했습니다'}
        </p>
        <p className="mt-1 text-xs text-neutral-500">{ctx.visits.length}번 놀러왔습니다</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">뱃지 {earned.length}/{allBadges.length}</h2>
        <BadgeShelf
          badges={allBadges.map((b) => ({
            code: b.code,
            label: b.label,
            emoji: b.emoji,
            description: b.description,
            earnedAt: earnedMap.get(b.code) ?? null,
          }))}
        />
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold">{year}년 발자국</h2>
        <VisitHeatmap year={year} dates={ctx.visits.map((v) => v.visitDate)} />
      </section>
    </main>
  )
}
