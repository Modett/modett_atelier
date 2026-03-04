/**
 * Loyalty schema — loyalty_accounts, loyalty_ledger, loyalty_rules, loyalty_grants
 * Mirrors packages/db/migrations/0001_initial.sql
 */
import { pgSchema, uuid, text, integer, boolean, timestamp, jsonb, } from 'drizzle-orm/pg-core';
import { users } from './iam.schema';
import { admins } from './iam.schema';
import { ordersTable } from './orders.schema';
const loyalty = pgSchema('loyalty');
export const ledgerTypeEnum = loyalty.enum('ledger_type', [
    'EARN',
    'REDEEM',
    'BONUS',
    'EXPIRY',
    'ADJUST',
]);
export const tierLevelEnum = loyalty.enum('tier_level', [
    'BRONZE',
    'SILVER',
    'GOLD',
]);
export const loyaltyAccounts = loyalty.table('loyalty_accounts', {
    user_id: uuid('user_id')
        .primaryKey()
        .references(() => users.id, { onDelete: 'cascade' }),
    balance: integer('balance').notNull().default(0),
    lifetime_earned: integer('lifetime_earned').notNull().default(0),
    tier: tierLevelEnum('tier').notNull().default('BRONZE'),
    tier_evaluated_at: timestamp('tier_evaluated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    last_activity_at: timestamp('last_activity_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const loyaltyLedger = loyalty.table('loyalty_ledger', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    type: ledgerTypeEnum('type').notNull(),
    points: integer('points').notNull(),
    order_id: uuid('order_id').references(() => ordersTable.id, {
        onDelete: 'set null',
    }),
    metadata_json: jsonb('metadata_json').notNull().default({}),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const loyaltyRules = loyalty.table('loyalty_rules', {
    id: uuid('id').primaryKey().defaultRandom(),
    earn_rate_json: jsonb('earn_rate_json').notNull(),
    redemption_rate_by_currency_json: jsonb('redemption_rate_by_currency_json').notNull(),
    tier_thresholds_json: jsonb('tier_thresholds_json').notNull(),
    multipliers_json: jsonb('multipliers_json').notNull(),
    min_redeem: integer('min_redeem').notNull().default(200),
    max_redeem_percent: text('max_redeem_percent').notNull().default('15.00'),
    no_stack_with_sale: boolean('no_stack_with_sale').notNull().default(true),
    updated_by_admin_id: uuid('updated_by_admin_id').references(() => admins.id, {
        onDelete: 'set null',
    }),
    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const loyaltyGrants = loyalty.table('loyalty_grants', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade' }),
    points: integer('points').notNull(),
    reason: text('reason').notNull(),
    granted_by_admin_id: uuid('granted_by_admin_id').references(() => admins.id, {
        onDelete: 'set null',
    }),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
