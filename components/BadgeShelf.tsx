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
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${earned ? '' : 'opacity-40 grayscale'}`}
          >
            <span className="text-3xl" aria-hidden>{b.emoji}</span>
            <span className="text-xs font-semibold">{b.label}</span>
            <span className="text-[10px] leading-tight text-neutral-500">
              {earned ? '획득' : b.description}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
