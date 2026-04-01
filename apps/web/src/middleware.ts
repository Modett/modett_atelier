import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'site_access'
const PUBLIC_PATHS = [
  '/password',
  '/_next',
  '/favicon.ico',
  '/images',
  '/api',
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

export function middleware(request: NextRequest) {
  const sitePassword = process.env.SITE_PASSWORD

  // No password set = site is open, skip all checks
  if (!sitePassword) return NextResponse.next()

  const { pathname } = request.nextUrl

  // Always allow public paths through
  if (isPublicPath(pathname)) return NextResponse.next()

  // Check if visitor has the access cookie
  const accessCookie = request.cookies.get(COOKIE_NAME)
  if (accessCookie?.value === sitePassword) {
    return NextResponse.next()
  }

  // Not verified — redirect to password page
  const url = request.nextUrl.clone()
  url.pathname = '/password'
  // Preserve the intended destination so we can redirect
  // back after successful login
  url.searchParams.set('next', pathname)
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
}
