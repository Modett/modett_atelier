/**
 * Entity interfaces mirroring PostgreSQL tables from
 * packages/db/migrations/0001_initial.sql
 * All IDs are UUID (string). Timestamps as ISO strings. Money as number (NUMERIC(12,2)).
 * Import from @modett/types for shared frontend/backend typing.
 */

import type {
  AdminRole,
  AdminStatus,
  SessionKind,
  StylingGuideType,
  UnitStatus,
  CartStatus,
  ReservationStatus,
  OrderState,
  PaymentState,
  FulfillmentState,
  ReturnState,
  AddressKind,
  CurrencyCode,
  PromoType,
  PaymentStatus,
  ReturnType,
  ReturnRequestStatus,
  LedgerType,
  TierLevel,
  MessagingChannel,
  OutboxStatus,
  CampaignStatus,
  DeliveryStatus,
  RateType,
} from './enums'

// -----------------------------------------------------------------------------
// IAM
// -----------------------------------------------------------------------------

export interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  password_hash: string
  dob?: string | null
  dob_consent: boolean
  newsletter_opt_in: boolean
  newsletter_opted_at?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface Admin {
  id: string
  user_id: string
  role: AdminRole
  status: AdminStatus
  created_at: string
  updated_at: string
}

export interface AdminInvite {
  id: string
  email: string
  token_hash: string
  expires_at: string
  created_by_admin_id: string
  used_at?: string | null
}

export interface Session {
  id: string
  user_id: string
  kind: SessionKind
  expires_at: string
  last_seen_at: string
  remember_me_until?: string | null
  created_at: string
  invalidated_at?: string | null
}

// -----------------------------------------------------------------------------
// Catalog
// -----------------------------------------------------------------------------

