/**
 * Checkout service — start checkout, address/contact/shipping, payment initiation,
 * confirmation. RORO. Uses Decimal.js for all money. Throws AppError.
 */

import Decimal from 'decimal.js'
import { AppError } from '../../lib/errors'
import {
  createReservation,
  createDraftOrder,
  stampPaymentSubmitted,
  getOrderById,
  getOrderWithDetails,
  getOrderAddresses,
  getOrderContact,
  updateOrderShipping,
  upsertOrderAddress,
  upsertOrderContact,
  updateOrderIsGift,
  appendOrderEvent,
} from '@modett/db'
import {
  getMethodsForCheckout,
  getMethodForOrder,
} from '../shipping'
import {
  getCartItems,
  getActiveCartBySessionId,
  getActiveCartByUserId,
  atomicReleaseHold,
} from '@modett/db'
import type { CartItemDetail } from '@modett/db'
import type { OrderWithDetails } from '@modett/db'
import { ReservationNotHeldError } from '@modett/db'

const TAX_RATES = { LKR: 0.18, SGD: 0.09, USD: 0 } as const

// Shared, user-facing copy for the most common checkout failures. The frontend
// surfaces these strings directly in the error toast / inline banner, so they
// are written for the customer (not for engineers reading logs).
const ORDER_NOT_FOUND_MSG =
  'We could not find this order. It may have expired or been completed in another tab. Please return to your bag and start checkout again.'
const ORDER_NOT_DRAFT_MSG =
  'This order can no longer be edited. Please return to your bag and start a new checkout.'
const RESERVATION_NOT_HELD_MSG =
  'Your item reservation has expired. Please return to your bag and start checkout again.'

type CurrencyCode = 'LKR' | 'SGD' | 'USD'

function resolvePriceAmount({
  lkrAmount,
  sgdAmount,
  usdAmount,
  currency,
}: {
  lkrAmount: string
  sgdAmount: string
  usdAmount: string
  currency: CurrencyCode
}): Decimal {
  const amount =
    currency === 'LKR'
      ? lkrAmount
      : currency === 'SGD'
        ? sgdAmount
        : usdAmount
  return new Decimal(amount)
}

function resolveCountryFromCurrency(currency: CurrencyCode): string {
  if (currency === 'LKR') return 'LK'
  if (currency === 'SGD') return 'SG'
  return 'US'
}

