import Link from 'next/link'
import { requireUser } from '@/lib/auth/guard'
import { listGames } from '@/lib/mystery'
import { ratingLabel } from '@/lib/mystery/logic'

type Props = { searchParams: Promise<{ filter?: string }> }

const FILTERS = [
  { key: 'all', label: '전체' },
  { key: 'new', label: '안 한 게임' },
  { key: '4', label: '4인' },
  { key: '5', label: '5인' },
  { key: '6', label: '6인' },
] as const

export default async function MysteryLibraryPage({ searchParams }: Props) {
  const user = await requireUser()
  const { filter = 'all' } = await searchParams
  const games = await listGames()

  const shown = games.filter((g) => {
    if (filter === 'new') return g.playCount === 0
    if (/^\d+$/.test(filter)) return g.players === Number(filter)
    return true
  })

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/" className="text-ink-soft underline">
          ← 캘린더로
        </Link>
        {user.role === 'HOST' && (
          <Link href="/admin/mystery" className="font-semibold text-brand-deep underline">
            서재 관리 →
          </Link>
        )}
      </div>
      <h1 className="mt-2 font-display text-2xl text-ink">🔍 머더미스터리 서재</h1>
      <p className="mt-1 text-sm text-ink-soft">
        {games.length}개 중 {games.filter((g) => g.playCount > 0).length}개 플레이함
      </p>

      <nav aria-label="필터" className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = f.key === filter
          return (
            <Link
              key={f.key}
              href={f.key === 'all' ? '/mystery' : `/mystery?filter=${f.key}`}
              aria-current={active ? 'page' : undefined}
              className={`min-h-11 rounded-full border px-4 py-2 text-sm transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
                active ? 'border-cta bg-cta text-white' : 'border-line bg-card text-ink'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </nav>

      {shown.length === 0 ? (
        <p className="mt-8 text-center text-sm text-ink-soft">해당하는 게임이 없습니다.</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {shown.map((g) => (
            <li key={g.id}>
              <Link
                href={`/mystery/${g.id}`}
                className="block rounded-2xl border border-line bg-card p-4 shadow-warm transition-transform duration-150 active:scale-[0.98] motion-reduce:transition-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-ink">{g.title}</h2>
                  <span className={`shrink-0 text-sm ${g.avgRating === null ? 'text-ink-soft' : 'text-gold'}`}>
                    {ratingLabel(g.avgRating)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  {g.players}인{g.playTime ? ` · ${g.playTime}` : ''}
                  {g.secretTalk ? ' · 밀담' : ''}
                  {g.owner ? ` · ${g.owner} 소유` : ''}
                  {g.playCount > 0 ? ` · ${g.playCount}회 플레이` : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
