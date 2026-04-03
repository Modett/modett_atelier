/**
 * IAM service layer — business logic, validation, errors.
 * RORO. Uses query functions from @modett/db. Throws AppError for expected failures.
 */

import * as crypto from 'node:crypto'
import * as bcrypt from 'bcryptjs'
import type { CurrencyCode } from '@modett/types'
import { AppError } from '../../lib/errors'
import { sendPasswordResetEmail } from '../../lib/sendPasswordResetEmail'
import {
  redis,
  getUserByEmail,
  getUserById,
  createUser,
  updateUser,
  createSession,
  getSession,
  refreshSession,
  invalidateSession,
  getActiveSessionsByUserId,
  getAdminByUserId,
  getAdminById,
  updateAdminStatus,
  updateAdminRole,
  listAdmins,
  createAdminInvite,
  getAdminInviteByTokenHash,
  acceptAdminInviteTransaction,
  listPendingAdminInvites,
  getAdminInviteById,
  updateAdminInviteToken,
  deleteAdminInvite,
  listSavedAddresses,
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  listSavedPaymentMethods,
  createSavedPaymentMethod,
  deleteSavedPaymentMethod,
  getWishlistByUserId,
  addToWishlist,
  removeFromWishlist,
  listActiveProductListRowsByIds,
} from '@modett/db'
import type {
  User,
  Admin,
  AdminInvite,
  SavedAddress,
  SavedPaymentMethod,
  ProductListItemRowWithCategory,
} from '@modett/db'
import { createLoyaltyAccount } from '../loyalty'
import { createNotificationPreferences } from '../messaging'
import { sendEmail } from '../../infrastructure/email/email.service'

const BCRYPT_ROUNDS = 12
const PASSWORD_RESET_REDIS_PREFIX = 'pwdreset:'
const PASSWORD_RESET_TTL_SECONDS = 60 * 60
const DUMMY_HASH =
  '$2a$12$dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.u'

type SanitisedUser = Omit<User, 'passwordHash'>

function sanitiseUser(user: User): SanitisedUser {
  const { passwordHash: _, ...rest } = user
  return rest
}

// —— Check email (checkout flow) ——

export async function checkEmailExists({
  email,
}: {
  email: string
}): Promise<boolean> {
  const normalisedEmail = email.toLowerCase().trim()
  const user = await getUserByEmail({ email: normalisedEmail })
  return user !== null && user !== undefined
}

// —— Signup / Login / Logout ——

export async function signup({
  firstName,
  lastName,
  email,
  password,
  newsletterOptIn,
}: {
  firstName: string
  lastName: string
  email: string
  password: string
  newsletterOptIn?: boolean
}): Promise<{ user: SanitisedUser; sessionId: string }> {
  const normalisedEmail = email.toLowerCase().trim()
  const existing = await getUserByEmail({ email: normalisedEmail })
  if (existing) throw new AppError('EMAIL_ALREADY_EXISTS', 409)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const user = await createUser({
    firstName,
    lastName,
    email: normalisedEmail,
    passwordHash,
    newsletterOptIn,
  })
  createLoyaltyAccount({ userId: user.id }).catch((err) =>
    console.error('[iam] loyalty account creation failed:', err),
  )
  createNotificationPreferences({ userId: user.id }).catch((err) =>
    console.error('[iam] notification prefs creation failed:', err),
  )
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const session = await createSession({
    userId: user.id,
    kind: 'CUSTOMER',
    expiresAt,
  })
  return { user: sanitiseUser(user), sessionId: session.id }
}

export async function login({
  email,
  password,
  rememberMe,
}: {
  email: string
  password: string
  rememberMe?: boolean
}): Promise<{ user: SanitisedUser; sessionId: string }> {
  const normalisedEmail = email.toLowerCase().trim()
  const user = await getUserByEmail({ email: normalisedEmail })
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH
  const passwordOk = await bcrypt.compare(password, hashToCompare)
  if (!user || !passwordOk) throw new AppError('INVALID_CREDENTIALS', 401)
  if (user.deletedAt) throw new AppError('ACCOUNT_DELETED', 403)
  const ttlMs = rememberMe
    ? 30 * 24 * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000
  const expiresAt = new Date(Date.now() + ttlMs)
  const rememberMeUntil = rememberMe ? expiresAt : null
  const session = await createSession({
    userId: user.id,
    kind: 'CUSTOMER',
    expiresAt,
    rememberMeUntil,
  })
  return { user: sanitiseUser(user), sessionId: session.id }
}

