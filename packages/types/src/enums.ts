/**
 * Shared type definitions mirroring PostgreSQL ENUMs from
 * packages/db/migrations/0001_initial.sql
 * Import from @modett/types to keep frontend and backend in sync.
 */

// -----------------------------------------------------------------------------
// IAM
// -----------------------------------------------------------------------------

export type AdminRole = 'OWNER' | 'ADMIN'
export const ADMIN_ROLES: AdminRole[] = ['OWNER', 'ADMIN']

export type AdminStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED'
export const ADMIN_STATUSES: AdminStatus[] = ['ACTIVE', 'INVITED', 'SUSPENDED']

export type SessionKind = 'CUSTOMER' | 'ADMIN'
export const SESSION_KINDS: SessionKind[] = ['CUSTOMER', 'ADMIN']

// -----------------------------------------------------------------------------
// Catalog
// -----------------------------------------------------------------------------

export type StylingGuideType = 'VIDEO' | 'GALLERY' | 'TEXT'
export const STYLING_GUIDE_TYPES: StylingGuideType[] = ['VIDEO', 'GALLERY', 'TEXT']

// -----------------------------------------------------------------------------
// Inventory
// -----------------------------------------------------------------------------

export type UnitStatus =
  | 'IN_STOCK'
  | 'HELD'
  | 'SOLD'
  | 'RETURNED'
  | 'DAMAGED'
  | 'ADJUSTED_OUT'
export const UNIT_STATUSES: UnitStatus[] = [
  'IN_STOCK',
  'HELD',
  'SOLD',
  'RETURNED',
  'DAMAGED',
  'ADJUSTED_OUT',
]

// -----------------------------------------------------------------------------
// Cart
// -----------------------------------------------------------------------------

export type CartStatus = 'ACTIVE' | 'ABANDONED' | 'CHECKED_OUT'
export const CART_STATUSES: CartStatus[] = ['ACTIVE', 'ABANDONED', 'CHECKED_OUT']

export type ReservationStatus = 'HELD' | 'CONSUMED' | 'EXPIRED'
export const RESERVATION_STATUSES: ReservationStatus[] = ['HELD', 'CONSUMED', 'EXPIRED']

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------

export type OrderState = 'DRAFT' | 'PLACED' | 'CANCELLED'
export const ORDER_STATES: OrderState[] = ['DRAFT', 'PLACED', 'CANCELLED']

export type PaymentState =
  | 'UNPAID'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
export const PAYMENT_STATES: PaymentState[] = [
  'UNPAID',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]

export type FulfillmentState =
  | 'NOT_STARTED'
  | 'PACKED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
export const FULFILLMENT_STATES: FulfillmentState[] = [
  'NOT_STARTED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
]

export type ReturnState =
  | 'NONE'
  | 'REQUESTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'FULFILLED'
  | 'REJECTED'
export const RETURN_STATES: ReturnState[] = [
  'NONE',
  'REQUESTED',
  'PENDING_REVIEW',
  'APPROVED',
  'FULFILLED',
  'REJECTED',
]

export type AddressKind = 'SHIPPING' | 'BILLING'
export const ADDRESS_KINDS: AddressKind[] = ['SHIPPING', 'BILLING']

export type CurrencyCode = 'LKR' | 'SGD' | 'USD'
export const CURRENCY_CODES: CurrencyCode[] = ['LKR', 'SGD', 'USD']

export type PromoType = 'PERCENT' | 'FIXED'
export const PROMO_TYPES: PromoType[] = ['PERCENT', 'FIXED']

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
export const PAYMENT_STATUSES: PaymentStatus[] = [
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]

// -----------------------------------------------------------------------------
// Returns
// -----------------------------------------------------------------------------

export type ReturnType = 'REFUND' | 'EXCHANGE'
export const RETURN_TYPES: ReturnType[] = ['REFUND', 'EXCHANGE']

export type ReturnRequestStatus =
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'FULFILLED'
export const RETURN_REQUEST_STATUSES: ReturnRequestStatus[] = [
  'SUBMITTED',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'FULFILLED',
]

// -----------------------------------------------------------------------------
// Reviews
// -----------------------------------------------------------------------------

export type ReviewStatus = 'VISIBLE' | 'HIDDEN'
export const REVIEW_STATUSES: ReviewStatus[] = ['VISIBLE', 'HIDDEN']

export type ReviewMediaType = 'IMAGE'
export const REVIEW_MEDIA_TYPES: ReviewMediaType[] = ['IMAGE']

// -----------------------------------------------------------------------------
// Loyalty
// -----------------------------------------------------------------------------

export type LedgerType = 'EARN' | 'REDEEM' | 'BONUS' | 'EXPIRY' | 'ADJUST'
export const LEDGER_TYPES: LedgerType[] = ['EARN', 'REDEEM', 'BONUS', 'EXPIRY', 'ADJUST']

export type TierLevel = 'BRONZE' | 'SILVER' | 'GOLD'
export const TIER_LEVELS: TierLevel[] = ['BRONZE', 'SILVER', 'GOLD']

// -----------------------------------------------------------------------------
// Messaging
// -----------------------------------------------------------------------------

export type MessagingChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'
export const MESSAGING_CHANNELS: MessagingChannel[] = ['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']

export type OutboxStatus = 'PENDING' | 'SENT' | 'FAILED'
export const OUTBOX_STATUSES: OutboxStatus[] = ['PENDING', 'SENT', 'FAILED']

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED'
export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  'DRAFT',
  'SCHEDULED',
  'SENT',
  'CANCELLED',
]

export type DeliveryStatus = 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED'
export const DELIVERY_STATUSES: DeliveryStatus[] = [
  'QUEUED',
  'SENT',
  'FAILED',
  'BOUNCED',
]

// -----------------------------------------------------------------------------
// Shipping
// -----------------------------------------------------------------------------

export type RateType = 'FLAT' | 'FREE' | 'CALCULATED'
export const RATE_TYPES: RateType[] = ['FLAT', 'FREE', 'CALCULATED']
