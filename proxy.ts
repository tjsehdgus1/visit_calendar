import { NextResponse, type NextRequest } from 'next/server'
import { auth } from '@/auth'

const PUBLIC_PATHS = ['/login', '/signup']

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next()

  const session = await auth()
  if (!session?.user) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = ''
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // PWA 정적 파일(매니페스트·서비스워커·아이콘)은 로그인 전에도 받아야 설치가 된다
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|icon.svg|icon-.*\.png|apple-touch-icon.png|manifest.webmanifest|sw.js|robots.txt).*)'],
}
