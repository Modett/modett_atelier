/**
 * Payments query functions — payment_intents, payment_transactions, saved_cards,
 * confirmOrderTransaction (atomic 6-step). No business logic. RORO.
 */

import { and, eq, desc, isNull } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db, type TransactionClient } from '../client'
import {
  paymentIntents,
  paymentTransactions,
  savedCards,
} from '../schema/payments.schema'
import type {
  PaymentIntent,
  PaymentTransaction,
  PaymentTypeColumn,
  SavedCard,
} from '../schema/payments.schema'
import { IntentNotPendingError, StockConfirmFailedError } from '../errors'
import { ordersTable } from '../schema/orders.schema'
import { consumeReservation, placeOrder, appendOrderEvent } from './checkout'
import { markCartCheckedOut } from './cart'
import { atomicConfirmSale } from './inventory'

// —— PaymentIntent ——

export async function createPaymentIntent({
  orderId,
  providerIntentId,
  amount,
  currency,
  paymentType,
  savedCardId,
}: {
  orderId: string
  providerIntentId: string
  amount: string
  currency: 'LKR' | 'SGD' | 'USD'
  paymentType?: PaymentTypeColumn
  savedCardId?: string | null
}): Promise<PaymentIntent> {
  const [row] = await db
    .insert(paymentIntents)
    .values({
      order_id: orderId,
      provider: 'payable',
      provider_intent_id: providerIntentId,
      amount,
      currency,
      status: 'PENDING',
      payment_type: paymentType ?? 'ONE_TIME',
      saved_card_id: savedCardId ?? null,
    })
    .returning()
  if (!row) throw new Error('createPaymentIntent: no row returned')
  return row
}

export async function getPaymentIntentByOrderId({
  orderId,
}: {
  orderId: string
}): Promise<PaymentIntent | null> {
  const rows = await db
    .select()
    .from(paymentIntents)
    .where(eq(paymentIntents.order_id, orderId))
    .orderBy(desc(paymentIntents.created_at))
    .limit(1)
  return rows[0] ?? null
}

export async function updatePaymentIntentStatus({
  orderId,
  newStatus,
}: {
  orderId: string
  newStatus: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
}): Promise<void> {
  const result = await db.execute(sql`
    UPDATE payments.payment_intents
    SET status = ${newStatus},
        updated_at = now()
    WHERE order_id = ${orderId}
      AND status = 'PENDING'
    RETURNING id
  `)
  if (result.rows.length === 0) {
    throw new IntentNotPendingError()
  }
}

// —— PaymentTransaction ——

export async function createPaymentTransaction({
  orderId,
  providerChargeId,
  status,
  amount,
  currency,
  paymentType,
  rawPayloadJson,
}: {
  orderId: string
  providerChargeId: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  amount: string
  currency: 'LKR' | 'SGD' | 'USD'
  paymentType?: PaymentTypeColumn
  rawPayloadJson: Record<string, unknown>
}): Promise<PaymentTransaction> {
  const [row] = await db
    .insert(paymentTransactions)
    .values({
      order_id: orderId,
      provider: 'payable',
      provider_charge_id: providerChargeId,
      status,
      amount,
      currency,
      payment_type: paymentType ?? 'ONE_TIME',
      raw_payload_json: rawPayloadJson,
    })
    .returning()
  if (!row) throw new Error('createPaymentTransaction: no row returned')
  return row
}

export async function getPaymentTransactionByChargeId({
  providerChargeId,
}: {
  providerChargeId: string
}): Promise<PaymentTransaction | null> {
  const rows = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.provider_charge_id, providerChargeId))
  return rows[0] ?? null
}

// —— Confirm order (one transaction, 6 steps) ——

export interface ConfirmOrderTransactionParams {
  orderId: string
  reservationId: string
  cartId: string
  providerChargeId: string
  amount: string
  currency: 'LKR' | 'SGD' | 'USD'
  paymentType?: PaymentTypeColumn
  rawPayloadJson: Record<string, unknown>
  items: Array<{ variantId: string; qty: number }>
  /**
   * If the gateway returned a fresh tokenized card (paymentType=TOKENIZE),
   * persist it atomically with the order confirmation. Returned `id` is the new
   * `payments.saved_cards.id` (or null when nothing was inserted, e.g. duplicate
   * token for the same user — soft-delete is preferred over hard delete).
   */
  saveCard?: {
    userId: string
    customerRefNo: string
    payableCustomerId: string | null
    tokenId: string
    maskedCardNo: string
    cardScheme: string | null
    cardHolderName: string | null
    cardExp: string | null
  } | null
}

