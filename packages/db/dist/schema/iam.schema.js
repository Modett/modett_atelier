"use strict";
/**
 * IAM schema — users, admins, sessions, admin_invites, saved_addresses, saved_payment_methods
 * Mirrors packages/db/migrations/0001_initial.sql
 * camelCase property names map to snake_case column names.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.savedPaymentMethods = exports.savedAddresses = exports.wishlists = exports.sessions = exports.adminInvites = exports.admins = exports.users = exports.sessionKindEnum = exports.adminStatusEnum = exports.adminRoleEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const iam = (0, pg_core_1.pgSchema)('iam');
// Enums (PostgreSQL CREATE TYPE iam.*)
exports.adminRoleEnum = iam.enum('admin_role', ['OWNER', 'ADMIN']);
exports.adminStatusEnum = iam.enum('admin_status', [
    'ACTIVE',
    'INVITED',
    'SUSPENDED',
]);
exports.sessionKindEnum = iam.enum('session_kind', ['CUSTOMER', 'ADMIN']);
exports.users = iam.table('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    firstName: (0, pg_core_1.text)('first_name').notNull(),
    lastName: (0, pg_core_1.text)('last_name').notNull(),
    email: (0, pg_core_1.text)('email').notNull().unique('uq_users_email'),
    passwordHash: (0, pg_core_1.text)('password_hash').notNull(),
    dob: (0, pg_core_1.date)('dob'),
    dobConsent: (0, pg_core_1.boolean)('dob_consent').notNull().default(false),
    newsletterOptIn: (0, pg_core_1.boolean)('newsletter_opt_in').notNull().default(false),
    newsletterOptedAt: (0, pg_core_1.timestamp)('newsletter_opted_at', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
exports.admins = iam.table('admins', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => exports.users.id)
        .unique('uq_admins_user_id'),
    role: (0, exports.adminRoleEnum)('role').notNull().default('ADMIN'),
    status: (0, exports.adminStatusEnum)('status').notNull().default('INVITED'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.adminInvites = iam.table('admin_invites', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.text)('email').notNull(),
    tokenHash: (0, pg_core_1.text)('token_hash').notNull().unique('uq_admin_invites_token'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    createdByAdminId: (0, pg_core_1.uuid)('created_by_admin_id')
        .notNull()
        .references(() => exports.admins.id),
    usedAt: (0, pg_core_1.timestamp)('used_at', { withTimezone: true }),
});
exports.sessions = iam.table('sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => exports.users.id),
    kind: (0, exports.sessionKindEnum)('kind').notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: (0, pg_core_1.timestamp)('last_seen_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    rememberMeUntil: (0, pg_core_1.timestamp)('remember_me_until', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    invalidatedAt: (0, pg_core_1.timestamp)('invalidated_at', { withTimezone: true }),
});
exports.wishlists = iam.table('wishlists', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => exports.users.id, { onDelete: 'cascade' }),
    productId: (0, pg_core_1.uuid)('product_id').notNull(),
    variantId: (0, pg_core_1.uuid)('variant_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [(0, pg_core_1.unique)('uq_wishlist_user_product').on(t.userId, t.productId)]);
exports.savedAddresses = iam.table('saved_addresses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => exports.users.id, { onDelete: 'cascade' }),
    label: (0, pg_core_1.text)('label'),
    addressJson: (0, pg_core_1.jsonb)('address_json').notNull(),
    countryCode: (0, pg_core_1.text)('country_code').notNull(),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.savedPaymentMethods = iam.table('saved_payment_methods', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => exports.users.id, { onDelete: 'cascade' }),
    provider: (0, pg_core_1.text)('provider').notNull(),
    token: (0, pg_core_1.text)('token').notNull(),
    brand: (0, pg_core_1.text)('brand'),
    lastFour: (0, pg_core_1.text)('last_four'),
    expiryMonth: (0, pg_core_1.smallint)('expiry_month'),
    expiryYear: (0, pg_core_1.smallint)('expiry_year'),
    isDefault: (0, pg_core_1.boolean)('is_default').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
