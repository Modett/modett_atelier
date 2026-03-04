"use strict";
/**
 * Rate limiting middleware — Redis sliding window.
 * Key format: rl:{name}:{identifier}
 * Applied per route. Requires redis from @modett/db.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitAcceptInvite = exports.rateLimitAdminInvites = exports.rateLimitAdminAuth = exports.rateLimitAuth = exports.rateLimitSignup = void 0;
exports.rateLimit = rateLimit;
var db_1 = require("@modett/db");
function slidingWindowKey(name, id) {
    return "rl:".concat(name, ":").concat(id);
}
function rateLimit(options) {
    var _this = this;
    var name = options.name, windowMs = options.windowMs, max = options.max, key = options.key;
    return function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
        var id, rkey, now, windowStart, count, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    id = key(req);
                    rkey = slidingWindowKey(name, id);
                    now = Date.now();
                    windowStart = now - windowMs;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, db_1.redis.zremrangebyscore(rkey, 0, windowStart)];
                case 2:
                    _b.sent();
                    return [4 /*yield*/, db_1.redis.zcard(rkey)];
                case 3:
                    count = _b.sent();
                    if (count >= max) {
                        res.status(429).json({
                            error: { code: 'RATE_LIMITED', message: 'Too many requests' },
                        });
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, db_1.redis.zadd(rkey, now, "".concat(now, "-").concat(Math.random()))];
                case 4:
                    _b.sent();
                    return [4 /*yield*/, db_1.redis.pexpire(rkey, windowMs)];
                case 5:
                    _b.sent();
                    next();
                    return [3 /*break*/, 7];
                case 6:
                    _a = _b.sent();
                    next();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    }); };
}
// Customer auth: signup 5 / 1 hr / IP
exports.rateLimitSignup = rateLimit({
    name: 'auth-signup',
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: function (req) { var _a; return (_a = req.ip) !== null && _a !== void 0 ? _a : 'unknown'; },
});
// Customer auth: login 10 / 15 min / IP
exports.rateLimitAuth = rateLimit({
    name: 'auth-login',
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: function (req) { var _a; return (_a = req.ip) !== null && _a !== void 0 ? _a : 'unknown'; },
});
// Admin auth: login 10 / 15 min / IP
exports.rateLimitAdminAuth = rateLimit({
    name: 'admin-auth-login',
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: function (req) { var _a; return (_a = req.ip) !== null && _a !== void 0 ? _a : 'unknown'; },
});
// Admin invites: 10 / 1 hr / OWNER (use admin id)
exports.rateLimitAdminInvites = rateLimit({
    name: 'admin-invites',
    windowMs: 60 * 60 * 1000,
    max: 10,
    key: function (req) { var _a, _b; return (_b = (_a = req.admin) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : 'unknown'; },
});
// Accept invite (unauthenticated): 5 / 1 hr / IP
exports.rateLimitAcceptInvite = rateLimit({
    name: 'admin-invites-accept',
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: function (req) { var _a; return (_a = req.ip) !== null && _a !== void 0 ? _a : 'unknown'; },
});
