"use strict";
/**
 * Auth middleware — requireAuth (customer), requireAdmin, requireOwner.
 * Reads 'sid' cookie, validates session via Redis/DB, attaches user/admin.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireAdmin = requireAdmin;
exports.requireOwner = requireOwner;
var db_1 = require("@modett/db");
var db_2 = require("@modett/db");
var errors_1 = require("../lib/errors");
var SESSION_KEY_PREFIX = 'session:';
var ADMIN_SESSION_TTL = 900; // 15 min in seconds
function requireAuth(req, res, next) {
    var _a;
    var sid = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sid;
    if (!sid) {
        next(new errors_1.AppError('UNAUTHENTICATED', 401));
        return;
    }
    (0, db_1.getSession)({ sessionId: sid })
        .then(function (session) {
        if (!session) {
            next(new errors_1.AppError('SESSION_EXPIRED', 401));
            return;
        }
        if (session.kind !== 'CUSTOMER') {
            next(new errors_1.AppError('UNAUTHENTICATED', 401));
            return;
        }
        return (0, db_1.getUserById)({ id: session.userId }).then(function (user) {
            if (!user || user.deletedAt) {
                next(new errors_1.AppError('USER_NOT_FOUND', 401));
                return;
            }
            (0, db_1.refreshSession)({ sessionId: sid }).then(function () {
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
    var _a;
    var sid = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sid;
    if (!sid) {
        next(new errors_1.AppError('UNAUTHENTICATED', 401));
        return;
    }
    (0, db_1.getSession)({ sessionId: sid })
        .then(function (session) {
        if (!session) {
            next(new errors_1.AppError('SESSION_EXPIRED', 401));
            return;
        }
        if (session.kind !== 'ADMIN') {
            next(new errors_1.AppError('FORBIDDEN', 403));
            return;
        }
        var key = "".concat(SESSION_KEY_PREFIX).concat(sid);
        return db_2.redis
            .ttl(key)
            .then(function (ttl) {
            if (ttl <= 0) {
                throw new errors_1.AppError('SESSION_EXPIRED', 401);
            }
            return db_2.redis.expire(key, ADMIN_SESSION_TTL);
        })
            .then(function () { return (0, db_1.getUserById)({ id: session.userId }); })
            .then(function (user) {
            if (!user) {
                next(new errors_1.AppError('FORBIDDEN', 403));
                return;
            }
            return (0, db_1.getAdminByUserId)({ userId: user.id }).then(function (admin) {
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
    requireAdmin(req, res, function (err) {
        if (err) {
            next(err);
            return;
        }
        var admin = req.admin;
        if ((admin === null || admin === void 0 ? void 0 : admin.role) !== 'OWNER') {
            next(new errors_1.AppError('FORBIDDEN', 403));
            return;
        }
        next();
    });
}
