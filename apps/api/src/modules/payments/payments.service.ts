/**
 * Payments service — createPaymentSession, payWithSavedCard, handleWebhook,
 * listSavedCards, deleteSavedCard, getPaymentStatus.
 *
 * Payment flows:
 *
 *   1. ONE_TIME (default — guest or `saveCard=false`)
 *      POST /payments/session  → server generates one-time checkValue, returns
 *                                params { payment_type: '1' } for SDK popup.
 *      PAYable popup → notify_url webhook → confirm order atomically.
 *
 *   2. TOKENIZE (logged-in user + `saveCard=true`)
 *      POST /payments/session  → server generates tokenize checkValue with
 *                                stable customerRefNo (derived from userId),
 *                                returns params { payment_type: '3',
 *                                isSaveCard: '1', doFirstPayment: '1' }.
 *      PAYable popup → notify_url webhook (carries `token` object) →
 *      confirm order + insert saved_cards row atomically.
 *
 *   3. SAVED_CARD_PAY (repeat customer paying with a previously-saved card)
 *      POST /payments/saved-cards/:id/pay → server-to-server POST to
 *      PAYable /ipg/v2/tokenize/pay using Bearer accessToken. PAYable returns
 *      result inline AND fires the webhook; DB unique constraint on
 *      provider_charge_id deduplicates.
 *
 *   4. RECURRING (subscription — admin/future)
 *      createRecurringPaymentSession() builds a paymentType=2 param set with
 *      startDate/endDate/interval. Not wired to the checkout UI by default.
 *
 * Security invariants (do not relax):
 *   - merchantToken/businessToken never leave the server.
 *   - Amount always derived from order.total (server-authoritative).
 *   - Tokenization is only enabled for authenticated users; guests can never
 *     trigger paymentType=3.
 *   - customerRefNo derived from userId; never accepted from request body.
 *   - Webhook: checkValue MUST be the FIRST check before reading any field.
 *   - 3-layer idempotency (Redis read → DB unique constraint → Redis write).
 *   - Saved-card ownership verified before any operation on it.
 */

import Decimal from 'decimal.js'
import { AppError } from '../../lib/errors'
import {
  payableConfig,
  getOneTimeCheckValue,
  getTokenizeCheckValue,
  verifyCallbackCheckValue,
  getWebhookUrl,
  getCustomerRefNo,
  payWithSavedCardRequest,
  deleteSavedCardRequest,
  toAlpha3,
  PAYMENT_TYPE,
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
  listSavedCardsByUser,
  getSavedCardOwnedByUser,
  softDeleteSavedCard,
  setDefaultSavedCard as setDefaultSavedCardQuery,
} from '@modett/db'
import type { SavedCard } from '@modett/db'
import { earnPointsForOrder } from '../loyalty'

type CurrencyCode = 'LKR' | 'SGD' | 'USD'

function isUniqueViolation(err: unknown): boolean {
  return (err as { code?: string })?.code === '23505'
}

/**
 * PAYable ONLY accepts LKR — convert other currencies. These are floor rates
 * used to ensure the LKR amount the gateway sees is correct; the order's
 * source-of-truth amount remains in the order's native currency.
 */
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
  /**
   * Authenticated user id (from optionalAuth middleware). Required to enable
   * tokenization. Guests cannot tokenize — the server forces ONE_TIME.
   */
  userId?: string | null
  /** Save the card for future use (only honored when `userId` is present). */
  saveCard?: boolean
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
  /** Tokenize-only — present when payment_type === '3' */
  is_save_card?: string
  do_first_payment?: string
  customer_ref_no?: string
}

