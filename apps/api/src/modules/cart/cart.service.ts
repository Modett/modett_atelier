/**
 * Cart service — cart resolution, get cart with stock hints and prices,
 * add/update/remove/clear, login merge. RORO. Throws AppError for expected failures.
 */

import type { CurrencyCode } from '@modett/types'
import Decimal from 'decimal.js'
import { AppError } from '../../lib/errors'
import {
  getActiveCartByUserId,
  getActiveCartBySessionId,
  createCart,
  extendCartExpiry,
  getCartItems,
  getCartItem,
  upsertCartItem,
  removeCartItem,
  clearCartItems,
  mergeCartItems,
  updateCartUserId,
} from '@modett/db'
import { getProductVariantById, getVariantAvailability } from '@modett/db'
import type { CartItemDetail } from '@modett/db'
import type { Cart } from '@modett/db'

export interface Money {
  amount: string
  currency: CurrencyCode
}

function resolvePriceForCurrency({
  lkrAmount,
  sgdAmount,
  usdAmount,
  currency,
}: {
  lkrAmount: string
  sgdAmount: string
  usdAmount: string
  currency: CurrencyCode
}): Money {
  const amount =
    currency === 'LKR'
      ? String(lkrAmount)
      : currency === 'SGD'
        ? String(sgdAmount)
        : String(usdAmount)
  return { amount, currency }
}

export interface CartItemWithPrice extends CartItemDetail {
  price: Money
  totalPrice: Money
}

export interface CartSummary {
  subtotal: Money
  itemCount: number
  hasOutOfStockItems: boolean
  hasLowStockItems: boolean
}

export interface GetCartResult {
  cart: Cart
  items: CartItemWithPrice[]
  summary: CartSummary
  sessionId: string
}

function resolveCart({
  userId,
  sessionId,
}: {
  userId?: string
  sessionId: string
}): Promise<Cart> {
  if (userId) {
    return getActiveCartByUserId({ userId }).then((existing) => {
      if (existing) {
        extendCartExpiry({ cartId: existing.id })
        return existing
      }
      return createCart({ userId, sessionId })
    })
  }
  return getActiveCartBySessionId({ sessionId }).then((existing) => {
    if (existing) {
      extendCartExpiry({ cartId: existing.id })
      return existing
    }
    return createCart({ sessionId })
  })
}

export async function getCart({
  userId,
  sessionId,
  currency,
}: {
  userId?: string
  sessionId: string
  currency: CurrencyCode
}): Promise<GetCartResult> {
  const cart = await resolveCart({ userId, sessionId })
  const details = await getCartItems({ cartId: cart.id })

  const items: CartItemWithPrice[] = details.map((item) => {
    const price = resolvePriceForCurrency({
      lkrAmount: item.prices.lkrAmount,
      sgdAmount: item.prices.sgdAmount,
      usdAmount: item.prices.usdAmount,
      currency,
    })
    const totalPrice: Money = {
      amount: new Decimal(price.amount).mul(item.qty).toFixed(2),
      currency,
    }
    return { ...item, price, totalPrice }
  })

  let subtotalAmount = new Decimal(0)
  let itemCount = 0
  let hasOutOfStockItems = false
  let hasLowStockItems = false
  for (const item of items) {
    subtotalAmount = subtotalAmount.plus(item.totalPrice.amount)
    itemCount += item.qty
    if (item.stock.stockStatus === 'OUT_OF_STOCK') hasOutOfStockItems = true
    if (item.stock.stockStatus === 'LOW_STOCK') hasLowStockItems = true
  }

  const summary: CartSummary = {
    subtotal: { amount: subtotalAmount.toFixed(2), currency },
    itemCount,
    hasOutOfStockItems,
    hasLowStockItems,
  }

  return {
    cart,
    items,
    summary,
    sessionId: cart.session_id,
  }
}

export async function addToCart({
  userId,
  sessionId,
  variantId,
  qty,
}: {
  userId?: string
  sessionId: string
  variantId: string
  qty: number
}): Promise<GetCartResult> {
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
    throw new AppError('VALIDATION_ERROR', 400, 'qty must be 1–10')
  }

  const cart = await resolveCart({ userId, sessionId })

  const variant = await getProductVariantById({ variantId })
  if (!variant) throw new AppError('VARIANT_NOT_FOUND', 404)

  const availability = await getVariantAvailability({ variantId })
  if (!availability || availability.availableQty <= 0) {
    throw new AppError('OUT_OF_STOCK', 409)
  }

  const existing = await getCartItem({ cartId: cart.id, variantId })
  const newQty = existing ? existing.qty + qty : qty
  if (newQty > 10) {
    throw new AppError('MAX_QTY_PER_ITEM_EXCEEDED', 400)
  }

  await upsertCartItem({ cartId: cart.id, variantId, qty: newQty })
  return getCart({
    userId,
    sessionId,
    currency: 'LKR',
  })
}

export async function updateCartItemQty({
  userId,
  sessionId,
  variantId,
  qty,
}: {
  userId?: string
  sessionId: string
  variantId: string
  qty: number
}): Promise<GetCartResult> {
  if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
    throw new AppError('VALIDATION_ERROR', 400, 'qty must be 1–10')
  }

  const cart = await resolveCart({ userId, sessionId })
  const existing = await getCartItem({ cartId: cart.id, variantId })
  if (!existing) throw new AppError('ITEM_NOT_IN_CART', 404)

  const availability = await getVariantAvailability({ variantId })
  if (availability && qty > availability.availableQty) {
    throw new AppError('INSUFFICIENT_STOCK', 409)
  }

  await upsertCartItem({ cartId: cart.id, variantId, qty })
  return getCart({
    userId,
    sessionId,
    currency: 'LKR',
  })
}

export async function removeFromCart({
  userId,
  sessionId,
  variantId,
}: {
  userId?: string
  sessionId: string
  variantId: string
}): Promise<GetCartResult> {
  const cart = await resolveCart({ userId, sessionId })
  await removeCartItem({ cartId: cart.id, variantId })
  return getCart({
    userId,
    sessionId,
    currency: 'LKR',
  })
}

export async function clearCart({
  userId,
  sessionId,
}: {
  userId?: string
  sessionId: string
}): Promise<GetCartResult> {
  const cart = await resolveCart({ userId, sessionId })
  await clearCartItems({ cartId: cart.id })
  return getCart({
    userId,
    sessionId,
    currency: 'LKR',
  })
}

export async function mergeCartsOnLogin({
  userId,
  guestSessionId,
}: {
  userId: string
  guestSessionId: string
}): Promise<{ mergedCartId: string; sessionId: string } | null> {
  const guestCart = await getActiveCartBySessionId({
    sessionId: guestSessionId,
  })
  if (!guestCart) return null

  const userCart = await getActiveCartByUserId({ userId })
  if (userCart) {
    await mergeCartItems({
      sourceCartId: guestCart.id,
      targetCartId: userCart.id,
    })
    return { mergedCartId: userCart.id, sessionId: userCart.session_id }
  }
  const updated = await updateCartUserId({
    cartId: guestCart.id,
    userId,
  })
  if (!updated) return null
  return { mergedCartId: updated.id, sessionId: updated.session_id }
}
