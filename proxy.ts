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
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|robots.txt).*)'],
}