export interface CreatePaymentSessionResult {
  intentId: string
  orderId: string
  orderRef: string
  sandboxMode: boolean
  paymentType: 'ONE_TIME' | 'TOKENIZE'
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
    userId,
    saveCard,
  } = params

  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404)
  if (order.order_state !== 'DRAFT') throw new AppError('ORDER_NOT_DRAFT', 409)

  // Server-authoritative amount from DB.
  const originalAmount = new Decimal(String(order.total))
  const lkrAmount = order.currency === 'LKR'
    ? originalAmount.toFixed(2)
    : originalAmount.mul(TO_LKR[order.currency] ?? 1).toDecimalPlaces(2).toFixed(2)

  const invoiceRef = order.order_ref

  // Tokenization is server-decided: only logged-in users + explicit saveCard=true
  // can ever trigger paymentType=3. Guests are forced to ONE_TIME.
  const willTokenize = Boolean(userId && saveCard)
  const paymentTypeWire = willTokenize ? PAYMENT_TYPE.TOKENIZE : PAYMENT_TYPE.ONE_TIME
  const paymentTypeColumn = willTokenize ? 'TOKENIZE' : 'ONE_TIME'

  // customerRefNo is derived from userId — never client-supplied.
  const customerRefNo = userId ? getCustomerRefNo(userId) : ''

  const checkValue = willTokenize
    ? getTokenizeCheckValue({
        invoiceId: invoiceRef,
        amount: lkrAmount,
        currencyCode: 'LKR',
        customerRefNo,
      })
    : getOneTimeCheckValue({
        invoiceId: invoiceRef,
        amount: lkrAmount,
        currencyCode: 'LKR',
      })

  const returnUrl = payableConfig.returnUrlBase
    ? payableConfig.returnUrlBase.replace('{orderId}', orderId)
    : `${payableConfig.frontendUrl}/checkout/confirm/${orderId}`

  const cancelUrl = payableConfig.cancelUrl || `${payableConfig.frontendUrl}/checkout`

  const baseParams: PayableSDKParams = {
    merchant_key:              payableConfig.merchantKey,
    check_value:               checkValue,
    invoice_id:                invoiceRef,
    amount:                    lkrAmount,
    currency_code:             'LKR',
    payment_type:              paymentTypeWire,
    order_description:         `Modett Order ${invoiceRef}`,
    notify_url:                getWebhookUrl(),
    return_url:                returnUrl,
    cancel_url:                cancelUrl,
    logo_url:                  payableConfig.logoUrl,
    customer_first_name:       customerFirstName,
    customer_last_name:        customerLastName,
    customer_email:            customerEmail,
    customer_mobile_phone:     customerMobilePhone,
    customer_phone:            customerMobilePhone,
    billing_address_street:    billingAddress.street,
    billing_address_city:      billingAddress.city,
    billing_address_province:  billingAddress.province || billingAddress.city,
    billing_address_country:   toAlpha3(billingAddress.country || 'LK'),
    billing_address_postcode:  billingAddress.postcode || '0000',
    custom_1:                  orderId,
    custom_2:                  reservationId,
  }

  const paymentParams: PayableSDKParams = willTokenize
    ? {
        ...baseParams,
        is_save_card:     '1',
        do_first_payment: '1',
        customer_ref_no:  customerRefNo,
      }
    : baseParams

  // Idempotent — if a PENDING intent already exists, return the cached params.
  const existing = await getPaymentIntentByOrderId({ orderId })
  if (existing && existing.status === 'PENDING') {
    return {
      intentId: existing.id,
      orderId,
      orderRef: order.order_ref,
      sandboxMode: payableConfig.sandboxMode,
      paymentType: paymentTypeColumn,
      paymentParams,
    }
  }

  // Stamp payment_submitted_at — starts the 10-min grace window.
  await stampPaymentSubmitted({ reservationId })

  // Cache reservation context for the webhook handler. Tokenize callbacks need
  // userId to insert the saved_cards row.
  await redis.set(
    `checkout:context:${orderId}`,
    JSON.stringify({ reservationId, cartId, userId: userId ?? null, customerRefNo }),
    'EX',
    3600,
  )

  const paymentIntent = await createPaymentIntent({
    orderId,
    providerIntentId: invoiceRef,
    amount: lkrAmount,
    currency: 'LKR' as CurrencyCode,
    paymentType: paymentTypeColumn,
  })

  return {
    intentId: paymentIntent.id,
    orderId,
    orderRef: order.order_ref,
    sandboxMode: payableConfig.sandboxMode,
    paymentType: paymentTypeColumn,
    paymentParams,
  }
}

// ——— payWithSavedCard ———

export interface PayWithSavedCardResult {
  status: 'confirmed' | 'failed' | 'pending'
  orderId: string
  orderRef: string
  payableTransactionId?: string
  statusMessage?: string
}

