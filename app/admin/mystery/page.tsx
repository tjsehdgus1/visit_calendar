import Link from 'next/link'
import { requireHost } from '@/lib/auth/guard'
import { listGames } from '@/lib/mystery'
import { ratingLabel } from '@/lib/mystery/logic'
import GameForm from './GameForm'
import { toggleGameActive } from './actions'

export default async function AdminMysteryPage() {
  await requireHost()
  const games = await listGames({ includeInactive: true })
  const active = games.filter((g) => g.active)
  const hidden = games.filter((g) => !g.active)

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/admin" className="text-ink-soft underline">
          ← 관리로
        </Link>
        <Link href="/mystery" className="font-semibold text-brand-deep underline">
          서재 보기 →
        </Link>
      </div>
      <h1 className="mt-2 font-display text-2xl text-ink">🔍 서재 관리</h1>

      <section className="mt-6">
        <h2 className="mb-2 font-semibold text-ink">게임 추가</h2>
        <GameForm />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-semibold text-ink">게임 {active.length}개</h2>
        <ul className="flex flex-col gap-1">
          {active.map((g) => (
            <li key={g.id} className="flex items-center gap-2 rounded-xl border border-line bg-card p-2 text-sm shadow-warm">
              <span className="flex-1 text-ink">
                {g.title}
                <span className="ml-1 text-xs text-ink-soft">
                  {g.players}인 · {g.playCount > 0 ? `${g.playCount}회 · ${ratingLabel(g.avgRating)}` : '안 함'}
                </span>
              </span>
              <Link href={`/admin/mystery/${g.id}`} className="text-xs text-ink-soft underline">
                수정
              </Link>
              <form action={toggleGameActive}>
                <input type="hidden" name="id" value={g.id} />
                <input type="hidden" name="active" value="false" />
                <button className="text-xs text-danger underline">숨김</button>
              </form>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-ink-soft">
          게임은 삭제하지 않고 숨깁니다. 숨겨도 과거 플레이 기록은 남습니다.
        </p>
      </section>

      {hidden.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 font-semibold text-ink-soft">숨긴 게임 {hidden.length}개</h2>
          <ul className="flex flex-col gap-1">
            {hidden.map((g) => (
              <li key={g.id} className="flex items-center gap-2 rounded-xl border border-line bg-card p-2 text-sm shadow-warm opacity-70">
                <span className="flex-1 text-ink">{g.title}</span>
                <form action={toggleGameActive}>
                  <input type="hidden" name="id" value={g.id} />
                  <input type="hidden" name="active" value="true" />
                  <button className="text-xs text-brand-deep underline">복구</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}
