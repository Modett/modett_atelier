import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COUNTRY_CURRENCY: Record<string, string> = {
  LK: 'LKR',
  SG: 'SGD',
}

const DEFAULT_CURRENCY = 'USD'

// TODO: REMOVE before production — Cloudflare CF-IPCountry will take over automatically.
// In development Cloudflare is not in the request path so CF-IPCountry is never set.
// We hardcode LK/LKR for dev so shipping methods load correctly locally.
const DEV_COUNTRY  = 'LK'
const DEV_CURRENCY = 'LKR'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  let countryCode: string
  let currency: string

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    countryCode = DEV_COUNTRY
    currency    = DEV_CURRENCY
  } else {
    const cfCountry = request.headers.get('CF-IPCountry')
    countryCode = cfCountry ?? 'US'
    currency    = COUNTRY_CURRENCY[countryCode] ?? DEFAULT_CURRENCY
  }

  const existingCountry  = request.cookies.get('country')?.value
  const existingCurrency = request.cookies.get('currency')?.value

  const COOKIE_OPTIONS = {
    httpOnly: false,       // readable by client-side JS (useCurrency / useGeo hooks)
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 30,   // 30 days
    path:     '/',
  }

  if (existingCountry !== countryCode) {
    response.cookies.set('country', countryCode, COOKIE_OPTIONS)
  }

  if (existingCurrency !== currency) {
    response.cookies.set('currency', currency, COOKIE_OPTIONS)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico
     * - images/      (public images)
     * - api/         (API routes — geo detection not needed here)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|api/).*)',
  ],
}
