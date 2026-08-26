import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { createLockout } from '@/lib/auth/lockout'

const lockout = createLockout()

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
        if (lockout.isLocked(loginId)) return null

        const user = await prisma.user.findUnique({ where: { loginId } })
        if (!user || user.status !== 'ACTIVE') {
          lockout.recordFailure(loginId)
          return null
        }
        if (!(await bcrypt.compare(password, user.passwordHash))) {
          lockout.recordFailure(loginId)
          return null
        }

        lockout.clear(loginId)
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
