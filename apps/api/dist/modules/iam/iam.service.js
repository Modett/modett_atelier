"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkEmailExists = checkEmailExists;
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
const crypto = __importStar(require("node:crypto"));
const bcrypt = __importStar(require("bcryptjs"));
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
const loyalty_1 = require("../loyalty");
const messaging_1 = require("../messaging");
const BCRYPT_ROUNDS = 12;
const DUMMY_HASH = '$2a$12$dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.u';
function sanitiseUser(user) {
    const { passwordHash: _, ...rest } = user;
    return rest;
}
async function checkEmailExists({ email, }) {
    const normalisedEmail = email.toLowerCase().trim();
    const user = await (0, db_1.getUserByEmail)({ email: normalisedEmail });
    return user !== null && user !== undefined;
}
async function signup({ firstName, lastName, email, password, newsletterOptIn, }) {
    const normalisedEmail = email.toLowerCase().trim();
    const existing = await (0, db_1.getUserByEmail)({ email: normalisedEmail });
    if (existing)
        throw new errors_1.AppError('EMAIL_ALREADY_EXISTS', 409);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await (0, db_1.createUser)({
        firstName,
        lastName,
        email: normalisedEmail,
        passwordHash,
        newsletterOptIn,
    });
    (0, loyalty_1.createLoyaltyAccount)({ userId: user.id }).catch((err) => console.error('[iam] loyalty account creation failed:', err));
    (0, messaging_1.createNotificationPreferences)({ userId: user.id }).catch((err) => console.error('[iam] notification prefs creation failed:', err));
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const session = await (0, db_1.createSession)({
        userId: user.id,
        kind: 'CUSTOMER',
        expiresAt,
    });
    return { user: sanitiseUser(user), sessionId: session.id };
}
async function login({ email, password, rememberMe, }) {
    const normalisedEmail = email.toLowerCase().trim();
    const user = await (0, db_1.getUserByEmail)({ email: normalisedEmail });
    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const passwordOk = await bcrypt.compare(password, hashToCompare);
    if (!user || !passwordOk)
        throw new errors_1.AppError('INVALID_CREDENTIALS', 401);
    if (user.deletedAt)
        throw new errors_1.AppError('ACCOUNT_DELETED', 403);
    const ttlMs = rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    const rememberMeUntil = rememberMe ? expiresAt : null;
    const session = await (0, db_1.createSession)({
        userId: user.id,
        kind: 'CUSTOMER',
        expiresAt,
        rememberMeUntil,
    });
    return { user: sanitiseUser(user), sessionId: session.id };
}
async function logout({ sessionId }) {
    await (0, db_1.invalidateSession)({ sessionId });
}
async function getMe({ userId, }) {
    const user = await (0, db_1.getUserById)({ id: userId });
    if (!user)
        throw new errors_1.AppError('USER_NOT_FOUND', 404);
    return sanitiseUser(user);
}
async function updateMe({ userId, data, }) {
    const user = await (0, db_1.getUserById)({ id: userId });
    if (!user)
        throw new errors_1.AppError('USER_NOT_FOUND', 404);
    if (data.dobConsent === true &&
        data.dob === undefined &&
        user.dob === null) {
        throw new errors_1.AppError('DOB_REQUIRED_FOR_CONSENT', 400);
    }
    const updates = { ...data };
    if (data.newsletterOptIn === true && !user.newsletterOptedAt) {
        updates.newsletterOptedAt = new Date();
    }
    const updated = await (0, db_1.updateUser)({ id: userId, data: updates });
    if (!updated)
        throw new errors_1.AppError('USER_NOT_FOUND', 404);
    return sanitiseUser(updated);
}
async function changePassword({ userId, currentPassword, newPassword, }) {
    const user = await (0, db_1.getUserById)({ id: userId });
    if (!user)
        throw new errors_1.AppError('USER_NOT_FOUND', 404);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok)
        throw new errors_1.AppError('INVALID_CREDENTIALS', 401);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await (0, db_1.updateUser)({ id: userId, data: { passwordHash } });
    const sessions = await (0, db_1.getActiveSessionsByUserId)({ userId });
    for (const s of sessions) {
        await (0, db_1.invalidateSession)({ sessionId: s.id });
    }
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const session = await (0, db_1.createSession)({
        userId,
        kind: 'CUSTOMER',
        expiresAt,
    });
    return { sessionId: session.id };
}
async function listSavedAddressesForUser({ userId, }) {
    return (0, db_1.listSavedAddresses)({ userId });
}
async function createSavedAddressForUser({ userId, label, addressJson, countryCode, isDefault, }) {
    return (0, db_1.createSavedAddress)({
        userId,
        label: label ?? null,
        addressJson,
        countryCode,
        isDefault,
    });
}
async function updateSavedAddressForUser({ id, userId, data, }) {
    const updated = await (0, db_1.updateSavedAddress)({ id, userId, data });
    if (!updated)
        throw new errors_1.AppError('ADDRESS_NOT_FOUND', 404);
    return updated;
}
async function deleteSavedAddressForUser({ id, userId, }) {
    await (0, db_1.deleteSavedAddress)({ id, userId });
}
async function listSavedPaymentMethodsForUser({ userId, }) {
    return (0, db_1.listSavedPaymentMethods)({ userId });
}
async function deleteSavedPaymentMethodForUser({ id, userId, }) {
    await (0, db_1.deleteSavedPaymentMethod)({ id, userId });
}
async function adminLogin({ email, password, }) {
    const normalisedEmail = email.toLowerCase().trim();
    const user = await (0, db_1.getUserByEmail)({ email: normalisedEmail });
    const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
    const passwordOk = await bcrypt.compare(password, hashToCompare);
    if (!user || !passwordOk)
        throw new errors_1.AppError('INVALID_CREDENTIALS', 401);
    const admin = await (0, db_1.getAdminByUserId)({ userId: user.id });
    if (!admin)
        throw new errors_1.AppError('NOT_AN_ADMIN', 403);
    if (admin.status === 'SUSPENDED')
        throw new errors_1.AppError('ACCOUNT_SUSPENDED', 403);
    if (admin.status === 'INVITED')
        throw new errors_1.AppError('INVITE_NOT_ACCEPTED', 403);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const session = await (0, db_1.createSession)({
        userId: user.id,
        kind: 'ADMIN',
        expiresAt,
    });
    return { user: sanitiseUser(user), admin, sessionId: session.id };
}
async function adminLogout({ sessionId, }) {
    await (0, db_1.invalidateSession)({ sessionId });
}
async function createAdminInviteForOwner({ email, createdByAdminId, }) {
    const normalisedEmail = email.toLowerCase().trim();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const invite = await (0, db_1.createAdminInvite)({
        email: normalisedEmail,
        tokenHash,
        expiresAt,
        createdByAdminId,
    });
    return { invite, rawToken };
}
async function acceptAdminInvite({ rawToken, firstName, lastName, password, }) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invite = await (0, db_1.getAdminInviteByTokenHash)({ tokenHash });
    if (!invite)
        throw new errors_1.AppError('INVALID_OR_EXPIRED_INVITE', 400);
    if (invite.expiresAt < new Date())
        throw new errors_1.AppError('INVALID_OR_EXPIRED_INVITE', 400);
    if (invite.usedAt)
        throw new errors_1.AppError('INVITE_ALREADY_USED', 400);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const { user, admin } = await (0, db_1.acceptAdminInviteTransaction)({
        inviteId: invite.id,
        email: invite.email,
        firstName,
        lastName,
        passwordHash,
    });
    return { user: sanitiseUser(user), admin };
}
async function listAdminsForOwner() {
    const rows = await (0, db_1.listAdmins)();
    return rows.map((r) => ({ ...r, user: sanitiseUser(r.user) }));
}
async function updateAdminRoleForOwner({ targetAdminId, role, requestingAdminId, }) {
    const admin = await (0, db_1.getAdminById)({ id: targetAdminId });
    if (!admin)
        throw new errors_1.AppError('ADMIN_NOT_FOUND', 404);
    if (targetAdminId === requestingAdminId) {
        throw new errors_1.AppError('CANNOT_MODIFY_OWN_ROLE', 400);
    }
    const updated = await (0, db_1.updateAdminRole)({ id: targetAdminId, role });
    if (!updated)
        throw new errors_1.AppError('ADMIN_NOT_FOUND', 404);
    return updated;
}
async function suspendAdminForOwner({ targetAdminId, requestingAdminId, }) {
    const admin = await (0, db_1.getAdminById)({ id: targetAdminId });
    if (!admin)
        throw new errors_1.AppError('ADMIN_NOT_FOUND', 404);
    if (targetAdminId === requestingAdminId) {
        throw new errors_1.AppError('CANNOT_SUSPEND_SELF', 400);
    }
    await (0, db_1.updateAdminStatus)({ id: targetAdminId, status: 'SUSPENDED' });
    const sessions = await (0, db_1.getActiveSessionsByUserId)({ userId: admin.userId });
    for (const s of sessions) {
        await (0, db_1.invalidateSession)({ sessionId: s.id });
    }
}
