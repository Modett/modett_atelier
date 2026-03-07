/**
 * IAM service layer — business logic, validation, errors.
 * RORO. Uses query functions from @modett/db. Throws AppError for expected failures.
 */

import * as crypto from 'node:crypto'
import * as bcrypt from 'bcryptjs'
import { AppError } from '../../lib/errors'
import {
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
  createAdmin,
  updateAdminStatus,
  updateAdminRole,
  listAdmins,
  createAdminInvite,
  getAdminInviteByTokenHash,
  acceptAdminInviteTransaction,
  listSavedAddresses,
  createSavedAddress,
  updateSavedAddress,
  deleteSavedAddress,
  listSavedPaymentMethods,
  createSavedPaymentMethod,
  deleteSavedPaymentMethod,
} from '@modett/db'
import type { User, Admin, SavedAddress, SavedPaymentMethod } from '@modett/db'
import { createLoyaltyAccount } from '../loyalty'
import { createNotificationPreferences } from '../messaging'

const BCRYPT_ROUNDS = 12
const DUMMY_HASH =
  '$2a$12$dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.dummy.u'

type SanitisedUser = Omit<User, 'passwordHash'>

function sanitiseUser(user: User): SanitisedUser {
  const { passwordHash: _, ...rest } = user
  return rest
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

export async function createAdminInviteForOwner({
  email,
  createdByAdminId,
}: {
  email: string
  createdByAdminId: string
}): Promise<{ invite: Awaited<ReturnType<typeof createAdminInvite>>; rawToken: string }> {
  const normalisedEmail = email.toLowerCase().trim()
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
  const invite = await createAdminInvite({
    email: normalisedEmail,
    tokenHash,
    expiresAt,
    createdByAdminId,
  })
  return { invite, rawToken }
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
}): Promise<{ user: SanitisedUser; admin: Admin }> {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  const invite = await getAdminInviteByTokenHash({ tokenHash })
  if (!invite) throw new AppError('INVALID_OR_EXPIRED_INVITE', 400)
  if (invite.expiresAt < new Date()) throw new AppError('INVALID_OR_EXPIRED_INVITE', 400)
  if (invite.usedAt) throw new AppError('INVITE_ALREADY_USED', 400)
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const { user, admin } = await acceptAdminInviteTransaction({
    inviteId: invite.id,
    email: invite.email,
    firstName,
    lastName,
    passwordHash,
  })
  return { user: sanitiseUser(user), admin }
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