export async function logout({ sessionId }: { sessionId: string }): Promise<void> {
  await invalidateSession({ sessionId })
}

export async function requestPasswordReset({ email }: { email: string }): Promise<void> {
  const normalisedEmail = email.toLowerCase().trim()
  const user = await getUserByEmail({ email: normalisedEmail })
  if (!user || user.deletedAt) return

  const rawToken = crypto.randomBytes(32).toString('hex')
  const key = `${PASSWORD_RESET_REDIS_PREFIX}${rawToken}`
  await redis.set(key, user.id, 'EX', PASSWORD_RESET_TTL_SECONDS)

  const base = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  const resetUrl = `${base.replace(/\/$/, '')}/auth/reset-password?token=${encodeURIComponent(rawToken)}`

  const { sent, reason } = await sendPasswordResetEmail({
    to: user.email,
    resetUrl,
  })
  if (!sent) {
    console.warn('[iam] password reset email not sent:', reason)
  }
}

export async function completePasswordReset({
  token,
  password,
}: {
  token: string
  password: string
}): Promise<void> {
  const trimmed = token.trim()
  if (!trimmed) throw new AppError('INVALID_OR_EXPIRED_RESET_TOKEN', 400)

  const key = `${PASSWORD_RESET_REDIS_PREFIX}${trimmed}`
  const userId = await redis.get(key)
  if (!userId) throw new AppError('INVALID_OR_EXPIRED_RESET_TOKEN', 400)

  const user = await getUserById({ id: userId })
  if (!user || user.deletedAt) {
    await redis.del(key)
    throw new AppError('USER_NOT_FOUND', 404)
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const updated = await updateUser({ id: user.id, data: { passwordHash } })
  if (!updated) throw new AppError('USER_NOT_FOUND', 404)

  await redis.del(key)

  const sessions = await getActiveSessionsByUserId({ userId: user.id })
  for (const s of sessions) {
    if (s.kind === 'CUSTOMER') await invalidateSession({ sessionId: s.id })
  }
}

// —— Me ——

export async function getMe({
  userId,
}: {
  userId: string
}): Promise<SanitisedUser> {
  const user = await getUserById({ id: userId })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)
  return sanitiseUser(user)
}

export async function updateMe({
  userId,
  data,
}: {
  userId: string
  data: {
    firstName?: string
    lastName?: string
    dob?: string
    dobConsent?: boolean
    newsletterOptIn?: boolean
  }
}): Promise<SanitisedUser> {
  const user = await getUserById({ id: userId })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)
  if (
    data.dobConsent === true &&
    data.dob === undefined &&
    user.dob === null
  ) {
    throw new AppError('DOB_REQUIRED_FOR_CONSENT', 400)
  }
  const updates: Parameters<typeof updateUser>[0]['data'] = { ...data }
  if (data.newsletterOptIn === true && !user.newsletterOptedAt) {
    updates.newsletterOptedAt = new Date()
  }
  const updated = await updateUser({ id: userId, data: updates })
  if (!updated) throw new AppError('USER_NOT_FOUND', 404)
  return sanitiseUser(updated)
}

export async function changePassword({
  userId,
  currentPassword,
  newPassword,
}: {
  userId: string
  currentPassword: string
  newPassword: string
}): Promise<{ sessionId: string }> {
  const user = await getUserById({ id: userId })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) throw new AppError('INVALID_CREDENTIALS', 401)
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await updateUser({ id: userId, data: { passwordHash } })
  const sessions = await getActiveSessionsByUserId({ userId })
  for (const s of sessions) {
    await invalidateSession({ sessionId: s.id })
  }
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
  const session = await createSession({
    userId,
    kind: 'CUSTOMER',
    expiresAt,
  })
  return { sessionId: session.id }
}

// —— Addresses ——

export async function listSavedAddressesForUser({
  userId,
}: {
  userId: string
}): Promise<SavedAddress[]> {
  return listSavedAddresses({ userId })
}

export async function createSavedAddressForUser({
  userId,
  label,
  addressJson,
  countryCode,
  isDefault,
}: {
  userId: string
  label?: string
  addressJson: unknown
  countryCode: string
  isDefault?: boolean
}): Promise<SavedAddress> {
  return createSavedAddress({
    userId,
    label: label ?? null,
    addressJson,
    countryCode,
    isDefault,
  })
}

