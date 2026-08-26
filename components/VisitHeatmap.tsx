type Props = { year: number; dates: string[] }

const LEVELS = ['bg-neutral-100', 'bg-neutral-300', 'bg-neutral-500', 'bg-neutral-800']

export default function VisitHeatmap({ year, dates }: Props) {
  const counts = new Map<string, number>()
  for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1)

  const start = Date.UTC(year, 0, 1)
  const end = Date.UTC(year, 11, 31)
  const cells: { date: string; level: number }[] = []
  for (let t = start; t <= end; t += 86_400_000) {
    const date = new Date(t).toISOString().slice(0, 10)
    const c = counts.get(date) ?? 0
    cells.push({ date, level: c === 0 ? 0 : Math.min(c, 3) })
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col grid-rows-7 gap-[2px]" style={{ width: 'max-content' }}>
        {cells.map((c) => (
          <div
            key={c.date}
            title={`${c.date} ${counts.get(c.date) ?? 0}회`}
            className={`h-2.5 w-2.5 rounded-[2px] ${LEVELS[c.level]}`}
          />
        ))}
      </div>
    </div>
  )
}
