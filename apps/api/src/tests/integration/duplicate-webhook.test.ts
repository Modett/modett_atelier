/**
 * Integration tests: duplicate webhook delivery — idempotency.
 * Real DB, real Redis. PAYable webhook; Layer 1 (Redis) and Layer 2 (DB unique).
 */

import crypto from 'node:crypto'
import { describe, it, expect, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, redis, getOrderItems, confirmOrderTransaction } from '@modett/db'

async function truncateForTest() {
  await db.execute(sql`
    TRUNCATE
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

async function seedConfirmedOrderScenario(): Promise<{
  orderId: string
  orderRef: string
  reservationId: string
  cartId: string
  variantId: string
  userId: string
  txId: string
}> {
  const userRow = await db.execute(sql`
    INSERT INTO iam.users (email, password_hash, first_name, last_name)
    VALUES ('webhook@modett.com', 'hash', 'Webhook', 'Tester')
    RETURNING id
  `)
  const userId = (userRow.rows[0] as { id: string }).id

  const prodRow = await db.execute(sql`
    INSERT INTO catalog.products (display_name, short_name, slug, product_code, active)
    VALUES ('Hook Shirt', 'Shirt', 'hook-shirt', 'HK001', true)
    RETURNING id
  `)
  const productId = (prodRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO catalog.product_prices (product_id, lkr_amount, sgd_amount, usd_amount)
    VALUES (${productId}, 3500.00, 25.00, 18.00)
  `)

  const varRow = await db.execute(sql`
    INSERT INTO inventory.product_variants (product_id, color, size, sku_group)
    VALUES (${productId}, 'Red', 'S', 'HK001-RED-S')
    RETURNING id
  `)
  const variantId = (varRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO inventory.variant_stock (variant_id, in_stock_qty, held_qty)
    VALUES (${variantId}, 5, 0)
  `)

  const cartRow = await db.execute(sql`
    INSERT INTO cart.carts (user_id, session_id, status, expires_at)
    VALUES (${userId}, 'sess-webhook', 'ACTIVE', now() + interval '1 day')
    RETURNING id
  `)
  const cartId = (cartRow.rows[0] as { id: string }).id

  const orderRow = await db.execute(sql`
    INSERT INTO orders.orders
      (order_ref, user_id, order_state, payment_state, fulfillment_state,
       return_state, currency, country_code, subtotal, discount_amount,
       shipping_cost, tax_amount, tax_rate_snapshot, total, placed_at)
    VALUES
      ('MOD-20260001', ${userId}, 'PLACED', 'PAID', 'NOT_STARTED',
       'NONE', 'LKR', 'LK', 3500.00, 0, 350.00, 0, 0, 3850.00, now())
    RETURNING id, order_ref
  `)
  const orderId = (orderRow.rows[0] as { id: string }).id
  const orderRef = (orderRow.rows[0] as { order_ref: string }).order_ref

  await db.execute(sql`
    INSERT INTO orders.order_items
      (order_id, variant_id, qty,
       unit_price_snapshot_amount, unit_price_snapshot_currency,
       tax_amount, product_snapshot_json)
    VALUES
      (${orderId}, ${variantId}, 1,
       3500.00, 'LKR', 0.00, '{"name":"Hook Shirt","sku":"HK001-RED-S"}')
  `)

  const resRow = await db.execute(sql`
    INSERT INTO cart.reservations
      (cart_id, user_id, status, expires_at, payment_submitted_at, grace_expires_at)
    VALUES
      (${cartId}, ${userId}, 'CONSUMED', now() - interval '1 hour',
       now() - interval '50 minutes', now() - interval '40 minutes')
    RETURNING id
  `)
  const reservationId = (resRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
    VALUES (${reservationId}, ${variantId}, 1)
  `)

  const txId = 'TXN-PAYABLE-UNIQUE-001'
  await db.execute(sql`
    INSERT INTO payments.payment_transactions
      (order_id, provider, provider_charge_id, status,
       amount, currency, raw_payload_json)
    VALUES
      (${orderId}, 'payable', ${txId}, 'SUCCEEDED',
       3850.00, 'LKR', '{"statusCode":1}'::jsonb)
  `)

  await redis.set(
    `checkout:context:${orderId}`,
    JSON.stringify({ reservationId, cartId }),
    'EX',
    3600,
  )

  return { orderId, orderRef, reservationId, cartId, variantId, userId, txId }
}

