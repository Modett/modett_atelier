/**
 * Payments service — createPaymentSession, handleWebhook, getPaymentStatus.
 *
 * Payment flow (PAYable CDN SDK v3):
 *   POST /payments/session → server generates checkValue, returns snake_case params to frontend
 *   Frontend CDN SDK (window.payable.startPayment) → opens PAYable popup
 *   PAYable webhook → POST /payments/webhook → confirms order atomically
 *
 * Security rules (non-negotiable):
 *   - checkValue generated server-side; merchantToken never leaves the server
 *   - Webhook: checkValue ALWAYS verified as the FIRST operation
 *   - Idempotency: Layer-1 Redis read → Layer-2 DB unique constraint → Layer-3 Redis write
 *   - Amount: always derived from order.total (server-authoritative), never from frontend
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
  stampPaymentSubmitted,
} from '@modett/db'
import { earnPointsForOrder } from '../loyalty'

type CurrencyCode = 'LKR' | 'SGD' | 'USD'

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505'
}

// PAYable ONLY accepts LKR — convert other currencies
const TO_LKR: Record<string, number> = {
  LKR: 1,
  SGD: 230,
  USD: 310,
}

// ——— createPaymentSession ———

export interface CreatePaymentSessionParams {
  orderId: string
  reservationId: string
  cartId: string
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

/** Snake_case params passed directly to window.payable.startPayment() on the frontend. */
export interface PayableSDKParams {
  merchant_key: string
  check_value: string
  invoice_id: string
  amount: string
  currency_code: string
  payment_type: string
  order_description: string
  notify_url: string
  return_url: string
  cancel_url: string
  logo_url: string
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
  custom_2: string
}

export interface CreatePaymentSessionResult {
  intentId: string
  orderId: string
  orderRef: string
  sandboxMode: boolean
  paymentParams: PayableSDKParams
}

export async function createPaymentSession(
  params: CreatePaymentSessionParams,
): Promise<CreatePaymentSessionResult> {
  const {
    orderId,
    reservationId,
    cartId,
    customerFirstName,
    customerLastName,
    customerEmail,
    customerMobilePhone,
    billingAddress,
  } = params

  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404)
  if (order.order_state !== 'DRAFT') throw new AppError('ORDER_NOT_DRAFT', 409)

  // Server-authoritative amount from DB (includes subtotal + shipping + tax)
  const originalAmount = new Decimal(String(order.total))

  // PAYable only accepts LKR — convert from order currency
  const lkrAmount = order.currency === 'LKR'
    ? originalAmount.toFixed(2)
    : originalAmount.mul(TO_LKR[order.currency] ?? 1).toDecimalPlaces(2).toFixed(2)

  // PAYable invoiceId ≤ 20 chars — orderRef is "MOD-YYYYNNNNN" = 13 chars
  const invoiceRef = order.order_ref

  const checkValue = generateCheckValue({
    invoiceId: invoiceRef,
    amount: lkrAmount,
    currencyCode: 'LKR',
  })

  const webhookUrl =
    process.env.PAYABLE_WEBHOOK_URL ??
    `${payableConfig.apiUrl}/api/payments/webhook`

  const paymentParams: PayableSDKParams = {
    merchant_key: payableConfig.merchantKey,
    check_value: checkValue,
    invoice_id: invoiceRef,
    amount: lkrAmount,
    currency_code: 'LKR',
    payment_type: 'ONE_TIME_PAYMENT',
    order_description: 'Modett Order',
    notify_url: webhookUrl,
    return_url: `${payableConfig.frontendUrl}/checkout/confirm/${orderId}`,
    cancel_url: `${payableConfig.frontendUrl}/checkout`,
    logo_url: payableConfig.logoUrl,
    customer_first_name: customerFirstName,
    customer_last_name: customerLastName,
    customer_email: customerEmail,
    customer_mobile_phone: customerMobilePhone,
    customer_phone: customerMobilePhone,
    billing_address_street: billingAddress.street,
    billing_address_city: billingAddress.city,
    billing_address_province: billingAddress.province || billingAddress.city,
    billing_address_country: 'LKA',
    billing_address_postcode: billingAddress.postcode || '0000',
    custom_1: orderId,
    custom_2: reservationId,
  }

  // If a PENDING intent already exists, return cached params (same checkValue)
  const existing = await getPaymentIntentByOrderId({ orderId })
  if (existing && existing.status === 'PENDING') {
    return {
      intentId: existing.id,
      orderId,
      orderRef: order.order_ref,
      sandboxMode: payableConfig.sandboxMode,
      paymentParams,
    }
  }

  // Stamp payment_submitted_at — starts the 10-min grace window for the expiry worker
  await stampPaymentSubmitted({ reservationId })

  // Cache reservation context for the webhook handler
  await redis.set(
    `checkout:context:${orderId}`,
    JSON.stringify({ reservationId, cartId }),
    'EX',
    3600,
  )

  // Create payment intent record (providerIntentId = orderRef before we get PAYable's ID)
  const paymentIntent = await createPaymentIntent({
    orderId,
    providerIntentId: invoiceRef,
    amount: lkrAmount,
    currency: 'LKR' as CurrencyCode,
  })

  return {
    intentId: paymentIntent.id,
    orderId,
    orderRef: order.order_ref,
    sandboxMode: payableConfig.sandboxMode,
    paymentParams,
  }
}

