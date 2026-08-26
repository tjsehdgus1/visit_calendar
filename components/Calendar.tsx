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
      <div className="grid grid-cols-7 border-b pb-2 text-center text-xs text-neutral-500">
        {WEEKDAYS.map((w) => <div key={w}>{w}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="aspect-square" />
          const day = byDate.get(date)
          const visit = day?.visits[0]
          const isToday = date === today

          const inner = (
            <div className={`flex h-full flex-col items-center gap-0.5 rounded-lg p-1 ${isToday ? 'ring-1 ring-neutral-900' : ''}`}>
              <span className="text-xs text-neutral-500">{Number(date.slice(8))}</span>
              {day && (
                <>
                  <span className="text-sm leading-none">{visit?.emojis.slice(0, 2).join('')}</span>
                  <span className="truncate text-[9px] leading-tight text-neutral-600">
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
