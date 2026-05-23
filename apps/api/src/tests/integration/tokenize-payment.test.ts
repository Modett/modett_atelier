/**
 * Integration tests for the PAYable TOKENIZE_PAYMENT (paymentType=3) flow.
 *
 *   1. Happy path: webhook with a `token` payload + matching checkValue
 *      confirms the order AND persists a row in payments.saved_cards
 *      atomically.
 *   2. Tokenize webhook with a tampered checkValue is rejected.
 *   3. Duplicate tokenize webhook is idempotent (Redis layer-1 + DB layer-2).
 *
 * Real DB, real Redis. Same fileParallelism: false / singleThread setup as
 * the other integration tests.
 */

import crypto from 'node:crypto'
import { describe, it, expect, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, redis } from '@modett/db'

const sha512 = (s: string) =>
  crypto.createHash('sha512').update(s).digest('hex').toUpperCase()

const MERCHANT_KEY   = process.env.PAYABLE_MERCHANT_KEY   ?? '400F6EF820842EAC'
const MERCHANT_TOKEN = process.env.PAYABLE_MERCHANT_TOKEN ?? 'test_merchant_token_replace_me'

async function truncateForTest(): Promise<void> {
  await db.execute(sql`
    TRUNCATE
      payments.saved_cards,
      cart.reservation_items,
      cart.reservations,
      orders.order_events,
      orders.order_addresses,
      orders.order_contacts,
      orders.order_items,
      orders.orders,
      cart.cart_items,
      cart.carts,
      payments.payment_transactions,
      payments.payment_intents,
      inventory.variant_stock,
      inventory.product_variants,
      catalog.products,
      iam.users
    CASCADE
  `)
  await redis.flushdb()
}

interface TokenizeScenario {
  orderId:        string
  orderRef:       string
  reservationId:  string
  cartId:         string
  variantId:      string
  userId:         string
  customerRefNo:  string
}

async function seedDraftOrderForUser({
  emailSuffix,
  orderRef,
}: {
  emailSuffix: string
  orderRef:    string
}): Promise<TokenizeScenario> {
  const userRow = await db.execute(sql`
    INSERT INTO iam.users (email, password_hash, first_name, last_name)
    VALUES (${`tokenize-${emailSuffix}@modett.com`}, 'hash', 'Tokenize', 'Tester')
    RETURNING id
  `)
  const userId = (userRow.rows[0] as { id: string }).id

  const prodRow = await db.execute(sql`
    INSERT INTO catalog.products (display_name, short_name, slug, product_code, active)
    VALUES (${`Token Shirt ${emailSuffix}`}, 'Shirt', ${`tok-shirt-${emailSuffix}`}, ${`TK${emailSuffix}`}, true)
    RETURNING id
  `)
  const productId = (prodRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO catalog.product_prices (product_id, lkr_amount, sgd_amount, usd_amount)
    VALUES (${productId}, 2500.00, 18.00, 12.00)
  `)

  const varRow = await db.execute(sql`
    INSERT INTO inventory.product_variants (product_id, color, size, sku_group)
    VALUES (${productId}, 'Black', 'M', ${`TK${emailSuffix}-BLK-M`})
    RETURNING id
  `)
  const variantId = (varRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO inventory.variant_stock (variant_id, in_stock_qty, held_qty)
    VALUES (${variantId}, 5, 1)
  `)

  const cartRow = await db.execute(sql`
    INSERT INTO cart.carts (user_id, session_id, status, expires_at)
    VALUES (${userId}, ${`sess-tok-${emailSuffix}`}, 'ACTIVE', now() + interval '1 day')
    RETURNING id
  `)
  const cartId = (cartRow.rows[0] as { id: string }).id

  const orderRow = await db.execute(sql`
    INSERT INTO orders.orders
      (order_ref, user_id, order_state, payment_state, fulfillment_state,
       return_state, currency, country_code,
       subtotal, discount_amount, shipping_cost, tax_amount,
       tax_rate_snapshot, total)
    VALUES
      (${orderRef}, ${userId}, 'DRAFT', 'UNPAID', 'NOT_STARTED',
       'NONE', 'LKR', 'LK', 2500.00, 0, 0, 0, 0, 2500.00)
    RETURNING id
  `)
  const orderId = (orderRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO orders.order_items
      (order_id, variant_id, qty,
       unit_price_snapshot_amount, unit_price_snapshot_currency,
       tax_amount, product_snapshot_json)
    VALUES
      (${orderId}, ${variantId}, 1,
       2500.00, 'LKR', 0.00, '{"name":"Token Shirt"}'::jsonb)
  `)

  const resRow = await db.execute(sql`
    INSERT INTO cart.reservations
      (cart_id, user_id, status, expires_at,
       payment_submitted_at, grace_expires_at)
    VALUES
      (${cartId}, ${userId}, 'HELD', now() + interval '25 minutes',
       now() - interval '2 minutes', now() + interval '8 minutes')
    RETURNING id
  `)
  const reservationId = (resRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
    VALUES (${reservationId}, ${variantId}, 1)
  `)

  // customerRefNo is derived in service code; the webhook sets it on the
  // payload directly. We mirror the derivation here — alphanumeric only,
  // matching getCustomerRefNo() in apps/api/src/config/payable.ts.
  const hex = crypto.createHash('sha256').update(userId).digest('hex')
  const customerRefNo = `CUST${hex.slice(0, 16).toUpperCase()}`

  await redis.set(
    `checkout:context:${orderId}`,
    JSON.stringify({ reservationId, cartId, userId, customerRefNo }),
    'EX',
    3600,
  )

  return { orderId, orderRef, reservationId, cartId, variantId, userId, customerRefNo }
}