function buildWebhookPayload(overrides: {
  invoiceNo: string
  payableTransactionId: string
  statusCode?: number
  payableAmount?: string
}): {
  merchantKey: string
  payableOrderId: string
  payableTransactionId: string
  payableAmount: string
  payableCurrency: string
  invoiceNo: string
  statusCode: number
  statusMessage: string
  paymentType: number
  paymentMethod: number
  paymentScheme: string
  checkValue: string
} {
  const MERCHANT_KEY =
    process.env.PAYABLE_MERCHANT_KEY ?? 'D7TEST000001'
  const MERCHANT_TOKEN =
    process.env.PAYABLE_MERCHANT_TOKEN ?? 'test_merchant_token_replace_me'

  const sha512 = (s: string) =>
    crypto.createHash('sha512').update(s).digest('hex').toUpperCase()

  const payableOrderId = 'ORD-PAYABLE-001'
  const payableTransactionId = overrides.payableTransactionId
  const payableAmount = overrides.payableAmount ?? '3850.00'
  const payableCurrency = 'LKR'
  const invoiceNo = overrides.invoiceNo
  const statusCode = overrides.statusCode ?? 1

  const tokenHash = sha512(MERCHANT_TOKEN)
  const checkValue = sha512(
    `${MERCHANT_KEY}|${payableOrderId}|${payableTransactionId}|` +
      `${payableAmount}|${payableCurrency}|${invoiceNo}|${statusCode}|${tokenHash}`,
  )

  return {
    merchantKey: MERCHANT_KEY,
    payableOrderId,
    payableTransactionId,
    payableAmount,
    payableCurrency,
    invoiceNo,
    statusCode,
    statusMessage: statusCode === 1 ? 'SUCCESS' : 'FAILED',
    paymentType: 1,
    paymentMethod: 1,
    paymentScheme: 'MASTERCARD',
    checkValue,
  }
}

