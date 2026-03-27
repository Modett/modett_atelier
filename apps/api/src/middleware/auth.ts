/**
 * Auth middleware — requireAuth (customer), requireAdmin, requireOwner.
 * Reads 'sid' cookie, validates session via Redis/DB, attaches user/admin.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { getSession, refreshSession, getUserById, getAdminByUserId } from '@modett/db'
import { redis } from '@modett/db'
import { AppError } from '../lib/errors'

const SESSION_KEY_PREFIX = 'session:'
const ADMIN_SESSION_TTL = 900 // 15 min in seconds

export type AuthRequest = Request & {
  user: { id: string; [k: string]: unknown }
  sessionId: string
}

export type AdminRequest = Request & {
  user: { id: string; [k: string]: unknown }
  admin: { id: string; role: string; [k: string]: unknown }
  sessionId: string
}

/** Wraps an AdminRequest handler so it can be passed to router.get/post etc. (avoids Request vs AdminRequest variance). */
export function withAdmin(
  handler: (req: AdminRequest, res: Response) => void | Promise<void>,
): RequestHandler {
  return handler as unknown as RequestHandler
}

/**
 * Optional auth — for cart routes. If 'sid' cookie present and valid CUSTOMER session,
 * sets req.user. If missing or invalid, continues without error (guest cart).
 * Admin sessions are ignored (no req.user).
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const sid = req.cookies?.sid
  if (!sid) {
    next()
    return
  }
  getSession({ sessionId: sid })
    .then((session) => {
      if (!session || session.kind !== 'CUSTOMER') {
        next()
        return
      }
      return getUserById({ id: session.userId }).then((user) => {
        if (!user || user.deletedAt) {
          next()
          return
        }
        ;(req as AuthRequest).user = user
        ;(req as AuthRequest).sessionId = sid
        next()
      })
    })
    .catch(() => next())
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const sid = req.cookies?.sid
  if (!sid) {
    next(new AppError('UNAUTHENTICATED', 401))
    return
  }
  getSession({ sessionId: sid })
    .then((session) => {
      if (!session) {
        next(new AppError('SESSION_EXPIRED', 401))
        return
      }
      if (session.kind !== 'CUSTOMER') {
        next(new AppError('UNAUTHENTICATED', 401))
        return
      }
      return getUserById({ id: session.userId }).then((user) => {
        if (!user || user.deletedAt) {
          next(new AppError('USER_NOT_FOUND', 401))
          return
        }
        refreshSession({ sessionId: sid }).then(() => {
          ;(req as AuthRequest).user = user
          ;(req as AuthRequest).sessionId = sid
          next()
        })
      })
    })
    .catch(next)
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const sid = req.cookies?.sid
  if (!sid) {
    next(new AppError('UNAUTHENTICATED', 401))
    return
  }
  getSession({ sessionId: sid })
    .then((session) => {
      if (!session) {
        next(new AppError('SESSION_EXPIRED', 401))
        return
      }
      if (session.kind !== 'ADMIN') {
        next(new AppError('FORBIDDEN', 403))
        return
      }
      const key = `${SESSION_KEY_PREFIX}${sid}`
      return redis
        .ttl(key)
        .then((ttl) => {
          if (ttl <= 0) {
            throw new AppError('SESSION_EXPIRED', 401)
          }
          return redis.expire(key, ADMIN_SESSION_TTL)
        })
        .then(() => getUserById({ id: session!.userId }))
        .then((user) => {
          if (!user) {
            next(new AppError('FORBIDDEN', 403))
            return
          }
          return getAdminByUserId({ userId: user.id }).then((admin) => {
            if (!admin || admin.status !== 'ACTIVE') {
              next(new AppError('FORBIDDEN', 403))
              return
            }
            ;(req as AdminRequest).user = user
            ;(req as AdminRequest).admin = admin
            ;(req as AdminRequest).sessionId = sid
            next()
          })
        })
    })
    .catch(next)
}

export function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  requireAdmin(req, res, (err?: unknown) => {
    if (err) {
      next(err)
      return
    }
    const admin = (req as AdminRequest).admin
    if (admin?.role !== 'OWNER') {
      next(new AppError('FORBIDDEN', 403))
      return
    }
    next()
  })
}
