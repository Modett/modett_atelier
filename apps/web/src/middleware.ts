import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COUNTRY_CURRENCY: Record<string, string> = {
  LK: 'LKR',
  SG: 'SGD',
}

const ENV_DEFAULT_CURRENCY = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY
const ENV_DEFAULT_COUNTRY  = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY

const DEFAULT_CURRENCY =
  ENV_DEFAULT_CURRENCY === 'LKR' ||
  ENV_DEFAULT_CURRENCY === 'SGD' ||
  ENV_DEFAULT_CURRENCY === 'USD'
    ? ENV_DEFAULT_CURRENCY
    : 'LKR'

const DEFAULT_COUNTRY =
  typeof ENV_DEFAULT_COUNTRY === 'string' &&
  ENV_DEFAULT_COUNTRY.length === 2
    ? ENV_DEFAULT_COUNTRY.toUpperCase()
    : 'LK'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const existingCountry  = request.cookies.get('country')?.value
  const existingCurrency = request.cookies.get('currency')?.value

  if (
    existingCountry &&
    existingCurrency &&
    ['LKR', 'SGD', 'USD'].includes(existingCurrency)
  ) {
    return response
  }

  let countryCode: string
  let currency: string

  const isDev = process.env.NODE_ENV === 'development'

  if (isDev) {
    countryCode = 'LK'
    currency    = 'LKR'
  } else {
    const cfCountry    = request.headers.get('CF-IPCountry')
    const vercelHeader = request.headers.get('x-vercel-ip-country')

    const detectedCountry = cfCountry ?? vercelHeader ?? DEFAULT_COUNTRY

    countryCode =
      detectedCountry === 'XX' || detectedCountry === 'T1'
        ? DEFAULT_COUNTRY
        : detectedCountry

    currency = COUNTRY_CURRENCY[countryCode] ?? DEFAULT_CURRENCY
  }

  const COOKIE_OPTIONS = {
    httpOnly: false,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge:   60 * 60 * 24 * 30,
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
    '/((?!_next/static|_next/image|favicon.ico|images/|api/).*)',
  ],
}
