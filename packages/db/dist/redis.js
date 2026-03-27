"use strict";
/**
 * Redis client for session cache, rate limiting, inventory locks.
 * Same private network as API on Railway.
 * Requires REDIS_URL in environment.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.withInventoryLock = withInventoryLock;
const crypto_1 = require("crypto");
const ioredis_1 = __importDefault(require("ioredis"));
const errors_1 = require("./errors");
const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) {
    throw new Error('REDIS_URL is required');
}
exports.redis = new ioredis_1.default(REDIS_URL, {
    tls: REDIS_URL.startsWith('rediss://')
        ? { rejectUnauthorized: false }
        : undefined,
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
        if (times > 3)
            return null;
        return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
});
exports.redis.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
});
exports.redis.on('connect', () => {
    console.log('[Redis] Connected');
});
/**
 * Run a function while holding an inventory lock for the given variant.
 * Prevents concurrent hold/release for the same variant. Lock TTL 5s.
 * Throws LockNotAcquiredError (409) if lock cannot be acquired.
 */
async function withInventoryLock(variantId, fn) {
    const key = `lock:variant:${variantId}`;
    const lockId = (0, crypto_1.randomUUID)();
    const acquired = await exports.redis.set(key, lockId, 'EX', 5, 'NX');
    if (!acquired) {
        throw new errors_1.LockNotAcquiredError('LOCK_NOT_ACQUIRED');
    }
    try {
        return await fn();
    }
    finally {
        await exports.redis.eval(`if redis.call('get', KEYS[1]) == ARGV[1]
       then return redis.call('del', KEYS[1])
       else return 0
       end`, 1, key, lockId);
    }
}
