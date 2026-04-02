/**
 * IAM schema — users, admins, sessions, admin_invites, saved_addresses, saved_payment_methods
 * Mirrors packages/db/migrations/0001_initial.sql
 * camelCase property names map to snake_case column names.
 */

import {
  pgSchema,
  uuid,
  text,
  boolean,
  timestamp,
  date,
  jsonb,
  smallint,
  unique,
} from 'drizzle-orm/pg-core'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'

const iam = pgSchema('iam')

// Enums (PostgreSQL CREATE TYPE iam.*)
export const adminRoleEnum = iam.enum('admin_role', ['OWNER', 'ADMIN'])
export const adminStatusEnum = iam.enum('admin_status', [
  'ACTIVE',
  'INVITED',
  'SUSPENDED',
])
export const sessionKindEnum = iam.enum('session_kind', ['CUSTOMER', 'ADMIN'])

export const users = iam.table('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull().unique('uq_users_email'),
  passwordHash: text('password_hash').notNull(),
  dob: date('dob'),
  dobConsent: boolean('dob_consent').notNull().default(false),
  newsletterOptIn: boolean('newsletter_opt_in').notNull().default(false),
  newsletterOptedAt: timestamp('newsletter_opted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const admins = iam.table('admins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id)
    .unique('uq_admins_user_id'),
  role: adminRoleEnum('role').notNull().default('ADMIN'),
  status: adminStatusEnum('status').notNull().default('INVITED'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const adminInvites = iam.table('admin_invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  tokenHash: text('token_hash').notNull().unique('uq_admin_invites_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  role: adminRoleEnum('role').notNull().default('ADMIN'),
  createdByAdminId: uuid('created_by_admin_id')
    .notNull()
    .references(() => admins.id),
  usedAt: timestamp('used_at', { withTimezone: true }),
})

export const sessions = iam.table('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  kind: sessionKindEnum('kind').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  rememberMeUntil: timestamp('remember_me_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  invalidatedAt: timestamp('invalidated_at', { withTimezone: true }),
})

export const wishlists = iam.table(
  'wishlists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull(),
    variantId: uuid('variant_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique('uq_wishlist_user_product').on(t.userId, t.productId)],
)

export const newsletterSubscribers = iam.table('newsletter_subscribers', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique('uq_newsletter_email'),
  promoCodeId: uuid('promo_code_id'),
  subscribedAt: timestamp('subscribed_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  ipAddress: text('ip_address'),
  source: text('source').notNull().default('POPUP'),
})

export const savedAddresses = iam.table('saved_addresses', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  label: text('label'),
  addressJson: jsonb('address_json').notNull(),
  countryCode: text('country_code').notNull(),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const adminAuditLog = iam.table('admin_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  adminId: uuid('admin_id').references(() => admins.id, { onDelete: 'set null' }),
  adminEmail: text('admin_email').notNull(),
  adminRole: text('admin_role').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  entityLabel: text('entity_label'),
  beforeJson: jsonb('before_json'),
  afterJson: jsonb('after_json'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const savedPaymentMethods = iam.table('saved_payment_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull(),
  token: text('token').notNull(),
  brand: text('brand'),
  lastFour: text('last_four'),
  expiryMonth: smallint('expiry_month'),
  expiryYear: smallint('expiry_year'),
  isDefault: boolean('is_default').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Inferred types
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Admin = InferSelectModel<typeof admins>
export type NewAdmin = InferInsertModel<typeof admins>
export type AdminInvite = InferSelectModel<typeof adminInvites>
export type NewAdminInvite = InferInsertModel<typeof adminInvites>
export type Session = InferSelectModel<typeof sessions>
export type NewSession = InferInsertModel<typeof sessions>
export type SavedAddress = InferSelectModel<typeof savedAddresses>
export type NewSavedAddress = InferInsertModel<typeof savedAddresses>
export type SavedPaymentMethod = InferSelectModel<typeof savedPaymentMethods>
export type NewSavedPaymentMethod = InferInsertModel<typeof savedPaymentMethods>
export type NewsletterSubscriber = InferSelectModel<typeof newsletterSubscribers>
export type NewNewsletterSubscriber = InferInsertModel<typeof newsletterSubscribers>
export type AdminAuditLogRow = InferSelectModel<typeof adminAuditLog>
export type NewAdminAuditLogRow = InferInsertModel<typeof adminAuditLog>