export async function updateSavedAddressForUser({
  id,
  userId,
  data,
}: {
  id: string
  userId: string
  data: Partial<{ label: string; addressJson: unknown; countryCode: string; isDefault: boolean }>
}): Promise<SavedAddress> {
  const updated = await updateSavedAddress({ id, userId, data })
  if (!updated) throw new AppError('ADDRESS_NOT_FOUND', 404)
  return updated
}

export async function deleteSavedAddressForUser({
  id,
  userId,
}: {
  id: string
  userId: string
}): Promise<void> {
  await deleteSavedAddress({ id, userId })
}

// —— Wishlist ——

function resolveWishlistPrice({
  row,
  currency,
}: {
  row: ProductListItemRowWithCategory
  currency: CurrencyCode
}): { amount: string; currency: CurrencyCode } {
  const amount =
    currency === 'LKR'
      ? String(row.lkrAmount)
      : currency === 'SGD'
        ? String(row.sgdAmount)
        : String(row.usdAmount)
  return { amount, currency }
}

function rowToWishlistProductSummary(
  row: ProductListItemRowWithCategory,
  currency: CurrencyCode,
) {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    shortName: row.shortName,
    isSale: row.isSale,
    categoryId: row.categoryId,
    keyImage:
      row.keyImageUrl != null
        ? {
            id: row.keyImageId ?? '',
            url: row.keyImageUrl,
            altText: row.keyImageAltText,
            sortOrder: row.keyImageSortOrder ?? 0,
          }
        : null,
    hoverImage:
      row.hoverImageUrl != null
        ? {
            id: '',
            url: row.hoverImageUrl,
            altText: row.hoverImageAltText ?? null,
            sortOrder: 0,
          }
        : null,
    price: resolveWishlistPrice({ row, currency }),
    variants: row.variants.map((v) => ({
      variantId: v.variantId,
      color: v.color,
      size: v.size,
      availableQty: v.availableQty,
      stockStatus: v.stockStatus,
    })),
  }
}

export async function getWishlist({
  userId,
  currency = 'LKR',
}: {
  userId: string
  currency?: CurrencyCode
}) {
  const rows = await getWishlistByUserId({ userId })
  if (rows.length === 0) return []
  const productIds = [...new Set(rows.map((r) => r.productId))]
  const products = await listActiveProductListRowsByIds({ ids: productIds })
  const productMap = new Map(products.map((p) => [p.id, p]))
  const out: Array<{
    id: string
    productId: string
    variantId: string | null
    createdAt: Date
    product: ReturnType<typeof rowToWishlistProductSummary>
  }> = []
  for (const r of rows) {
    const p = productMap.get(r.productId)
    if (!p) continue
    out.push({
      id: r.id,
      productId: r.productId,
      variantId: r.variantId ?? null,
      createdAt: r.createdAt,
      product: rowToWishlistProductSummary(p, currency),
    })
  }
  return out
}

export async function wishlistAdd({
  userId,
  productId,
}: {
  userId: string
  productId: string
}) {
  const row = await addToWishlist({ userId, productId })
  return {
    id: row.id,
    productId: row.productId,
    variantId: row.variantId ?? null,
    createdAt: row.createdAt,
  }
}

export async function wishlistRemove({
  userId,
  productId,
}: {
  userId: string
  productId: string
}): Promise<void> {
  await removeFromWishlist({ userId, productId })
}

// —— Payment methods ——

export async function listSavedPaymentMethodsForUser({
  userId,
}: {
  userId: string
}): Promise<SavedPaymentMethod[]> {
  return listSavedPaymentMethods({ userId })
}

export async function deleteSavedPaymentMethodForUser({
  id,
  userId,
}: {
  id: string
  userId: string
}): Promise<void> {
  await deleteSavedPaymentMethod({ id, userId })
}

// —— Admin auth ——

