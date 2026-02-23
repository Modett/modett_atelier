/**
 * Redis client for session cache, rate limiting, inventory locks.
 * Same private network as API on Railway.
 * Requires REDIS_URL in environment.
 */

import Redis from 'ioredis'

const connectionString = process.env.REDIS_URL
if (!connectionString) {
  throw new Error('REDIS_URL is required')
}

export const redis = new Redis(connectionString, { maxRetriesPerRequest: 3 })
