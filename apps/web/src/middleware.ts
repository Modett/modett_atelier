import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ── Site-wide password protection ─────────────────────────
// Controlled by the SITE_PASSWORD environment variable.
// Set it in Railway/Vercel frontend service variables.
// Delete the variable entirely to open the site publicly.
// ──────────────────────────────────────────────────────────

function isAuthenticated(request: NextRequest): boolean {
  const sitePassword = process.env.SITE_PASSWORD
  if (!sitePassword) return true // no var set = open access

  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Basic ')) return false

  const base64 = authHeader.slice(6)
  const decoded = atob(base64)
  // username is ignored — only password is checked
  const [, password] = decoded.split(':')
  return password === sitePassword
}

export function middleware(request: NextRequest) {
  if (!isAuthenticated(request)) {
    return new NextResponse('Site under maintenance', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Modett — Coming Soon"',
      },
    })
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (Next.js static assets)
     * - _next/image   (Next.js image optimisation)
     * - favicon.ico
     * - /images/      (public image folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
}
