/**
 * Checkout query functions — shipping (read), reservations (read + write),
 * order creation and reads. No business logic. RORO.
 */

import { eq, and, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db, type Database, type TransactionClient } from '../client'
import { withInventoryLock } from '../redis'
import { atomicHoldStock, atomicReleaseHold } from './inventory'
import { reservations, reservationItems } from '../schema/cart.schema'
import {
  ordersTable,
  orderItems,
  orderAddresses,
  orderContacts,
  orderEvents,
} from '../schema/orders.schema'
import type { Order, OrderItem, OrderAddress, OrderContact, OrderEvent } from '../schema/orders.schema'
import { shippingMethods } from '../schema/shipping.schema'
import type { Reservation, ReservationItem } from '../schema/cart.schema'
import type { InferSelectModel } from 'drizzle-orm'
import {
  ReservationNotHeldError,
  InsufficientStockError,
  OrderNotDraftError,
} from '../errors'

type ShippingMethod = InferSelectModel<typeof shippingMethods>

// —— Shipping (read only) ——

export async function getShippingMethodsForCountry({
  countryCode,
}: {
  countryCode: string
}): Promise<ShippingMethod[]> {
  const countryArray = JSON.stringify([countryCode])
  const result = await db.execute(sql`
    SELECT sm.id, sm.zone_id, sm.name, sm.carrier, sm.rate_type,
           sm.flat_rate_lkr, sm.flat_rate_sgd, sm.flat_rate_usd,
           sm.estimated_days, sm.active, sm.created_at, sm.updated_at
    FROM shipping.shipping_methods sm
    JOIN shipping.shipping_zones sz ON sz.id = sm.zone_id
    WHERE sz.countries_json @> ${countryArray}::jsonb
      AND sm.active = true
    ORDER BY sm.rate_type ASC, sm.name ASC
  `)
  return (result.rows as ShippingMethod[]) ?? []
}

export async function getShippingMethodById({
  id,
}: {
  id: string
}): Promise<ShippingMethod | null> {
  const rows = await db
    .select()
    .from(shippingMethods)
    .where(and(eq(shippingMethods.id, id), eq(shippingMethods.active, true)))
  return rows[0] ?? null
}

// —— Reservation writes ——

export interface CreateReservationParams {
  userId?: string | null
  cartId: string
  items: Array<{ variantId: string; qty: number }>
}

export interface ReservationWithItems extends Reservation {
  items: ReservationItem[]
}

/**
 * Creates a reservation and its items. Acquires atomic stock holds for every
 * item before creating any DB records. If any hold fails, releases all
 * already-acquired holds then re-throws. If the DB transaction fails after
 * holds are acquired, releases all holds in the catch block.
 */
export async function createReservation({
  userId,
  cartId,
  items,
}: CreateReservationParams): Promise<ReservationWithItems> {
  const held: Array<{ variantId: string; qty: number }> = []

  try {
    for (const item of items) {
      await withInventoryLock(item.variantId, async () => {
        const ok = await atomicHoldStock({
          variantId: item.variantId,
          qty: item.qty,
        })
        if (!ok) throw new InsufficientStockError()
        held.push(item)
      })
    }

    return await db.transaction(async (tx) => {
      const expiresAt = sql`now() + interval '30 minutes'`
      const [reservationRow] = await tx
        .insert(reservations)
        .values({
          user_id: userId ?? null,
          cart_id: cartId,
          status: 'HELD',
          expires_at: expiresAt,
        })
        .returning()

      if (!reservationRow) throw new Error('createReservation: no row returned')

      if (items.length > 0) {
        await tx.insert(reservationItems).values(
          items.map((item) => ({
            reservation_id: reservationRow.id,
            variant_id: item.variantId,
            qty: item.qty,
          })),
        )
      }

      const itemRows = await tx
        .select()
        .from(reservationItems)
        .where(eq(reservationItems.reservation_id, reservationRow.id))

      return { ...reservationRow, items: itemRows }
    })
  } catch (err) {
    for (const h of held) {
      await atomicReleaseHold({ variantId: h.variantId, qty: h.qty }).catch(
        () => {},
      )
    }
    throw err
  }
}

