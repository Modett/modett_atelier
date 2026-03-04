/**
 * Redis client for session cache, rate limiting, inventory locks.
 * Same private network as API on Railway.
 * Requires REDIS_URL in environment.
 */

import { randomUUID } from 'crypto'
import Redis from 'ioredis'
import { LockNotAcquiredError } from './errors'

const connectionString = process.env.REDIS_URL
if (!connectionString) {
  throw new Error('REDIS_URL is required')
}

export const redis = new Redis(connectionString, { maxRetriesPerRequest: 3 })

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
