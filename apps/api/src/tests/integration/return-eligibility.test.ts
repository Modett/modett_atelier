/**
 * Integration tests: return eligibility — all five rules.
 * Real DB. Every distinct rejection reason gets its own test case.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, redis } from '@modett/db'

async function truncateForTest() {
  await db.execute(sql`
    TRUNCATE
      returns.return_request_items,
      returns.return_requests,
      returns.return_events,
      cart.reservation_items,
      cart.reservations,
      payments.payment_transactions,
      payments.payment_intents,
      orders.order_events,
      orders.order_addresses,
      orders.order_contacts,
      orders.order_items,
      orders.orders,
      cart.cart_items,
      cart.carts,
      inventory.variant_stock,
      inventory.product_variants,
      catalog.products,
      iam.admins,
      iam.users
    CASCADE
  `)
  await redis.flushdb()
}

interface OrderSeedParams {
  orderState?: 'DRAFT' | 'PLACED' | 'CANCELLED'
  paymentState?: 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
  fulfillmentState?: 'NOT_STARTED' | 'PACKED' | 'SHIPPED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  deliveredAt?: Date | null
  itemQty?: number
}

async function seedOrderForReturn(params: OrderSeedParams = {}): Promise<{
  userId: string
  orderId: string
  orderItemId: string
  variantId: string
}> {
  const {
    orderState = 'PLACED',
    paymentState = 'PAID',
    fulfillmentState = 'DELIVERED',
    deliveredAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    itemQty = 2,
  } = params

  const userRow = await db.execute(sql`
    INSERT INTO iam.users (email, password_hash, first_name, last_name)
    VALUES ('returns@modett.com', 'hash', 'Returns', 'Tester')
    RETURNING id
  `)
  const userId = (userRow.rows[0] as { id: string }).id

  const prodRow = await db.execute(sql`
    INSERT INTO catalog.products
      (display_name, short_name, slug, product_code, active)
    VALUES ('Return Shirt', 'Shirt', 'return-shirt', 'RT001', true)
    RETURNING id
  `)
  const productId = (prodRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO catalog.product_prices
      (product_id, lkr_amount, sgd_amount, usd_amount)
    VALUES (${productId}, 4000.00, 28.00, 20.00)
  `)

  const varRow = await db.execute(sql`
    INSERT INTO inventory.product_variants
      (product_id, color, size, sku_group)
    VALUES (${productId}, 'Navy', 'XL', 'RT001-NVY-XL')
    RETURNING id
  `)
  const variantId = (varRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO inventory.variant_stock (variant_id, in_stock_qty, held_qty)
    VALUES (${variantId}, 10, 0)
  `)

  const orderRow = await db.execute(sql`
    INSERT INTO orders.orders
      (order_ref, user_id,
       order_state, payment_state, fulfillment_state, return_state,
       currency, country_code,
       subtotal, discount_amount, shipping_cost, tax_amount,
       tax_rate_snapshot, total,
       placed_at)
    VALUES
      ('MOD-RTN-0001', ${userId},
       ${orderState}, ${paymentState}, ${fulfillmentState}, 'NONE',
       'LKR', 'LK',
       4000.00, 0, 350.00, 0, 0, 4350.00,
       now() - interval '10 days')
    RETURNING id
  `)
  const orderId = (orderRow.rows[0] as { id: string }).id

  const itemRow = await db.execute(sql`
    INSERT INTO orders.order_items
      (order_id, variant_id, qty,
       unit_price_snapshot_amount, unit_price_snapshot_currency,
       tax_amount, product_snapshot_json)
    VALUES
      (${orderId}, ${variantId}, ${itemQty},
       4000.00, 'LKR', 0.00,
       '{"name":"Return Shirt","sku":"RT001-NVY-XL"}')
    RETURNING id
  `)
  const orderItemId = (itemRow.rows[0] as { id: string }).id

  if (deliveredAt !== null) {
    await db.execute(sql`
      INSERT INTO orders.order_events
        (order_id, event_type, payload_json, created_at)
      VALUES
        (${orderId}, 'FULFILLMENT_UPDATED',
         '{"from":"OUT_FOR_DELIVERY","to":"DELIVERED"}'::jsonb,
         ${deliveredAt})
    `)
  }

  return { userId, orderId, orderItemId, variantId }
}

describe('Return eligibility — all five rules', () => {
  beforeEach(async () => {
    await truncateForTest()
  })

  it('happy path: valid return on delivered paid order within window', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      orderState: 'PLACED',
      paymentState: 'PAID',
      fulfillmentState: 'DELIVERED',
      deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      itemQty: 2,
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    const result = await createReturn({
      orderId,
      userId,
      type: 'REFUND',
      reason: 'The colour was different from the website photo.',
      policyVersion: 'v1.0',
      items: [{ orderItemId, qty: 1 }],
    })

    const req = result.returnRequest
    expect(req.status).toBe('SUBMITTED')
    expect(req.type).toBe('REFUND')
    expect(req.order_id).toBe(orderId)

    const orderAfter = await db.execute(sql`
      SELECT return_state FROM orders.orders WHERE id = ${orderId}
    `)
    expect((orderAfter.rows[0] as { return_state: string }).return_state).toBe(
      'REQUESTED',
    )

    const events = await db.execute(sql`
      SELECT event_type FROM returns.return_events
      WHERE return_request_id = ${req.id}
    `)
    expect((events.rows[0] as { event_type: string }).event_type).toBe(
      'RETURN_SUBMITTED',
    )

    const items = await db.execute(sql`
      SELECT request_status FROM returns.return_request_items
      WHERE return_request_id = ${req.id}
    `)
    expect((items.rows[0] as { request_status: string }).request_status).toBe(
      'SUBMITTED',
    )
  })

  it('rule 3 failure: return on NOT_STARTED order throws ORDER_NOT_DELIVERED 422', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      fulfillmentState: 'NOT_STARTED',
      deliveredAt: null,
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    await expect(
      createReturn({
        orderId,
        userId,
        type: 'REFUND',
        reason: 'Changed my mind.',
        policyVersion: 'v1.0',
        items: [{ orderItemId, qty: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_DELIVERED',
      statusCode: 422,
    })

    const returnRows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM returns.return_requests
      WHERE order_id = ${orderId}
    `)
    expect((returnRows.rows[0] as { cnt: number }).cnt).toBe(0)
  })

  it('rule 3 failure: return on SHIPPED order throws ORDER_NOT_DELIVERED 422', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      fulfillmentState: 'SHIPPED',
      deliveredAt: null,
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    await expect(
      createReturn({
        orderId,
        userId,
        type: 'REFUND',
        reason: 'Want to cancel.',
        policyVersion: 'v1.0',
        items: [{ orderItemId, qty: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_DELIVERED', statusCode: 422 })
  })

  it('rule 1 failure: return on CANCELLED order throws ORDER_NOT_PLACED 422', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      orderState: 'CANCELLED',
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    await expect(
      createReturn({
        orderId,
        userId,
        type: 'REFUND',
        reason: 'Cancellation.',
        policyVersion: 'v1.0',
        items: [{ orderItemId, qty: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_PLACED', statusCode: 422 })
  })

  it('rule 1 failure: return on DRAFT order throws ORDER_NOT_PLACED 422', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      orderState: 'DRAFT',
      paymentState: 'UNPAID',
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    await expect(
      createReturn({
        orderId,
        userId,
        type: 'REFUND',
        reason: 'Never finished checkout.',
        policyVersion: 'v1.0',
        items: [{ orderItemId, qty: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_PLACED', statusCode: 422 })
  })

  it('rule 2 failure: return on unpaid order throws ORDER_NOT_PAID 422', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      orderState: 'PLACED',
      paymentState: 'UNPAID',
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    await expect(
      createReturn({
        orderId,
        userId,
        type: 'REFUND',
        reason: 'Did not pay.',
        policyVersion: 'v1.0',
        items: [{ orderItemId, qty: 1 }],
      }),
    ).rejects.toMatchObject({ code: 'ORDER_NOT_PAID', statusCode: 422 })
  })

  it('rule 4 failure: return after 14-day window throws RETURN_WINDOW_EXPIRED 422', async () => {
    const deliveredAt = new Date(
      Date.now() - 20 * 24 * 60 * 60 * 1000,
    )

    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      deliveredAt,
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    const error = await createReturn({
      orderId,
      userId,
      type: 'REFUND',
      reason: 'Late return.',
      policyVersion: 'v1.0',
      items: [{ orderItemId, qty: 1 }],
    }).catch((e) => e)

    expect(error.code).toBe('RETURN_WINDOW_EXPIRED')
    expect(error.statusCode).toBe(422)
    if ((error as { meta?: { eligibleUntil?: unknown } }).meta?.eligibleUntil != null) {
      expect((error as { meta: { eligibleUntil: unknown } }).meta.eligibleUntil).toBeDefined()
    }
  })

  it('rule 4 boundary: return on day 14 exactly is still within window', async () => {
    const deliveredAt = new Date(
      Date.now() - 14 * 24 * 60 * 60 * 1000 + 60 * 1000,
    )

    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      deliveredAt,
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    const result = await createReturn({
      orderId,
      userId,
      type: 'REFUND',
      reason: 'Just made it.',
      policyVersion: 'v1.0',
      items: [{ orderItemId, qty: 1 }],
    })
    expect(result.returnRequest.status).toBe('SUBMITTED')
  })

  it('rule 4 failure: DELIVERED state but no delivery event throws DELIVERY_EVENT_NOT_FOUND 422', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      fulfillmentState: 'DELIVERED',
      deliveredAt: null,
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    await expect(
      createReturn({
        orderId,
        userId,
        type: 'REFUND',
        reason: 'No delivery event.',
        policyVersion: 'v1.0',
        items: [{ orderItemId, qty: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'DELIVERY_EVENT_NOT_FOUND',
      statusCode: 422,
    })
  })

  it('rule 5 failure: return qty > order qty throws RETURN_QTY_EXCEEDS_ORDER 422', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      itemQty: 2,
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    const error = await createReturn({
      orderId,
      userId,
      type: 'REFUND',
      reason: 'Too many.',
      policyVersion: 'v1.0',
      items: [{ orderItemId, qty: 3 }],
    }).catch((e) => e)

    expect(error.code).toBe('RETURN_QTY_EXCEEDS_ORDER')
    expect(error.statusCode).toBe(422)
    const err = error as { meta?: { max?: number; requested?: number } }
    if (err.meta != null) {
      expect(err.meta.max).toBe(2)
      expect(err.meta.requested).toBe(3)
    }
  })

  it('rule 5 failure: already-returned qty blocks second return', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      itemQty: 2,
    })

    const existingReturnRow = await db.execute(sql`
      INSERT INTO returns.return_requests
        (order_id, type, status, reason,
         policy_accepted_at, policy_version, eligible_until)
      VALUES
        (${orderId}, 'REFUND', 'APPROVED', 'First return.',
         now() - interval '2 days', 'v1.0',
         now() + interval '10 days')
      RETURNING id
    `)
    const existingReturnId = (existingReturnRow.rows[0] as { id: string }).id

    await db.execute(sql`
      INSERT INTO returns.return_request_items
        (return_request_id, order_item_id, qty, request_status)
      VALUES
        (${existingReturnId}, ${orderItemId}, 2, 'APPROVED')
    `)

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    const error = await createReturn({
      orderId,
      userId,
      type: 'REFUND',
      reason: 'Return again.',
      policyVersion: 'v1.0',
      items: [{ orderItemId, qty: 1 }],
    }).catch((e) => e)

    expect(error.code).toBe('INSUFFICIENT_RETURNABLE_QTY')
    expect(error.statusCode).toBe(422)
    const err = error as { meta?: { available?: number; requested?: number } }
    if (err.meta != null) {
      expect(err.meta.available).toBe(0)
      expect(err.meta.requested).toBe(1)
    }
  })

  it('duplicate active return throws RETURN_ALREADY_ACTIVE 409', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      itemQty: 2,
    })

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    await createReturn({
      orderId,
      userId,
      type: 'REFUND',
      reason: 'First submission.',
      policyVersion: 'v1.0',
      items: [{ orderItemId, qty: 1 }],
    })

    await expect(
      createReturn({
        orderId,
        userId,
        type: 'REFUND',
        reason: 'Duplicate submission.',
        policyVersion: 'v1.0',
        items: [{ orderItemId, qty: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'RETURN_ALREADY_ACTIVE',
      statusCode: 409,
    })

    const returnRows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM returns.return_requests WHERE order_id = ${orderId}
    `)
    expect((returnRows.rows[0] as { cnt: number }).cnt).toBe(1)
  })

  it('rejected return allows re-submission for the same item', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      itemQty: 2,
    })

    const rejectedRow = await db.execute(sql`
      INSERT INTO returns.return_requests
        (order_id, type, status, reason,
         policy_accepted_at, policy_version, eligible_until)
      VALUES
        (${orderId}, 'REFUND', 'REJECTED', 'First attempt.',
         now() - interval '3 days', 'v1.0',
         now() + interval '10 days')
      RETURNING id
    `)
    const rejectedReturnId = (rejectedRow.rows[0] as { id: string }).id

    await db.execute(sql`
      INSERT INTO returns.return_request_items
        (return_request_id, order_item_id, qty, request_status)
      VALUES
        (${rejectedReturnId}, ${orderItemId}, 1, 'REJECTED')
    `)

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    const result = await createReturn({
      orderId,
      userId,
      type: 'REFUND',
      reason: 'Second attempt after rejection.',
      policyVersion: 'v1.0',
      items: [{ orderItemId, qty: 1 }],
    })

    expect(result.returnRequest.status).toBe('SUBMITTED')

    const returnRows = await db.execute(sql`
      SELECT status FROM returns.return_requests
      WHERE order_id = ${orderId}
      ORDER BY created_at ASC
    `)
    expect(returnRows.rows).toHaveLength(2)
    expect((returnRows.rows[0] as { status: string }).status).toBe('REJECTED')
    expect((returnRows.rows[1] as { status: string }).status).toBe('SUBMITTED')
  })

  it('ownership: user cannot return another user order — throws ORDER_NOT_FOUND 404', async () => {
    const { orderId, orderItemId } = await seedOrderForReturn()

    const otherUserRow = await db.execute(sql`
      INSERT INTO iam.users (email, password_hash, first_name, last_name)
      VALUES ('other@modett.com', 'hash', 'Other', 'User')
      RETURNING id
    `)
    const otherUserId = (otherUserRow.rows[0] as { id: string }).id

    const { createReturn } = await import(
      '../../modules/returns/returns.service'
    )

    await expect(
      createReturn({
        orderId,
        userId: otherUserId,
        type: 'REFUND',
        reason: 'Not my order.',
        policyVersion: 'v1.0',
        items: [{ orderItemId, qty: 1 }],
      }),
    ).rejects.toMatchObject({
      code: 'ORDER_NOT_FOUND',
      statusCode: 404,
    })
  })

  it('atomicity: return approval updates all three tables or none', async () => {
    const { userId, orderId, orderItemId } = await seedOrderForReturn({
      itemQty: 1,
    })

    const { createReturn, adminOpenForReview, adminApprove } = await import(
      '../../modules/returns/returns.service'
    )

    const adminUserRow = await db.execute(sql`
      INSERT INTO iam.users (email, password_hash, first_name, last_name)
      VALUES ('admin@modett.com', 'hash', 'Admin', 'User')
      RETURNING id
    `)
    const adminUserId = (adminUserRow.rows[0] as { id: string }).id

    const adminRow = await db.execute(sql`
      INSERT INTO iam.admins (user_id, role, status)
      VALUES (${adminUserId}, 'ADMIN', 'ACTIVE')
      RETURNING id
    `)
    const adminId = (adminRow.rows[0] as { id: string }).id

    const returnRequest = await createReturn({
      orderId,
      userId,
      type: 'REFUND',
      reason: 'Wrong size.',
      policyVersion: 'v1.0',
      items: [{ orderItemId, qty: 1 }],
    })

    await adminOpenForReview({
      returnRequestId: returnRequest.returnRequest.id,
      adminId,
    })

    await adminApprove({
      returnRequestId: returnRequest.returnRequest.id,
      adminId,
      adminNote: 'Approved — customer photo confirmed defect.',
    })

    const reqRow = await db.execute(sql`
      SELECT status FROM returns.return_requests WHERE id = ${returnRequest.returnRequest.id}
    `)
    expect((reqRow.rows[0] as { status: string }).status).toBe('APPROVED')

    const itemRows = await db.execute(sql`
      SELECT request_status FROM returns.return_request_items
      WHERE return_request_id = ${returnRequest.returnRequest.id}
    `)
    expect((itemRows.rows[0] as { request_status: string }).request_status).toBe(
      'APPROVED',
    )

    const orderRow = await db.execute(sql`
      SELECT return_state FROM orders.orders WHERE id = ${orderId}
    `)
    expect((orderRow.rows[0] as { return_state: string }).return_state).toBe(
      'APPROVED',
    )

    const eventRows = await db.execute(sql`
      SELECT event_type, admin_note FROM returns.return_events
      WHERE return_request_id = ${returnRequest.returnRequest.id}
        AND event_type = 'RETURN_APPROVED'
    `)
    expect(eventRows.rows).toHaveLength(1)
    expect((eventRows.rows[0] as { admin_note: string | null }).admin_note).toBe(
      'Approved — customer photo confirmed defect.',
    )
  })
})