/**
 * Stamps payment_submitted_at and grace_expires_at on the reservation.
 * WHERE payment_submitted_at IS NULL prevents double-stamping.
 * 0 rows → RESERVATION_NOT_HELD 409.
 */
export async function stampPaymentSubmitted({
  reservationId,
}: {
  reservationId: string
}): Promise<Reservation> {
  const result = await db.execute(sql`
    UPDATE cart.reservations
    SET payment_submitted_at = now(),
        grace_expires_at     = now() + interval '10 minutes'
    WHERE id = ${reservationId}
      AND status = 'HELD'
      AND payment_submitted_at IS NULL
    RETURNING *
  `)

  const row = result.rows[0] as Reservation | undefined
  if (!row) throw new ReservationNotHeldError()
  return row
}

/**
 * Called ONLY by the reservation expiry worker — not by any route.
 * Claims the reservation (worker_lock_id, processed_at, status EXPIRED),
 * releases holds for each reservation_item, then sets hold_released_at.
 * If 0 rows on claim (another worker got it), returns { expired: false }.
 */
export async function expireReservation({
  reservationId,
  workerLockId,
}: {
  reservationId: string
  workerLockId: string
}): Promise<{ expired: boolean }> {
  const result = await db.transaction(async (tx) => {
    const claimResult = await tx.execute(sql`
      UPDATE cart.reservations
      SET worker_lock_id = ${workerLockId},
          processed_at   = now(),
          status         = 'EXPIRED'
      WHERE id     = ${reservationId}
        AND status = 'HELD'
        AND worker_lock_id IS NULL
      RETURNING *
    `)

    if (claimResult.rows.length === 0) return null

    const itemsResult = await tx.execute(sql`
      SELECT variant_id, qty
      FROM cart.reservation_items
      WHERE reservation_id = ${reservationId}
    `)
    const items = itemsResult.rows as Array<{ variant_id: string; qty: number }>

    for (const item of items) {
      const releaseResult = await tx.execute(sql`
        UPDATE inventory.variant_stock
        SET held_qty   = held_qty - ${item.qty},
            updated_at = now()
        WHERE variant_id = ${item.variant_id}
          AND held_qty   >= ${item.qty}
        RETURNING variant_id
      `)
      if (releaseResult.rows.length === 0) {
        throw new Error(
          `expireReservation: failed to release hold for variant ${item.variant_id}`,
        )
      }
    }

    await tx.execute(sql`
      UPDATE cart.reservations
      SET hold_released_at = now()
      WHERE id = ${reservationId}
    `)

    return { expired: true }
  })

  if (result === null) return { expired: false }
  return result
}

/**
 * Consumes the reservation (status = 'CONSUMED'). Called inside the order
 * confirmation transaction. Uses tx, not db. 0 rows → RESERVATION_NOT_HELD 409.
 */
export async function consumeReservation({
  reservationId,
  tx,
}: {
  reservationId: string
  tx: TransactionClient
}): Promise<void> {
  const result = await tx.execute(sql`
    UPDATE cart.reservations
    SET status = 'CONSUMED'
    WHERE id     = ${reservationId}
      AND status = 'HELD'
    RETURNING id
  `)

  if (result.rows.length === 0) throw new ReservationNotHeldError()
}

// —— Order ref (runs inside caller's transaction) ——

