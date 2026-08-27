'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Trophy, PenLine, User, CheckCheck, Settings } from 'lucide-react'

type Props = { role: 'HOST' | 'GUEST'; pendingCount: number }

const TABS = [
  { href: '/', label: '캘린더', Icon: CalendarDays },
  { href: '/ranking', label: '랭킹', Icon: Trophy },
  { href: '/visits/new', label: '기록', Icon: PenLine },
  { href: '/me', label: '내 기록', Icon: User },
]

function itemClass(active: boolean) {
  return `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
    active ? 'font-bold text-brand-deep' : 'text-ink-soft'
  }`
}

export default function BottomNav({ role, pendingCount }: Props) {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {TABS.map((t) => {
          const active = pathname === t.href
          return (
            <li key={t.href} className="flex-1">
              <Link href={t.href} className={itemClass(active)}>
                <t.Icon aria-hidden size={22} strokeWidth={active ? 2 : 1.5} />
                {t.label}
              </Link>
            </li>
          )
        })}
        {role === 'HOST' && (
          <li className="flex-1">
            <Link href="/admin/approvals" className={`relative ${itemClass(pathname === '/admin/approvals')}`}>
              <CheckCheck aria-hidden size={22} strokeWidth={pathname === '/admin/approvals' ? 2 : 1.5} />
              승인함
              {pendingCount > 0 && (
                <span className="absolute right-3 top-1 rounded-full bg-danger px-1.5 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </Link>
          </li>
        )}
        {role === 'HOST' && (
          <li className="flex-1">
            <Link href="/admin" className={itemClass(pathname === '/admin')}>
              <Settings aria-hidden size={22} strokeWidth={pathname === '/admin' ? 2 : 1.5} />
              관리
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
