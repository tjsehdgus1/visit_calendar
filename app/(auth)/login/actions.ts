'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'

export type LoginState = { error?: string }

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn('credentials', {
      loginId: String(formData.get('loginId') ?? ''),
      password: String(formData.get('password') ?? ''),
      redirectTo: '/',
    })
    return {}
  } catch (e) {
    if (e instanceof AuthError) {
      return { error: '아이디 또는 비밀번호가 올바르지 않습니다.' }
    }
    throw e // redirect 예외는 그대로 통과시켜야 한다
  }
}