export async function generateOrderRef({
  tx,
}: {
  tx: TransactionClient
}): Promise<string> {
  const result = await tx.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM orders.orders
    WHERE order_ref LIKE 'MOD-' || EXTRACT(YEAR FROM now())::text || '%'
  `)
  const row = result.rows[0] as { count: number } | undefined
  const count = (row?.count ?? 0) + 1
  const year = new Date().getFullYear()
  return `MOD-${year}${String(count).padStart(5, '0')}`
}

// —— Order creation ——

export interface CreateDraftOrderParams {
  userId?: string | null
  guestEmail?: string | null
  currency: 'LKR' | 'SGD' | 'USD'
  countryCode: string
  subtotal: string
  taxRateSnapshot: string
  taxAmount: string
  total: string
  items: Array<{
    variantId: string
    qty: number
    unitPriceSnapshotAmount: string
    unitPriceSnapshotCurrency: 'LKR' | 'SGD' | 'USD'
    taxAmount: string
    productSnapshotJson: Record<string, unknown>
  }>
}

export async function createDraftOrder(
  params: CreateDraftOrderParams,
): Promise<Order> {
  const {
    userId,
    guestEmail,
    currency,
    countryCode,
    subtotal,
    taxRateSnapshot,
    taxAmount,
    total,
    items,
  } = params

  return await db.transaction(async (tx) => {
    const orderRef = await generateOrderRef({ tx })

    const [orderRow] = await tx
      .insert(ordersTable)
      .values({
        order_ref: orderRef,
        user_id: userId ?? null,
        guest_email: guestEmail ?? null,
        order_state: 'DRAFT',
        payment_state: 'UNPAID',
        fulfillment_state: 'NOT_STARTED',
        return_state: 'NONE',
        currency,
        country_code: countryCode,
        subtotal,
        discount_amount: '0',
        shipping_cost: '0',
        tax_amount: taxAmount,
        tax_rate_snapshot: taxRateSnapshot,
        total,
        is_gift: false,
      })
      .returning()

    if (!orderRow) throw new Error('createDraftOrder: no row returned')
    const orderId = orderRow.id

    if (items.length > 0) {
      await tx.insert(orderItems).values(
        items.map((item) => ({
          order_id: orderId,
          variant_id: item.variantId,
          qty: item.qty,
          unit_price_snapshot_amount: item.unitPriceSnapshotAmount,
          unit_price_snapshot_currency: item.unitPriceSnapshotCurrency,
          tax_amount: item.taxAmount,
          product_snapshot_json: item.productSnapshotJson,
        })),
      )
    }

    await tx.insert(orderEvents).values({
      order_id: orderId,
      event_type: 'ORDER_CREATED',
      payload_json: {
        currency,
        countryCode,
        itemCount: items.length,
      },
    })

    return orderRow
  })
}

export async function updateOrderShipping({
  orderId,
  shippingMethodId,
  shippingMethodSnapshot,
  shippingCost,
  total,
  tx,
}: {
  orderId: string
  shippingMethodId: string
  shippingMethodSnapshot: string | null
  shippingCost: string
  total: string
  tx?: TransactionClient
}): Promise<Order> {
  const client = (tx ?? db) as Database | TransactionClient
  const rows = await client
    .update(ordersTable)
    .set({
      shipping_method_id: shippingMethodId,
      shipping_method_snapshot: shippingMethodSnapshot,
      shipping_cost: shippingCost,
      total,
      updated_at: new Date(),
    })
    .where(
      and(eq(ordersTable.id, orderId), eq(ordersTable.order_state, 'DRAFT')),
    )
    .returning()

  const row = rows[0]
  if (!row) throw new OrderNotDraftError()
  return row
}

export async function updateOrderIsGift({
  orderId,
  isGift,
  tx,
}: {
  orderId: string
  isGift: boolean
  tx?: TransactionClient
}): Promise<void> {
  const client = (tx ?? db) as Database | TransactionClient
  await client
    .update(ordersTable)
    .set({ is_gift: isGift, updated_at: new Date() })
    .where(
      and(eq(ordersTable.id, orderId), eq(ordersTable.order_state, 'DRAFT')),
    )
}

export async function upsertOrderAddress({
  orderId,
  kind,
  addressJson,
  countryCode,
  tx,
}: {
  orderId: string
  kind: 'SHIPPING' | 'BILLING'
  addressJson: Record<string, unknown>
  countryCode: string
  tx?: TransactionClient
}): Promise<OrderAddress> {
  const client = (tx ?? db) as Database | TransactionClient
  const rows = await client
    .insert(orderAddresses)
    .values({
      order_id: orderId,
      kind,
      address_json: addressJson,
      country_code: countryCode,
    })
    .onConflictDoUpdate({
      target: [orderAddresses.order_id, orderAddresses.kind],
      set: {
        address_json: addressJson,
        country_code: countryCode,
      },
    })
    .returning()

  const row = rows[0]
  if (!row) throw new Error('upsertOrderAddress: no row returned')
  return row
}

export async function upsertOrderContact({
  orderId,
  primaryPhone,
  extraPhonesJson,
  giftReceiverJson,
  tx,
}: {
  orderId: string
  primaryPhone: string
  extraPhonesJson?: unknown[]
  giftReceiverJson?: Record<string, unknown> | null
  tx?: TransactionClient
}): Promise<OrderContact> {
  const client = (tx ?? db) as Database | TransactionClient
  const rows = await client
    .insert(orderContacts)
    .values({
      order_id: orderId,
      primary_phone: primaryPhone,
      extra_phones_json: extraPhonesJson ?? [],
      gift_receiver_json: giftReceiverJson ?? null,
    })
    .onConflictDoUpdate({
      target: [orderContacts.order_id],
      set: {
        primary_phone: primaryPhone,
        extra_phones_json: extraPhonesJson ?? [],
        gift_receiver_json: giftReceiverJson ?? null,
      },
    })
    .returning()

  const row = rows[0]
  if (!row) throw new Error('upsertOrderContact: no row returned')
  return row
}

export async function placeOrder({
  orderId,
  tx,
}: {
  orderId: string
  tx: TransactionClient
}): Promise<void> {
  const result = await tx.execute(sql`
    UPDATE orders.orders
    SET order_state = 'PLACED',
        placed_at   = now(),
        updated_at  = now()
    WHERE id          = ${orderId}
      AND order_state = 'DRAFT'
    RETURNING id
  `)

  if (result.rows.length === 0) throw new OrderNotDraftError()
}

export async function appendOrderEvent({
  orderId,
  eventType,
  payloadJson,
  createdByAdminId,
  adminNote,
  tx,
}: {
  orderId: string
  eventType: string
  payloadJson?: Record<string, unknown>
  createdByAdminId?: string | null
  adminNote?: string | null
  tx?: TransactionClient
}): Promise<OrderEvent> {
  const client = (tx ?? db) as Database | TransactionClient
  const rows = await client
    .insert(orderEvents)
    .values({
      order_id: orderId,
      event_type: eventType,
      payload_json: payloadJson ?? {},
      created_by_admin_id: createdByAdminId ?? null,
      admin_note: adminNote ?? null,
    })
    .returning()

  const row = rows[0]
  if (!row) throw new Error('appendOrderEvent: no row returned')
  return row
}

// —— Order reads ——

export async function getOrderById({ id }: { id: string }): Promise<Order | null> {
  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.id, id))
  return rows[0] ?? null
}

export async function getOrderByRef({
  orderRef,
}: {
  orderRef: string
}): Promise<Order | null> {
  const rows = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.order_ref, orderRef))
  return rows[0] ?? null
}

export async function getOrderItems({
  orderId,
}: {
  orderId: string
}): Promise<OrderItem[]> {
  const rows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.order_id, orderId))
    .orderBy(asc(orderItems.created_at))
  return rows
}

export async function getOrderAddresses({
  orderId,
}: {
  orderId: string
}): Promise<OrderAddress[]> {
  const rows = await db
    .select()
    .from(orderAddresses)
    .where(eq(orderAddresses.order_id, orderId))
  return rows
}

export async function getOrderContact({
  orderId,
}: {
  orderId: string
}): Promise<OrderContact | null> {
  const rows = await db
    .select()
    .from(orderContacts)
    .where(eq(orderContacts.order_id, orderId))
  return rows[0] ?? null
}

export interface OrderWithDetails {
  order: Order
  items: OrderItem[]
  addresses: OrderAddress[]
  contact: OrderContact | null
}

export async function getOrderWithDetails({
  id,
}: {
  id: string
}): Promise<OrderWithDetails | null> {
  const order = await getOrderById({ id })
  if (!order) return null

  const [items, addresses, contact] = await Promise.all([
    getOrderItems({ orderId: id }),
    getOrderAddresses({ orderId: id }),
    getOrderContact({ orderId: id }),
  ])

  return { order, items, addresses, contact }
}
