/**
 * Redis client for session cache, rate limiting, inventory locks.
 * Same private network as API on Railway.
 * Requires REDIS_URL in environment.
 */
import Redis from 'ioredis';
export declare const redis: Redis;
/**
 * Run a function while holding an inventory lock for the given variant.
 * Prevents concurrent hold/release for the same variant. Lock TTL 5s.
 * Throws LockNotAcquiredError (409) if lock cannot be acquired.
 */
export declare function withInventoryLock<T>(variantId: string, fn: () => Promise<T>): Promise<T>;
//# sourceMappingURL=redis.d.ts.map