export interface Category {
  id: string
  name: string
  slug: string
  active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  category_id?: string | null
  slug: string
  display_name: string
  short_name: string
  description?: string | null
  fabric_info?: string | null
  product_code: string
  active: boolean
  is_sale: boolean
  key_image_id?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface ProductPrice {
  product_id: string
  lkr_amount: number
  sgd_amount: number
  usd_amount: number
  updated_at: string
}

export interface ProductImage {
  id: string
  product_id: string
  url: string
  alt_text?: string | null
  sort_order: number
  created_at: string
}

export interface ProductRelation {
  product_id: string
  related_product_id: string
  relation_type: string
}

export interface ProductStylingGuide {
  id: string
  product_id: string
  type: StylingGuideType
  link_url?: string | null
  content_json?: Record<string, unknown> | null
  active: boolean
  created_at: string
  updated_at: string
}

export interface BestsellerListEntry {
  id: string
  product_id: string
  sort_order: number
  added_by_admin_id?: string | null
  added_at: string
}

export interface Banner {
  id: string
  message: string
  link_url?: string | null
  enabled: boolean
  start_at?: string | null
  end_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// Inventory
// -----------------------------------------------------------------------------

export interface ProductVariant {
  id: string
  product_id: string
  color: string
  size: string
  sku_group: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface VariantStock {
  variant_id: string
  in_stock_qty: number
  held_qty: number
  available_qty: number
  low_stock_threshold: number
  updated_at: string
}

export interface InventoryUnit {
  id: string
  variant_id: string
  unit_sku: string
  barcode_value: string
  status: UnitStatus
  created_at: string
  updated_at: string
}

export interface InventoryMovement {
  id: string
  variant_id: string
  delta_qty: number
  reason: string
  reference_type?: string | null
  reference_id?: string | null
  created_by_admin_id?: string | null
  created_at: string
}

export interface InventoryReconciliationLog {
  id: string
  variant_id: string
  actual_count: number
  aggregate_count: number
  delta: number
  detected_at: string
  resolved_at?: string | null
  resolved_note?: string | null
}

// -----------------------------------------------------------------------------
// Cart
// -----------------------------------------------------------------------------

export interface Cart {
  id: string
  user_id?: string | null
  session_id: string
  status: CartStatus
  expires_at: string
  created_at: string
  updated_at: string
}

export interface CartItem {
  id: string
  cart_id: string
  variant_id: string
  qty: number
  added_at: string
}

export interface Reservation {
  id: string
  user_id?: string | null
  cart_id: string
  status: ReservationStatus
  expires_at: string
  payment_submitted_at?: string | null
  grace_expires_at?: string | null
  worker_lock_id?: string | null
  processed_at?: string | null
  hold_released_at?: string | null
  created_at: string
}

export interface ReservationItem {
  id: string
  reservation_id: string
  variant_id: string
  qty: number
}

// -----------------------------------------------------------------------------
// Shipping
// -----------------------------------------------------------------------------

export interface ShippingZone {
  id: string
  name: string
  countries_json: string[]
  created_at: string
}

export interface ShippingMethod {
  id: string
  zone_id: string
  name: string
  carrier?: string | null
  rate_type: RateType
  flat_rate_lkr?: number | null
  flat_rate_sgd?: number | null
  flat_rate_usd?: number | null
  estimated_days?: string | null
  active: boolean
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// Promotions
// -----------------------------------------------------------------------------

export interface PromoCode {
  id: string
  code: string
  type: PromoType
  value: number
  currency?: CurrencyCode | null
  min_order_amount?: number | null
  max_uses?: number | null
  uses_count: number
  valid_from?: string | null
  valid_until?: string | null
  active: boolean
  created_at: string
}

// -----------------------------------------------------------------------------
// Orders
// -----------------------------------------------------------------------------

export interface Order {
  id: string
  order_ref: string
  user_id?: string | null
  guest_email?: string | null
  order_state: OrderState
  payment_state: PaymentState
  fulfillment_state: FulfillmentState
  return_state: ReturnState
  currency: CurrencyCode
  country_code: string
  subtotal: number
  discount_amount: number
  shipping_cost: number
  tax_amount: number
  tax_rate_snapshot: number
  total: number
  shipping_method_id?: string | null
  shipping_method_snapshot?: string | null
  promo_code_id?: string | null
  is_gift: boolean
  placed_at?: string | null
  created_at: string
  updated_at: string
}

export interface PromoRedemption {
  id: string
  promo_code_id: string
  order_id: string
  user_id?: string | null
  discount_amount: number
  created_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  variant_id?: string | null
  qty: number
  unit_price_snapshot_amount: number
  unit_price_snapshot_currency: CurrencyCode
  tax_amount: number
  product_snapshot_json: Record<string, unknown>
  created_at: string
}

export interface OrderAddress {
  id: string
  order_id: string
  kind: AddressKind
  address_json: Record<string, unknown>
  country_code: string
}

export interface OrderContact {
  id: string
  order_id: string
  primary_phone: string
  extra_phones_json: unknown[]
  gift_receiver_json?: Record<string, unknown> | null
}

export interface OrderEvent {
  id: string
  order_id: string
  event_type: string
  payload_json: Record<string, unknown>
  created_by_admin_id?: string | null
  admin_note?: string | null
  created_at: string
}

export interface OrderUnitAllocation {
  id: string
  order_item_id: string
  inventory_unit_id: string
  scanned_by_admin_id?: string | null
  scanned_by_name_snapshot: string
  scanned_at: string
}

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------

export interface PaymentIntent {
  id: string
  order_id: string
  provider: string
  provider_intent_id: string
  amount: number
  currency: CurrencyCode
  status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface PaymentTransaction {
  id: string
  order_id: string
  provider: string
  provider_charge_id: string
  status: PaymentStatus
  amount: number
  currency: CurrencyCode
  raw_payload_json: Record<string, unknown>
  received_at: string
}

// -----------------------------------------------------------------------------
// Returns
// -----------------------------------------------------------------------------

export interface ReturnRequest {
  id: string
  order_id: string
  type: ReturnType
  status: ReturnRequestStatus
  reason: string
  policy_accepted_at: string
  policy_version: string
  eligible_until: string
  created_at: string
  updated_at: string
}

export interface ReturnRequestItem {
  id: string
  return_request_id: string
  order_item_id: string
  qty: number
  requested_variant_change_json?: Record<string, unknown> | null
  request_status: ReturnRequestStatus
  created_at: string
}

export interface ReturnEvent {
  id: string
  return_request_id: string
  event_type: string
  payload_json: Record<string, unknown>
  admin_id?: string | null
  admin_note?: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Loyalty
// -----------------------------------------------------------------------------

export interface LoyaltyAccount {
  user_id: string
  balance: number
  lifetime_earned: number
  tier: TierLevel
  tier_evaluated_at: string
  last_activity_at: string
  composite_score: string
}

export interface LoyaltyLedgerEntry {
  id: string
  user_id: string
  type: LedgerType
  points: number
  order_id?: string | null
  metadata_json: Record<string, unknown>
  created_at: string
}

export interface LoyaltyRules {
  id: string
  earn_rate_json: Record<string, unknown>
  redemption_rate_by_currency_json: Record<string, unknown>
  tier_thresholds_json: Record<string, unknown>
  multipliers_json: Record<string, unknown>
  min_redeem: number
  max_redeem_percent: number
  no_stack_with_sale: boolean
  frequency_weight: string
  spend_weight: string
  spend_normalisation_factor: number
  evaluation_window_months: number
  points_expiry_months: number
  updated_by_admin_id?: string | null
  updated_at: string
}

export interface LoyaltyGrant {
  id: string
  user_id: string
  points: number
  reason: string
  granted_by_admin_id?: string | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Messaging
// -----------------------------------------------------------------------------

export interface InboxMessage {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  cta_label?: string | null
  cta_url?: string | null
  metadata_json: Record<string, unknown>
  is_read: boolean
  created_at: string
}

export interface NotificationPreferences {
  user_id: string
  email_opt_in: boolean
  sms_opt_in: boolean
  whatsapp_opt_in: boolean
  push_opt_in: boolean
  updated_at: string
}

export interface NotificationOutbox {
  id: string
  user_id?: string | null
  channel: MessagingChannel
  template_key: string
  payload_json: Record<string, unknown>
  dedupe_key: string
  status: OutboxStatus
  attempts: number
  created_at: string
  sent_at?: string | null
  failed_at?: string | null
}

export interface EmailDeliveryLog {
  id: string
  user_id?: string | null
  notification_outbox_id: string
  provider_message_id?: string | null
  status: DeliveryStatus
  created_at: string
}

export interface BackInStockSubscription {
  id: string
  user_id?: string | null
  variant_id: string
  channels_json: string[]
  created_at: string
  notified_at?: string | null
}

export interface PriceDropSubscription {
  id: string
  user_id?: string | null
  variant_id: string
  target_price?: number | null
  channels_json: string[]
  created_at: string
}

export interface Campaign {
  id: string
  name: string
  content_json: Record<string, unknown>
  channels_json: string[]
  audience_filter_json: Record<string, unknown>
  status: CampaignStatus
  created_by_admin_id?: string | null
  scheduled_at?: string | null
  sent_at?: string | null
  created_at: string
  updated_at: string
}

export interface CampaignDelivery {
  id: string
  campaign_id: string
  user_id?: string | null
  channel: MessagingChannel
  status: DeliveryStatus
  created_at: string
}

export interface NotifyMeEvent {
  id: string
  variant_id: string
  user_id?: string | null
  session_id: string
  created_at: string
}

// -----------------------------------------------------------------------------
// Customer profile (IAM)
// -----------------------------------------------------------------------------

export interface Wishlist {
  id: string
  user_id: string
  product_id: string
  variant_id?: string | null
  created_at: string
}

export interface SavedAddress {
  id: string
  user_id: string
  label?: string | null
  address_json: Record<string, unknown>
  country_code: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface SavedPaymentMethod {
  id: string
  user_id: string
  provider: string
  token: string
  brand?: string | null
  last_four?: string | null
  expiry_month?: number | null
  expiry_year?: number | null
  is_default: boolean
  created_at: string
}

// -----------------------------------------------------------------------------
// Analytics
// -----------------------------------------------------------------------------

export interface AnalyticsEvent {
  id: string
  session_id: string
  user_id?: string | null
  type: string
  payload_json: Record<string, unknown>
  currency?: CurrencyCode | null
  country_code?: string | null
  device_type?: string | null
  created_at: string
}

export interface AnalyticsAggregate {
  id: string
  metric: string
  dimension_json: Record<string, unknown>
  value: number
  period: string
  period_start: string
  computed_at: string
}
