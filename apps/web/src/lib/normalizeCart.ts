import type { Cart, CartItem, CartSummary, Money } from '@/types'

/**
 * Raw shape returned by the API for each cart item.
 * The backend returns nested objects; the frontend CartItem type is flat.
 */
interface ApiCartItem {
  id:        string
  cartId:    string
  variantId: string
  qty:       number
  addedAt:   string
  variant:   { color: string; size: string; skuGroup: string; productId: string }
  product:   { displayName: string; shortName: string; slug: string; isSale: boolean }
  keyImage:  { url: string; altText: string | null } | null
  prices:    { lkrAmount: string; sgdAmount: string; usdAmount: string }
  stock:     { availableQty: number; stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'; lowStockThreshold: number }
  price:     Money
  totalPrice: Money
}

interface ApiCartSummary {
  subtotal:           Money
  itemCount:          number
  hasOutOfStockItems: boolean
  hasLowStockItems:   boolean
}

export interface ApiCartResponse {
  cart:    Cart
  items:   ApiCartItem[]
  summary: ApiCartSummary
}

export interface NormalizedCartResponse {
  cart:    Cart
  items:   CartItem[]
  summary: CartSummary
}

function normalizeCartItem(raw: ApiCartItem): CartItem {
  return {
    id:           raw.id,
    variantId:    raw.variantId,
    qty:          raw.qty,
    productSlug:  raw.product.slug,
    displayName:  raw.product.displayName,
    shortName:    raw.product.shortName,
    color:        raw.variant.color,
    size:         raw.variant.size,
    image:        raw.keyImage
      ? { id: raw.id, url: raw.keyImage.url, altText: raw.keyImage.altText, sortOrder: 0 }
      : null,
    unitPrice:    raw.price,
    totalPrice:   raw.totalPrice,
    stockStatus:  raw.stock.stockStatus,
    availableQty: raw.stock.availableQty,
  }
}

export function normalizeCartResponse(raw: ApiCartResponse): NormalizedCartResponse {
  return {
    cart: raw.cart,
    items: raw.items.map(normalizeCartItem),
    summary: {
      itemCount: raw.summary.itemCount,
      subtotal:  raw.summary.subtotal,
      currency:  raw.summary.subtotal.currency,
    },
  }
}