interface TokenizeWebhookOverrides {
  invoiceNo:             string
  payableTransactionId:  string
  customerRefNo:         string
  tokenId:               string
  payableAmount?:        string
}

function buildTokenizeWebhook(o: TokenizeWebhookOverrides): {
  merchantKey:           string
  payableOrderId:        string
  payableTransactionId:  string
  payableAmount:         string
  payableCurrency:       string
  invoiceNo:             string
  statusCode:            number
  statusMessage:         string
  paymentType:           number
  paymentMethod:         number
  paymentScheme:         string
  customerRefNo:         string
  cardHolderName:        string
  cardNumber:            string
  customerId:            string
  token: {
    tokenId:      string
    maskedCardNo: string
    exp:          string
    tokenStatus:  string
    defaultCard:  number
  }
  checkValue:            string
} {
  const payableOrderId = `oid-${o.tokenId}`
  const payableAmount = o.payableAmount ?? '2500.00'
  const payableCurrency = 'LKR'
  const statusCode = 1

  const tokenHash = sha512(MERCHANT_TOKEN)
  const checkValue = sha512(
    `${MERCHANT_KEY}|${payableOrderId}|${o.payableTransactionId}|` +
      `${payableAmount}|${payableCurrency}|${o.invoiceNo}|${statusCode}|` +
      `${o.customerRefNo}|${tokenHash}`,
  )

  return {
    merchantKey:           MERCHANT_KEY,
    payableOrderId,
    payableTransactionId:  o.payableTransactionId,
    payableAmount,
    payableCurrency,
    invoiceNo:             o.invoiceNo,
    statusCode,
    statusMessage:         'SUCCESS',
    paymentType:           1, // PAYable inherits CARD; we discriminate by customerRefNo/token
    paymentMethod:         1,
    paymentScheme:         'MASTERCARD',
    customerRefNo:         o.customerRefNo,
    cardHolderName:        'KUMUDIKA J',
    cardNumber:            '512345xxxxxx0008',
    customerId:            'PAY-CUST-001',
    token: {
      tokenId:      o.tokenId,
      maskedCardNo: '512345xxxxxx0008',
      exp:          '1227',
      tokenStatus:  'SUCCESS',
      defaultCard:  0,
    },
    checkValue,
  }
}