function buildProductSnapshot(item: CartItemDetail): Record<string, unknown> {
  return {
    productId: item.variant.productId,
    displayName: item.product.displayName,
    shortName: item.product.shortName,
    slug: item.product.slug,
    color: item.variant.color,
    size: item.variant.size,
    imageUrl: item.keyImage?.url ?? null,
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

// —— startCheckout ——

export interface StartCheckoutParams {
  userId?: string | null
  sessionId: string
  currency: CurrencyCode
  guestEmail?: string | null
}

export interface StartCheckoutResult {
  reservationId: string
  orderId: string
  orderRef: string
  expiresAt: Date
  currency: CurrencyCode
  summary: {
    cartId: string
    subtotal: string
    taxAmount: string
    total: string
    itemCount: number
  }
}

export async function startCheckout({
  userId,
  sessionId,
  currency,
  guestEmail,
}: StartCheckoutParams): Promise<StartCheckoutResult> {
  const cart = userId
    ? await getActiveCartByUserId({ userId })
    : await getActiveCartBySessionId({ sessionId })

  if (!cart) {
    throw new AppError(
      'CART_NOT_FOUND',
      404,
      'Your bag could not be found. Please add an item and try again.',
    )
  }

  const cartItems = await getCartItems({ cartId: cart.id })
  if (cartItems.length === 0) {
    throw new AppError(
      'CART_IS_EMPTY',
      400,
      'Your bag is empty. Please add an item before starting checkout.',
    )
  }

  for (const item of cartItems) {
    if (item.stock.availableQty < item.qty) {
      throw new AppError(
        'INSUFFICIENT_STOCK',
        409,
        'One or more items in your bag are no longer in stock. Please review your bag and try again.',
      )
    }
  }

  if (!userId && !guestEmail) {
    throw new AppError(
      'GUEST_EMAIL_REQUIRED',
      400,
      'Please enter your e-mail address to continue.',
    )
  }
  if (guestEmail && !isValidEmail(guestEmail)) {
    throw new AppError(
      'INVALID_EMAIL',
      400,
      'Please enter a valid e-mail address.',
    )
  }

  const taxRate = TAX_RATES[currency]
  let subtotal = new Decimal(0)

  for (const item of cartItems) {
    const unitPrice = resolvePriceAmount({
      lkrAmount: item.prices.lkrAmount,
      sgdAmount: item.prices.sgdAmount,
      usdAmount: item.prices.usdAmount,
      currency,
    })
    const lineTotal = unitPrice.mul(item.qty)
    subtotal = subtotal.add(lineTotal)
  }

  let taxAmount: Decimal
  let total: Decimal

  if (currency === 'LKR') {
    taxAmount = subtotal
      .mul(taxRate)
      .div(new Decimal(1).add(taxRate))
      .toDecimalPlaces(2)
    total = subtotal
  } else {
    taxAmount = subtotal.mul(taxRate).toDecimalPlaces(2)
    total = subtotal.add(taxAmount)
  }

  const taxRateSnapshot = new Decimal(taxRate)

  const reservation = await createReservation({
    userId: userId ?? null,
    cartId: cart.id,
    items: cartItems.map((i) => ({ variantId: i.variantId, qty: i.qty })),
  })

  let order
  try {
    order = await createDraftOrder({
      userId: userId ?? null,
      guestEmail: guestEmail ?? null,
      currency,
      countryCode: resolveCountryFromCurrency(currency),
      subtotal: subtotal.toFixed(2),
      taxRateSnapshot: taxRateSnapshot.toFixed(4),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      items: cartItems.map((item) => ({
        variantId: item.variantId,
        qty: item.qty,
        unitPriceSnapshotAmount: resolvePriceAmount({
          lkrAmount: item.prices.lkrAmount,
          sgdAmount: item.prices.sgdAmount,
          usdAmount: item.prices.usdAmount,
          currency,
        }).toFixed(2),
        unitPriceSnapshotCurrency: currency,
        taxAmount: '0',
        productSnapshotJson: buildProductSnapshot(item),
      })),
    })
  } catch (err) {
    for (const item of cartItems) {
      await atomicReleaseHold({
        variantId: item.variantId,
        qty: item.qty,
      }).catch(() => {})
    }
    throw err
  }

  return {
    reservationId: reservation.id,
    orderId: order.id,
    orderRef: order.order_ref,
    expiresAt: reservation.expires_at,
    currency,
    summary: {
      cartId: cart.id,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      itemCount: cartItems.length,
    },
  }
}

// —— saveAddress ——

export async function saveAddress({
  orderId,
  kind,
  addressJson,
  countryCode,
}: {
  orderId: string
  kind: 'SHIPPING' | 'BILLING'
  addressJson: Record<string, unknown>
  countryCode: string
}): Promise<OrderWithDetails> {
  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404, ORDER_NOT_FOUND_MSG)
  if (order.order_state !== 'DRAFT') {
    throw new AppError('ORDER_NOT_DRAFT', 409, ORDER_NOT_DRAFT_MSG)
  }

  await upsertOrderAddress({ orderId, kind, addressJson, countryCode })
  await appendOrderEvent({
    orderId,
    eventType: 'ADDRESS_SAVED',
    payloadJson: { kind, countryCode },
  })

  const details = await getOrderWithDetails({ id: orderId })
  if (!details) throw new AppError('ORDER_NOT_FOUND', 404, ORDER_NOT_FOUND_MSG)
  return details
}

// —— saveContact ——

export async function saveContact({
  orderId,
  primaryPhone,
  extraPhones,
  isGift,
  giftReceiver,
}: {
  orderId: string
  primaryPhone: string
  extraPhones?: unknown[]
  isGift?: boolean
  giftReceiver?: Record<string, unknown> | null
}): Promise<OrderWithDetails> {
  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404, ORDER_NOT_FOUND_MSG)
  if (order.order_state !== 'DRAFT') {
    throw new AppError('ORDER_NOT_DRAFT', 409, ORDER_NOT_DRAFT_MSG)
  }

  let giftReceiverJson: Record<string, unknown> | null = null
  if (isGift === true) {
    if (giftReceiver == null) {
      throw new AppError(
        'GIFT_RECEIVER_REQUIRED',
        400,
        'Gift receiver details are required when marking an order as a gift.',
      )
    }
    giftReceiverJson = giftReceiver
  }

  if (isGift === true) {
    await updateOrderIsGift({ orderId, isGift: true })
  }

  await upsertOrderContact({
    orderId,
    primaryPhone,
    extraPhonesJson: extraPhones ?? [],
    giftReceiverJson,
  })

  await appendOrderEvent({
    orderId,
    eventType: 'CONTACT_SAVED',
    payloadJson: { isGift: isGift ?? false },
  })

  const details = await getOrderWithDetails({ id: orderId })
  if (!details) throw new AppError('ORDER_NOT_FOUND', 404, ORDER_NOT_FOUND_MSG)
  return details
}

// —— getShippingMethods ——

export interface Money {
  amount: string
  currency: CurrencyCode
}

export interface ShippingMethodOption {
  id: string
  name: string
  carrier: string | null
  estimatedDays: string | null
  rateType: string
  cost: Money | null
}

export async function getShippingMethods({
  countryCode,
  currency,
}: {
  countryCode: string
  currency: CurrencyCode
}): Promise<ShippingMethodOption[]> {
  return getMethodsForCheckout({ countryCode, currency })
}

