'use client'

import { useActionState } from 'react'
import { resetPassword, type ResetPasswordState } from './actions'

/** 비번 초기화 버튼. 발급된 임시 비밀번호를 그 자리에 한 번 표시한다 (새로고침하면 사라짐) */
export default function ResetPasswordButton({ userId, loginId }: { userId: string; loginId: string }) {
  const [state, action, pending] = useActionState<ResetPasswordState, FormData>(resetPassword, {})

  if (state.tempPassword) {
    return (
      <span className="text-xs text-ink" role="status" aria-live="polite">
        임시 비번 <code className="font-mono font-bold tracking-wider">{state.tempPassword}</code>
      </span>
    )
  }

  return (
    <form action={action} className="flex items-center gap-1">
      <input type="hidden" name="userId" value={userId} />
      <button
        disabled={pending}
        aria-label={`${loginId} 비밀번호 초기화`}
        className="text-xs text-ink-soft underline disabled:opacity-60"
      >
        {pending ? '발급 중…' : '비번 초기화'}
      </button>
      {state.error && <span className="text-xs text-danger">{state.error}</span>}
    </form>
  )
}
