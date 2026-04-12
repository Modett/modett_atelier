/**
 * Analytics schema — events (partitioned), analytics_aggregates
 * Mirrors packages/db/migrations/0001_initial.sql
 */

import {
  pgSchema,
  uuid,
  text,
  timestamp,
  jsonb,
  unique,
  numeric,
} from 'drizzle-orm/pg-core'
import { users } from './iam.schema'
import { currencyCodeEnum } from './orders.schema'

const analytics = pgSchema('analytics')

export const events = analytics.table('events', {
  id: uuid('id').defaultRandom().notNull(),
  session_id: text('session_id').notNull(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type').notNull(),
  payload_json: jsonb('payload_json').notNull().default({}),
  currency: currencyCodeEnum('currency'),
  country_code: text('country_code'),
  device_type: text('device_type'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const analyticsAggregates = analytics.table(
  'analytics_aggregates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    metric: text('metric').notNull(),
    dimension_json: jsonb('dimension_json').notNull().default({}),
    value: numeric('value', { precision: 20, scale: 4 }).notNull(),
    period: text('period').notNull(),
    period_start: timestamp('period_start', { withTimezone: true }).notNull(),
    computed_at: timestamp('computed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('uq_aggregate').on(
      t.metric,
      t.period,
      t.period_start,
      t.dimension_json,
    ),
  ],
)
