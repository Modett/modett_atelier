/**
 * Integration tests: concurrent checkout — last unit race condition.
 * Real DB, real Redis. No mocks.
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { sql } from 'drizzle-orm'
import {
  db,
  redis,
  atomicHoldStock,
  createReservation,
  InsufficientStockError,
} from '@modett/db'

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
      inventory.variant_stock,
      inventory.product_variants,
      catalog.products,
      iam.users
    CASCADE
  `)
  await redis.flushdb()
}

async function seedOneUnitVariant(): Promise<{
  userId: string
  cartAId: string
  cartBId: string
  variantId: string
  productId: string
}> {
  const userResult = await db.execute(sql`
    INSERT INTO iam.users (email, password_hash, first_name, last_name)
    VALUES ('test@modett.com', 'hash', 'Test', 'User')
    RETURNING id
  `)
  const userId = (userResult.rows[0] as { id: string }).id

  const productResult = await db.execute(sql`
    INSERT INTO catalog.products
      (display_name, short_name, slug, product_code, active)
    VALUES ('Test Shirt', 'Shirt', 'test-shirt', 'TS001', true)
    RETURNING id
  `)
  const productId = (productResult.rows[0] as { id: string }).id

  const variantResult = await db.execute(sql`
    INSERT INTO inventory.product_variants
      (product_id, color, size, sku_group)
    VALUES (${productId}, 'Black', 'M', 'TS001-BLK-M')
    RETURNING id
  `)
  const variantId = (variantResult.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO inventory.variant_stock (variant_id, in_stock_qty, held_qty)
    VALUES (${variantId}, 1, 0)
  `)

  await db.execute(sql`
    INSERT INTO catalog.product_prices
      (product_id, lkr_amount, sgd_amount, usd_amount)
    VALUES (${productId}, 2500.00, 18.00, 12.00)
  `)

  const cartAResult = await db.execute(sql`
    INSERT INTO cart.carts (user_id, session_id, status, expires_at)
    VALUES (${userId}, 'sess-A', 'ACTIVE', now() + interval '1 day')
    RETURNING id
  `)
  const cartAId = (cartAResult.rows[0] as { id: string }).id

  const cartBResult = await db.execute(sql`
    INSERT INTO cart.carts (session_id, status, expires_at)
    VALUES ('sess-B', 'ACTIVE', now() + interval '1 day')
    RETURNING id
  `)
  const cartBId = (cartBResult.rows[0] as { id: string }).id

  await db.execute(sql`
    INSERT INTO cart.cart_items (cart_id, variant_id, qty)
    VALUES (${cartAId}, ${variantId}, 1)
  `)
  await db.execute(sql`
    INSERT INTO cart.cart_items (cart_id, variant_id, qty)
    VALUES (${cartBId}, ${variantId}, 1)
  `)

  return { userId, cartAId, cartBId, variantId, productId }
}

/** Wraps atomicHoldStock so that false is turned into a throw (for assertion on error.code). */
async function holdOrThrow(variantId: string, qty: number): Promise<boolean> {
  const ok = await atomicHoldStock({ variantId, qty })
  if (!ok) throw new InsufficientStockError()
  return ok
}

describe('Concurrent checkout — last unit race condition', () => {
  beforeEach(async () => {
    await truncateForTest()
  })

  afterAll(async () => {
    await db.execute(sql`SELECT 1`)
  })

  it('happy path: first checkout holds the last unit successfully', async () => {
    const { variantId } = await seedOneUnitVariant()

    await atomicHoldStock({ variantId, qty: 1 })

    const stock = await db.execute(sql`
      SELECT in_stock_qty, held_qty, available_qty
      FROM inventory.variant_stock
      WHERE variant_id = ${variantId}
    `)
    const row = stock.rows[0] as { in_stock_qty: number; held_qty: number; available_qty: number }

    expect(row.in_stock_qty).toBe(1)
    expect(row.held_qty).toBe(1)
    expect(row.available_qty).toBe(0)
  })

  it('failure path: concurrent holds on last unit — exactly one succeeds', async () => {
    const { variantId } = await seedOneUnitVariant()

    const results = await Promise.allSettled([
      holdOrThrow(variantId, 1),
      holdOrThrow(variantId, 1),
    ])

    const succeeded = results.filter((r) => r.status === 'fulfilled')
    const failed = results.filter((r) => r.status === 'rejected')

    expect(succeeded).toHaveLength(1)
    expect(failed).toHaveLength(1)

    const error = (failed[0] as PromiseRejectedResult).reason
    expect(error).toMatchObject({ code: 'INSUFFICIENT_STOCK' })

    const stock = await db.execute(sql`
      SELECT in_stock_qty, held_qty, available_qty
      FROM inventory.variant_stock
      WHERE variant_id = ${variantId}
    `)
    const row = stock.rows[0] as { in_stock_qty: number; held_qty: number; available_qty: number }

    expect(row.in_stock_qty).toBe(1)
    expect(row.held_qty).toBe(1)
    expect(row.available_qty).toBe(0)
  })

  it('edge case: three concurrent holds on one unit — exactly one succeeds', async () => {
    const { variantId } = await seedOneUnitVariant()

    const results = await Promise.allSettled([
      holdOrThrow(variantId, 1),
      holdOrThrow(variantId, 1),
      holdOrThrow(variantId, 1),
    ])

    const succeeded = results.filter((r) => r.status === 'fulfilled')
    const failed = results.filter((r) => r.status === 'rejected')

    expect(succeeded).toHaveLength(1)
    expect(failed).toHaveLength(2)

    for (const f of failed) {
      const error = (f as PromiseRejectedResult).reason
      expect(error).toMatchObject({ code: 'INSUFFICIENT_STOCK' })
    }

    const stock = await db.execute(sql`
      SELECT held_qty, available_qty
      FROM inventory.variant_stock
      WHERE variant_id = ${variantId}
    `)
    const row = stock.rows[0] as { held_qty: number; available_qty: number }
    expect(row.held_qty).toBe(1)
    expect(row.available_qty).toBe(0)
  })

  it('rollback: partial hold is fully released if a later item fails', async () => {
    const { variantId: variantAId } = await seedOneUnitVariant()

    const variantBResult = await db.execute(sql`
      INSERT INTO inventory.product_variants
        (product_id, color, size, sku_group)
      SELECT id, 'White', 'L', 'TS001-WHT-L'
      FROM catalog.products LIMIT 1
      RETURNING id
    `)
    const variantBId = (variantBResult.rows[0] as { id: string }).id
    await db.execute(sql`
      INSERT INTO inventory.variant_stock (variant_id, in_stock_qty, held_qty)
      VALUES (${variantBId}, 0, 0)
    `)

    const cartResult = await db.execute(sql`
      INSERT INTO cart.carts (session_id, status, expires_at)
      VALUES ('sess-rollback', 'ACTIVE', now() + interval '1 day')
      RETURNING id
    `)
    const cartId = (cartResult.rows[0] as { id: string }).id

    await expect(
      createReservation({
        cartId,
        items: [
          { variantId: variantAId, qty: 1 },
          { variantId: variantBId, qty: 1 },
        ],
      }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_STOCK' })

    const stockA = await db.execute(sql`
      SELECT held_qty, available_qty
      FROM inventory.variant_stock
      WHERE variant_id = ${variantAId}
    `)
    const rowA = stockA.rows[0] as { held_qty: number; available_qty: number }
    expect(rowA.held_qty).toBe(0)
    expect(rowA.available_qty).toBe(1)
  })
})
