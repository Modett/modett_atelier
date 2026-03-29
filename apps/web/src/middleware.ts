import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!pathname.startsWith('/account')) {
    return NextResponse.next()
  }
  const sid = request.cookies.get('sid')
  if (sid?.value) {
    return NextResponse.next()
  }
  const url = request.nextUrl.clone()
  url.pathname = '/'
  url.searchParams.set('openAuth', '1')
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/account/:path*'],
}
