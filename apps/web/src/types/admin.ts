// Admin-specific TypeScript types (dashboard + list views; camelCase after API mapping)

import type { CurrencyCode } from './index'

// ── Dashboard Stats ──────────────────────────────────────
export interface DashboardStats {
  todayOrders: number
  todayRevenue: { amount: string; currency: CurrencyCode }
  pendingReturns: number
  lowStockCount: number
  outOfStockCount: number
  flaggedReviews: number
}

// ── Order Summary (for list views) ───────────────────────
export type OrderState = 'DRAFT' | 'PLACED' | 'CANCELLED'
export type PaymentState = 'UNPAID' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED'
export type FulfillmentState =
  | 'NOT_STARTED'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'

export interface AdminOrderSummary {
  id: string
  orderRef: string
  orderState: OrderState
  paymentState: PaymentState
  fulfillmentState: FulfillmentState
  customerEmail: string
  customerName: string
  totalAmount: string
  currency: CurrencyCode
  itemCount: number
  createdAt: string
  updatedAt: string
}

export interface AdminOrdersResponse {
  orders: AdminOrderSummary[]
  page: number
  limit: number
  total: number
}

// ── Returns ──────────────────────────────────────────────
export type ReturnStatus =
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FULFILLED'
export type ReturnType = 'REFUND' | 'EXCHANGE'

export interface AdminReturnSummary {
  id: string
  orderRef: string
  status: ReturnStatus
  type: ReturnType
  reason: string
  customerEmail: string
  customerName: string
  itemCount: number
  createdAt: string
}

export interface AdminReturnsResponse {
  returns: AdminReturnSummary[]
  page: number
  limit: number
  total: number
}

// ── Inventory / Stock ────────────────────────────────────
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

export interface LowStockVariant {
  variantId: string
  productId: string
  productName: string
  color: string
  size: string
  sku: string
  inStockQty: number
  heldQty: number
  availableQty: number
  lowStockThreshold: number
  stockStatus: StockStatus
}

// ── Notify-Me Demand ─────────────────────────────────────
export interface NotifyMeDemandItem {
  variantId: string
  productId: string
  productName: string
  color: string
  size: string
  requestCount: number
  latestRequestAt: string
}

// ── Flagged Reviews ──────────────────────────────────────
export interface FlaggedReview {
  id: string
  productId: string
  productName: string
  rating: number
  body: string | null
  customerName: string
  flagReason: string
  flaggedAt: string
  createdAt: string
}

export interface FlaggedReviewsResponse {
  reviews: FlaggedReview[]
  page: number
  limit: number
  total: number
}

// ── Order Detail Types ───────────────────────────────────

export interface OrderDetail {
  id: string
  orderRef: string
  userId: string | null
  guestEmail: string | null
  orderState: OrderState
  paymentState: PaymentState
  fulfillmentState: FulfillmentState
  returnState: ReturnState
  currency: CurrencyCode
  countryCode: string
  subtotal: string
  discountAmount: string
  shippingCost: string
  taxAmount: string
  total: string
  shippingMethodSnapshot: string | null
  isGift: boolean
  placedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ReturnState = 'NONE' | 'REQUESTED' | 'PARTIAL' | 'RETURNED'

export interface OrderItemDetail {
  id: string
  variantId: string | null
  qty: number
  unitPriceAmount: string
  unitPriceCurrency: CurrencyCode
  taxAmount: string
  productSnapshot: {
    displayName: string
    shortName: string
    color: string
    size: string
    productCode: string
    imageUrl?: string
  }
}

export interface OrderAddress {
  id: string
  kind: 'SHIPPING' | 'BILLING'
  addressJson: {
    fullName: string
    line1: string
    line2?: string
    city: string
    state?: string
    postalCode: string
    country: string
  }
  countryCode: string
}

export interface OrderContact {
  primaryPhone: string
  extraPhones: string[]
  giftReceiver?: {
    name: string
    phone: string
    message?: string
  }
}

export interface OrderEvent {
  id: string
  eventType: string
  payloadJson: Record<string, unknown>
  createdByAdminId: string | null
  adminNote: string | null
  createdAt: string
}

export interface OrderAllocation {
  id: string
  orderItemId: string
  inventoryUnitId: string
  scannedByAdminId: string | null
  scannedByName: string
  scannedAt: string
  variantId: string | null
  itemQty: number
  unitSku: string
  barcodeValue: string
  unitStatus: string
}

export interface OrderDetailResponse {
  order: OrderDetail
  items: OrderItemDetail[]
  addresses: OrderAddress[]
  contact: OrderContact | null
  events: OrderEvent[]
  allocations: OrderAllocation[]
}

export interface PackingStatus {
  orderId: string
  isFullyPacked: boolean
  items: PackingItemStatus[]
}

export interface PackingItemStatus {
  orderItemId: string
  variantId: string
  productName: string
  color: string
  size: string
  required: number
  allocated: number
  isComplete: boolean
  allocatedUnits: AllocatedUnit[]
}

export interface AllocatedUnit {
  inventoryUnitId: string
  unitSku: string
  barcodeValue: string
  scannedByName: string
  scannedAt: string
}

export interface ScanResult {
  unit: {
    id: string
    variantId: string
    status: string
    barcodeValue: string
    sku: string
  }
  variant: {
    id: string
    color: string
    size: string
    productId: string
  }
  orderItem: {
    id: string
    orderId: string
    variantId: string
    qty: number
  }
  allocation: {
    id: string
    orderItemId: string
    inventoryUnitId: string
    scannedAt: string
  }
}
