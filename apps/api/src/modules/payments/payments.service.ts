/**
 * Payments service — createPaymentSession, handleWebhook, getPaymentStatus.
 * PAYable IPG; two-layer idempotency; atomic order confirmation.
 */

import Decimal from 'decimal.js'
import { AppError } from '../../lib/errors'
import {
  payableConfig,
  generateCheckValue,
  verifyCallbackCheckValue,
} from '../../config/payable'
import type { PayableWebhookPayload } from '../../config/payable'
import { redis } from '@modett/db'
import {
  getPaymentIntentByOrderId,
  createPaymentIntent,
  updatePaymentIntentStatus,
  createPaymentTransaction,
  confirmOrderTransaction,
  getOrderById,
  getOrderItems,
  appendOrderEvent,
} from '@modett/db'
import { earnPointsForOrder } from '../loyalty'

type CurrencyCode = 'LKR' | 'SGD' | 'USD'

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505'
}

// —— createPaymentSession ——

export interface CreatePaymentSessionParams {
  orderId: string
  reservationId: string
  cartId: string
  amount: string
  currency: CurrencyCode
  customerFirstName: string
  customerLastName: string
  customerEmail: string
  customerMobilePhone: string
  billingAddress: {
    street: string
    city: string
    province: string
    country: string
    postcode: string
  }
}

export interface CreatePaymentSessionResult {
  intentId: string
  payhereParams: {
    notify_url: string
    return_url: string
    cancel_url: string
    merchant_key: string
    check_value: string
    amount: string
    invoice_id: string
    order_description: string
    currency_code: string
    customer_first_name: string
    customer_last_name: string
    customer_email: string
    customer_mobile_phone: string
    customer_phone: string
    billing_address_street: string
    billing_address_city: string
    billing_address_province: string
    billing_address_country: string
    billing_address_postcode: string
    custom_1: string
  }
  sandboxMode: boolean
}