// ——— handleWebhook ———

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
  // Rule 8.1: checkValue MUST be the VERY FIRST check — no exceptions
  if (!payload.checkValue) {
    throw new AppError('WEBHOOK_INVALID_CHECKVALUE', 400)
  }
  const valid = verifyCallbackCheckValue(payload)
  if (!valid) {
    throw new AppError('WEBHOOK_INVALID_CHECKVALUE', 400)
  }

  const txId = payload.payableTransactionId
  // custom1 carries the full UUID orderId (invoiceNo is the orderRef ≤ 20 chars)
  const orderId = payload.custom1 ?? payload.invoiceNo

  if (!txId || !orderId) {
    console.error('[webhook] Missing transactionId or orderId in payload')
    return { status: 'unknown_status' }
  }

  // Layer 1 idempotency — fast Redis read
  const redisKey = `payment:event:${txId}`
  const hit = await redis.get(redisKey)
  if (hit) return { status: 'already_processed' }

  const statusCode = Number(payload.statusCode)
  const isFailure = statusCode === 2
  const isSuccess = statusCode === 1

  if (isFailure) {
    try {
      await createPaymentTransaction({
        orderId,
        providerChargeId: txId,
        status: 'FAILED',
        amount: payload.payableAmount ?? '0',
        currency: (payload.payableCurrency as CurrencyCode) ?? 'LKR',
        rawPayloadJson: payload as unknown as Record<string, unknown>,
      })
    } catch (err) {
      if (isUniqueViolation(err)) return { status: 'already_processed' }
      throw err
    }

    // Layer 3 idempotency — cache after successful DB write
    await redis.set(redisKey, '1', 'EX', 86400).catch(() => {})

    await updatePaymentIntentStatus({
      orderId,
      newStatus: 'FAILED',
    }).catch((err) => console.error('[webhook] intent update failed:', err))

    await appendOrderEvent({
      orderId,
      eventType: 'PAYMENT_FAILED',
      payloadJson: {
        payableTransactionId: txId,
        statusMessage: payload.statusMessage,
      },
    }).catch((err) => console.error('[webhook] appendOrderEvent failed:', err))

    return { status: 'recorded_failure' }
  }

  if (!isSuccess) {
    // Unknown status codes: log and return 200 to PAYable (per rule 8.4)
    console.warn('[webhook] Unknown statusCode:', payload.statusCode, payload.statusMessage)
    return { status: 'unknown_status' }
  }

  // SUCCESS path
  const order = await getOrderById({ id: orderId })
  if (!order) {
    console.error(`[webhook] Order not found: ${orderId}`)
    return { status: 'order_not_found' }
  }

  const orderItems = await getOrderItems({ orderId: order.id })

  const contextRaw = await redis.get(`checkout:context:${orderId}`)
  if (!contextRaw) {
    console.error(`[webhook] Context missing for order: ${orderId}`)
    return { status: 'context_missing' }
  }
  const { reservationId, cartId } = JSON.parse(contextRaw) as {
    reservationId: string
    cartId: string
  }

  // Layer 2 idempotency — DB unique constraint on provider_charge_id
  try {
    await confirmOrderTransaction({
      orderId,
      reservationId,
      cartId,
      providerChargeId: txId,
      amount: payload.payableAmount ?? String(order.total),
      currency: (payload.payableCurrency as CurrencyCode) ?? order.currency,
      rawPayloadJson: payload as unknown as Record<string, unknown>,
      items: orderItems
        .filter((i) => i.variant_id != null)
        .map((i) => ({ variantId: i.variant_id!, qty: i.qty })),
    })
  } catch (err) {
    if (isUniqueViolation(err)) return { status: 'already_processed' }
    throw err
  }

  // Layer 3 idempotency — cache after successful DB transaction
  await redis.set(redisKey, '1', 'EX', 86400).catch(() => {})

  await updatePaymentIntentStatus({
    orderId,
    newStatus: 'SUCCEEDED',
  }).catch((err) => console.error('[webhook] intent update failed:', err))

  // Clean up session caches
  await redis.del(`checkout:context:${orderId}`).catch(() => {})
  await redis.del(`payable:session:${orderId}`).catch(() => {})

  // Post-confirmation side effects (best-effort — never fail the webhook)
  if (order.user_id) {
    const { notifyOrderReceipt } = await import('../messaging')
    await notifyOrderReceipt({
      userId: order.user_id,
      orderId,
      orderRef: order.order_ref,
      totalAmount: String(order.total),
      currency: order.currency,
    }).catch(() => {})

    earnPointsForOrder({
      userId: order.user_id,
      orderId,
    }).catch((err) => console.error('[payments] earn points failed:', err))
  }

  return { status: 'confirmed' }
}

