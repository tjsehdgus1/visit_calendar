import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export type SessionUser = {
  id: string
  loginId: string
  nickname: string
  role: 'HOST' | 'GUEST'
}

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth()
  const u = session?.user as SessionUser | undefined
  return u?.id ? u : null
}

/** 로그인 필수. 서버 액션·페이지에서 매번 호출한다 */
export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser()
  if (!user) redirect('/login')
  return user
}

/** 호스트 전용 */
export async function requireHost(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== 'HOST') redirect('/')
  return user
}
