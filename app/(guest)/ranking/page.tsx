import Link from 'next/link'
import { requireUser } from '@/lib/auth/guard'
import { overallRanking, seasonRanking, tagKings, currentSeason } from '@/lib/ranking'
import { daysUntil, fromDateOnly } from '@/lib/date'
import RankList from '@/components/RankList'

type Props = { searchParams: Promise<{ tab?: string }> }

const TABS = [
  { key: 'season', label: '이번 시즌' },
  { key: 'overall', label: '통산' },
  { key: 'tag', label: '부문왕' },
]

export default async function RankingPage({ searchParams }: Props) {
  const user = await requireUser()
  const tab = (await searchParams).tab ?? 'season'
  const season = await currentSeason()

  const daysLeft = season ? daysUntil(fromDateOnly(season.endDate)) : null

  return (
    <main className="mx-auto max-w-md px-4 py-6">
      <h1 className="font-display text-2xl text-ink">랭킹</h1>
      {season && <p className="mt-1 text-sm text-ink-soft">{season.name}</p>}

      {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
        <p className="mt-3 rounded-xl bg-gold-soft px-3 py-2 text-sm font-semibold text-amber-900 shadow-warm">
          🔥 시즌 마감 D-{daysLeft}
        </p>
      )}

      <nav className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/ranking?tab=${t.key}`}
            className={`flex-1 rounded-full border py-2 text-center text-sm font-medium transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
              tab === t.key ? 'border-cta bg-cta text-white' : 'border-line bg-card text-ink-soft'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-4">
        {tab === 'overall' && <RankList rows={await overallRanking()} meId={user.id} />}
        {tab === 'season' &&
          (season ? (
            <RankList rows={await seasonRanking(season.id)} meId={user.id} />
          ) : (
            <p className="py-10 text-center text-ink-soft">진행 중인 시즌이 없습니다.</p>
          ))}
        {tab === 'tag' &&
          (season ? (
            <ul className="flex flex-col gap-2">
              {(await tagKings(season.id)).map((k) => (
                <li key={k.tagSlug} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-warm">
                  <span className="text-2xl">{k.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs text-ink-soft">{k.tagLabel}왕</p>
                    <p className="font-semibold text-ink">{k.nickname}</p>
                  </div>
                  <span className="text-sm text-ink-soft">{k.count}회</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-ink-soft">진행 중인 시즌이 없습니다.</p>
          ))}
      </div>

      <p className="mt-6 text-center">
        <Link href="/hall-of-fame" className="text-sm font-semibold text-brand-deep underline">
          🏛️ 명예의 전당 보기 →
        </Link>
      </p>
    </main>
  )
}