// ——— getPaymentStatus ———

export interface PurchaseAnalyticsPayload {
  totalValue: string
  currency:   string
  items:      Array<{
    variantId: string
    productId: string
    color:     string
    size:      string
    qty:       number
    unitPrice: string
  }>
}

export interface GetPaymentStatusResult {
  orderId: string
  orderRef: string
  orderState: string
  paymentState: string
  userId: string | null
  intent: {
    id: string
    status: string
    amount: string
    currency: string
  } | null
  /** Present when payment has completed — used for storefront analytics only. */
  purchaseAnalytics: PurchaseAnalyticsPayload | null
}

function snapshotProductId(snap: Record<string, unknown>): string {
  const v = snap.product_id ?? snap.productId
  return typeof v === 'string' ? v : ''
}

function snapshotColor(snap: Record<string, unknown>): string {
  const v = snap.color ?? snap.colour
  return typeof v === 'string' ? v : String(v ?? '')
}

function snapshotSize(snap: Record<string, unknown>): string {
  const v = snap.size
  return typeof v === 'string' ? v : String(v ?? '')
}

async function buildPurchaseAnalytics(orderId: string): Promise<PurchaseAnalyticsPayload | null> {
  const order = await getOrderById({ id: orderId })
  if (!order) return null
  const rows = await getOrderItems({ orderId })
  const items = rows.map((oi) => {
    const snap = (oi.product_snapshot_json ?? {}) as Record<string, unknown>
    return {
      variantId: oi.variant_id ?? '',
      productId: snapshotProductId(snap),
      color:     snapshotColor(snap),
      size:      snapshotSize(snap),
      qty:       oi.qty,
      unitPrice: String(oi.unit_price_snapshot_amount),
    }
  })
  return {
    totalValue: String(order.total),
    currency:   order.currency,
    items,
  }
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
    if (orderGuest !== requestedGuest) throw new AppError('ORDER_ACCESS_DENIED', 403)
  } else {
    throw new AppError('ORDER_ACCESS_DENIED', 403)
  }

  const intent = await getPaymentIntentByOrderId({ orderId })

  const paid =
    order.payment_state === 'PAID'
    || (intent != null && intent.status === 'SUCCEEDED')

  let purchaseAnalytics: PurchaseAnalyticsPayload | null = null
  if (paid) {
    purchaseAnalytics = await buildPurchaseAnalytics(order.id)
  }

  return {
    orderId: order.id,
    orderRef: order.order_ref,
    orderState: order.order_state,
    paymentState: order.payment_state,
    userId: order.user_id ?? null,
    intent: intent
      ? {
          id: intent.id,
          status: intent.status,
          amount: String(intent.amount),
          currency: intent.currency,
        }
      : null,
    purchaseAnalytics,
  }
}
