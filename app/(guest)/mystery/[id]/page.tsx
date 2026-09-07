import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth/guard'
import { getGame } from '@/lib/mystery'
import { ratingLabel } from '@/lib/mystery/logic'

export default async function MysteryGamePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser()
  const { id } = await params
  const game = await getGame(id)
  if (!game || (!game.active && user.role !== 'HOST')) notFound()

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <div className="flex items-center justify-between text-sm">
        <Link href="/mystery" className="text-ink-soft underline">
          ← 서재로
        </Link>
        {user.role === 'HOST' && (
          <Link href={`/admin/mystery/${game.id}`} className="font-semibold text-brand-deep underline">
            수정 →
          </Link>
        )}
      </div>
      <h1 className="mt-2 font-display text-2xl text-ink">
        {game.title}
        {!game.active && <span className="ml-2 text-sm text-danger">(숨김)</span>}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        {game.players}인{game.playTime ? ` · ${game.playTime}` : ''}
        {game.secretTalk ? ' · 밀담 있음' : ''}
        {game.owner ? ` · ${game.owner} 소유` : ''}
      </p>

      <section className="mt-4 rounded-2xl border border-line bg-card p-4 shadow-warm">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-soft">{game.playCount > 0 ? `${game.playCount}회 플레이` : '아직 안 한 게임'}</span>
          <span className={`font-display text-xl ${game.avgRating === null ? 'text-ink-soft' : 'text-gold'}`}>
            {ratingLabel(game.avgRating)}
          </span>
        </div>
      </section>

      {game.description && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-ink-soft">소개</h2>
          <p className="mt-1 whitespace-pre-wrap rounded-xl border border-line bg-card p-3 text-sm text-ink shadow-warm">
            {game.description}
          </p>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold text-ink-soft">플레이 기록</h2>
        {game.plays.length === 0 ? (
          <p className="mt-1 text-sm text-ink-soft">
            아직 없습니다. 놀러온 날 기록에서 머더미스터리 태그를 켜면 남길 수 있어요.
          </p>
        ) : (
          <ul className="mt-1 flex flex-col gap-2">
            {game.plays.map((p) => (
              <li key={p.id} className="rounded-xl border border-line bg-card p-3 text-sm shadow-warm">
                <div className="flex items-center justify-between">
                  {p.visitId ? (
                    <Link href={`/visits/${p.visitId}`} className="font-semibold text-ink underline">
                      {p.playedOn}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink">{p.playedOn}</span>
                  )}
                  <span className="text-gold">{'⭐'.repeat(p.rating)}</span>
                </div>
                {p.players && <p className="mt-1 text-xs text-ink-soft">{p.players}</p>}
                {p.review && <p className="mt-1 text-ink">{p.review}</p>}
                {!p.effective && <p className="mt-1 text-xs text-ink-soft">승인 대기 중인 기록</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