describe('PAYable TOKENIZE_PAYMENT webhook flow', () => {
  beforeEach(async () => {
    await truncateForTest()
  })

  it('persists a saved_cards row atomically with the order confirmation', async () => {
    const sc = await seedDraftOrderForUser({
      emailSuffix: '001',
      orderRef:    'MOD-20260101',
    })

    const { handleWebhook } = await import(
      '../../modules/payments/payments.service'
    )

    const payload = buildTokenizeWebhook({
      invoiceNo:            sc.orderRef,
      payableTransactionId: 'TXN-TOKENIZE-001',
      customerRefNo:        sc.customerRefNo,
      tokenId:              'TOK-001',
    })

    // custom1 carries the orderId UUID — set it like the service expects
    const payloadWithCustom = { ...payload, custom1: sc.orderId } as typeof payload & {
      custom1: string
    }

    const result = await handleWebhook({
      payload: payloadWithCustom as Parameters<typeof handleWebhook>[0]['payload'],
    })
    expect(result.status).toBe('confirmed')

    // Order moved to PLACED + PAID
    const orderRow = await db.execute(sql`
      SELECT order_state, payment_state
      FROM orders.orders WHERE id = ${sc.orderId}
    `)
    const ord = orderRow.rows[0] as { order_state: string; payment_state: string }
    expect(ord.order_state).toBe('PLACED')
    expect(ord.payment_state).toBe('PAID')

    // Saved card row inserted for the right user
    const cardRow = await db.execute(sql`
      SELECT user_id, token_id, masked_card_no, card_scheme, customer_ref_no,
             payable_customer_id, deleted_at
      FROM payments.saved_cards
      WHERE user_id = ${sc.userId}
    `)
    expect(cardRow.rows.length).toBe(1)
    const card = cardRow.rows[0] as {
      user_id:              string
      token_id:             string
      masked_card_no:       string
      card_scheme:          string
      customer_ref_no:      string
      payable_customer_id:  string
      deleted_at:           Date | null
    }
    expect(card.token_id).toBe('TOK-001')
    expect(card.masked_card_no).toBe('512345xxxxxx0008')
    expect(card.card_scheme).toBe('MASTERCARD')
    expect(card.customer_ref_no).toBe(sc.customerRefNo)
    expect(card.payable_customer_id).toBe('PAY-CUST-001')
    expect(card.deleted_at).toBeNull()

    // Payment transaction recorded with payment_type=TOKENIZE
    const txRow = await db.execute(sql`
      SELECT status, payment_type FROM payments.payment_transactions
      WHERE provider_charge_id = 'TXN-TOKENIZE-001'
    `)
    expect((txRow.rows[0] as { status: string }).status).toBe('SUCCEEDED')
    expect((txRow.rows[0] as { payment_type: string }).payment_type).toBe('TOKENIZE')
  })

  it('rejects tokenize webhook with tampered checkValue', async () => {
    const sc = await seedDraftOrderForUser({
      emailSuffix: '002',
      orderRef:    'MOD-20260102',
    })

    const { handleWebhook } = await import(
      '../../modules/payments/payments.service'
    )

    const payload = buildTokenizeWebhook({
      invoiceNo:            sc.orderRef,
      payableTransactionId: 'TXN-TOKENIZE-002',
      customerRefNo:        sc.customerRefNo,
      tokenId:              'TOK-002',
    })

    const tampered = { ...payload, checkValue: 'NOT_A_REAL_HASH', custom1: sc.orderId }

    await expect(
      handleWebhook({
        payload: tampered as Parameters<typeof handleWebhook>[0]['payload'],
      }),
    ).rejects.toMatchObject({
      code:       'WEBHOOK_INVALID_CHECKVALUE',
      statusCode: 400,
    })

    // No saved card persisted
    const cardRow = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM payments.saved_cards
      WHERE user_id = ${sc.userId}
    `)
    expect((cardRow.rows[0] as { cnt: number }).cnt).toBe(0)
  })

  it('duplicate tokenize webhook is idempotent (no double saved-card row)', async () => {
    const sc = await seedDraftOrderForUser({
      emailSuffix: '003',
      orderRef:    'MOD-20260103',
    })

    const { handleWebhook } = await import(
      '../../modules/payments/payments.service'
    )

    const payload = buildTokenizeWebhook({
      invoiceNo:            sc.orderRef,
      payableTransactionId: 'TXN-TOKENIZE-003',
      customerRefNo:        sc.customerRefNo,
      tokenId:              'TOK-003',
    })
    const payloadWithCustom = { ...payload, custom1: sc.orderId } as typeof payload & {
      custom1: string
    }

    // First delivery confirms order + saves card
    const firstResult = await handleWebhook({
      payload: payloadWithCustom as Parameters<typeof handleWebhook>[0]['payload'],
    })
    expect(firstResult.status).toBe('confirmed')

    // Second delivery (with the same txId): layer-1 Redis cache catches it
    // before any DB work. This is the real-world duplicate-delivery shape —
    // PAYable retries on slow ACK and we must not double-charge or duplicate
    // the saved-cards row.
    const secondResult = await handleWebhook({
      payload: payloadWithCustom as Parameters<typeof handleWebhook>[0]['payload'],
    })
    expect(secondResult.status).toBe('already_processed')

    const txCount = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM payments.payment_transactions
      WHERE provider_charge_id = 'TXN-TOKENIZE-003'
    `)
    expect((txCount.rows[0] as { cnt: number }).cnt).toBe(1)

    const cardCount = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM payments.saved_cards
      WHERE user_id = ${sc.userId} AND token_id = 'TOK-003'
    `)
    expect((cardCount.rows[0] as { cnt: number }).cnt).toBe(1)
  })
})
