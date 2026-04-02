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

// ── Analytics ─────────────────────────────────────────────────────────────

export interface AnalyticsTodaySummary {
  ordersToday: number
  revenueLkr: string
  revenueSgd: string
  revenueUsd: string
  avgOrderValueLkr: string
  conversionToday: number
  activeSessionsNow: number
}

export interface AnalyticsRevenuePoint {
  date: string
  currency: string
  orderCount: number
  revenue: string
  avgOrderValue: string
}

export interface AnalyticsFunnelData {
  productViews: number
  addToCart: number
  checkoutStarts: number
  purchases: number
  viewToCartPct: number
  cartToCheckoutPct: number
  checkoutToPurchasePct: number
  overallConversionPct: number
}

export interface AnalyticsRevenueByCurrency {
  currency: string
  orders: number
  totalRevenue: string
}

export interface AnalyticsTimeSeriesPoint {
  date: string
  value: number
}

// ── Audit Log ─────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  adminId: string
  adminEmail: string
  adminRole: string
  action: string
  entityType: string
  entityId: string | null
  entityLabel: string | null
  beforeJson: Record<string, unknown> | null
  afterJson: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

export interface AuditLogFilters {
  page?: number
  limit?: number
  adminId?: string
  action?: string
  entityType?: string
  from?: string
  to?: string
}

// ── Customers ─────────────────────────────────────────────────────────────

export interface AdminCustomerSummary {
  id: string
  email: string
  firstName: string
  lastName: string
  createdAt: string
  loyaltyBalance: number
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | null
  compositeScore: number | null
  orderCount: number
  totalSpentLkr: string
}

export interface AdminCustomerDetail {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    createdAt: string
  }
  loyalty: {
    balance: number
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | null
    compositeScore: number | null
    lastActivityAt: string | null
    recentLedger: Array<{
      id: string
      type: string
      points: number
      createdAt: string
      metadataJson: Record<string, unknown>
    }>
  } | null
  orders: Array<{
    id: string
    orderRef: string
    paymentState: string
    fulfillmentState: string
    currency: string
    total: string
    createdAt: string
  }>
  reviews: Array<{
    id: string
    productName: string
    rating: number
    status: string
    createdAt: string
    body: string | null
  }>
  returns: Array<{
    id: string
    orderRef: string
    status: string
    createdAt: string
    itemCount?: number
  }>
  addresses: Array<{
    id: string
    label: string | null
    line1: string
    city: string
    country: string
    isDefault: boolean
  }>
}

// ── Notifications ─────────────────────────────────────────────────────────

export interface AdminNotificationSummary {
  lowStock: number
  outOfStock: number
  newReturns: number
  flaggedReviews: number
  unresolvedDrift: number
  pendingOrders: number
  total: number
}

export interface AdminNotificationAlert {
  type: 'LOW_STOCK' | 'OUT_OF_STOCK' | 'NEW_RETURN' | 'FLAGGED_REVIEW' | 'PENDING_ORDER'
  message: string
  entityId: string | null
  href: string
  timestamp: string
  isRead: boolean
}
