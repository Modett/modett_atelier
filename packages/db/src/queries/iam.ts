/**
 * IAM query functions — users, sessions, admins, admin_invites, saved_addresses, saved_payment_methods.
 * No business logic. RORO signatures. Return null when not found.
 */

import { eq, and, isNull, gt, desc } from 'drizzle-orm'
import { db } from '../client'
import { redis } from '../redis'
import {
  users,
  admins,
  adminInvites,
  sessions,
  savedAddresses,
  savedPaymentMethods,
  wishlists,
  newsletterSubscribers,
} from '../schema/iam.schema'
import type {
  User,
  NewUser,
  Admin,
  Session,
  NewSession,
  AdminInvite,
  SavedAddress,
  NewSavedAddress,
  SavedPaymentMethod,
  NewSavedPaymentMethod,
  NewsletterSubscriber,
} from '../schema/iam.schema'

const SESSION_KEY_PREFIX = 'session:'
const ADMIN_SESSION_TTL_SECONDS = 900 // 15 min

function sessionKey(sessionId: string): string {
  return `${SESSION_KEY_PREFIX}${sessionId}`
}

function getTtlSeconds(expiresAt: Date): number {
  const now = new Date()
  const delta = Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
  return Math.max(0, delta)
}

// —— User queries ——

export async function getUserByEmail({
  email,
}: {
  email: string
}): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.email, email), isNull(users.deletedAt)))
  return rows[0] ?? null
}

export async function getUserById({ id }: { id: string }): Promise<User | null> {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
  return rows[0] ?? null
}

export async function createUser({
  firstName,
  lastName,
  email,
  passwordHash,
  newsletterOptIn,
}: {
  firstName: string
  lastName: string
  email: string
  passwordHash: string
  newsletterOptIn?: boolean
}): Promise<User> {
  const [row] = await db
    .insert(users)
    .values({
      firstName,
      lastName,
      email,
      passwordHash,
      newsletterOptIn: newsletterOptIn ?? false,
      ...(newsletterOptIn && { newsletterOptedAt: new Date() }),
    })
    .returning()
  if (!row) throw new Error('createUser: no row returned')
  return row
}

export async function updateUser({
  id,
  data,
}: {
  id: string
  data: Partial<NewUser>
}): Promise<User | null> {
  const [row] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  return row ?? null
}

// —— Session queries ——

export async function createSession({
  userId,
  kind,
  expiresAt,
  rememberMeUntil,
}: {
  userId: string
  kind: 'CUSTOMER' | 'ADMIN'
  expiresAt: Date
  rememberMeUntil?: Date | null
}): Promise<Session> {
  const [row] = await db
    .insert(sessions)
    .values({
      userId,
      kind,
      expiresAt,
      ...(rememberMeUntil !== undefined && { rememberMeUntil }),
    })
    .returning()
  if (!row) throw new Error('createSession: no row returned')
  const key = sessionKey(row.id)
  const ttl =
    kind === 'ADMIN' ? ADMIN_SESSION_TTL_SECONDS : getTtlSeconds(expiresAt)
  await redis.set(key, row.userId, 'EX', ttl)
  return row
}

export async function getSession({
  sessionId,
}: {
  sessionId: string
}): Promise<Session | null> {
  const key = sessionKey(sessionId)
  const cached = await redis.get(key)
  if (cached !== null) {
    const rows = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          isNull(sessions.invalidatedAt),
          gt(sessions.expiresAt, new Date()),
        ),
      )
    const session = rows[0] ?? null
    if (session) return session
    await redis.del(key)
    return null
  }
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        isNull(sessions.invalidatedAt),
        gt(sessions.expiresAt, new Date()),
      ),
    )
  const session = rows[0] ?? null
  if (!session) return null
  const ttl =
    session.kind === 'ADMIN'
      ? ADMIN_SESSION_TTL_SECONDS
      : getTtlSeconds(session.expiresAt)
  await redis.set(key, session.userId, 'EX', ttl)
  return session
}

export async function refreshSession({
  sessionId,
}: {
  sessionId: string
}): Promise<void> {
  const key = sessionKey(sessionId)
  const rows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
  const session = rows[0]
  if (session?.kind === 'ADMIN') {
    await redis.expire(key, ADMIN_SESSION_TTL_SECONDS)
  }
  await db
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, sessionId))
}

export async function invalidateSession({
  sessionId,
}: {
  sessionId: string
}): Promise<void> {
  const key = sessionKey(sessionId)
  await redis.del(key)
  await db
    .update(sessions)
    .set({ invalidatedAt: new Date() })
    .where(eq(sessions.id, sessionId))
}

export async function getActiveSessionsByUserId({
  userId,
}: {
  userId: string
}): Promise<Session[]> {
  const rows = await db
    .select()
    .from(sessions)
    .where(
      and(eq(sessions.userId, userId), isNull(sessions.invalidatedAt)),
    )
  return rows
}

