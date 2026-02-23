/**
 * Returns schema — return_requests, return_request_items, return_events
 * Mirrors packages/db/migrations/0001_initial.sql
 */

import {
  pgSchema,
  uuid,
  text,
  integer,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'
import { ordersTable } from './orders.schema'
import { orderItems } from './orders.schema'
import { admins } from './iam.schema'

const returns = pgSchema('returns')

export const returnTypeEnum = returns.enum('return_type', ['REFUND', 'EXCHANGE'])
export const returnStatusEnum = returns.enum('return_status', [
  'SUBMITTED',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'FULFILLED',
])

export const returnRequests = returns.table('return_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id')
    .notNull()
    .references(() => ordersTable.id),
  type: returnTypeEnum('type').notNull(),
  status: returnStatusEnum('status').notNull().default('SUBMITTED'),
  reason: text('reason').notNull(),
  policy_accepted_at: timestamp('policy_accepted_at', {
    withTimezone: true,
  }).notNull(),
  policy_version: text('policy_version').notNull(),
  eligible_until: timestamp('eligible_until', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const returnRequestItems = returns.table('return_request_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  return_request_id: uuid('return_request_id')
    .notNull()
    .references(() => returnRequests.id, { onDelete: 'cascade' }),
  order_item_id: uuid('order_item_id')
    .notNull()
    .references(() => orderItems.id),
  qty: integer('qty').notNull(),
  requested_variant_change_json: jsonb('requested_variant_change_json'),
  request_status: returnStatusEnum('request_status')
    .notNull()
    .default('SUBMITTED'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const returnEvents = returns.table('return_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  return_request_id: uuid('return_request_id')
    .notNull()
    .references(() => returnRequests.id, { onDelete: 'cascade' }),
  event_type: text('event_type').notNull(),
  payload_json: jsonb('payload_json').notNull().default({}),
  admin_id: uuid('admin_id').references(() => admins.id, {
    onDelete: 'set null',
  }),
  admin_note: text('admin_note'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
