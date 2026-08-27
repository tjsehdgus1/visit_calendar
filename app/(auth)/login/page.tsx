'use client'

import { Suspense, useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { login, type LoginState } from './actions'

function SignupNotice() {
  const searchParams = useSearchParams()
  if (searchParams.get('signup') !== '1') return null
  return (
    <p className="mb-4 rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-ok shadow-warm">
      가입 완료! 로그인해 주세요
    </p>
  )
}

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center bg-cream px-6 py-10">
      <div className="rounded-2xl border border-line bg-card p-6 shadow-warm">
        <h1 className="mb-6 text-center font-display text-3xl text-brand-deep">우리집 방문일지</h1>

        <Suspense fallback={null}>
          <SignupNotice />
        </Suspense>

        <form action={action} className="flex flex-col gap-3">
          <input
            name="loginId"
            placeholder="아이디"
            autoCapitalize="none"
            required
            className="h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <input
            name="password"
            type="password"
            placeholder="비밀번호"
            required
            className="h-12 rounded-xl border border-line bg-card px-3 focus:outline-none focus:ring-2 focus:ring-brand"
          />

          {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 h-12 rounded-xl bg-cta font-bold text-white transition-transform duration-150 active:scale-[0.97] motion-reduce:transition-none disabled:opacity-50"
          >
            {pending ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <Link href="/signup" className="mt-6 block text-center text-sm text-ink-soft underline">
          초대코드로 가입하기
        </Link>
      </div>
    </main>
  )
}