// —— Admin queries ——

export async function getAdminByUserId({
  userId,
}: {
  userId: string
}): Promise<Admin | null> {
  const rows = await db
    .select()
    .from(admins)
    .where(eq(admins.userId, userId))
  return rows[0] ?? null
}

export async function getAdminById({ id }: { id: string }): Promise<Admin | null> {
  const rows = await db.select().from(admins).where(eq(admins.id, id))
  return rows[0] ?? null
}

export async function createAdmin({
  userId,
  role,
}: {
  userId: string
  role: 'OWNER' | 'ADMIN'
}): Promise<Admin> {
  const [row] = await db.insert(admins).values({ userId, role }).returning()
  if (!row) throw new Error('createAdmin: no row returned')
  return row
}

export async function updateAdminStatus({
  id,
  status,
}: {
  id: string
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
}): Promise<Admin | null> {
  const [row] = await db
    .update(admins)
    .set({ status, updatedAt: new Date() })
    .where(eq(admins.id, id))
    .returning()
  return row ?? null
}

export async function updateAdminRole({
  id,
  role,
}: {
  id: string
  role: 'OWNER' | 'ADMIN'
}): Promise<Admin | null> {
  const [row] = await db
    .update(admins)
    .set({ role, updatedAt: new Date() })
    .where(eq(admins.id, id))
    .returning()
  return row ?? null
}

export async function listAdmins(): Promise<Array<Admin & { user: User }>> {
  const rows = await db
    .select()
    .from(admins)
    .innerJoin(users, eq(users.id, admins.userId))
  return rows.map((r) => ({ ...r.admins, user: r.users }))
}

// —— Admin invite queries ——

export async function createAdminInvite({
  email,
  tokenHash,
  expiresAt,
  createdByAdminId,
}: {
  email: string
  tokenHash: string
  expiresAt: Date
  createdByAdminId: string
}): Promise<AdminInvite> {
  const [row] = await db
    .insert(adminInvites)
    .values({
      email,
      tokenHash,
      expiresAt,
      createdByAdminId,
    })
    .returning()
  if (!row) throw new Error('createAdminInvite: no row returned')
  return row
}

export async function getAdminInviteByTokenHash({
  tokenHash,
}: {
  tokenHash: string
}): Promise<AdminInvite | null> {
  const rows = await db
    .select()
    .from(adminInvites)
    .where(
      and(
        eq(adminInvites.tokenHash, tokenHash),
        isNull(adminInvites.usedAt),
        gt(adminInvites.expiresAt, new Date()),
      ),
    )
  return rows[0] ?? null
}

export async function markAdminInviteUsed({ id }: { id: string }): Promise<void> {
  await db
    .update(adminInvites)
    .set({ usedAt: new Date() })
    .where(eq(adminInvites.id, id))
}

export async function acceptAdminInviteTransaction({
  inviteId,
  email,
  firstName,
  lastName,
  passwordHash,
}: {
  inviteId: string
  email: string
  firstName: string
  lastName: string
  passwordHash: string
}): Promise<{ user: User; admin: Admin }> {
  return await db.transaction(async (tx) => {
    let user = await tx
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .then((rows) => rows[0] ?? null)
    if (!user) {
      const [inserted] = await tx
        .insert(users)
        .values({ firstName, lastName, email, passwordHash })
        .returning()
      if (!inserted) throw new Error('acceptAdminInvite: user insert failed')
      user = inserted
    }
    let admin = await tx
      .select()
      .from(admins)
      .where(eq(admins.userId, user.id))
      .then((rows) => rows[0] ?? null)
    if (!admin) {
      const [inserted] = await tx
        .insert(admins)
        .values({ userId: user.id, role: 'ADMIN' })
        .returning()
      if (!inserted) throw new Error('acceptAdminInvite: admin insert failed')
      admin = inserted
    }
    const updatedAt = new Date()
    await tx
      .update(admins)
      .set({ status: 'ACTIVE', updatedAt })
      .where(eq(admins.id, admin.id))
    admin = { ...admin, status: 'ACTIVE' as const, updatedAt }
    await tx
      .update(adminInvites)
      .set({ usedAt: new Date() })
      .where(eq(adminInvites.id, inviteId))
    return { user, admin }
  })
}

// —— Address queries ——

export async function listSavedAddresses({
  userId,
}: {
  userId: string
}): Promise<SavedAddress[]> {
  const rows = await db
    .select()
    .from(savedAddresses)
    .where(eq(savedAddresses.userId, userId))
    .orderBy(desc(savedAddresses.isDefault), desc(savedAddresses.createdAt))
  return rows
}