describe('Duplicate webhook delivery — idempotency', () => {
  beforeEach(async () => {
    await truncateForTest()
  })

  it('happy path: first webhook delivery confirms the order', async () => {
    const userRow = await db.execute(sql`
      INSERT INTO iam.users (email, password_hash, first_name, last_name)
      VALUES ('fresh@modett.com', 'hash', 'Fresh', 'Order')
      RETURNING id
    `)
    const userId = (userRow.rows[0] as { id: string }).id

    const prodRow = await db.execute(sql`
      INSERT INTO catalog.products (display_name, short_name, slug, product_code, active)
      VALUES ('Fresh Shirt', 'Shirt', 'fresh-shirt', 'FR001', true)
      RETURNING id
    `)
    const productId = (prodRow.rows[0] as { id: string }).id

    await db.execute(sql`
      INSERT INTO catalog.product_prices (product_id, lkr_amount, sgd_amount, usd_amount)
      VALUES (${productId}, 2000.00, 15.00, 10.00)
    `)

    const varRow = await db.execute(sql`
      INSERT INTO inventory.product_variants (product_id, color, size, sku_group)
      VALUES (${productId}, 'Blue', 'M', 'FR001-BLU-M')
      RETURNING id
    `)
    const variantId = (varRow.rows[0] as { id: string }).id

    await db.execute(sql`
      INSERT INTO inventory.variant_stock (variant_id, in_stock_qty, held_qty)
      VALUES (${variantId}, 3, 1)
    `)

    const cartRow = await db.execute(sql`
      INSERT INTO cart.carts (user_id, session_id, status, expires_at)
      VALUES (${userId}, 'sess-fresh', 'ACTIVE', now() + interval '1 day')
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
        ('MOD-20260002', ${userId}, 'DRAFT', 'UNPAID', 'NOT_STARTED',
         'NONE', 'LKR', 'LK', 2000.00, 0, 350.00, 0, 0, 2350.00)
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
         2000.00, 'LKR', 0.00, '{"name":"Fresh Shirt"}')
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

    await redis.set(
      `checkout:context:${orderId}`,
      JSON.stringify({ reservationId, cartId }),
      'EX',
      3600,
    )

    const { handleWebhook } = await import(
      '../../modules/payments/payments.service'
    )

    const txId = 'TXN-FRESH-001'
    const payload = buildWebhookPayload({
      invoiceNo: orderId,
      payableTransactionId: txId,
      payableAmount: '2350.00',
    })

    const result = await handleWebhook({ payload })

    expect(result.status).toBe('confirmed')

    const orderAfter = await db.execute(sql`
      SELECT order_state, payment_state
      FROM orders.orders WHERE id = ${orderId}
    `)
    const orderStateRow = orderAfter.rows[0] as {
      order_state: string
      payment_state: string
    }
    expect(orderStateRow.order_state).toBe('PLACED')
    expect(orderStateRow.payment_state).toBe('PAID')

    const resAfter = await db.execute(sql`
      SELECT status FROM cart.reservations WHERE id = ${reservationId}
    `)
    expect((resAfter.rows[0] as { status: string }).status).toBe('CONSUMED')

    const stockAfter = await db.execute(sql`
      SELECT held_qty FROM inventory.variant_stock WHERE variant_id = ${variantId}
    `)
    expect((stockAfter.rows[0] as { held_qty: number }).held_qty).toBe(0)

    const txAfter = await db.execute(sql`
      SELECT status FROM payments.payment_transactions
      WHERE provider_charge_id = ${txId}
    `)
    expect((txAfter.rows[0] as { status: string }).status).toBe('SUCCEEDED')
  })

  it('failure path: second webhook delivery blocked by Redis (Layer 1)', async () => {
    const { orderId, txId } = await seedConfirmedOrderScenario()

    const { handleWebhook } = await import(
      '../../modules/payments/payments.service'
    )

    await redis.set(`payment:event:${txId}`, '1', 'EX', 86400)

    const payload = buildWebhookPayload({
      invoiceNo: orderId,
      payableTransactionId: txId,
    })

    const result = await handleWebhook({ payload })

    expect(result.status).toBe('already_processed')

    const orderRow = await db.execute(sql`
      SELECT order_state, payment_state FROM orders.orders WHERE id = ${orderId}
    `)
    const row = orderRow.rows[0] as { order_state: string; payment_state: string }
    expect(row.order_state).toBe('PLACED')
    expect(row.payment_state).toBe('PAID')

    const txRows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM payments.payment_transactions
      WHERE provider_charge_id = ${txId}
    `)
    expect((txRows.rows[0] as { cnt: number }).cnt).toBe(1)
  })

  it('failure path: simultaneous deliveries — DB unique constraint catches second', async () => {
    const { orderId, txId, variantId } = await seedConfirmedOrderScenario()

    const items = await getOrderItems({ orderId })

    const draftRow = await db.execute(sql`
      INSERT INTO orders.orders
        (order_ref, user_id, order_state, payment_state,
         fulfillment_state, return_state, currency, country_code,
         subtotal, discount_amount, shipping_cost, tax_amount,
         tax_rate_snapshot, total)
      SELECT 'MOD-20260003', user_id, 'DRAFT', 'UNPAID',
             'NOT_STARTED', 'NONE', currency, country_code,
             subtotal, discount_amount, shipping_cost, tax_amount,
             tax_rate_snapshot, total
      FROM orders.orders WHERE id = ${orderId}
      RETURNING id
    `)
    const draftOrderId = (draftRow.rows[0] as { id: string }).id

    await db.execute(sql`
      INSERT INTO orders.order_items
        (order_id, variant_id, qty, unit_price_snapshot_amount,
         unit_price_snapshot_currency, tax_amount, product_snapshot_json)
      SELECT ${draftOrderId}, variant_id, qty, unit_price_snapshot_amount,
             unit_price_snapshot_currency, tax_amount, product_snapshot_json
      FROM orders.order_items WHERE order_id = ${orderId}
    `)

    const newCartRow = await db.execute(sql`
      INSERT INTO cart.carts (session_id, status, expires_at)
      VALUES ('sess-layer2', 'ACTIVE', now() + interval '1 day')
      RETURNING id
    `)
    const newCartId = (newCartRow.rows[0] as { id: string }).id

    const newResRow = await db.execute(sql`
      INSERT INTO cart.reservations (cart_id, status, expires_at)
      VALUES (${newCartId}, 'HELD', now() + interval '25 minutes')
      RETURNING id
    `)
    const newReservationId = (newResRow.rows[0] as { id: string }).id

    await db.execute(sql`
      INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
      VALUES (${newReservationId}, ${variantId}, 1)
    `)

    const newTxId = 'TXN-LAYER2-RACE-001'

    // Simulate held stock for this variant so atomicConfirmSale can succeed for the first call
    await db.execute(sql`
      UPDATE inventory.variant_stock SET held_qty = 1 WHERE variant_id = ${variantId}
    `)

    const confirmArgs = {
      orderId: draftOrderId,
      reservationId: newReservationId,
      cartId: newCartId,
      providerChargeId: newTxId,
      amount: '3850.00',
      currency: 'LKR' as const,
      rawPayloadJson: { statusCode: 1 },
      items: items
        .filter((i) => i.variant_id != null)
        .map((i) => ({ variantId: i.variant_id!, qty: i.qty })),
    }

    const results = await Promise.allSettled([
      confirmOrderTransaction(confirmArgs),
      confirmOrderTransaction(confirmArgs),
    ])

    const succeeded = results.filter((r) => r.status === 'fulfilled')
    const failed = results.filter((r) => r.status === 'rejected')

    expect(succeeded).toHaveLength(1)
    expect(failed).toHaveLength(1)

    const err = (failed[0] as PromiseRejectedResult).reason as {
      code?: string
    }
    expect(
      err?.code === '23505' || err?.code === 'WEBHOOK_ALREADY_PROCESSED',
    ).toBe(true)

    const txRows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM payments.payment_transactions
      WHERE provider_charge_id = ${newTxId}
    `)
    expect((txRows.rows[0] as { cnt: number }).cnt).toBe(1)
  })

  it('failure path: invalid checkValue throws WEBHOOK_INVALID_CHECKVALUE 400', async () => {
    const { orderId, txId } = await seedConfirmedOrderScenario()

    const { handleWebhook } = await import(
      '../../modules/payments/payments.service'
    )

    const payload = buildWebhookPayload({
      invoiceNo: orderId,
      payableTransactionId: txId,
    })

    const tamperedPayload = {
      ...payload,
      checkValue: 'INVALID_TAMPERED_VALUE',
    }

    await expect(handleWebhook({ payload: tamperedPayload })).rejects.toMatchObject(
      {
        code: 'WEBHOOK_INVALID_CHECKVALUE',
        statusCode: 400,
      },
    )

    const redisKey = await redis.get(`payment:event:${txId}`)
    expect(redisKey).toBeNull()

    const txRows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM payments.payment_transactions
      WHERE provider_charge_id = ${txId}
    `)
    expect((txRows.rows[0] as { cnt: number }).cnt).toBe(1)
  })
})
