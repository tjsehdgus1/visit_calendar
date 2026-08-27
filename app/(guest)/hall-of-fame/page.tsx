import Link from 'next/link'
import { prisma } from '@/lib/db'
import { requireUser } from '@/lib/auth/guard'

export default async function HallOfFamePage() {
  await requireUser()

  const seasons = await prisma.season.findMany({
    where: { closedAt: { not: null } },
    orderBy: { startDate: 'desc' },
    include: {
      results: {
        where: { rank: { lte: 3 } },
        orderBy: { rank: 'asc' },
        include: { user: { select: { nickname: true } } },
      },
      champions: { include: { season: false } },
    },
  })

  const tags = await prisma.tag.findMany({ select: { id: true, label: true, emoji: true } })
  const tagMap = new Map(tags.map((t) => [t.id, t]))
  const users = await prisma.user.findMany({ select: { id: true, nickname: true } })
  const userMap = new Map(users.map((u) => [u.id, u.nickname]))

  const MEDALS = ['🥇', '🥈', '🥉']

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <Link href="/ranking" className="text-sm text-ink-soft underline">
        ← 랭킹으로
      </Link>
      <h1 className="mt-2 font-display text-2xl text-ink">명예의 전당</h1>

      {seasons.length === 0 && (
        <p className="mt-10 text-center text-ink-soft">아직 마감된 시즌이 없습니다.</p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {seasons.map((s) => (
          <section key={s.id} className="rounded-2xl border border-line bg-card p-4 shadow-warm">
            <h2 className="font-display text-lg text-ink">{s.name}</h2>

            <ol className="mt-3 flex flex-col gap-1">
              {s.results.map((r) => (
                <li key={r.id} className="flex items-center gap-2 text-sm">
                  <span>{MEDALS[r.rank - 1] ?? r.rank}</span>
                  <span className="flex-1 font-semibold text-ink">{r.user.nickname}</span>
                  <span className="tabular-nums text-ink-soft">{r.points}점</span>
                </li>
              ))}
            </ol>

            {s.champions.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                {s.champions.map((c) => {
                  const tag = tagMap.get(c.tagId)
                  return (
                    <li key={c.tagId} className="rounded-full bg-brand-soft px-3 py-1 text-xs text-brand-deep">
                      {tag?.emoji} {tag?.label}왕 · {userMap.get(c.userId) ?? '?'}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ))}
      </div>
    </main>
  )
}