export async function confirmOrderTransaction(
  params: ConfirmOrderTransactionParams,
): Promise<{ savedCardId: string | null }> {
  const {
    orderId,
    reservationId,
    cartId,
    providerChargeId,
    amount,
    currency,
    paymentType,
    rawPayloadJson,
    items,
    saveCard,
  } = params

  return await db.transaction(async (tx) => {
    // Step 1: Insert payment transaction
    await tx.insert(paymentTransactions).values({
      order_id: orderId,
      provider: 'payable',
      provider_charge_id: providerChargeId,
      status: 'SUCCEEDED',
      amount,
      currency,
      payment_type: paymentType ?? 'ONE_TIME',
      raw_payload_json: rawPayloadJson,
    })

    // Step 2: Confirm stock sale (no Redis lock — uses tx)
    for (const item of items) {
      const ok = await atomicConfirmSale({
        variantId: item.variantId,
        qty: item.qty,
        tx,
      })
      if (!ok) throw new StockConfirmFailedError()
    }

    // Step 3: Consume reservation
    await consumeReservation({ reservationId, tx })

    // Step 4: Place order and set payment state
    await placeOrder({ orderId, tx })
    await tx
      .update(ordersTable)
      .set({ payment_state: 'PAID', updated_at: new Date() })
      .where(eq(ordersTable.id, orderId))

    // Step 5: Mark cart checked out
    await markCartCheckedOut({ cartId, tx })

    // Step 6: Persist tokenized card (only on TOKENIZE_PAYMENT callbacks)
    let savedCardId: string | null = null
    if (saveCard) {
      // ON CONFLICT (user_id, token_id) DO NOTHING — same card scanned twice is harmless
      const inserted = await tx
        .insert(savedCards)
        .values({
          user_id: saveCard.userId,
          customer_ref_no: saveCard.customerRefNo,
          payable_customer_id: saveCard.payableCustomerId ?? null,
          token_id: saveCard.tokenId,
          masked_card_no: saveCard.maskedCardNo,
          card_scheme: saveCard.cardScheme ?? null,
          card_holder_name: saveCard.cardHolderName ?? null,
          card_exp: saveCard.cardExp ?? null,
          is_default: false,
        })
        .onConflictDoNothing({ target: [savedCards.user_id, savedCards.token_id] })
        .returning({ id: savedCards.id })
      savedCardId = inserted[0]?.id ?? null
    }

    // Step 7: Append order event
    await appendOrderEvent({
      orderId,
      eventType: 'PAYMENT_CONFIRMED',
      payloadJson: { providerChargeId, amount, currency, paymentType: paymentType ?? 'ONE_TIME' },
      tx,
    })

    return { savedCardId }
  })
}

// —— Saved cards ——

export async function listSavedCardsByUser({
  userId,
}: {
  userId: string
}): Promise<SavedCard[]> {
  return await db
    .select()
    .from(savedCards)
    .where(and(eq(savedCards.user_id, userId), isNull(savedCards.deleted_at)))
    .orderBy(desc(savedCards.is_default), desc(savedCards.created_at))
}

export async function getSavedCardById({
  id,
}: {
  id: string
}): Promise<SavedCard | null> {
  const rows = await db
    .select()
    .from(savedCards)
    .where(and(eq(savedCards.id, id), isNull(savedCards.deleted_at)))
    .limit(1)
  return rows[0] ?? null
}

export async function getSavedCardOwnedByUser({
  id,
  userId,
}: {
  id: string
  userId: string
}): Promise<SavedCard | null> {
  const rows = await db
    .select()
    .from(savedCards)
    .where(
      and(
        eq(savedCards.id, id),
        eq(savedCards.user_id, userId),
        isNull(savedCards.deleted_at),
      ),
    )
    .limit(1)
  return rows[0] ?? null
}

export async function softDeleteSavedCard({
  id,
  userId,
}: {
  id: string
  userId: string
}): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE payments.saved_cards
    SET deleted_at = now(),
        is_default = FALSE,
        updated_at = now()
    WHERE id = ${id}
      AND user_id = ${userId}
      AND deleted_at IS NULL
    RETURNING id
  `)
  return result.rows.length > 0
}

export async function setDefaultSavedCard({
  id,
  userId,
}: {
  id: string
  userId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(savedCards)
      .set({ is_default: false, updated_at: new Date() })
      .where(and(eq(savedCards.user_id, userId), isNull(savedCards.deleted_at)))
    await tx
      .update(savedCards)
      .set({ is_default: true, updated_at: new Date() })
      .where(
        and(
          eq(savedCards.id, id),
          eq(savedCards.user_id, userId),
          isNull(savedCards.deleted_at),
        ),
      )
  })
}

export async function updateSavedCardNickname({
  id,
  userId,
  nickname,
}: {
  id: string
  userId: string
  nickname: string | null
}): Promise<void> {
  await db
    .update(savedCards)
    .set({ nickname, updated_at: new Date() })
    .where(
      and(
        eq(savedCards.id, id),
        eq(savedCards.user_id, userId),
        isNull(savedCards.deleted_at),
      ),
    )
}
