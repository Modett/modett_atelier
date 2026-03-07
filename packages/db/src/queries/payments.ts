/**
 * Payments query functions — payment_intents, payment_transactions,
 * confirmOrderTransaction (atomic 6-step). No business logic. RORO.
 */

import { eq, desc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db, type TransactionClient } from '../client'
import { paymentIntents, paymentTransactions } from '../schema/payments.schema'
import type { PaymentIntent, PaymentTransaction } from '../schema/payments.schema'
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
}: {
  orderId: string
  providerIntentId: string
  amount: string
  currency: 'LKR' | 'SGD' | 'USD'
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
  rawPayloadJson,
}: {
  orderId: string
  providerChargeId: string
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  amount: string
  currency: 'LKR' | 'SGD' | 'USD'
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
  rawPayloadJson: Record<string, unknown>
  items: Array<{ variantId: string; qty: number }>
}

export async function confirmOrderTransaction(
  params: ConfirmOrderTransactionParams,
): Promise<void> {
  const {
    orderId,
    reservationId,
    cartId,
    providerChargeId,
    amount,
    currency,
    rawPayloadJson,
    items,
  } = params

  await db.transaction(async (tx) => {
    // Step 1: Insert payment transaction
    await tx.insert(paymentTransactions).values({
      order_id: orderId,
      provider: 'payable',
      provider_charge_id: providerChargeId,
      status: 'SUCCEEDED',
      amount,
      currency,
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

    // Step 6: Append order event
    await appendOrderEvent({
      orderId,
      eventType: 'PAYMENT_CONFIRMED',
      payloadJson: { providerChargeId, amount, currency },
      tx,
    })
  })
}