export async function adminLogin({
  email,
  password,
}: {
  email: string
  password: string
}): Promise<{
  user: SanitisedUser
  admin: Admin
  sessionId: string
}> {
  const normalisedEmail = email.toLowerCase().trim()
  const user = await getUserByEmail({ email: normalisedEmail })
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH
  const passwordOk = await bcrypt.compare(password, hashToCompare)
  if (!user || !passwordOk) throw new AppError('INVALID_CREDENTIALS', 401)
  const admin = await getAdminByUserId({ userId: user.id })
  if (!admin) throw new AppError('NOT_AN_ADMIN', 403)
  if (admin.status === 'SUSPENDED') throw new AppError('ACCOUNT_SUSPENDED', 403)
  if (admin.status === 'INVITED') throw new AppError('INVITE_NOT_ACCEPTED', 403)
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const session = await createSession({
    userId: user.id,
    kind: 'ADMIN',
    expiresAt,
  })
  return { user: sanitiseUser(user), admin, sessionId: session.id }
}

export async function adminLogout({
  sessionId,
}: {
  sessionId: string
}): Promise<void> {
  await invalidateSession({ sessionId })
}

// —— Admin invites ——

function adminInviteEmailHtml({
  inviteUrl,
  role,
}: {
  inviteUrl: string
  role: string
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
      <p style="font-size:13px;letter-spacing:0.3em;text-transform:uppercase;
                color:#8B8480;margin-bottom:24px;">MODETT ATELIER</p>
      <h1 style="font-family:Georgia,serif;font-size:24px;font-weight:normal;
                 color:#1A1914;margin-bottom:16px;">
        You've been invited to the team
      </h1>
      <p style="font-size:14px;line-height:1.7;color:#1A1914;">
        You have been invited to join the Modett Atelier admin portal
        as an <strong>${role}</strong>.
      </p>
      <p style="font-size:14px;line-height:1.7;color:#1A1914;">
        Click the button below to accept your invitation and set up your account.
        This link expires in <strong>48 hours</strong>.
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
        <tr>
          <td style="background:#3D2E26;">
            <a href="${inviteUrl}"
               style="display:inline-block;padding:14px 32px;color:#FAFAF8;
                      text-decoration:none;font-size:12px;letter-spacing:0.2em;
                      text-transform:uppercase;">
              Accept Invitation
            </a>
          </td>
        </tr>
      </table>
      <p style="font-size:12px;color:#8B8480;">
        If you weren't expecting this invitation, you can safely ignore this email.
      </p>
    </body>
    </html>
  `
}

export async function createAdminInviteForOwner({
  email,
  role,
  createdByAdminId,
}: {
  email: string
  role: 'OWNER' | 'ADMIN'
  createdByAdminId: string
}): Promise<{ invite: Awaited<ReturnType<typeof createAdminInvite>> }> {
  const normalisedEmail = email.toLowerCase().trim()
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const invite = await createAdminInvite({
    email: normalisedEmail,
    tokenHash,
    expiresAt,
    createdByAdminId,
    role,
  })
  const base = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  const inviteUrl = `${base.replace(/\/$/, '')}/admin/accept-invite?token=${encodeURIComponent(rawToken)}`
  try {
    await sendEmail({
      to: normalisedEmail,
      subject: 'You have been invited to join Modett Atelier',
      html: adminInviteEmailHtml({ inviteUrl, role }),
    })
  } catch (err) {
    console.error('[iam] admin invite email failed:', err)
    throw new AppError('INVITE_EMAIL_FAILED', 502)
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[iam] admin invite accept URL (dev):', inviteUrl)
  }
  return { invite }
}

export async function acceptAdminInvite({
  rawToken,
  firstName,
  lastName,
  password,
}: {
  rawToken: string
  firstName: string
  lastName: string
  password: string
}): Promise<{ user: SanitisedUser; admin: Admin; sessionId: string }> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const invite = await getAdminInviteByTokenHash({ tokenHash })
  if (!invite) throw new AppError('INVALID_OR_EXPIRED_INVITE', 400)
  if (invite.expiresAt < new Date()) throw new AppError('INVALID_OR_EXPIRED_INVITE', 400)
  if (invite.usedAt) throw new AppError('INVITE_ALREADY_USED', 400)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const invitedRole = invite.role === 'OWNER' ? 'OWNER' : 'ADMIN'
  const { user, admin } = await acceptAdminInviteTransaction({
    inviteId: invite.id,
    email: invite.email,
    firstName,
    lastName,
    passwordHash,
    invitedRole,
  })
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000)
  const session = await createSession({
    userId: user.id,
    kind: 'ADMIN',
    expiresAt,
  })
  return { user: sanitiseUser(user), admin, sessionId: session.id }
}

// —— Admin management (OWNER only, enforced in routes) ——

export async function listAdminsForOwner(): Promise<
  Array<Admin & { user: SanitisedUser }>
> {
  const rows = await listAdmins()
  return rows.map((r) => ({ ...r, user: sanitiseUser(r.user) }))
}

export async function updateAdminRoleForOwner({
  targetAdminId,
  role,
  requestingAdminId,
}: {
  targetAdminId: string
  role: 'OWNER' | 'ADMIN'
  requestingAdminId: string
}): Promise<Admin> {
  const admin = await getAdminById({ id: targetAdminId })
  if (!admin) throw new AppError('ADMIN_NOT_FOUND', 404)
  if (targetAdminId === requestingAdminId) {
    throw new AppError('CANNOT_MODIFY_OWN_ROLE', 400)
  }
  const updated = await updateAdminRole({ id: targetAdminId, role })
  if (!updated) throw new AppError('ADMIN_NOT_FOUND', 404)
  return updated
}

export async function suspendAdminForOwner({
  targetAdminId,
  requestingAdminId,
}: {
  targetAdminId: string
  requestingAdminId: string
}): Promise<void> {
  const admin = await getAdminById({ id: targetAdminId })
  if (!admin) throw new AppError('ADMIN_NOT_FOUND', 404)
  if (targetAdminId === requestingAdminId) {
    throw new AppError('CANNOT_SUSPEND_SELF', 400)
  }
  await updateAdminStatus({ id: targetAdminId, status: 'SUSPENDED' })
  const sessions = await getActiveSessionsByUserId({ userId: admin.userId })
  for (const s of sessions) {
    await invalidateSession({ sessionId: s.id })
  }
}

export async function reinstateAdminForOwner({
  targetAdminId,
}: {
  targetAdminId: string
}): Promise<void> {
  const admin = await getAdminById({ id: targetAdminId })
  if (!admin) throw new AppError('ADMIN_NOT_FOUND', 404)
  if (admin.status !== 'SUSPENDED') {
    throw new AppError('ADMIN_NOT_SUSPENDED', 400)
  }
  await updateAdminStatus({ id: targetAdminId, status: 'ACTIVE' })
}

export async function listPendingAdminInvitesForAdmin(): Promise<AdminInvite[]> {
  return listPendingAdminInvites()
}

export async function resendAdminInviteForOwner({
  inviteId,
}: {
  inviteId: string
}): Promise<void> {
  const invite = await getAdminInviteById({ id: inviteId })
  if (!invite || invite.usedAt) throw new AppError('INVITE_NOT_FOUND', 404)
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const updated = await updateAdminInviteToken({
    id: inviteId,
    tokenHash,
    expiresAt,
  })
  if (!updated) throw new AppError('INVITE_NOT_FOUND', 404)
  const base = process.env.FRONTEND_URL ?? 'http://localhost:3000'
  const inviteUrl = `${base.replace(/\/$/, '')}/admin/accept-invite?token=${encodeURIComponent(rawToken)}`
  const roleLabel = invite.role === 'OWNER' ? 'OWNER' : 'ADMIN'
  try {
    await sendEmail({
      to: invite.email,
      subject: 'You have been invited to join Modett Atelier',
      html: adminInviteEmailHtml({ inviteUrl, role: roleLabel }),
    })
  } catch (err) {
    console.error('[iam] admin invite resend email failed:', err)
    throw new AppError('INVITE_EMAIL_FAILED', 502)
  }
  if (process.env.NODE_ENV === 'development') {
    console.log('[iam] admin invite resend URL (dev):', inviteUrl)
  }
}

export async function cancelAdminInviteForOwner({
  inviteId,
}: {
  inviteId: string
}): Promise<void> {
  const ok = await deleteAdminInvite({ id: inviteId })
  if (!ok) throw new AppError('INVITE_NOT_FOUND', 404)
}

export async function updateAdminSelfProfile({
  userId,
  firstName,
  lastName,
}: {
  userId: string
  firstName?: string
  lastName?: string
}): Promise<SanitisedUser> {
  return updateMe({ userId, data: { firstName, lastName } })
}

export async function adminChangePassword({
  userId,
  currentPassword,
  newPassword,
}: {
  userId: string
  currentPassword: string
  newPassword: string
}): Promise<void> {
  const user = await getUserById({ id: userId })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) throw new AppError('INCORRECT_PASSWORD', 401)
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
  await updateUser({ id: userId, data: { passwordHash } })
}
