import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

const MAX_FAILURES = 5
const LOCK_MS = 10 * 60 * 1000
const failures = new Map<string, { count: number; until: number }>()

function isLocked(loginId: string): boolean {
  const f = failures.get(loginId)
  if (!f) return false
  if (Date.now() > f.until) {
    failures.delete(loginId)
    return false
  }
  return f.count >= MAX_FAILURES
}

function recordFailure(loginId: string) {
  const f = failures.get(loginId) ?? { count: 0, until: 0 }
  failures.set(loginId, { count: f.count + 1, until: Date.now() + LOCK_MS })
}

export const authConfig: NextAuthConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { loginId: {}, password: {} },
      async authorize(raw) {
        const loginId = String(raw?.loginId ?? '').trim()
        const password = String(raw?.password ?? '')
        if (!loginId || !password) return null
        if (isLocked(loginId)) return null

        const user = await prisma.user.findUnique({ where: { loginId } })
        if (!user || user.status !== 'ACTIVE') {
          recordFailure(loginId)
          return null
        }
        if (!(await bcrypt.compare(password, user.passwordHash))) {
          recordFailure(loginId)
          return null
        }

        failures.delete(loginId)
        return { id: user.id, loginId: user.loginId, nickname: user.nickname, role: user.role }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = (user as { id: string }).id
        token.loginId = (user as { loginId: string }).loginId
        token.nickname = (user as { nickname: string }).nickname
        token.role = (user as { role: string }).role
      }
      return token
    },
    session({ session, token }) {
      session.user = {
        ...session.user,
        id: String(token.uid),
        loginId: String(token.loginId),
        nickname: String(token.nickname),
        role: token.role as 'HOST' | 'GUEST',
      }
      return session
    },
  },
}
