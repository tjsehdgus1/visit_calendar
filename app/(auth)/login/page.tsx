'use client'

import { Suspense, useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { login, type LoginState } from './actions'

function SignupNotice() {
  const searchParams = useSearchParams()
  if (searchParams.get('signup') !== '1') return null
  return (
    <p className="mb-4 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900">
      가입 완료! 로그인해 주세요
    </p>
  )
}

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {})

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">우리집 방문일지</h1>

      <Suspense fallback={null}>
        <SignupNotice />
      </Suspense>

      <form action={action} className="flex flex-col gap-3">
        <input name="loginId" placeholder="아이디" autoCapitalize="none" required className="rounded-lg border px-3 py-3" />
        <input name="password" type="password" placeholder="비밀번호" required className="rounded-lg border px-3 py-3" />

        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="mt-2 rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50">
          {pending ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <Link href="/signup" className="mt-6 text-center text-sm text-neutral-500 underline">
        초대코드로 가입하기
      </Link>
    </main>
  )
}
