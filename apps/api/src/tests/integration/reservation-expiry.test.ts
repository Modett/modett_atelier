/**
 * Integration tests: reservation expiry — two-window grace period.
 * Real DB, real Redis. Expiry worker must not release holds during grace.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { db, redis, stampPaymentSubmitted } from '@modett/db'

async function truncateForTest() {
  await db.execute(sql`
    TRUNCATE
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
      iam.users
    CASCADE
  `)
  await redis.flushdb()
}

async function seedVariantWithStock(availableQty: number = 3): Promise<{
  variantId: string
  cartId: string
  userId: string
}> {
  const userRow = await db.execute(sql`
    INSERT INTO iam.users (email, password_hash, first_name, last_name)
    VALUES ('expiry@modett.com', 'hash', 'Expiry', 'Tester')
    RETURNING id
  `)
  const userId = (userRow.rows[0] as { id: string }).id

  const prodRow = await db.execute(sql`
    INSERT INTO catalog.products
      (display_name, short_name, slug, product_code, active)
    VALUES ('Expiry Shirt', 'Shirt', 'expiry-shirt', 'EX001', true)
    RETURNING id
  `)
  const productId = (prodRow.rows[0] as { id: string }).id

  const varRow = await db.execute(sql`
    INSERT INTO inventory.product_variants
      (product_id, color, size, sku_group)
    VALUES (${productId}, 'Green', 'L', 'EX001-GRN-L')
    RETURNING id
  `)
  const variantId = (varRow.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO inventory.variant_stock (variant_id, in_stock_qty, held_qty)
    VALUES (${variantId}, ${availableQty + 1}, 1)
  `)

  const cartRow = await db.execute(sql`
    INSERT INTO cart.carts (user_id, session_id, status, expires_at)
    VALUES (${userId}, 'sess-expiry', 'ACTIVE', now() + interval '1 day')
    RETURNING id
  `)
  const cartId = (cartRow.rows[0] as { id: string }).id

  return { variantId, cartId, userId }
}

async function seedExpiredNoPayment(
  variantId: string,
  cartId: string,
  userId: string,
): Promise<string> {
  const resRow = await db.execute(sql`
    INSERT INTO cart.reservations
      (cart_id, user_id, status, expires_at,
       payment_submitted_at, grace_expires_at,
       worker_lock_id, processed_at)
    VALUES
      (${cartId}, ${userId}, 'HELD',
       now() - interval '5 minutes',
       NULL, NULL, NULL, NULL)
    RETURNING id
  `)
  const reservationId = (resRow.rows[0] as { id: string }).id
  await db.execute(sql`
    INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
    VALUES (${reservationId}, ${variantId}, 1)
  `)
  return reservationId
}

async function seedExpiredWindowOneGraceActive(
  variantId: string,
  cartId: string,
  userId: string,
): Promise<string> {
  const resRow = await db.execute(sql`
    INSERT INTO cart.reservations
      (cart_id, user_id, status, expires_at,
       payment_submitted_at, grace_expires_at,
       worker_lock_id, processed_at)
    VALUES
      (${cartId}, ${userId}, 'HELD',
       now() - interval '2 minutes',
       now() - interval '1 minute',
       now() + interval '9 minutes',
       NULL, NULL)
    RETURNING id
  `)
  const reservationId = (resRow.rows[0] as { id: string }).id
  await db.execute(sql`
    INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
    VALUES (${reservationId}, ${variantId}, 1)
  `)
  return reservationId
}

async function seedBothWindowsExpired(
  variantId: string,
  cartId: string,
  userId: string,
): Promise<string> {
  const resRow = await db.execute(sql`
    INSERT INTO cart.reservations
      (cart_id, user_id, status, expires_at,
       payment_submitted_at, grace_expires_at,
       worker_lock_id, processed_at)
    VALUES
      (${cartId}, ${userId}, 'HELD',
       now() - interval '45 minutes',
       now() - interval '40 minutes',
       now() - interval '30 minutes',
       NULL, NULL)
    RETURNING id
  `)
  const reservationId = (resRow.rows[0] as { id: string }).id
  await db.execute(sql`
    INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
    VALUES (${reservationId}, ${variantId}, 1)
  `)
  return reservationId
}

async function seedActiveNotExpired(
  variantId: string,
  cartId: string,
  userId: string,
): Promise<string> {
  const resRow = await db.execute(sql`
    INSERT INTO cart.reservations
      (cart_id, user_id, status, expires_at,
       payment_submitted_at, grace_expires_at,
       worker_lock_id, processed_at)
    VALUES
      (${cartId}, ${userId}, 'HELD',
       now() + interval '20 minutes',
       NULL, NULL, NULL, NULL)
    RETURNING id
  `)
  const reservationId = (resRow.rows[0] as { id: string }).id
  await db.execute(sql`
    INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
    VALUES (${reservationId}, ${variantId}, 1)
  `)
  return reservationId
}

describe('Reservation expiry — two-window grace period', () => {
  beforeEach(async () => {
    await truncateForTest()
  })

  it('happy path: expired reservation with no payment is released by worker', async () => {
    const { variantId, cartId, userId } = await seedVariantWithStock(2)
    const reservationId = await seedExpiredNoPayment(variantId, cartId, userId)

    const { expireReservations } = await import(
      '../../../../worker/src/jobs/expireReservations'
    )

    const stockBefore = await db.execute(sql`
      SELECT held_qty FROM inventory.variant_stock WHERE variant_id = ${variantId}
    `)
    expect((stockBefore.rows[0] as { held_qty: number }).held_qty).toBe(1)

    await expireReservations()

    const resAfter = await db.execute(sql`
      SELECT status, worker_lock_id, processed_at, hold_released_at
      FROM cart.reservations WHERE id = ${reservationId}
    `)
    const res = resAfter.rows[0] as {
      status: string
      worker_lock_id: string | null
      processed_at: string | null
      hold_released_at: string | null
    }
    expect(res.status).toBe('EXPIRED')
    expect(res.worker_lock_id).not.toBeNull()
    expect(res.processed_at).not.toBeNull()
    expect(res.hold_released_at).not.toBeNull()

    const stockAfter = await db.execute(sql`
      SELECT held_qty FROM inventory.variant_stock WHERE variant_id = ${variantId}
    `)
    expect((stockAfter.rows[0] as { held_qty: number }).held_qty).toBe(0)
  })

  it('CRITICAL failure path: grace period active — worker must not release hold', async () => {
    const { variantId, cartId, userId } = await seedVariantWithStock(2)
    const reservationId = await seedExpiredWindowOneGraceActive(
      variantId,
      cartId,
      userId,
    )

    const { expireReservations } = await import(
      '../../../../worker/src/jobs/expireReservations'
    )

    await expireReservations()

    const resAfter = await db.execute(sql`
      SELECT status, worker_lock_id, hold_released_at
      FROM cart.reservations WHERE id = ${reservationId}
    `)
    const row = resAfter.rows[0] as {
      status: string
      worker_lock_id: string | null
      hold_released_at: string | null
    }
    expect(row.status).toBe('HELD')
    expect(row.worker_lock_id).toBeNull()
    expect(row.hold_released_at).toBeNull()

    const stockAfter = await db.execute(sql`
      SELECT held_qty FROM inventory.variant_stock WHERE variant_id = ${variantId}
    `)
    expect((stockAfter.rows[0] as { held_qty: number }).held_qty).toBe(1)
  })

  it('failure path: both windows expired — worker releases hold', async () => {
    const { variantId, cartId, userId } = await seedVariantWithStock(2)
    const reservationId = await seedBothWindowsExpired(
      variantId,
      cartId,
      userId,
    )

    const { expireReservations } = await import(
      '../../../../worker/src/jobs/expireReservations'
    )

    await expireReservations()

    const resAfter = await db.execute(sql`
      SELECT status, hold_released_at
      FROM cart.reservations WHERE id = ${reservationId}
    `)
    const row = resAfter.rows[0] as { status: string; hold_released_at: string | null }
    expect(row.status).toBe('EXPIRED')
    expect(row.hold_released_at).not.toBeNull()

    const stockAfter = await db.execute(sql`
      SELECT held_qty FROM inventory.variant_stock WHERE variant_id = ${variantId}
    `)
    expect((stockAfter.rows[0] as { held_qty: number }).held_qty).toBe(0)
  })

  it('edge case: active reservation is never touched by worker', async () => {
    const { variantId, cartId, userId } = await seedVariantWithStock(2)
    const reservationId = await seedActiveNotExpired(variantId, cartId, userId)

    const { expireReservations } = await import(
      '../../../../worker/src/jobs/expireReservations'
    )

    await expireReservations()

    const resAfter = await db.execute(sql`
      SELECT status FROM cart.reservations WHERE id = ${reservationId}
    `)
    expect((resAfter.rows[0] as { status: string }).status).toBe('HELD')

    const stockAfter = await db.execute(sql`
      SELECT held_qty FROM inventory.variant_stock WHERE variant_id = ${variantId}
    `)
    expect((stockAfter.rows[0] as { held_qty: number }).held_qty).toBe(1)
  })

  it('concurrency: two worker instances race — exactly one claims the reservation', async () => {
    const { variantId, cartId, userId } = await seedVariantWithStock(2)
    const reservationId = await seedExpiredNoPayment(variantId, cartId, userId)

    const { expireReservations } = await import(
      '../../../../worker/src/jobs/expireReservations'
    )

    await Promise.all([expireReservations(), expireReservations()])

    const resAfter = await db.execute(sql`
      SELECT status, worker_lock_id FROM cart.reservations
      WHERE id = ${reservationId}
    `)
    const row = resAfter.rows[0] as { status: string; worker_lock_id: string | null }
    expect(row.status).toBe('EXPIRED')
    expect(row.worker_lock_id).not.toBeNull()

    const stockAfter = await db.execute(sql`
      SELECT held_qty FROM inventory.variant_stock WHERE variant_id = ${variantId}
    `)
    expect((stockAfter.rows[0] as { held_qty: number }).held_qty).toBe(0)
  })

  it('stampPaymentSubmitted activates grace window atomically', async () => {
    const { variantId, cartId, userId } = await seedVariantWithStock(2)

    const resRow = await db.execute(sql`
      INSERT INTO cart.reservations
        (cart_id, user_id, status, expires_at,
         payment_submitted_at, grace_expires_at, worker_lock_id, processed_at)
      VALUES
        (${cartId}, ${userId}, 'HELD',
         now() + interval '15 minutes',
         NULL, NULL, NULL, NULL)
      RETURNING id
    `)
    const reservationId = (resRow.rows[0] as { id: string }).id

    await db.execute(sql`
      INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
      VALUES (${reservationId}, ${variantId}, 1)
    `)

    await stampPaymentSubmitted({ reservationId })

    const resAfter = await db.execute(sql`
      SELECT payment_submitted_at, grace_expires_at
      FROM cart.reservations WHERE id = ${reservationId}
    `)
    const row = resAfter.rows[0] as {
      payment_submitted_at: string | null
      grace_expires_at: string | null
    }
    expect(row.payment_submitted_at).not.toBeNull()
    expect(row.grace_expires_at).not.toBeNull()

    const submittedAt = new Date(row.payment_submitted_at as string).getTime()
    const graceAt = new Date(row.grace_expires_at as string).getTime()
    const diffMinutes = (graceAt - submittedAt) / 1000 / 60

    expect(diffMinutes).toBeGreaterThanOrEqual(9.9)
    expect(diffMinutes).toBeLessThanOrEqual(10.1)

    const { expireReservations } = await import(
      '../../../../worker/src/jobs/expireReservations'
    )

    await db.execute(sql`
      UPDATE cart.reservations
      SET expires_at = now() - interval '1 second'
      WHERE id = ${reservationId}
    `)

    await expireReservations()

    const resAfterWorker = await db.execute(sql`
      SELECT status FROM cart.reservations WHERE id = ${reservationId}
    `)
    expect((resAfterWorker.rows[0] as { status: string }).status).toBe('HELD')

    const stockAfter = await db.execute(sql`
      SELECT held_qty FROM inventory.variant_stock WHERE variant_id = ${variantId}
    `)
    expect((stockAfter.rows[0] as { held_qty: number }).held_qty).toBe(1)
  })

  it('stampPaymentSubmitted is idempotent — second call throws RESERVATION_NOT_HELD', async () => {
    const { variantId, cartId, userId } = await seedVariantWithStock(1)

    const resRow = await db.execute(sql`
      INSERT INTO cart.reservations
        (cart_id, user_id, status, expires_at,
         payment_submitted_at, grace_expires_at)
      VALUES
        (${cartId}, ${userId}, 'HELD',
         now() + interval '20 minutes',
         now() - interval '1 minute',
         now() + interval '9 minutes')
      RETURNING id
    `)
    const reservationId = (resRow.rows[0] as { id: string }).id

    await db.execute(sql`
      INSERT INTO cart.reservation_items (reservation_id, variant_id, qty)
      VALUES (${reservationId}, ${variantId}, 1)
    `)

    await expect(stampPaymentSubmitted({ reservationId })).rejects.toMatchObject(
      {
        code: 'RESERVATION_NOT_HELD',
      },
    )
  })
})
