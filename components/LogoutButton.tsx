'use client'

import { useTransition } from 'react'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/(guest)/me/actions'

export default function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => logout())}
      className="flex items-center gap-1 rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink-soft shadow-warm transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
    >
      <LogOut aria-hidden size={16} strokeWidth={1.5} />
      {pending ? '로그아웃 중…' : '로그아웃'}
    </button>
  )
}
