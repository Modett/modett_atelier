import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'
import { geolocation }   from '@vercel/functions'

// ── Country → Currency mapping ──────────────────────────
const COUNTRY_CURRENCY: Record<string, string> = {
  LK: 'LKR',   // Sri Lanka
  SG: 'SGD',   // Singapore
}

const DEFAULT_CURRENCY = 'LKR'
const DEFAULT_COUNTRY  = 'LK'

// ── Valid currency codes ────────────────────────────────
const VALID_CURRENCIES = ['LKR', 'SGD', 'USD']

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // ── Check existing cookies ────────────────────────────
  const existingCountry  = request.cookies.get('country')?.value
  const existingCurrency = request.cookies.get('currency')?.value

  // If valid cookies already exist, skip — do not overwrite
  if (
    existingCountry &&
    existingCurrency &&
    VALID_CURRENCIES.includes(existingCurrency)
  ) {
    return response
  }

  // ── Detect country ────────────────────────────────────
  let countryCode: string
  let currency: string

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    // ── DEV MODE: hardcode Sri Lanka ───────────────────
    // Vercel geo headers are NOT available on localhost.
    // This ensures shipping methods and currency work in dev.
    // TODO: Remove this block before going live if needed.
    countryCode = DEFAULT_COUNTRY
    currency    = DEFAULT_CURRENCY
  } else {
    // ── PRODUCTION: use Vercel geo detection ──────────
    // @vercel/functions reads X-Vercel-IP-Country header
    // automatically set by Vercel's edge network.
    const geo = geolocation(request)

    // geo.country is the 2-letter ISO country code e.g. "LK"
    // It is undefined if Vercel cannot detect the country.
    const detectedCountry = geo.country ?? DEFAULT_COUNTRY

    // Filter out Cloudflare's placeholder codes
    // 'XX' = unknown, 'T1' = Tor network
    countryCode = (detectedCountry === 'XX' || detectedCountry === 'T1')
      ? DEFAULT_COUNTRY
      : detectedCountry

    currency = COUNTRY_CURRENCY[countryCode] ?? DEFAULT_CURRENCY
  }

  // ── Cookie configuration ──────────────────────────────
  const COOKIE_OPTIONS = {
    httpOnly: false,   // MUST be false — client JS reads these cookies
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax'  as const,
    maxAge:   60 * 60 * 24 * 30,   // 30 days
    path:     '/',
  }

  // ── Set cookies on response ───────────────────────────
  if (existingCountry !== countryCode) {
    response.cookies.set('country', countryCode, COOKIE_OPTIONS)
  }

  if (existingCurrency !== currency) {
    response.cookies.set('currency', currency, COOKIE_OPTIONS)
  }

  return response
}

// ── Matcher: run on page routes only ─────────────────────
// Skip: static files, images, API routes, Next.js internals
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/|api/).*)',
  ],
}