// —— selectShippingMethod ——

export async function selectShippingMethod({
  orderId,
  shippingMethodId,
  currency,
}: {
  orderId: string
  shippingMethodId: string
  currency: CurrencyCode
}): Promise<OrderWithDetails> {
  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404, ORDER_NOT_FOUND_MSG)
  if (order.order_state !== 'DRAFT') {
    throw new AppError('ORDER_NOT_DRAFT', 409, ORDER_NOT_DRAFT_MSG)
  }

  const { method, cost } = await getMethodForOrder({
    methodId: shippingMethodId,
    currency,
  })
  if (cost == null) {
    throw new AppError(
      'SHIPPING_COST_NOT_AVAILABLE',
      400,
      'Shipping is not available for the selected destination. Please pick a different shipping method.',
    )
  }
  const shippingCost = new Decimal(cost.amount)

  const subtotal = new Decimal(String(order.subtotal))
  const taxAmount = new Decimal(String(order.tax_amount))

  let newTotal: Decimal
  if (currency === 'LKR') {
    newTotal = subtotal.add(shippingCost)
  } else {
    newTotal = subtotal.add(shippingCost).add(taxAmount)
  }

  const shippingMethodSnapshot = method.carrier
    ? `${method.name} — ${method.carrier}`
    : method.name

  await updateOrderShipping({
    orderId,
    shippingMethodId,
    shippingMethodSnapshot,
    shippingCost: shippingCost.toFixed(2),
    total: newTotal.toFixed(2),
  })

  await appendOrderEvent({
    orderId,
    eventType: 'SHIPPING_SELECTED',
    payloadJson: {
      shippingMethodId,
      shippingMethodSnapshot,
      shippingCost: shippingCost.toFixed(2),
    },
  })

  const details = await getOrderWithDetails({ id: orderId })
  if (!details) throw new AppError('ORDER_NOT_FOUND', 404, ORDER_NOT_FOUND_MSG)
  return details
}

// —— initiatePayment ——

export interface InitiatePaymentResult {
  orderId: string
  orderRef: string
  reservationId: string
  total: string
  currency: string
  stripeReady: boolean
}

export async function initiatePayment({
  orderId,
  reservationId,
}: {
  orderId: string
  reservationId: string
}): Promise<InitiatePaymentResult> {
  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404, ORDER_NOT_FOUND_MSG)
  if (order.order_state !== 'DRAFT') {
    throw new AppError('ORDER_NOT_DRAFT', 409, ORDER_NOT_DRAFT_MSG)
  }
  if (!order.shipping_method_id) {
    throw new AppError(
      'SHIPPING_NOT_SELECTED',
      400,
      'Please select a shipping method before continuing to payment.',
    )
  }

  const addresses = await getOrderAddresses({ orderId })
  const hasShipping = addresses.some((a) => a.kind === 'SHIPPING')
  if (!hasShipping) {
    throw new AppError(
      'SHIPPING_ADDRESS_REQUIRED',
      400,
      'Please provide a shipping address before continuing to payment.',
    )
  }

  const contact = await getOrderContact({ orderId })
  if (!contact) {
    throw new AppError(
      'CONTACT_REQUIRED',
      400,
      'Please provide a contact phone number before continuing to payment.',
    )
  }

  try {
    await stampPaymentSubmitted({ reservationId })
  } catch (err) {
    if (err instanceof ReservationNotHeldError) {
      throw new AppError('RESERVATION_EXPIRED', 410, RESERVATION_NOT_HELD_MSG)
    }
    throw err
  }

  return {
    orderId: order.id,
    orderRef: order.order_ref,
    reservationId,
    total: String(order.total),
    currency: order.currency,
    stripeReady: true,
  }
}

// —— getOrderConfirmation ——

export async function getOrderConfirmation({
  orderId,
  userId,
  guestEmail,
}: {
  orderId: string
  userId?: string | null
  guestEmail?: string | null
}): Promise<OrderWithDetails> {
  const details = await getOrderWithDetails({ id: orderId })
  if (!details) throw new AppError('ORDER_NOT_FOUND', 404, ORDER_NOT_FOUND_MSG)

  const { order } = details
  const accessDeniedMsg = 'You do not have access to this order.'

  if (userId != null) {
    if (order.user_id !== userId) {
      throw new AppError('ORDER_ACCESS_DENIED', 403, accessDeniedMsg)
    }
  } else if (guestEmail != null) {
    const orderGuest = order.guest_email?.trim().toLowerCase() ?? ''
    const requestedGuest = guestEmail.trim().toLowerCase()
    if (orderGuest !== requestedGuest) {
      throw new AppError('ORDER_ACCESS_DENIED', 403, accessDeniedMsg)
    }
  } else {
    throw new AppError('ORDER_ACCESS_DENIED', 403, accessDeniedMsg)
  }

  return details
}
