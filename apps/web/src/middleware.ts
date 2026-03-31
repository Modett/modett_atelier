import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_request: NextRequest) {
  // Auth protection for /account/* is handled client-side
  // via useSession() in the account layout. Server-side
  // cookie checks do not work because the session cookie
  // is set on the API domain (Railway), not the frontend
  // domain (Vercel/Railway frontend).
  return NextResponse.next()
}

export const config = {
  matcher: ['/account/:path*'],
}
