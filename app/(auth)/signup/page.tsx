'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup, type SignupState } from './actions'

export default function SignupPage() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {})

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center bg-cream px-6 py-10">
      <div className="rounded-2xl border border-line bg-card p-6 shadow-warm">
        <h1 className="mb-1 text-center font-display text-3xl text-brand-deep">가입하기</h1>
        <p className="mb-6 text-center text-sm text-ink-soft">집주인에게 받은 초대코드가 필요합니다.</p>

        <form action={action} className="flex flex-col gap-3">
          <input
            name="inviteCode"
            placeholder="초대코드"
            autoCapitalize="characters"
            required
            className="h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            name="loginId"
            placeholder="아이디 (영문·숫자 4~20자)"
            autoCapitalize="none"
            required
            className="h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            name="password"
            type="password"
            placeholder="비밀번호 (8자 이상)"
            required
            className="h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            name="nickname"
            placeholder="닉네임"
            required
            className="h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />

          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-12 rounded-xl bg-cta font-bold text-white transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none disabled:opacity-50"
          >
            {pending ? '가입 중…' : '가입하기'}
          </button>
        </form>

        <Link href="/login" className="mt-6 block text-center text-sm text-ink-soft underline">
          이미 계정이 있어요
        </Link>
      </div>
    </main>
  )
}
