/**
 * Cookie attributes for browser clients on a different origin than the API
 * (e.g. Vercel storefront → Railway API). SameSite=Lax does not send cookies
 * on cross-origin XHR/fetch; production uses SameSite=None + Secure.
 *
 * `cid` uses a manual Set-Cookie line in production so we can append `Partitioned`
 * (CHIPS) for Chrome 115+; Express 4’s res.cookie typings omit `partitioned`.
 */

import type { Response } from 'express'

const CID_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000 // 21 days
const CID_MAX_AGE_SEC = Math.floor(CID_MAX_AGE_MS / 1000)

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

function encodeCookieValue(value: string): string {
  return encodeURIComponent(value)
}

export function setCidCookie(res: Response, sessionId: string): void {
  const attrs = crossOriginCookieAttributes()
  if (attrs.sameSite === 'none' && attrs.secure) {
    const v = encodeCookieValue(sessionId)
    res.append(
      'Set-Cookie',
      `cid=${v}; Path=/; Max-Age=${CID_MAX_AGE_SEC}; HttpOnly; Secure; SameSite=None; Partitioned`,
    )
    return
  }
  res.cookie('cid', sessionId, {
    ...attrs,
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
