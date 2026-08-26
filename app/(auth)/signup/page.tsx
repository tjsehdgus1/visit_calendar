'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup, type SignupState } from './actions'

export default function SignupPage() {
  const [state, action, pending] = useActionState<SignupState, FormData>(signup, {})

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-10">
      <h1 className="mb-1 text-2xl font-bold">가입하기</h1>
      <p className="mb-6 text-sm text-neutral-500">집주인에게 받은 초대코드가 필요합니다.</p>

      <form action={action} className="flex flex-col gap-3">
        <input name="inviteCode" placeholder="초대코드" autoCapitalize="characters" required className="rounded-lg border px-3 py-3" />
        <input name="loginId" placeholder="아이디 (영문·숫자 4~20자)" autoCapitalize="none" required className="rounded-lg border px-3 py-3" />
        <input name="password" type="password" placeholder="비밀번호 (8자 이상)" required className="rounded-lg border px-3 py-3" />
        <input name="nickname" placeholder="닉네임" required className="rounded-lg border px-3 py-3" />

        {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

        <button type="submit" disabled={pending} className="mt-2 rounded-lg bg-neutral-900 py-3 font-semibold text-white disabled:opacity-50">
          {pending ? '가입 중…' : '가입하기'}
        </button>
      </form>

      <Link href="/login" className="mt-6 text-center text-sm text-neutral-500 underline">
        이미 계정이 있어요
      </Link>
    </main>
  )
}
