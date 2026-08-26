import type { DefaultSession } from 'next-auth'

// next-auth v5의 User/Session/JWT 기본 타입에는 loginId·nickname·role이 없다.
// authorize()·jwt()·session() 콜백에서 커스텀 필드를 주고받기 위한 선언 병합.
declare module 'next-auth' {
  interface User {
    loginId: string
    nickname: string
    role: 'HOST' | 'GUEST'
  }

  interface Session {
    user: {
      id: string
      loginId: string
      nickname: string
      role: 'HOST' | 'GUEST'
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    uid?: string
    loginId?: string
    nickname?: string
    role?: 'HOST' | 'GUEST'
  }
}