export async function createPaymentSession(
  params: CreatePaymentSessionParams,
): Promise<CreatePaymentSessionResult> {
  const {
    orderId,
    reservationId,
    cartId,
    amount,
    currency,
    customerFirstName,
    customerLastName,
    customerEmail,
    customerMobilePhone,
    billingAddress,
  } = params

  const existing = await getPaymentIntentByOrderId({ orderId })
  if (existing && existing.status === 'PENDING') {
    const checkValue = generateCheckValue({
      invoiceId: orderId,
      amount: new Decimal(amount).toFixed(2),
      currencyCode: currency,
    })
    return {
      intentId: existing.id,
      payhereParams: {
        notify_url: `${process.env.API_URL}/api/payments/webhook`,
        return_url: `${process.env.FRONTEND_URL}/checkout/confirmation`,
        cancel_url: `${process.env.FRONTEND_URL}/checkout/cancelled`,
        merchant_key: payableConfig.merchantKey,
        check_value: checkValue,
        amount: new Decimal(amount).toFixed(2),
        invoice_id: orderId,
        order_description: 'Modett Order',
        currency_code: currency,
        customer_first_name: customerFirstName,
        customer_last_name: customerLastName,
        customer_email: customerEmail,
        customer_mobile_phone: customerMobilePhone,
        customer_phone: customerMobilePhone,
        billing_address_street: billingAddress.street,
        billing_address_city: billingAddress.city,
        billing_address_province: billingAddress.province,
        billing_address_country: billingAddress.country,
        billing_address_postcode: billingAddress.postcode,
        custom_1: orderId,
      },
      sandboxMode: payableConfig.sandboxMode,
    }
  }

  const checkValue = generateCheckValue({
    invoiceId: orderId,
    amount: new Decimal(amount).toFixed(2),
    currencyCode: currency,
  })

  await redis.set(
    `checkout:context:${orderId}`,
    JSON.stringify({ reservationId, cartId }),
    'EX',
    3600,
  )

  const paymentIntent = await createPaymentIntent({
    orderId,
    providerIntentId: orderId,
    amount: new Decimal(amount).toFixed(2),
    currency,
  })

  return {
    intentId: paymentIntent.id,
    payhereParams: {
      notify_url: `${process.env.API_URL}/api/payments/webhook`,
      return_url: `${process.env.FRONTEND_URL}/checkout/confirmation`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout/cancelled`,
      merchant_key: payableConfig.merchantKey,
      check_value: checkValue,
      amount: new Decimal(amount).toFixed(2),
      invoice_id: orderId,
      order_description: 'Modett Order',
      currency_code: currency,
      customer_first_name: customerFirstName,
      customer_last_name: customerLastName,
      customer_email: customerEmail,
      customer_mobile_phone: customerMobilePhone,
      customer_phone: customerMobilePhone,
      billing_address_street: billingAddress.street,
      billing_address_city: billingAddress.city,
      billing_address_province: billingAddress.province,
      billing_address_country: billingAddress.country,
      billing_address_postcode: billingAddress.postcode,
      custom_1: orderId,
    },
    sandboxMode: payableConfig.sandboxMode,
  }
}

// —— handleWebhook ——

export type HandleWebhookResult =
  | { status: 'already_processed' }
  | { status: 'recorded_failure' }
  | { status: 'unknown_status' }
  | { status: 'order_not_found' }
  | { status: 'context_missing' }
  | { status: 'confirmed' }

export async function handleWebhook({
  payload,
}: {
  payload: PayableWebhookPayload
}): Promise<HandleWebhookResult> {
  // STEP 1 — Verify checkValue first
  const valid = verifyCallbackCheckValue(payload)
  if (!valid) {
    throw new AppError('INVALID_WEBHOOK_SIGNATURE', 400)
  }

  // STEP 2 — Redis idempotency (Layer 1)
  const redisKey = `payment:event:${payload.payableTransactionId}`
  const hit = await redis.get(redisKey)
  if (hit) return { status: 'already_processed' }

  // STEP 3 — Set Redis key BEFORE DB write
  await redis.set(redisKey, '1', 'EX', 86400)

  // STEP 4 — Parse status
  if (payload.statusCode === 2) {
    // FAILURE
    try {
      await createPaymentTransaction({
        orderId: payload.invoiceNo,
        providerChargeId: payload.payableTransactionId,
        status: 'FAILED',
        amount: payload.payableAmount,
        currency: payload.payableCurrency as CurrencyCode,
        rawPayloadJson: payload as unknown as Record<string, unknown>,
      })
    } catch (err) {
      if (isUniqueViolation(err)) return { status: 'already_processed' }
      throw err
    }
    await appendOrderEvent({
      orderId: payload.invoiceNo,
      eventType: 'PAYMENT_FAILED',
      payloadJson: {
        payableTransactionId: payload.payableTransactionId,
        statusMessage: payload.statusMessage,
      },
    }).catch((err) =>
      console.error('[webhook] appendOrderEvent failed:', err),
    )
    return { status: 'recorded_failure' }
  }

  if (payload.statusCode !== 1) {
    return { status: 'unknown_status' }
  }

  // STEP 5 — Load order and items
  const order = await getOrderById({ id: payload.invoiceNo })
  if (!order) {
    console.error(`[webhook] Order not found: ${payload.invoiceNo}`)
    return { status: 'order_not_found' }
  }
  const orderItems = await getOrderItems({ orderId: order.id })

  // STEP 6 — Load checkout context from Redis
  const contextRaw = await redis.get(`checkout:context:${payload.invoiceNo}`)
  if (!contextRaw) {
    console.error(`[webhook] Context missing for order: ${payload.invoiceNo}`)
    return { status: 'context_missing' }
  }
  const { reservationId, cartId } = JSON.parse(contextRaw) as {
    reservationId: string
    cartId: string
  }

  // STEP 7 — Confirmation transaction (DB Layer 2 idempotency)
  try {
    await confirmOrderTransaction({
      orderId: payload.invoiceNo,
      reservationId,
      cartId,
      providerChargeId: payload.payableTransactionId,
      amount: payload.payableAmount,
      currency: payload.payableCurrency as CurrencyCode,
      rawPayloadJson: payload as unknown as Record<string, unknown>,
      items: orderItems
        .filter((i) => i.variant_id != null)
        .map((i) => ({ variantId: i.variant_id!, qty: i.qty })),
    })
  } catch (err) {
    if (isUniqueViolation(err)) return { status: 'already_processed' }
    throw err
  }

  // STEP 8 — Post-transaction side effects
  await updatePaymentIntentStatus({
    orderId: payload.invoiceNo,
    newStatus: 'SUCCEEDED',
  }).catch((err) =>
    console.error('[webhook] intent update failed:', err),
  )
  await redis.del(`checkout:context:${payload.invoiceNo}`).catch(() => {})

  if (order.user_id) {
    const { notifyOrderReceipt } = await import('../messaging')
    await notifyOrderReceipt({
      userId: order.user_id,
      orderId: payload.invoiceNo,
      orderRef: order.order_ref,
      totalAmount: String(order.total),
      currency: order.currency,
    }).catch(() => {})

    earnPointsForOrder({
      userId: order.user_id,
      orderId: payload.invoiceNo,
    }).catch((err) =>
      console.error('[payments] earn points failed:', err),
    )
  }

  return { status: 'confirmed' }
}

// —— getPaymentStatus ——

export interface GetPaymentStatusResult {
  orderId: string
  orderRef: string
  orderState: string
  paymentState: string
  intent: {
    id: string
    status: string
    amount: string
    currency: string
  } | null
}

export async function getPaymentStatus({
  orderId,
  userId,
  guestEmail,
}: {
  orderId: string
  userId?: string | null
  guestEmail?: string | null
}): Promise<GetPaymentStatusResult> {
  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404)

  if (userId != null) {
    if (order.user_id !== userId) throw new AppError('ORDER_ACCESS_DENIED', 403)
  } else if (guestEmail != null) {
    const orderGuest = order.guest_email?.trim().toLowerCase() ?? ''
    const requestedGuest = guestEmail.trim().toLowerCase()
    if (orderGuest !== requestedGuest) {
      throw new AppError('ORDER_ACCESS_DENIED', 403)
    }
  } else {
    throw new AppError('ORDER_ACCESS_DENIED', 403)
  }

  const intent = await getPaymentIntentByOrderId({ orderId })

  return {
    orderId: order.id,
    orderRef: order.order_ref,
    orderState: order.order_state,
    paymentState: order.payment_state,
    intent: intent
      ? {
          id: intent.id,
          status: intent.status,
          amount: String(intent.amount),
          currency: intent.currency,
        }
      : null,
  }
}
