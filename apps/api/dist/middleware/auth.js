"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withAdmin = withAdmin;
exports.optionalAuth = optionalAuth;
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.requireOwner = requireOwner;
const db_1 = require("@modett/db");
const db_2 = require("@modett/db");
const errors_1 = require("../lib/errors");
const SESSION_KEY_PREFIX = 'session:';
const ADMIN_SESSION_TTL = 900;
function withAdmin(handler) {
    return handler;
}
function optionalAuth(req, res, next) {
    const sid = req.cookies?.sid;
    if (!sid) {
        next();
        return;
    }
    (0, db_1.getSession)({ sessionId: sid })
        .then((session) => {
        if (!session || session.kind !== 'CUSTOMER') {
            next();
            return;
        }
        return (0, db_1.getUserById)({ id: session.userId }).then((user) => {
            if (!user || user.deletedAt) {
                next();
                return;
            }
            ;
            req.user = user;
            req.sessionId = sid;
            next();
        });
    })
        .catch(() => next());
}
function requireAuth(req, res, next) {
    const sid = req.cookies?.sid;
    if (!sid) {
        next(new errors_1.AppError('UNAUTHENTICATED', 401));
        return;
    }
    (0, db_1.getSession)({ sessionId: sid })
        .then((session) => {
        if (!session) {
            next(new errors_1.AppError('SESSION_EXPIRED', 401));
            return;
        }
        if (session.kind !== 'CUSTOMER') {
            next(new errors_1.AppError('UNAUTHENTICATED', 401));
            return;
        }
        return (0, db_1.getUserById)({ id: session.userId }).then((user) => {
            if (!user || user.deletedAt) {
                next(new errors_1.AppError('USER_NOT_FOUND', 401));
                return;
            }
            (0, db_1.refreshSession)({ sessionId: sid }).then(() => {
                ;
                req.user = user;
                req.sessionId = sid;
                next();
            });
        });
    })
        .catch(next);
}
function requireAdmin(req, res, next) {
    const sid = req.cookies?.sid;
    if (!sid) {
        next(new errors_1.AppError('UNAUTHENTICATED', 401));
        return;
    }
    (0, db_1.getSession)({ sessionId: sid })
        .then((session) => {
        if (!session) {
            next(new errors_1.AppError('SESSION_EXPIRED', 401));
            return;
        }
        if (session.kind !== 'ADMIN') {
            next(new errors_1.AppError('FORBIDDEN', 403));
            return;
        }
        const key = `${SESSION_KEY_PREFIX}${sid}`;
        return db_2.redis
            .ttl(key)
            .then((ttl) => {
            if (ttl <= 0) {
                throw new errors_1.AppError('SESSION_EXPIRED', 401);
            }
            return db_2.redis.expire(key, ADMIN_SESSION_TTL);
        })
            .then(() => (0, db_1.getUserById)({ id: session.userId }))
            .then((user) => {
            if (!user) {
                next(new errors_1.AppError('FORBIDDEN', 403));
                return;
            }
            return (0, db_1.getAdminByUserId)({ userId: user.id }).then((admin) => {
                if (!admin || admin.status !== 'ACTIVE') {
                    next(new errors_1.AppError('FORBIDDEN', 403));
                    return;
                }
                ;
                req.user = user;
                req.admin = admin;
                req.sessionId = sid;
                next();
            });
        });
    })
        .catch(next);
}
function requireOwner(req, res, next) {
    requireAdmin(req, res, (err) => {
        if (err) {
            next(err);
            return;
        }
        const admin = req.admin;
        if (admin?.role !== 'OWNER') {
            next(new errors_1.AppError('FORBIDDEN', 403));
            return;
        }
        next();
    });
}
