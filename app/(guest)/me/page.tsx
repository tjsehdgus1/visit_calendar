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
      <h1 className="font-display text-2xl text-ink">{user.nickname}</h1>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4 shadow-warm">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-xl text-brand-deep">{title.label}</span>
          <span className="font-display text-2xl tabular-nums text-ink">{points}점</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-brand transition-transform duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-soft">
          {title.next
            ? `${title.next.label}까지 ${title.next.min - points}점`
            : '최고 칭호에 도달했습니다'}
        </p>
        <p className="mt-1 text-xs text-ink-soft">{ctx.visits.length}번 놀러왔습니다</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-ink">뱃지 {new Set(earned.map((e) => e.badgeCode)).size}/{allBadges.length}</h2>
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
        <h2 className="mb-3 text-sm font-semibold text-ink">{year}년 발자국</h2>
        <VisitHeatmap year={year} dates={ctx.visits.map((v) => v.visitDate)} />
      </section>
    </main>
  )
}
