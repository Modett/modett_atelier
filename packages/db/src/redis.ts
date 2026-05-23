/**
 * Redis client for session cache, rate limiting, inventory locks.
 * Same private network as API on Railway.
 * Requires REDIS_URL in environment.
 */

import { randomUUID } from 'crypto'
import Redis from 'ioredis'
import { LockNotAcquiredError } from './errors'

const REDIS_URL = process.env.REDIS_URL
if (!REDIS_URL) {
  throw new Error('REDIS_URL is required')
}

export const redis = new Redis(REDIS_URL, {
  tls: REDIS_URL.startsWith('rediss://')
    ? { rejectUnauthorized: false }
    : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null
    return Math.min(times * 200, 2000)
  },
  lazyConnect: true,
})

redis.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message)
})

redis.on('connect', () => {
  console.log('[Redis] Connected')
})

/**
 * Run a function while holding an inventory lock for the given variant.
 * Prevents concurrent hold/release for the same variant. Lock TTL 5s.
 * Throws LockNotAcquiredError (409) if lock cannot be acquired.
 */
export async function withInventoryLock<T>(
  variantId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `lock:variant:${variantId}`
  const lockId = randomUUID()

  const acquired = await redis.set(key, lockId, 'EX', 5, 'NX')
  if (!acquired) {
    throw new LockNotAcquiredError('LOCK_NOT_ACQUIRED')
  }

  try {
    return await fn()
  } finally {
    await redis.eval(
      `if redis.call('get', KEYS[1]) == ARGV[1]
       then return redis.call('del', KEYS[1])
       else return 0
       end`,
      1,
      key,
      lockId,
    )
  }
}

/**
 * Per-payment-operation lock — used by /payments/session and saved-card pay to
 * serialize work on the same order. Each (orderId, op) gets its own key so
 * different operations on the same order don't collide unnecessarily.
 *
 * TTL 30s (long enough to cover a PAYable server-to-server call). Throws
 * PaymentInProgressError (409) on contention — callers should surface a
 * friendly "Your payment is still being processed" message rather than retry.
 */
export async function withPaymentLock<T>(
  orderId: string,
  op: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `lock:payment:${op}:${orderId}`
  const lockId = randomUUID()

  const acquired = await redis.set(key, lockId, 'EX', 30, 'NX')
  if (!acquired) {
    throw new PaymentInProgressError()
  }

  try {
    return await fn()
  } finally {
    await redis.eval(
      `if redis.call('get', KEYS[1]) == ARGV[1]
       then return redis.call('del', KEYS[1])
       else return 0
       end`,
      1,
      key,
      lockId,
    )
  }
}

export class PaymentInProgressError extends Error {
  readonly code = 'PAYMENT_IN_PROGRESS'
  readonly statusCode = 409

  constructor() {
    super('Another payment operation is already in progress for this order')
    this.name = 'PaymentInProgressError'
    Object.setPrototypeOf(this, PaymentInProgressError.prototype)
  }
}
