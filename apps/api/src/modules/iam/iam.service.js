"use strict";
/**
 * IAM service layer — business logic, validation, errors.
 * RORO. Uses query functions from @modett/db. Throws AppError for expected failures.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.login = login;
exports.logout = logout;
exports.getMe = getMe;
exports.updateMe = updateMe;
exports.changePassword = changePassword;
exports.listSavedAddressesForUser = listSavedAddressesForUser;
exports.createSavedAddressForUser = createSavedAddressForUser;
exports.updateSavedAddressForUser = updateSavedAddressForUser;
exports.deleteSavedAddressForUser = deleteSavedAddressForUser;
exports.listSavedPaymentMethodsForUser = listSavedPaymentMethodsForUser;
exports.deleteSavedPaymentMethodForUser = deleteSavedPaymentMethodForUser;
exports.adminLogin = adminLogin;
exports.adminLogout = adminLogout;
exports.createAdminInviteForOwner = createAdminInviteForOwner;
exports.acceptAdminInvite = acceptAdminInvite;
exports.listAdminsForOwner = listAdminsForOwner;
exports.updateAdminRoleForOwner = updateAdminRoleForOwner;
exports.suspendAdminForOwner = suspendAdminForOwner;
var crypto = require("node:crypto");
var bcryptjs_1 = require("bcryptjs");
var errors_1 = require("../../lib/errors");
var db_1 = require("@modett/db");
var BCRYPT_ROUNDS = 12;
var DUMMY_HASH = '$2a$12$dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.u';
function sanitiseUser(user) {
    var _ = user.passwordHash, rest = __rest(user, ["passwordHash"]);
    return rest;
}
// —— Signup / Login / Logout ——
function signup(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var normalisedEmail, existing, passwordHash, user, expiresAt, session;
        var firstName = _b.firstName, lastName = _b.lastName, email = _b.email, password = _b.password, newsletterOptIn = _b.newsletterOptIn;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    normalisedEmail = email.toLowerCase().trim();
                    return [4 /*yield*/, (0, db_1.getUserByEmail)({ email: normalisedEmail })];
                case 1:
                    existing = _c.sent();
                    if (existing)
                        throw new errors_1.AppError('EMAIL_ALREADY_EXISTS', 409);
                    return [4 /*yield*/, bcryptjs_1.default.hash(password, BCRYPT_ROUNDS)];
                case 2:
                    passwordHash = _c.sent();
                    return [4 /*yield*/, (0, db_1.createUser)({
                            firstName: firstName,
                            lastName: lastName,
                            email: normalisedEmail,
                            passwordHash: passwordHash,
                            newsletterOptIn: newsletterOptIn,
                        })];
                case 3:
                    user = _c.sent();
                    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, (0, db_1.createSession)({
                            userId: user.id,
                            kind: 'CUSTOMER',
                            expiresAt: expiresAt,
                        })];
                case 4:
                    session = _c.sent();
                    return [2 /*return*/, { user: sanitiseUser(user), sessionId: session.id }];
            }
        });
    });
}
function login(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var normalisedEmail, user, hashToCompare, passwordOk, ttlMs, expiresAt, rememberMeUntil, session;
        var _c;
        var email = _b.email, password = _b.password, rememberMe = _b.rememberMe;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    normalisedEmail = email.toLowerCase().trim();
                    return [4 /*yield*/, (0, db_1.getUserByEmail)({ email: normalisedEmail })];
                case 1:
                    user = _d.sent();
                    hashToCompare = (_c = user === null || user === void 0 ? void 0 : user.passwordHash) !== null && _c !== void 0 ? _c : DUMMY_HASH;
                    return [4 /*yield*/, bcryptjs_1.default.compare(password, hashToCompare)];
                case 2:
                    passwordOk = _d.sent();
                    if (!user || !passwordOk)
                        throw new errors_1.AppError('INVALID_CREDENTIALS', 401);
                    if (user.deletedAt)
                        throw new errors_1.AppError('ACCOUNT_DELETED', 403);
                    ttlMs = rememberMe
                        ? 30 * 24 * 60 * 60 * 1000
                        : 24 * 60 * 60 * 1000;
                    expiresAt = new Date(Date.now() + ttlMs);
                    rememberMeUntil = rememberMe ? expiresAt : null;
                    return [4 /*yield*/, (0, db_1.createSession)({
                            userId: user.id,
                            kind: 'CUSTOMER',
                            expiresAt: expiresAt,
                            rememberMeUntil: rememberMeUntil,
                        })];
                case 3:
                    session = _d.sent();
                    return [2 /*return*/, { user: sanitiseUser(user), sessionId: session.id }];
            }
        });
    });
}
function logout(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var sessionId = _b.sessionId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.invalidateSession)({ sessionId: sessionId })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// —— Me ——
function getMe(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user;
        var userId = _b.userId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getUserById)({ id: userId })];
                case 1:
                    user = _c.sent();
                    if (!user)
                        throw new errors_1.AppError('USER_NOT_FOUND', 404);
                    return [2 /*return*/, sanitiseUser(user)];
            }
        });
    });
}
function updateMe(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, updates, updated;
        var userId = _b.userId, data = _b.data;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getUserById)({ id: userId })];
                case 1:
                    user = _c.sent();
                    if (!user)
                        throw new errors_1.AppError('USER_NOT_FOUND', 404);
                    if (data.dobConsent === true &&
                        data.dob === undefined &&
                        user.dob === null) {
                        throw new errors_1.AppError('DOB_REQUIRED_FOR_CONSENT', 400);
                    }
                    updates = __assign({}, data);
                    if (data.newsletterOptIn === true && !user.newsletterOptedAt) {
                        updates.newsletterOptedAt = new Date();
                    }
                    return [4 /*yield*/, (0, db_1.updateUser)({ id: userId, data: updates })];
                case 2:
                    updated = _c.sent();
                    if (!updated)
                        throw new errors_1.AppError('USER_NOT_FOUND', 404);
                    return [2 /*return*/, sanitiseUser(updated)];
            }
        });
    });
}
function changePassword(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var user, ok, passwordHash, sessions, _i, sessions_1, s, expiresAt, session;
        var userId = _b.userId, currentPassword = _b.currentPassword, newPassword = _b.newPassword;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getUserById)({ id: userId })];
                case 1:
                    user = _c.sent();
                    if (!user)
                        throw new errors_1.AppError('USER_NOT_FOUND', 404);
                    return [4 /*yield*/, bcryptjs_1.default.compare(currentPassword, user.passwordHash)];
                case 2:
                    ok = _c.sent();
                    if (!ok)
                        throw new errors_1.AppError('INVALID_CREDENTIALS', 401);
                    return [4 /*yield*/, bcryptjs_1.default.hash(newPassword, BCRYPT_ROUNDS)];
                case 3:
                    passwordHash = _c.sent();
                    return [4 /*yield*/, (0, db_1.updateUser)({ id: userId, data: { passwordHash: passwordHash } })];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, (0, db_1.getActiveSessionsByUserId)({ userId: userId })];
                case 5:
                    sessions = _c.sent();
                    _i = 0, sessions_1 = sessions;
                    _c.label = 6;
                case 6:
                    if (!(_i < sessions_1.length)) return [3 /*break*/, 9];
                    s = sessions_1[_i];
                    return [4 /*yield*/, (0, db_1.invalidateSession)({ sessionId: s.id })];
                case 7:
                    _c.sent();
                    _c.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 6];
                case 9:
                    expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
                    return [4 /*yield*/, (0, db_1.createSession)({
                            userId: userId,
                            kind: 'CUSTOMER',
                            expiresAt: expiresAt,
                        })];
                case 10:
                    session = _c.sent();
                    return [2 /*return*/, { sessionId: session.id }];
            }
        });
    });
}
// —— Addresses ——
function listSavedAddressesForUser(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var userId = _b.userId;
        return __generator(this, function (_c) {
            return [2 /*return*/, (0, db_1.listSavedAddresses)({ userId: userId })];
        });
    });
}
function createSavedAddressForUser(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var userId = _b.userId, label = _b.label, addressJson = _b.addressJson, countryCode = _b.countryCode, isDefault = _b.isDefault;
        return __generator(this, function (_c) {
            return [2 /*return*/, (0, db_1.createSavedAddress)({
                    userId: userId,
                    label: label !== null && label !== void 0 ? label : null,
                    addressJson: addressJson,
                    countryCode: countryCode,
                    isDefault: isDefault,
                })];
        });
    });
}
function updateSavedAddressForUser(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var updated;
        var id = _b.id, userId = _b.userId, data = _b.data;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.updateSavedAddress)({ id: id, userId: userId, data: data })];
                case 1:
                    updated = _c.sent();
                    if (!updated)
                        throw new errors_1.AppError('ADDRESS_NOT_FOUND', 404);
                    return [2 /*return*/, updated];
            }
        });
    });
}
function deleteSavedAddressForUser(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var id = _b.id, userId = _b.userId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.deleteSavedAddress)({ id: id, userId: userId })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// —— Payment methods ——
function listSavedPaymentMethodsForUser(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var userId = _b.userId;
        return __generator(this, function (_c) {
            return [2 /*return*/, (0, db_1.listSavedPaymentMethods)({ userId: userId })];
        });
    });
}
function deleteSavedPaymentMethodForUser(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var id = _b.id, userId = _b.userId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.deleteSavedPaymentMethod)({ id: id, userId: userId })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// —— Admin auth ——
function adminLogin(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var normalisedEmail, user, hashToCompare, passwordOk, admin, expiresAt, session;
        var _c;
        var email = _b.email, password = _b.password;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    normalisedEmail = email.toLowerCase().trim();
                    return [4 /*yield*/, (0, db_1.getUserByEmail)({ email: normalisedEmail })];
                case 1:
                    user = _d.sent();
                    hashToCompare = (_c = user === null || user === void 0 ? void 0 : user.passwordHash) !== null && _c !== void 0 ? _c : DUMMY_HASH;
                    return [4 /*yield*/, bcryptjs_1.default.compare(password, hashToCompare)];
                case 2:
                    passwordOk = _d.sent();
                    if (!user || !passwordOk)
                        throw new errors_1.AppError('INVALID_CREDENTIALS', 401);
                    return [4 /*yield*/, (0, db_1.getAdminByUserId)({ userId: user.id })];
                case 3:
                    admin = _d.sent();
                    if (!admin)
                        throw new errors_1.AppError('NOT_AN_ADMIN', 403);
                    if (admin.status === 'SUSPENDED')
                        throw new errors_1.AppError('ACCOUNT_SUSPENDED', 403);
                    if (admin.status === 'INVITED')
                        throw new errors_1.AppError('INVITE_NOT_ACCEPTED', 403);
                    expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
                    return [4 /*yield*/, (0, db_1.createSession)({
                            userId: user.id,
                            kind: 'ADMIN',
                            expiresAt: expiresAt,
                        })];
                case 4:
                    session = _d.sent();
                    return [2 /*return*/, { user: sanitiseUser(user), admin: admin, sessionId: session.id }];
            }
        });
    });
}
function adminLogout(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var sessionId = _b.sessionId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.invalidateSession)({ sessionId: sessionId })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// —— Admin invites ——
function createAdminInviteForOwner(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var normalisedEmail, rawToken, tokenHash, expiresAt, invite;
        var email = _b.email, createdByAdminId = _b.createdByAdminId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    normalisedEmail = email.toLowerCase().trim();
                    rawToken = crypto.randomBytes(32).toString('hex');
                    tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
                    expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
                    return [4 /*yield*/, (0, db_1.createAdminInvite)({
                            email: normalisedEmail,
                            tokenHash: tokenHash,
                            expiresAt: expiresAt,
                            createdByAdminId: createdByAdminId,
                        })];
                case 1:
                    invite = _c.sent();
                    return [2 /*return*/, { invite: invite, rawToken: rawToken }];
            }
        });
    });
}
function acceptAdminInvite(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var tokenHash, invite, passwordHash, _c, user, admin;
        var rawToken = _b.rawToken, firstName = _b.firstName, lastName = _b.lastName, password = _b.password;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
                    return [4 /*yield*/, (0, db_1.getAdminInviteByTokenHash)({ tokenHash: tokenHash })];
                case 1:
                    invite = _d.sent();
                    if (!invite)
                        throw new errors_1.AppError('INVALID_OR_EXPIRED_INVITE', 400);
                    if (invite.expiresAt < new Date())
                        throw new errors_1.AppError('INVALID_OR_EXPIRED_INVITE', 400);
                    if (invite.usedAt)
                        throw new errors_1.AppError('INVITE_ALREADY_USED', 400);
                    return [4 /*yield*/, bcryptjs_1.default.hash(password, BCRYPT_ROUNDS)];
                case 2:
                    passwordHash = _d.sent();
                    return [4 /*yield*/, (0, db_1.acceptAdminInviteTransaction)({
                            inviteId: invite.id,
                            email: invite.email,
                            firstName: firstName,
                            lastName: lastName,
                            passwordHash: passwordHash,
                        })];
                case 3:
                    _c = _d.sent(), user = _c.user, admin = _c.admin;
                    return [2 /*return*/, { user: sanitiseUser(user), admin: admin }];
            }
        });
    });
}
// —— Admin management (OWNER only, enforced in routes) ——
function listAdminsForOwner() {
    return __awaiter(this, void 0, void 0, function () {
        var rows;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, db_1.listAdmins)()];
                case 1:
                    rows = _a.sent();
                    return [2 /*return*/, rows.map(function (r) { return (__assign(__assign({}, r), { user: sanitiseUser(r.user) })); })];
            }
        });
    });
}
function updateAdminRoleForOwner(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var admin, updated;
        var targetAdminId = _b.targetAdminId, role = _b.role, requestingAdminId = _b.requestingAdminId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getAdminById)({ id: targetAdminId })];
                case 1:
                    admin = _c.sent();
                    if (!admin)
                        throw new errors_1.AppError('ADMIN_NOT_FOUND', 404);
                    if (targetAdminId === requestingAdminId) {
                        throw new errors_1.AppError('CANNOT_MODIFY_OWN_ROLE', 400);
                    }
                    return [4 /*yield*/, (0, db_1.updateAdminRole)({ id: targetAdminId, role: role })];
                case 2:
                    updated = _c.sent();
                    if (!updated)
                        throw new errors_1.AppError('ADMIN_NOT_FOUND', 404);
                    return [2 /*return*/, updated];
            }
        });
    });
}
function suspendAdminForOwner(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var admin, sessions, _i, sessions_2, s;
        var targetAdminId = _b.targetAdminId, requestingAdminId = _b.requestingAdminId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getAdminById)({ id: targetAdminId })];
                case 1:
                    admin = _c.sent();
                    if (!admin)
                        throw new errors_1.AppError('ADMIN_NOT_FOUND', 404);
                    if (targetAdminId === requestingAdminId) {
                        throw new errors_1.AppError('CANNOT_SUSPEND_SELF', 400);
                    }
                    return [4 /*yield*/, (0, db_1.updateAdminStatus)({ id: targetAdminId, status: 'SUSPENDED' })];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, db_1.getActiveSessionsByUserId)({ userId: admin.userId })];
                case 3:
                    sessions = _c.sent();
                    _i = 0, sessions_2 = sessions;
                    _c.label = 4;
                case 4:
                    if (!(_i < sessions_2.length)) return [3 /*break*/, 7];
                    s = sessions_2[_i];
                    return [4 /*yield*/, (0, db_1.invalidateSession)({ sessionId: s.id })];
                case 5:
                    _c.sent();
                    _c.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7: return [2 /*return*/];
            }
        });
    });
}