/**
 * Charge an existing saved card token. Server-to-server. The PAYable webhook
 * will also fire — DB unique constraint on provider_charge_id deduplicates.
 *
 * The caller (route handler) must have authenticated the user; we re-verify
 * card ownership against userId here.
 */
export async function payWithSavedCard({
  orderId,
  savedCardId,
  userId,
}: {
  orderId: string
  savedCardId: string
  userId: string
}): Promise<PayWithSavedCardResult> {
  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404)
  if (order.order_state !== 'DRAFT') throw new AppError('ORDER_NOT_DRAFT', 409)
  if (order.user_id !== userId) throw new AppError('ORDER_ACCESS_DENIED', 403)

  const savedCard = await getSavedCardOwnedByUser({ id: savedCardId, userId })
  if (!savedCard) throw new AppError('SAVED_CARD_NOT_FOUND', 404)
  if (!savedCard.payable_customer_id) {
    throw new AppError('SAVED_CARD_MISSING_CUSTOMER_ID', 409)
  }

  const originalAmount = new Decimal(String(order.total))
  const lkrAmount = order.currency === 'LKR'
    ? originalAmount.toFixed(2)
    : originalAmount.mul(TO_LKR[order.currency] ?? 1).toDecimalPlaces(2).toFixed(2)

  const intent = await getPaymentIntentByOrderId({ orderId })
  if (!intent || intent.status !== 'PENDING') {
    await createPaymentIntent({
      orderId,
      providerIntentId: order.order_ref,
      amount: lkrAmount,
      currency: 'LKR' as CurrencyCode,
      paymentType: 'SAVED_CARD_PAY',
      savedCardId,
    })
  }

  const contextKey = `checkout:context:${orderId}`
  const contextRaw = await redis.get(contextKey)
  if (!contextRaw) {
    throw new AppError('CHECKOUT_CONTEXT_MISSING', 409)
  }

  const resp = await payWithSavedCardRequest({
    invoiceId:    order.order_ref,
    amount:       lkrAmount,
    currencyCode: 'LKR',
    customerId:   savedCard.payable_customer_id,
    tokenId:      savedCard.token_id,
    custom1:      orderId,
  })

  const statusCode = Number(resp.statusCode ?? 0)
  const isSuccess = statusCode === 1

  if (!isSuccess) {
    const txId = resp.payableTransactionId ?? `failed-${orderId}-${Date.now()}`
    try {
      await createPaymentTransaction({
        orderId,
        providerChargeId: txId,
        status: 'FAILED',
        amount: lkrAmount,
        currency: 'LKR' as CurrencyCode,
        paymentType: 'SAVED_CARD_PAY',
        rawPayloadJson: resp as unknown as Record<string, unknown>,
      })
    } catch (err) {
      if (!isUniqueViolation(err)) throw err
    }
    await updatePaymentIntentStatus({ orderId, newStatus: 'FAILED' }).catch(() => {})
    await appendOrderEvent({
      orderId,
      eventType: 'PAYMENT_FAILED',
      payloadJson: {
        provider: 'payable',
        method: 'saved_card_pay',
        statusMessage: resp.statusMessage ?? 'Saved-card charge failed',
      },
    }).catch(() => {})

    return {
      status: 'failed',
      orderId,
      orderRef: order.order_ref,
      payableTransactionId: resp.payableTransactionId,
      statusMessage: resp.statusMessage,
    }
  }

  const txId = resp.payableTransactionId
  if (!txId) throw new AppError('PAYABLE_NO_TRANSACTION_ID', 502)

  const { reservationId, cartId } = JSON.parse(contextRaw) as {
    reservationId: string
    cartId: string
  }

  const orderItems = await getOrderItems({ orderId })

  // Same atomic 6-step confirmation as the webhook path. The webhook may also
  // arrive — the DB unique constraint on provider_charge_id deduplicates.
  try {
    await confirmOrderTransaction({
      orderId,
      reservationId,
      cartId,
      providerChargeId: txId,
      amount: lkrAmount,
      currency: 'LKR' as CurrencyCode,
      paymentType: 'SAVED_CARD_PAY',
      rawPayloadJson: resp as unknown as Record<string, unknown>,
      items: orderItems
        .filter((i) => i.variant_id != null)
        .map((i) => ({ variantId: i.variant_id!, qty: i.qty })),
    })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return {
        status: 'confirmed',
        orderId,
        orderRef: order.order_ref,
        payableTransactionId: txId,
      }
    }
    throw err
  }

  // Cache event ID and the intent flip for the (likely) subsequent webhook.
  await redis.set(`payment:event:${txId}`, '1', 'EX', 86400).catch(() => {})
  await updatePaymentIntentStatus({ orderId, newStatus: 'SUCCEEDED' }).catch(() => {})
  await redis.del(contextKey).catch(() => {})

  if (order.user_id) {
    const { notifyOrderReceipt } = await import('../messaging')
    notifyOrderReceipt({
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

  return {
    status: 'confirmed',
    orderId,
    orderRef: order.order_ref,
    payableTransactionId: txId,
  }
}

// ——— Saved-card management ———

export interface SavedCardSummary {
  id: string
  maskedCardNo: string
  cardScheme: string | null
  cardHolderName: string | null
  cardExp: string | null
  nickname: string | null
  isDefault: boolean
  createdAt: string
}

function toSummary(card: SavedCard): SavedCardSummary {
  return {
    id:             card.id,
    maskedCardNo:   card.masked_card_no,
    cardScheme:     card.card_scheme,
    cardHolderName: card.card_holder_name,
    cardExp:        card.card_exp,
    nickname:       card.nickname,
    isDefault:      card.is_default,
    createdAt:      card.created_at.toISOString(),
  }
}

export async function listSavedCards({
  userId,
}: {
  userId: string
}): Promise<{ cards: SavedCardSummary[] }> {
  const rows = await listSavedCardsByUser({ userId })
  return { cards: rows.map(toSummary) }
}

/** Soft-delete locally, then best-effort delete on PAYable. Local is authoritative. */
export async function deleteSavedCard({
  savedCardId,
  userId,
}: {
  savedCardId: string
  userId: string
}): Promise<{ ok: true }> {
  const card = await getSavedCardOwnedByUser({ id: savedCardId, userId })
  if (!card) throw new AppError('SAVED_CARD_NOT_FOUND', 404)

  const removed = await softDeleteSavedCard({ id: savedCardId, userId })
  if (!removed) throw new AppError('SAVED_CARD_NOT_FOUND', 404)

  // Best-effort: tell PAYable to remove the token too. Failures here are logged
  // but don't fail the request — the local card is already inaccessible.
  if (card.payable_customer_id) {
    deleteSavedCardRequest({
      customerId: card.payable_customer_id,
      tokenId:    card.token_id,
    })
      .then((r) => {
        if (!r.ok) {
          console.warn('[payments] PAYable deleteCard non-OK:', r.status, r.body)
        }
      })
      .catch((err) => console.error('[payments] PAYable deleteCard failed:', err))
  }

  return { ok: true }
}

export async function setDefaultSavedCard({
  savedCardId,
  userId,
}: {
  savedCardId: string
  userId: string
}): Promise<{ ok: true }> {
  const card = await getSavedCardOwnedByUser({ id: savedCardId, userId })
  if (!card) throw new AppError('SAVED_CARD_NOT_FOUND', 404)
  await setDefaultSavedCardQuery({ id: savedCardId, userId })
  return { ok: true }
}

// ——— handleWebhook ———

export type HandleWebhookResult =
  | { status: 'already_processed' }
  | { status: 'recorded_failure' }
  | { status: 'unknown_status' }
  | { status: 'order_not_found' }
  | { status: 'context_missing' }
  | { status: 'confirmed'; savedCardId: string | null }

export async function handleWebhook({
  payload,
}: {
  payload: PayableWebhookPayload
}): Promise<HandleWebhookResult> {
  // Rule 8.1: checkValue MUST be the VERY FIRST check — no exceptions.
  if (!payload.checkValue) {
    throw new AppError('WEBHOOK_INVALID_CHECKVALUE', 400)
  }
  const valid = verifyCallbackCheckValue(payload)
  if (!valid) {
    throw new AppError('WEBHOOK_INVALID_CHECKVALUE', 400)
  }

  const txId = payload.payableTransactionId
  // custom1 carries the full UUID orderId (invoiceNo is the orderRef ≤ 20 chars).
  const orderId = payload.custom1 ?? payload.invoiceNo

  if (!txId || !orderId) {
    console.error('[webhook] Missing transactionId or orderId in payload')
    return { status: 'unknown_status' }
  }

  // Layer 1 idempotency — fast Redis read.
  const redisKey = `payment:event:${txId}`
  const hit = await redis.get(redisKey)
  if (hit) return { status: 'already_processed' }

  const statusCode = Number(payload.statusCode)
  const isFailure = statusCode === 2
  const isSuccess = statusCode === 1
  const isTokenize = Boolean(payload.customerRefNo || payload.token)
  const paymentTypeColumn = isTokenize ? 'TOKENIZE' : 'ONE_TIME'

  if (isFailure) {
    try {
      await createPaymentTransaction({
        orderId,
        providerChargeId: txId,
        status: 'FAILED',
        amount: payload.payableAmount ?? '0',
        currency: (payload.payableCurrency as CurrencyCode) ?? 'LKR',
        paymentType: paymentTypeColumn,
        rawPayloadJson: payload as unknown as Record<string, unknown>,
      })
    } catch (err) {
      if (isUniqueViolation(err)) return { status: 'already_processed' }
      throw err
    }

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
        paymentType: paymentTypeColumn,
      },
    }).catch((err) => console.error('[webhook] appendOrderEvent failed:', err))

    return { status: 'recorded_failure' }
  }

  if (!isSuccess) {
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
  const ctx = JSON.parse(contextRaw) as {
    reservationId: string
    cartId: string
    userId?: string | null
    customerRefNo?: string
  }

  // Build the optional saveCard insert payload for tokenize callbacks.
  let saveCard:
    | {
        userId: string
        customerRefNo: string
        payableCustomerId: string | null
        tokenId: string
        maskedCardNo: string
        cardScheme: string | null
        cardHolderName: string | null
        cardExp: string | null
      }
    | null = null

  if (isTokenize && ctx.userId && payload.token?.tokenId) {
    const cardScheme = payload.paymentScheme ?? null
    saveCard = {
      userId:            ctx.userId,
      customerRefNo:     payload.customerRefNo ?? ctx.customerRefNo ?? '',
      payableCustomerId: payload.customerId ?? null,
      tokenId:           payload.token.tokenId,
      maskedCardNo:      payload.token.maskedCardNo ?? payload.cardNumber ?? '',
      cardScheme,
      cardHolderName:    payload.cardHolderName ?? null,
      cardExp:           payload.token.exp ?? null,
    }
  }

  // Layer 2 idempotency — DB unique constraint on provider_charge_id.
  let savedCardId: string | null = null
  try {
    const result = await confirmOrderTransaction({
      orderId,
      reservationId: ctx.reservationId,
      cartId: ctx.cartId,
      providerChargeId: txId,
      amount: payload.payableAmount ?? String(order.total),
      currency: (payload.payableCurrency as CurrencyCode) ?? order.currency,
      paymentType: paymentTypeColumn,
      rawPayloadJson: payload as unknown as Record<string, unknown>,
      items: orderItems
        .filter((i) => i.variant_id != null)
        .map((i) => ({ variantId: i.variant_id!, qty: i.qty })),
      saveCard,
    })
    savedCardId = result.savedCardId
  } catch (err) {
    if (isUniqueViolation(err)) return { status: 'already_processed' }
    throw err
  }

  // Layer 3 idempotency — cache event ID after the DB transaction.
  await redis.set(redisKey, '1', 'EX', 86400).catch(() => {})

  await updatePaymentIntentStatus({
    orderId,
    newStatus: 'SUCCEEDED',
  }).catch((err) => console.error('[webhook] intent update failed:', err))

  await redis.del(`checkout:context:${orderId}`).catch(() => {})
  await redis.del(`payable:session:${orderId}`).catch(() => {})

  // Post-confirmation side effects — best-effort, never fail the webhook.
  if (order.user_id) {
    const { notifyOrderReceipt } = await import('../messaging')
    notifyOrderReceipt({
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

  return { status: 'confirmed', savedCardId }
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
    paymentType: string
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
          paymentType: intent.payment_type,
        }
      : null,
    purchaseAnalytics,
  }
}
