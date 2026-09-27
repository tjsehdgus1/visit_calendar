import Link from 'next/link'
import { summarizeDay } from '@/lib/calendar'

export type CalendarDay = {
  date: string // 'YYYY-MM-DD'
  visits: { id: string; emojis: string[]; nicknames: string[] }[]
}

type Props = { year: number; month: number; days: CalendarDay[]; today: string }

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']

/**
 * 월간 캘린더. 375px에서 칸 너비가 약 47px이라 정사각형 칸에는 날짜·이모지·이름이 다 들어가지 않아
 * 이름이 옆·아래 칸으로 넘쳤다 — 칸 높이를 고정(4.5rem)하고 이름은 한 줄에 한 명씩 두 줄까지 (2026-09-27).
 * 좌우 여백 없이 11px이면 375px에서도 네 글자 이름까지 잘리지 않는다
 */
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
      <div className="grid grid-cols-7 gap-x-0.5 border-b border-line pb-2 text-center text-xs font-medium text-ink-soft">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={i === 5 ? 'text-info' : i === 6 ? 'text-danger' : undefined}>
            {w}
          </div>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-0.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`empty-${i}`} className="h-[4.5rem]" />
          const day = byDate.get(date)
          const visit = day?.visits[0]
          const summary = day ? summarizeDay(day.visits) : null
          const isToday = date === today
          const weekday = i % 7

          const inner = (
            <div
              className={`flex h-full flex-col items-center overflow-hidden rounded-lg py-1 transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
                isToday ? 'bg-brand-soft ring-2 ring-inset ring-brand' : day ? 'bg-brand-soft' : ''
              }`}
            >
              <span
                className={`text-xs leading-4 tabular-nums ${
                  weekday === 5 ? 'text-info' : weekday === 6 ? 'text-danger' : 'text-ink-soft'
                }`}
              >
                {Number(date.slice(8))}
              </span>
              {summary && (
                <>
                  <span aria-hidden className="text-sm leading-5">
                    {summary.emojis.join('')}
                  </span>
                  {summary.lines.map((line, n) => (
                    <span key={n} className="w-full truncate text-center text-[11px] leading-[13px] text-ink">
                      {line}
                    </span>
                  ))}
                </>
              )}
            </div>
          )

          // 기록 있는 날 → 상세(같은 날 다른 모임은 상세 화면에서 이어진다), 빈 날(오늘 이전) → 그 날짜로 기록 시작, 미래 → 링크 없음
          const href = visit
            ? `/visits/${visit.id}`
            : date <= today
              ? `/visits/new?date=${date}`
              : null
          const label = summary ? `${month}월 ${Number(date.slice(8))}일 ${summary.names.join(', ')}` : undefined

          return (
            <div key={date} className="h-[4.5rem]">
              {href ? (
                <Link href={href} aria-label={label} className="block h-full">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
