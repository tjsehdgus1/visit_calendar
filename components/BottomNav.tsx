'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Trophy, PenLine, User, Settings } from 'lucide-react'

type Props = { role: 'HOST' | 'GUEST' }

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

/**
 * 하단 탭. 관리 화면(/admin 이하)에서도 유지된다 (2026-09-07 사용자 확정).
 * 승인함은 탭에서 빼고 관리 화면 안의 링크로만 둔다 — 기록은 거의 호스트가 올려 즉시 승인되므로.
 */
export default function BottomNav({ role }: Props) {
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
            <Link href="/admin" className={itemClass(pathname.startsWith('/admin'))}>
              <Settings aria-hidden size={22} strokeWidth={pathname.startsWith('/admin') ? 2 : 1.5} />
              관리
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
