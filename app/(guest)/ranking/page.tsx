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
      <h1 className="text-xl font-bold">랭킹</h1>
      {season && <p className="mt-1 text-sm text-neutral-500">{season.name}</p>}

      {daysLeft !== null && daysLeft <= 7 && daysLeft >= 0 && (
        <p className="mt-3 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
          🔥 시즌 마감 D-{daysLeft}
        </p>
      )}

      <nav className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/ranking?tab=${t.key}`}
            className={`flex-1 rounded-lg border py-2 text-center text-sm ${tab === t.key ? 'border-neutral-900 bg-neutral-900 text-white' : ''}`}
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
            <p className="py-10 text-center text-neutral-500">진행 중인 시즌이 없습니다.</p>
          ))}
        {tab === 'tag' &&
          (season ? (
            <ul className="flex flex-col gap-2">
              {(await tagKings(season.id)).map((k) => (
                <li key={k.tagSlug} className="flex items-center gap-3 rounded-xl border p-3">
                  <span className="text-2xl">{k.emoji}</span>
                  <div className="flex-1">
                    <p className="text-xs text-neutral-500">{k.tagLabel}왕</p>
                    <p className="font-semibold">{k.nickname}</p>
                  </div>
                  <span className="text-sm text-neutral-500">{k.count}회</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-10 text-center text-neutral-500">진행 중인 시즌이 없습니다.</p>
          ))}
      </div>
    </main>
  )
}
