import type { RankRow } from '@/lib/ranking'
import { titleFor } from '@/lib/scoring/titles'

const MEDALS = ['🥇', '🥈', '🥉']

const PODIUM_STYLE = [
  'border-gold bg-gold-soft',
  'border-line bg-stone-100',
  'border-brand-soft bg-orange-50',
]

export default function RankList({ rows, meId }: { rows: RankRow[]; meId: string }) {
  if (rows.length === 0) return <p className="py-10 text-center text-ink-soft">아직 기록이 없습니다.</p>

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((r) => {
        const isMe = r.userId === meId
        const isPodium = r.rank <= 3
        return (
          <li
            key={r.userId}
            className={`flex items-center gap-3 rounded-2xl border p-3 shadow-warm transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
              isMe
                ? 'border-brand bg-brand-soft'
                : isPodium
                  ? PODIUM_STYLE[r.rank - 1]
                  : 'border-line bg-card'
            }`}
          >
            <span className="w-8 shrink-0 text-center text-lg font-bold tabular-nums">
              {isPodium ? MEDALS[r.rank - 1] : r.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">{r.nickname}</p>
              <p className="text-xs text-ink-soft">
                {titleFor(r.points).label} · {r.visitCount}회 방문
              </p>
            </div>
            <span className="shrink-0 font-display text-lg tabular-nums text-brand-deep">{r.points}점</span>
          </li>
        )
      })}
    </ol>
  )
}
