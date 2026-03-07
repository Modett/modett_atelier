"use strict";
/**
 * Rate limiting middleware — Redis sliding window.
 * Key format: rl:{name}:{identifier}
 * Applied per route. Requires redis from @modett/db.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitPaymentIntent = exports.rateLimitCheckoutStart = exports.rateLimitAcceptInvite = exports.rateLimitAdminInvites = exports.rateLimitAdminAuth = exports.rateLimitAuth = exports.rateLimitSignup = void 0;
exports.rateLimit = rateLimit;
const db_1 = require("@modett/db");
function slidingWindowKey(name, id) {
    return `rl:${name}:${id}`;
}
function rateLimit(options) {
    const { name, windowMs, max, key } = options;
    return async (req, res, next) => {
        const id = key(req);
        const rkey = slidingWindowKey(name, id);
        const now = Date.now();
        const windowStart = now - windowMs;
        try {
            await db_1.redis.zremrangebyscore(rkey, 0, windowStart);
            const count = await db_1.redis.zcard(rkey);
            if (count >= max) {
                res.status(429).json({
                    error: { code: 'RATE_LIMITED', message: 'Too many requests' },
                });
                return;
            }
            await db_1.redis.zadd(rkey, now, `${now}-${Math.random()}`);
            await db_1.redis.pexpire(rkey, windowMs);
            next();
        }
        catch {
            next();
        }
    };
}
// Customer auth: signup 5 / 1 hr / IP
exports.rateLimitSignup = rateLimit({
    name: 'auth-signup',
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: (req) => req.ip ?? 'unknown',
});
// Customer auth: login 10 / 15 min / IP
exports.rateLimitAuth = rateLimit({
    name: 'auth-login',
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: (req) => req.ip ?? 'unknown',
});
// Admin auth: login 10 / 15 min / IP
exports.rateLimitAdminAuth = rateLimit({
    name: 'admin-auth-login',
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: (req) => req.ip ?? 'unknown',
});
// Admin invites: 10 / 1 hr / OWNER (use admin id)
exports.rateLimitAdminInvites = rateLimit({
    name: 'admin-invites',
    windowMs: 60 * 60 * 1000,
    max: 10,
    key: (req) => req.admin?.id ?? 'unknown',
});
// Accept invite (unauthenticated): 5 / 1 hr / IP
exports.rateLimitAcceptInvite = rateLimit({
    name: 'admin-invites-accept',
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: (req) => req.ip ?? 'unknown',
});
// Checkout start: 5 / 10 min / IP (prevent reservation flooding)
exports.rateLimitCheckoutStart = rateLimit({
    name: 'checkout:start',
    windowMs: 10 * 60 * 1000,
    max: 5,
    key: (req) => req.ip ?? 'unknown',
});
// Payment intent: 3 / 5 min / IP (prevent grace window abuse)
exports.rateLimitPaymentIntent = rateLimit({
    name: 'checkout:payment',
    windowMs: 5 * 60 * 1000,
    max: 3,
    key: (req) => req.ip ?? 'unknown',
});
//# sourceMappingURL=rateLimit.js.map