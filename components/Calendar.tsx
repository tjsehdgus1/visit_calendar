import Link from 'next/link'

export type CalendarDay = {
  date: string // 'YYYY-MM-DD'
  visits: { id: string; emojis: string[]; nicknames: string[] }[]
}

type Props = { year: number; month: number; days: CalendarDay[]; today: string }

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

export default function Calendar({ year, month, days, today }: Props) {
  const byDate = new Map(days.map((d) => [d.date, d]))
  const first = new Date(Date.UTC(year, month - 1, 1))
  const firstWeekday = (first.getUTCDay() || 7) - 1 // 월=0
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1).padStart(2, '0')
      return `${year}-${String(month).padStart(2, '0')}-${d}`
    }),
  ]

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-line pb-2 text-center text-xs font-medium text-ink-soft">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={i === 5 ? 'text-info' : i === 6 ? 'text-danger' : undefined}>
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="aspect-square" />
          const day = byDate.get(date)
          const visit = day?.visits[0]
          const isToday = date === today
          const weekday = (i % 7)

          const inner = (
            <div
              className={`flex h-full flex-col items-center gap-0.5 rounded-lg p-1 transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
                isToday ? 'ring-2 ring-brand bg-brand-soft' : day ? 'bg-brand-soft' : ''
              }`}
            >
              <span
                className={`text-xs tabular-nums ${
                  weekday === 5 ? 'text-info' : weekday === 6 ? 'text-danger' : 'text-ink-soft'
                }`}
              >
                {Number(date.slice(8))}
              </span>
              {day && (
                <>
                  <span className="text-base leading-none">{visit?.emojis.slice(0, 2).join('')}</span>
                  <span className="truncate text-[11px] leading-tight text-ink-soft">
                    {day.visits.flatMap((v) => v.nicknames).slice(0, 2).join(',')}
                  </span>
                </>
              )}
            </div>
          )

          return (
            <div key={date} className="aspect-square">
              {visit ? <Link href={`/visits/${visit.id}`} className="block h-full">{inner}</Link> : inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
