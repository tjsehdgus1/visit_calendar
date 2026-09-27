'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Trophy, PenLine, User, Settings } from 'lucide-react'

type Props = { role: 'HOST' | 'GUEST' }

const TABS = [
  { href: '/', label: '캘린더', Icon: CalendarDays },
  { href: '/ranking', label: '랭킹', Icon: Trophy },
  { href: '/visits/new', label: '기록', Icon: PenLine },
]

function itemClass(active: boolean) {
  return `flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none ${
    active ? 'font-bold text-brand-deep' : 'text-ink-soft'
  }`
}

/**
 * 하단 탭. 관리 화면(/admin 이하)에서도 유지된다 (2026-09-07 사용자 확정).
 * 호스트는 점수·랭킹 대상이 아니라 '내 기록' 대신 '관리'를 둔다.
 * 승인 탭은 승인 절차 폐지로 없앴다 (2026-09-27 사용자 결정).
 */
export default function BottomNav({ role }: Props) {
  const pathname = usePathname()
  const last =
    role === 'HOST'
      ? { href: '/admin', label: '관리', Icon: Settings, active: pathname.startsWith('/admin') }
      : { href: '/me', label: '내 기록', Icon: User, active: pathname === '/me' }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {[...TABS.map((t) => ({ ...t, active: pathname === t.href })), last].map((t) => (
          <li key={t.href} className="flex-1">
            <Link href={t.href} className={itemClass(t.active)}>
              <t.Icon aria-hidden size={22} strokeWidth={t.active ? 2 : 1.5} />
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
