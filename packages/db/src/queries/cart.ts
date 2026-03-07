/**
 * Cart query functions — carts, cart_items, reservations (read-only), reservation_items.
 * No business logic. RORO. Return null for not-found. Reservation writes live in Checkout module.
 */

import { eq, and, desc, sql } from 'drizzle-orm'
import { db, type TransactionClient } from '../client'
import {
  carts,
  cartItems,
  reservations,
  reservationItems,
} from '../schema/cart.schema'
import type { Cart, CartItem, Reservation, ReservationItem } from '../schema/cart.schema'
import { CartAlreadyCheckedOutError } from '../errors'

// —— CartItemDetail (assembled from getCartItems join) ——

export interface CartItemDetail {
  id: string
  cartId: string
  variantId: string
  qty: number
  addedAt: Date
  variant: { color: string; size: string; skuGroup: string; productId: string }
  product: { displayName: string; shortName: string; slug: string; isSale: boolean }
  keyImage: { url: string; altText: string | null } | null
  prices: { lkrAmount: string; sgdAmount: string; usdAmount: string }
  stock: {
    availableQty: number
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
    lowStockThreshold: number
  }
}

// —— Cart queries ——

export async function getActiveCartByUserId({
  userId,
}: {
  userId: string
}): Promise<Cart | null> {
  const rows = await db
    .select()
    .from(carts)
    .where(
      and(
        eq(carts.user_id, userId),
        eq(carts.status, 'ACTIVE'),
        sql`${carts.expires_at} > now()`,
      ),
    )
    .orderBy(desc(carts.created_at))
    .limit(1)
  return rows[0] ?? null
}

export async function getActiveCartBySessionId({
  sessionId,
}: {
  sessionId: string
}): Promise<Cart | null> {
  const rows = await db
    .select()
    .from(carts)
    .where(
      and(
        eq(carts.session_id, sessionId),
        eq(carts.status, 'ACTIVE'),
        sql`${carts.expires_at} > now()`,
      ),
    )
    .orderBy(desc(carts.created_at))
    .limit(1)
  return rows[0] ?? null
}

export async function getCartById({ id }: { id: string }): Promise<Cart | null> {
  const rows = await db.select().from(carts).where(eq(carts.id, id))
  return rows[0] ?? null
}

