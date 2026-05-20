/**
 * Payments schema — payment_intents, payment_transactions, saved_cards
 * Mirrors packages/db/migrations/0001_initial.sql + 0011_payable_tokenize.sql
 */

import {
  pgSchema,
  uuid,
  text,
  timestamp,
  jsonb,
  numeric,
  boolean,
} from 'drizzle-orm/pg-core'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { users } from './iam.schema'
import { ordersTable } from './orders.schema'
import { currencyCodeEnum } from './orders.schema'

const payments = pgSchema('payments')

export const paymentStatusEnum = payments.enum('payment_status', [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
])

/**
 * Logical payment type stored on intents/transactions. PAYable's wire value is
 * '1' | '2' | '3', but we store readable enum-like strings for queryability.
 * Mapped at the gateway boundary by config/payable.ts → PAYMENT_TYPE.
 *
 *   ONE_TIME        — guest / unauthenticated / opted-out (PAYable type 1)
 *   TOKENIZE        — first save-card payment (PAYable type 3)
 *   RECURRING       — subscription (PAYable type 2) — admin/future use
 *   SAVED_CARD_PAY  — server-to-server charge against a saved token
 */
export type PaymentTypeColumn =
  | 'ONE_TIME'
  | 'TOKENIZE'
  | 'RECURRING'
  | 'SAVED_CARD_PAY'

export const savedCards = payments.table('saved_cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  customer_ref_no: text('customer_ref_no').notNull(),
  payable_customer_id: text('payable_customer_id'),
  token_id: text('token_id').notNull(),
  masked_card_no: text('masked_card_no').notNull(),
  card_scheme: text('card_scheme'),
  card_holder_name: text('card_holder_name'),
  card_exp: text('card_exp'),
  nickname: text('nickname'),
  is_default: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
})

export const paymentIntents = payments.table('payment_intents', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id')
    .notNull()
    .references(() => ordersTable.id),
  provider: text('provider').notNull(),
  provider_intent_id: text('provider_intent_id').notNull().unique(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: currencyCodeEnum('currency').notNull(),
  status: paymentStatusEnum('status').notNull().default('PENDING'),
  payment_type: text('payment_type').notNull().default('ONE_TIME').$type<PaymentTypeColumn>(),
  saved_card_id: uuid('saved_card_id').references(() => savedCards.id),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const paymentTransactions = payments.table('payment_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id')
    .notNull()
    .references(() => ordersTable.id),
  provider: text('provider').notNull(),
  provider_charge_id: text('provider_charge_id').notNull().unique(),
  status: paymentStatusEnum('status').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: currencyCodeEnum('currency').notNull(),
  payment_type: text('payment_type').notNull().default('ONE_TIME').$type<PaymentTypeColumn>(),
  raw_payload_json: jsonb('raw_payload_json').notNull(),
  received_at: timestamp('received_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type PaymentIntent = InferSelectModel<typeof paymentIntents>
export type NewPaymentIntent = InferInsertModel<typeof paymentIntents>
export type PaymentTransaction = InferSelectModel<typeof paymentTransactions>
export type NewPaymentTransaction = InferInsertModel<typeof paymentTransactions>
export type SavedCard = InferSelectModel<typeof savedCards>
export type NewSavedCard = InferInsertModel<typeof savedCards>
