import Link from 'next/link'

type Props = { role: 'HOST' | 'GUEST'; pendingCount: number }

const TABS = [
  { href: '/', label: '캘린더', icon: '📅' },
  { href: '/ranking', label: '랭킹', icon: '🏆' },
  { href: '/visits/new', label: '기록', icon: '✏️' },
  { href: '/me', label: '내 기록', icon: '🙋' },
]

export default function BottomNav({ role, pendingCount }: Props) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => (
          <li key={t.href} className="flex-1">
            <Link href={t.href} className="flex flex-col items-center gap-0.5 py-2 text-xs">
              <span aria-hidden className="text-lg">{t.icon}</span>
              {t.label}
            </Link>
          </li>
        ))}
        {role === 'HOST' && (
          <li className="flex-1">
            <Link href="/admin/approvals" className="relative flex flex-col items-center gap-0.5 py-2 text-xs">
              <span aria-hidden className="text-lg">✅</span>
              승인함
              {pendingCount > 0 && (
                <span className="absolute right-3 top-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