export async function createCart({
  userId,
  sessionId,
}: {
  userId?: string | null
  sessionId: string
}): Promise<Cart> {
  const rows = await db
    .insert(carts)
    .values({
      user_id: userId ?? null,
      session_id: sessionId,
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('createCart: no row returned')
  return row
}

export async function updateCartUserId({
  cartId,
  userId,
}: {
  cartId: string
  userId: string
}): Promise<Cart | null> {
  const rows = await db
    .update(carts)
    .set({ user_id: userId, updated_at: new Date() })
    .where(eq(carts.id, cartId))
    .returning()
  return rows[0] ?? null
}

export async function markCartAbandoned({
  cartId,
}: {
  cartId: string
}): Promise<void> {
  await db
    .update(carts)
    .set({ status: 'ABANDONED', updated_at: new Date() })
    .where(eq(carts.id, cartId))
}

export async function markCartCheckedOut({
  cartId,
  tx,
}: {
  cartId: string
  tx: TransactionClient
}): Promise<void> {
  const result = await tx
    .update(carts)
    .set({ status: 'CHECKED_OUT', updated_at: new Date() })
    .where(and(eq(carts.id, cartId), eq(carts.status, 'ACTIVE')))
    .returning({ id: carts.id })
  if (result.length === 0) {
    throw new CartAlreadyCheckedOutError()
  }
}

export async function extendCartExpiry({
  cartId,
}: {
  cartId: string
}): Promise<void> {
  await db
    .update(carts)
    .set({
      expires_at: sql`now() + interval '21 days'`,
      updated_at: new Date(),
    })
    .where(eq(carts.id, cartId))
}

// —— Cart item queries ——

export async function getCartItems({
  cartId,
}: {
  cartId: string
}): Promise<CartItemDetail[]> {
  const result = await db.execute(sql`
    SELECT
      ci.id,
      ci.cart_id AS "cartId",
      ci.variant_id AS "variantId",
      ci.qty,
      ci.added_at AS "addedAt",
      pv.color,
      pv.size,
      pv.sku_group AS "skuGroup",
      pv.product_id AS "productId",
      p.display_name AS "displayName",
      p.short_name AS "shortName",
      p.slug,
      p.is_sale AS "isSale",
      img.url AS "keyImageUrl",
      img.alt_text AS "keyImageAltText",
      pp.lkr_amount AS "lkrAmount",
      pp.sgd_amount AS "sgdAmount",
      pp.usd_amount AS "usdAmount",
      va.available_qty AS "availableQty",
      va.stock_status AS "stockStatus",
      va.low_stock_threshold AS "lowStockThreshold"
    FROM cart.cart_items ci
    JOIN inventory.product_variants pv ON pv.id = ci.variant_id AND pv.deleted_at IS NULL
    JOIN catalog.products p ON p.id = pv.product_id
    JOIN catalog.product_prices pp ON pp.product_id = p.id
    LEFT JOIN catalog.product_images img ON img.id = p.key_image_id
    LEFT JOIN inventory.variant_availability va ON va.variant_id = ci.variant_id
    WHERE ci.cart_id = ${cartId}
    ORDER BY ci.added_at ASC
  `)
  const rows = result.rows as Array<{
    id: string
    cartId: string
    variantId: string
    qty: number
    addedAt: Date
    color: string
    size: string
    skuGroup: string
    productId: string
    displayName: string
    shortName: string
    slug: string
    isSale: boolean
    keyImageUrl: string | null
    keyImageAltText: string | null
    lkrAmount: string
    sgdAmount: string
    usdAmount: string
    availableQty: number
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
    lowStockThreshold: number
  }>
  return rows.map((r) => ({
    id: r.id,
    cartId: r.cartId,
    variantId: r.variantId,
    qty: r.qty,
    addedAt: r.addedAt,
    variant: {
      color: r.color,
      size: r.size,
      skuGroup: r.skuGroup,
      productId: r.productId,
    },
    product: {
      displayName: r.displayName,
      shortName: r.shortName,
      slug: r.slug,
      isSale: r.isSale,
    },
    keyImage:
      r.keyImageUrl != null
        ? { url: r.keyImageUrl, altText: r.keyImageAltText ?? null }
        : null,
    prices: {
      lkrAmount: String(r.lkrAmount),
      sgdAmount: String(r.sgdAmount),
      usdAmount: String(r.usdAmount),
    },
    stock: {
      availableQty: r.availableQty ?? 0,
      stockStatus: r.stockStatus ?? 'OUT_OF_STOCK',
      lowStockThreshold: r.lowStockThreshold ?? 0,
    },
  }))
}

export async function getCartItem({
  cartId,
  variantId,
}: {
  cartId: string
  variantId: string
}): Promise<CartItem | null> {
  const rows = await db
    .select()
    .from(cartItems)
    .where(
      and(eq(cartItems.cart_id, cartId), eq(cartItems.variant_id, variantId)),
    )
  return rows[0] ?? null
}

export async function upsertCartItem({
  cartId,
  variantId,
  qty,
}: {
  cartId: string
  variantId: string
  qty: number
}): Promise<CartItem> {
  const rows = await db
    .insert(cartItems)
    .values({ cart_id: cartId, variant_id: variantId, qty })
    .onConflictDoUpdate({
      target: [cartItems.cart_id, cartItems.variant_id],
      set: { qty },
    })
    .returning()
  const row = rows[0]
  if (!row) throw new Error('upsertCartItem: no row returned')
  return row
}

export async function removeCartItem({
  cartId,
  variantId,
}: {
  cartId: string
  variantId: string
}): Promise<void> {
  await db
    .delete(cartItems)
    .where(
      and(eq(cartItems.cart_id, cartId), eq(cartItems.variant_id, variantId)),
    )
}

export async function clearCartItems({
  cartId,
  tx,
}: {
  cartId: string
  tx?: TransactionClient
}): Promise<void> {
  const client = tx ?? db
  await client
    .delete(cartItems)
    .where(eq(cartItems.cart_id, cartId))
}

export async function getCartItemCount({
  cartId,
}: {
  cartId: string
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt
    FROM cart.cart_items
    WHERE cart_id = ${cartId}
  `)
  const row = result.rows[0] as { cnt: number } | undefined
  return row?.cnt ?? 0
}

// —— Merge (used during login) ——

export async function mergeCartItems({
  sourceCartId,
  targetCartId,
}: {
  sourceCartId: string
  targetCartId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const sourceItems = await tx
      .select()
      .from(cartItems)
      .where(eq(cartItems.cart_id, sourceCartId))
    for (const item of sourceItems) {
      const existing = await tx
        .select()
        .from(cartItems)
        .where(
          and(
            eq(cartItems.cart_id, targetCartId),
            eq(cartItems.variant_id, item.variant_id),
          ),
        )
        .limit(1)
      if (existing[0]) {
        const newQty = Math.max(existing[0].qty, item.qty)
        await tx
          .update(cartItems)
          .set({ qty: newQty })
          .where(
            and(
              eq(cartItems.cart_id, targetCartId),
              eq(cartItems.variant_id, item.variant_id),
            ),
          )
      } else {
        await tx.insert(cartItems).values({
          cart_id: targetCartId,
          variant_id: item.variant_id,
          qty: item.qty,
        })
      }
    }
    await tx
      .update(carts)
      .set({ status: 'ABANDONED', updated_at: new Date() })
      .where(eq(carts.id, sourceCartId))
  })
}

// —— Reservation read queries ——

export async function getActiveReservationByCartId({
  cartId,
}: {
  cartId: string
}): Promise<Reservation | null> {
  const rows = await db
    .select()
    .from(reservations)
    .where(
      and(eq(reservations.cart_id, cartId), eq(reservations.status, 'HELD')),
    )
    .orderBy(desc(reservations.created_at))
    .limit(1)
  return rows[0] ?? null
}

export async function getReservationById({
  id,
}: {
  id: string
}): Promise<Reservation | null> {
  const rows = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, id))
  return rows[0] ?? null
}

export async function getReservationItems({
  reservationId,
}: {
  reservationId: string
}): Promise<ReservationItem[]> {
  const rows = await db
    .select()
    .from(reservationItems)
    .where(eq(reservationItems.reservation_id, reservationId))
  return rows
}
