'use client'

import { useActionState } from 'react'
import { createUser, type CreateUserState } from './actions'

const inputClass =
  'h-11 rounded-xl border border-line bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand'

/** 호스트가 초대코드 없이 회원을 직접 추가하는 폼 — 이름 + 숫자 4자리 비밀번호 */
export default function CreateUserForm() {
  const [state, action, pending] = useActionState<CreateUserState, FormData>(createUser, {})

  return (
    <form action={action} className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3 shadow-warm">
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs text-ink-soft">이름</span>
          <input name="loginId" autoCapitalize="none" autoComplete="off" required maxLength={20} className={inputClass} />
        </label>
        <label className="flex w-32 flex-col gap-1">
          <span className="text-xs text-ink-soft">비밀번호 (숫자 4자리)</span>
          <input
            name="password"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            autoComplete="off"
            required
            className={inputClass}
          />
        </label>
      </div>
      <button
        disabled={pending}
        className="h-11 rounded-xl bg-cta text-sm font-semibold text-white transition-transform duration-150 active:scale-[0.97] disabled:opacity-60 motion-reduce:transition-none"
      >
        {pending ? '추가 중…' : '회원 추가'}
      </button>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      {state.created && (
        <p role="status" className="text-sm text-brand-deep">
          {state.created}
        </p>
      )}
    </form>
  )
}
