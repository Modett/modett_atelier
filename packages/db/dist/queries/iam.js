"use strict";
/**
 * IAM query functions — users, sessions, admins, admin_invites, saved_addresses, saved_payment_methods.
 * No business logic. RORO signatures. Return null when not found.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByEmail = getUserByEmail;
exports.getUserById = getUserById;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.createSession = createSession;
exports.getSession = getSession;
exports.refreshSession = refreshSession;
exports.invalidateSession = invalidateSession;
exports.getActiveSessionsByUserId = getActiveSessionsByUserId;
exports.getAdminByUserId = getAdminByUserId;
exports.getAdminById = getAdminById;
exports.createAdmin = createAdmin;
exports.updateAdminStatus = updateAdminStatus;
exports.updateAdminRole = updateAdminRole;
exports.listAdmins = listAdmins;
exports.createAdminInvite = createAdminInvite;
exports.getAdminInviteByTokenHash = getAdminInviteByTokenHash;
exports.markAdminInviteUsed = markAdminInviteUsed;
exports.acceptAdminInviteTransaction = acceptAdminInviteTransaction;
exports.listSavedAddresses = listSavedAddresses;
exports.createSavedAddress = createSavedAddress;
exports.updateSavedAddress = updateSavedAddress;
exports.deleteSavedAddress = deleteSavedAddress;
exports.listSavedPaymentMethods = listSavedPaymentMethods;
exports.createSavedPaymentMethod = createSavedPaymentMethod;
exports.deleteSavedPaymentMethod = deleteSavedPaymentMethod;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const redis_1 = require("../redis");
const iam_schema_1 = require("../schema/iam.schema");
const SESSION_KEY_PREFIX = 'session:';
const ADMIN_SESSION_TTL_SECONDS = 900; // 15 min
function sessionKey(sessionId) {
    return `${SESSION_KEY_PREFIX}${sessionId}`;
}
function getTtlSeconds(expiresAt) {
    const now = new Date();
    const delta = Math.floor((expiresAt.getTime() - now.getTime()) / 1000);
    return Math.max(0, delta);
}
// —— User queries ——
async function getUserByEmail({ email, }) {
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.users.email, email), (0, drizzle_orm_1.isNull)(iam_schema_1.users.deletedAt)));
    return rows[0] ?? null;
}
async function getUserById({ id }) {
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.users)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.users.id, id), (0, drizzle_orm_1.isNull)(iam_schema_1.users.deletedAt)));
    return rows[0] ?? null;
}
async function createUser({ firstName, lastName, email, passwordHash, newsletterOptIn, }) {
    const [row] = await client_1.db
        .insert(iam_schema_1.users)
        .values({
        firstName,
        lastName,
        email,
        passwordHash,
        newsletterOptIn: newsletterOptIn ?? false,
        ...(newsletterOptIn && { newsletterOptedAt: new Date() }),
    })
        .returning();
    if (!row)
        throw new Error('createUser: no row returned');
    return row;
}
async function updateUser({ id, data, }) {
    const [row] = await client_1.db
        .update(iam_schema_1.users)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(iam_schema_1.users.id, id))
        .returning();
    return row ?? null;
}
// —— Session queries ——
async function createSession({ userId, kind, expiresAt, rememberMeUntil, }) {
    const [row] = await client_1.db
        .insert(iam_schema_1.sessions)
        .values({
        userId,
        kind,
        expiresAt,
        ...(rememberMeUntil !== undefined && { rememberMeUntil }),
    })
        .returning();
    if (!row)
        throw new Error('createSession: no row returned');
    const key = sessionKey(row.id);
    const ttl = kind === 'ADMIN' ? ADMIN_SESSION_TTL_SECONDS : getTtlSeconds(expiresAt);
    await redis_1.redis.set(key, row.userId, 'EX', ttl);
    return row;
}
async function getSession({ sessionId, }) {
    const key = sessionKey(sessionId);
    const cached = await redis_1.redis.get(key);
    if (cached !== null) {
        const rows = await client_1.db
            .select()
            .from(iam_schema_1.sessions)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.sessions.id, sessionId), (0, drizzle_orm_1.isNull)(iam_schema_1.sessions.invalidatedAt), (0, drizzle_orm_1.gt)(iam_schema_1.sessions.expiresAt, new Date())));
        const session = rows[0] ?? null;
        if (session)
            return session;
        await redis_1.redis.del(key);
        return null;
    }
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.sessions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.sessions.id, sessionId), (0, drizzle_orm_1.isNull)(iam_schema_1.sessions.invalidatedAt), (0, drizzle_orm_1.gt)(iam_schema_1.sessions.expiresAt, new Date())));
    const session = rows[0] ?? null;
    if (!session)
        return null;
    const ttl = session.kind === 'ADMIN'
        ? ADMIN_SESSION_TTL_SECONDS
        : getTtlSeconds(session.expiresAt);
    await redis_1.redis.set(key, session.userId, 'EX', ttl);
    return session;
}
async function refreshSession({ sessionId, }) {
    const key = sessionKey(sessionId);
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.sessions)
        .where((0, drizzle_orm_1.eq)(iam_schema_1.sessions.id, sessionId));
    const session = rows[0];
    if (session?.kind === 'ADMIN') {
        await redis_1.redis.expire(key, ADMIN_SESSION_TTL_SECONDS);
    }
    await client_1.db
        .update(iam_schema_1.sessions)
        .set({ lastSeenAt: new Date() })
        .where((0, drizzle_orm_1.eq)(iam_schema_1.sessions.id, sessionId));
}
async function invalidateSession({ sessionId, }) {
    const key = sessionKey(sessionId);
    await redis_1.redis.del(key);
    await client_1.db
        .update(iam_schema_1.sessions)
        .set({ invalidatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(iam_schema_1.sessions.id, sessionId));
}
async function getActiveSessionsByUserId({ userId, }) {
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.sessions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.sessions.userId, userId), (0, drizzle_orm_1.isNull)(iam_schema_1.sessions.invalidatedAt)));
    return rows;
}
// —— Admin queries ——
async function getAdminByUserId({ userId, }) {
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.admins)
        .where((0, drizzle_orm_1.eq)(iam_schema_1.admins.userId, userId));
    return rows[0] ?? null;
}
async function getAdminById({ id }) {
    const rows = await client_1.db.select().from(iam_schema_1.admins).where((0, drizzle_orm_1.eq)(iam_schema_1.admins.id, id));
    return rows[0] ?? null;
}
async function createAdmin({ userId, role, }) {
    const [row] = await client_1.db.insert(iam_schema_1.admins).values({ userId, role }).returning();
    if (!row)
        throw new Error('createAdmin: no row returned');
    return row;
}
async function updateAdminStatus({ id, status, }) {
    const [row] = await client_1.db
        .update(iam_schema_1.admins)
        .set({ status, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(iam_schema_1.admins.id, id))
        .returning();
    return row ?? null;
}
async function updateAdminRole({ id, role, }) {
    const [row] = await client_1.db
        .update(iam_schema_1.admins)
        .set({ role, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(iam_schema_1.admins.id, id))
        .returning();
    return row ?? null;
}
async function listAdmins() {
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.admins)
        .innerJoin(iam_schema_1.users, (0, drizzle_orm_1.eq)(iam_schema_1.users.id, iam_schema_1.admins.userId));
    return rows.map((r) => ({ ...r.admins, user: r.users }));
}
// —— Admin invite queries ——
async function createAdminInvite({ email, tokenHash, expiresAt, createdByAdminId, }) {
    const [row] = await client_1.db
        .insert(iam_schema_1.adminInvites)
        .values({
        email,
        tokenHash,
        expiresAt,
        createdByAdminId,
    })
        .returning();
    if (!row)
        throw new Error('createAdminInvite: no row returned');
    return row;
}
async function getAdminInviteByTokenHash({ tokenHash, }) {
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.adminInvites)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.adminInvites.tokenHash, tokenHash), (0, drizzle_orm_1.isNull)(iam_schema_1.adminInvites.usedAt), (0, drizzle_orm_1.gt)(iam_schema_1.adminInvites.expiresAt, new Date())));
    return rows[0] ?? null;
}
async function markAdminInviteUsed({ id }) {
    await client_1.db
        .update(iam_schema_1.adminInvites)
        .set({ usedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(iam_schema_1.adminInvites.id, id));
}
async function acceptAdminInviteTransaction({ inviteId, email, firstName, lastName, passwordHash, }) {
    return await client_1.db.transaction(async (tx) => {
        let user = await tx
            .select()
            .from(iam_schema_1.users)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.users.email, email), (0, drizzle_orm_1.isNull)(iam_schema_1.users.deletedAt)))
            .then((rows) => rows[0] ?? null);
        if (!user) {
            const [inserted] = await tx
                .insert(iam_schema_1.users)
                .values({ firstName, lastName, email, passwordHash })
                .returning();
            if (!inserted)
                throw new Error('acceptAdminInvite: user insert failed');
            user = inserted;
        }
        let admin = await tx
            .select()
            .from(iam_schema_1.admins)
            .where((0, drizzle_orm_1.eq)(iam_schema_1.admins.userId, user.id))
            .then((rows) => rows[0] ?? null);
        if (!admin) {
            const [inserted] = await tx
                .insert(iam_schema_1.admins)
                .values({ userId: user.id, role: 'ADMIN' })
                .returning();
            if (!inserted)
                throw new Error('acceptAdminInvite: admin insert failed');
            admin = inserted;
        }
        const updatedAt = new Date();
        await tx
            .update(iam_schema_1.admins)
            .set({ status: 'ACTIVE', updatedAt })
            .where((0, drizzle_orm_1.eq)(iam_schema_1.admins.id, admin.id));
        admin = { ...admin, status: 'ACTIVE', updatedAt };
        await tx
            .update(iam_schema_1.adminInvites)
            .set({ usedAt: new Date() })
            .where((0, drizzle_orm_1.eq)(iam_schema_1.adminInvites.id, inviteId));
        return { user, admin };
    });
}
// —— Address queries ——
async function listSavedAddresses({ userId, }) {
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.savedAddresses)
        .where((0, drizzle_orm_1.eq)(iam_schema_1.savedAddresses.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(iam_schema_1.savedAddresses.isDefault), (0, drizzle_orm_1.desc)(iam_schema_1.savedAddresses.createdAt));
    return rows;
}
async function createSavedAddress({ userId, label, addressJson, countryCode, isDefault, }) {
    return await client_1.db.transaction(async (tx) => {
        if (isDefault) {
            await tx
                .update(iam_schema_1.savedAddresses)
                .set({ isDefault: false })
                .where((0, drizzle_orm_1.eq)(iam_schema_1.savedAddresses.userId, userId));
        }
        const [row] = await tx
            .insert(iam_schema_1.savedAddresses)
            .values({
            userId,
            label: label ?? null,
            addressJson: addressJson,
            countryCode,
            isDefault: isDefault ?? false,
        })
            .returning();
        if (!row)
            throw new Error('createSavedAddress: no row returned');
        return row;
    });
}
async function updateSavedAddress({ id, userId, data, }) {
    const [row] = await client_1.db
        .update(iam_schema_1.savedAddresses)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.savedAddresses.id, id), (0, drizzle_orm_1.eq)(iam_schema_1.savedAddresses.userId, userId)))
        .returning();
    return row ?? null;
}
async function deleteSavedAddress({ id, userId, }) {
    await client_1.db
        .delete(iam_schema_1.savedAddresses)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.savedAddresses.id, id), (0, drizzle_orm_1.eq)(iam_schema_1.savedAddresses.userId, userId)));
}
// —— Saved payment method queries ——
async function listSavedPaymentMethods({ userId, }) {
    const rows = await client_1.db
        .select()
        .from(iam_schema_1.savedPaymentMethods)
        .where((0, drizzle_orm_1.eq)(iam_schema_1.savedPaymentMethods.userId, userId))
        .orderBy((0, drizzle_orm_1.desc)(iam_schema_1.savedPaymentMethods.isDefault), (0, drizzle_orm_1.desc)(iam_schema_1.savedPaymentMethods.createdAt));
    return rows;
}
async function createSavedPaymentMethod({ userId, provider, token, brand, lastFour, expiryMonth, expiryYear, isDefault, }) {
    return await client_1.db.transaction(async (tx) => {
        if (isDefault) {
            await tx
                .update(iam_schema_1.savedPaymentMethods)
                .set({ isDefault: false })
                .where((0, drizzle_orm_1.eq)(iam_schema_1.savedPaymentMethods.userId, userId));
        }
        const [row] = await tx
            .insert(iam_schema_1.savedPaymentMethods)
            .values({
            userId,
            provider,
            token,
            brand: brand ?? null,
            lastFour: lastFour ?? null,
            expiryMonth: expiryMonth ?? null,
            expiryYear: expiryYear ?? null,
            isDefault: isDefault ?? false,
        })
            .returning();
        if (!row)
            throw new Error('createSavedPaymentMethod: no row returned');
        return row;
    });
}
async function deleteSavedPaymentMethod({ id, userId, }) {
    await client_1.db
        .delete(iam_schema_1.savedPaymentMethods)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(iam_schema_1.savedPaymentMethods.id, id), (0, drizzle_orm_1.eq)(iam_schema_1.savedPaymentMethods.userId, userId)));
}
