/**
 * Cookie attributes for browser clients on a different origin than the API
 * (e.g. Vercel storefront → Railway API). SameSite=Lax does not send cookies
 * on cross-origin XHR/fetch; production uses SameSite=None + Secure.
 */

import type { Response } from 'express'

const CID_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000 // 21 days

export function crossOriginCookieAttributes(): {
  httpOnly: true
  secure: boolean
  sameSite: 'none' | 'lax'
} {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure:   isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  }
}

export function setCidCookie(res: Response, sessionId: string): void {
  res.cookie('cid', sessionId, {
    ...crossOriginCookieAttributes(),
    maxAge: CID_MAX_AGE_MS,
    path:   '/',
  })
}

/** clearCookie options must match how the cookie was set */
export function clearSidCookie(res: Response, path: string): void {
  res.clearCookie('sid', {
    ...crossOriginCookieAttributes(),
    path,
  })
}
