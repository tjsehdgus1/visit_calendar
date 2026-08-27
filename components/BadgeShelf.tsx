type BadgeView = {
  code: string
  label: string
  emoji: string
  description: string
  earnedAt: Date | null
}

export default function BadgeShelf({ badges }: { badges: BadgeView[] }) {
  return (
    <ul className="grid grid-cols-3 gap-3">
      {badges.map((b) => {
        const earned = b.earnedAt !== null
        return (
          <li
            key={b.code}
            className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center shadow-warm transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
              earned ? 'border-gold bg-gold-soft' : 'border-line bg-card opacity-40 grayscale'
            }`}
          >
            <span className="text-3xl" aria-hidden>{b.emoji}</span>
            <span className="text-xs font-semibold text-ink">{b.label}</span>
            <span className="text-[11px] leading-tight text-ink-soft">
              {earned ? '획득' : b.description}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