export async function createSavedAddress({
  userId,
  label,
  addressJson,
  countryCode,
  isDefault,
}: {
  userId: string
  label?: string | null
  addressJson: unknown
  countryCode: string
  isDefault?: boolean
}): Promise<SavedAddress> {
  return await db.transaction(async (tx) => {
    if (isDefault) {
      await tx
        .update(savedAddresses)
        .set({ isDefault: false })
        .where(eq(savedAddresses.userId, userId))
    }
    const [row] = await tx
      .insert(savedAddresses)
      .values({
        userId,
        label: label ?? null,
        addressJson: addressJson as NewSavedAddress['addressJson'],
        countryCode,
        isDefault: isDefault ?? false,
      })
      .returning()
    if (!row) throw new Error('createSavedAddress: no row returned')
    return row
  })
}

export async function updateSavedAddress({
  id,
  userId,
  data,
}: {
  id: string
  userId: string
  data: Partial<NewSavedAddress>
}): Promise<SavedAddress | null> {
  const [row] = await db
    .update(savedAddresses)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(savedAddresses.id, id), eq(savedAddresses.userId, userId)))
    .returning()
  return row ?? null
}

export async function deleteSavedAddress({
  id,
  userId,
}: {
  id: string
  userId: string
}): Promise<void> {
  await db
    .delete(savedAddresses)
    .where(and(eq(savedAddresses.id, id), eq(savedAddresses.userId, userId)))
}

// —— Saved payment method queries ——

export async function listSavedPaymentMethods({
  userId,
}: {
  userId: string
}): Promise<SavedPaymentMethod[]> {
  const rows = await db
    .select()
    .from(savedPaymentMethods)
    .where(eq(savedPaymentMethods.userId, userId))
    .orderBy(desc(savedPaymentMethods.isDefault), desc(savedPaymentMethods.createdAt))
  return rows
}

export async function createSavedPaymentMethod({
  userId,
  provider,
  token,
  brand,
  lastFour,
  expiryMonth,
  expiryYear,
  isDefault,
}: {
  userId: string
  provider: string
  token: string
  brand?: string | null
  lastFour?: string | null
  expiryMonth?: number | null
  expiryYear?: number | null
  isDefault?: boolean
}): Promise<SavedPaymentMethod> {
  return await db.transaction(async (tx) => {
    if (isDefault) {
      await tx
        .update(savedPaymentMethods)
        .set({ isDefault: false })
        .where(eq(savedPaymentMethods.userId, userId))
    }
    const [row] = await tx
      .insert(savedPaymentMethods)
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
      .returning()
    if (!row) throw new Error('createSavedPaymentMethod: no row returned')
    return row
  })
}

export async function deleteSavedPaymentMethod({
  id,
  userId,
}: {
  id: string
  userId: string
}): Promise<void> {
  await db
    .delete(savedPaymentMethods)
    .where(
      and(
        eq(savedPaymentMethods.id, id),
        eq(savedPaymentMethods.userId, userId),
      ),
    )
}

// —— Wishlist ——

export async function getWishlistByUserId({
  userId,
}: {
  userId: string
}) {
  return db
    .select()
    .from(wishlists)
    .where(eq(wishlists.userId, userId))
    .orderBy(desc(wishlists.createdAt))
}

export async function addToWishlist({
  userId,
  productId,
  variantId,
}: {
  userId: string
  productId: string
  variantId?: string | null
}) {
  const existing = await db
    .select()
    .from(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
    .limit(1)
  if (existing[0]) return existing[0]
  const [row] = await db
    .insert(wishlists)
    .values({ userId, productId, variantId: variantId ?? null })
    .returning()
  if (!row) throw new Error('addToWishlist: no row returned')
  return row
}

export async function removeFromWishlist({
  userId,
  productId,
}: {
  userId: string
  productId: string
}): Promise<void> {
  await db
    .delete(wishlists)
    .where(and(eq(wishlists.userId, userId), eq(wishlists.productId, productId)))
}

// —— Newsletter (guest + logged-in) ——

export async function getNewsletterSubscriberByEmail({
  email,
}: {
  email: string
}): Promise<NewsletterSubscriber | null> {
  const normalized = email.toLowerCase().trim()
  const rows = await db
    .select()
    .from(newsletterSubscribers)
    .where(eq(newsletterSubscribers.email, normalized))
    .limit(1)
  return rows[0] ?? null
}

export async function createNewsletterSubscriber({
  email,
  promoCodeId,
  ipAddress,
  source = 'POPUP',
}: {
  email: string
  promoCodeId?: string
  ipAddress?: string
  source?: string
}): Promise<NewsletterSubscriber> {
  const [row] = await db
    .insert(newsletterSubscribers)
    .values({
      email: email.toLowerCase().trim(),
      promoCodeId: promoCodeId ?? null,
      ipAddress: ipAddress ?? null,
      source,
    })
    .returning()
  if (!row) throw new Error('createNewsletterSubscriber: no row returned')
  return row
}
