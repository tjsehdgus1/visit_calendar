import type { RankRow } from '@/lib/ranking'
import { titleFor } from '@/lib/scoring/titles'

const MEDALS = ['🥇', '🥈', '🥉']

export default function RankList({ rows, meId }: { rows: RankRow[]; meId: string }) {
  if (rows.length === 0) return <p className="py-10 text-center text-neutral-500">아직 기록이 없습니다.</p>

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r) => (
        <li
          key={r.userId}
          className={`flex items-center gap-3 rounded-xl border p-3 ${r.userId === meId ? 'border-neutral-900 bg-neutral-50' : ''}`}
        >
          <span className="w-8 shrink-0 text-center text-lg font-bold">
            {r.rank <= 3 ? MEDALS[r.rank - 1] : r.rank}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{r.nickname}</p>
            <p className="text-xs text-neutral-500">
              {titleFor(r.points).label} · {r.visitCount}회 방문
            </p>
          </div>
          <span className="shrink-0 font-bold tabular-nums">{r.points}점</span>
        </li>
      ))}
    </ol>
  )
}
