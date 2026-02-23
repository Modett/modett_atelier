/**
 * Rate limiting middleware — Redis sliding window.
 * Key format: rl:{name}:{identifier}
 * Applied per route. Requires redis from @modett/db.
 */

import type { Request, Response, NextFunction } from 'express'
import { redis } from '@modett/db'

export type RateLimitOptions = {
  windowMs: number
  max: number
  key: (req: Request) => string
}

function slidingWindowKey(name: string, id: string): string {
  return `rl:${name}:${id}`
}

export function rateLimit(options: {
  name: string
  windowMs: number
  max: number
  key: (req: Request) => string
}) {
  const { name, windowMs, max, key } = options
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const id = key(req)
    const rkey = slidingWindowKey(name, id)
    const now = Date.now()
    const windowStart = now - windowMs
    try {
      await redis.zremrangebyscore(rkey, 0, windowStart)
      const count = await redis.zcard(rkey)
      if (count >= max) {
        res.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many requests' },
        })
        return
      }
      await redis.zadd(rkey, now, `${now}-${Math.random()}`)
      await redis.pexpire(rkey, windowMs)
      next()
    } catch {
      next()
    }
  }
}

// Customer auth: signup 5 / 1 hr / IP
export const rateLimitSignup = rateLimit({
  name: 'auth-signup',
  windowMs: 60 * 60 * 1000,
  max: 5,
  key: (req) => req.ip ?? 'unknown',
})

// Customer auth: login 10 / 15 min / IP
export const rateLimitAuth = rateLimit({
  name: 'auth-login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => req.ip ?? 'unknown',
})

// Admin auth: login 10 / 15 min / IP
export const rateLimitAdminAuth = rateLimit({
  name: 'admin-auth-login',
  windowMs: 15 * 60 * 1000,
  max: 10,
  key: (req) => req.ip ?? 'unknown',
})

// Admin invites: 10 / 1 hr / OWNER (use admin id)
export const rateLimitAdminInvites = rateLimit({
  name: 'admin-invites',
  windowMs: 60 * 60 * 1000,
  max: 10,
  key: (req) => (req as Request & { admin?: { id: string } }).admin?.id ?? 'unknown',
})

// Accept invite (unauthenticated): 5 / 1 hr / IP
export const rateLimitAcceptInvite = rateLimit({
  name: 'admin-invites-accept',
  windowMs: 60 * 60 * 1000,
  max: 5,
  key: (req) => req.ip ?? 'unknown',
})
