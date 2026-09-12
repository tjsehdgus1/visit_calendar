'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, Trophy, PenLine, User, ClipboardCheck, Settings } from 'lucide-react'

type Props = { role: 'HOST' | 'GUEST'; pendingCount?: number }

const COMMON_TABS = [
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
 * 호스트는 점수·랭킹 대상이 아니라 '내 기록'이 의미 없으므로 그 자리에 '승인'을 둔다 (2026-09-12 사용자 확정).
 */
export default function BottomNav({ role, pendingCount = 0 }: Props) {
  const pathname = usePathname()
  const inApprovals = pathname.startsWith('/admin/approvals')

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {COMMON_TABS.map((t) => {
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

        {role === 'GUEST' ? (
          <li className="flex-1">
            <Link href="/me" className={itemClass(pathname === '/me')}>
              <User aria-hidden size={22} strokeWidth={pathname === '/me' ? 2 : 1.5} />내 기록
            </Link>
          </li>
        ) : (
          <>
            <li className="flex-1">
              <Link
                href="/admin/approvals"
                className={itemClass(inApprovals)}
                aria-label={pendingCount > 0 ? `승인, 대기 ${pendingCount}건` : '승인'}
              >
                <span className="relative">
                  <ClipboardCheck aria-hidden size={22} strokeWidth={inApprovals ? 2 : 1.5} />
                  {pendingCount > 0 && (
                    <span
                      aria-hidden
                      className="absolute -right-2 -top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-bold leading-4 text-white"
                    >
                      {pendingCount > 9 ? '9+' : pendingCount}
                    </span>
                  )}
                </span>
                승인
              </Link>
            </li>
            <li className="flex-1">
              <Link
                href="/admin"
                className={itemClass(pathname.startsWith('/admin') && !inApprovals)}
              >
                <Settings aria-hidden size={22} strokeWidth={pathname.startsWith('/admin') && !inApprovals ? 2 : 1.5} />
                관리
              </Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  )
}
