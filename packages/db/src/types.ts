/**
 * TypeScript types inferred from Drizzle schema.
 * Export Select (row) and Insert (new row) types for each table.
 * Mirrors packages/db/migrations/0001_initial.sql — no extra columns.
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import {
  users,
  admins,
  adminInvites,
  sessions,
  wishlists,
  savedAddresses,
  savedPaymentMethods,
} from './schema/iam.schema'
import {
  categories,
  products,
  productPrices,
  productImages,
  productRelations,
  productStylingGuides,
  bestsellerList,
  banners,
} from './schema/catalog.schema'
import {
  productVariants,
  variantStock,
  inventoryUnits,
  inventoryMovements,
  inventoryReconciliationLog,
} from './schema/inventory.schema'
import { carts, cartItems, reservations, reservationItems } from './schema/cart.schema'
import { shippingZones, shippingMethods, shippingSettings } from './schema/shipping.schema'
import {
  promoCodes,
  ordersTable,
  promoRedemptions,
  orderItems,
  orderAddresses,
  orderContacts,
  orderEvents,
  orderUnitAllocations,
} from './schema/orders.schema'
import {
  paymentIntents,
  paymentTransactions,
} from './schema/payments.schema'
import {
  returnRequests,
  returnRequestItems,
  returnEvents,
} from './schema/returns.schema'
import {
  reviewRequestTokens,
  reviewsTable,
  reviewMedia,
  reviewFlags,
} from './schema/reviews.schema'
import {
  loyaltyAccounts,
  loyaltyLedger,
  loyaltyRules,
  loyaltyGrants,
} from './schema/loyalty'
import {
  inboxMessages,
  notificationPreferences,
  notificationOutbox,
  emailDeliveryLog,
  backInStockSubscriptions,
  priceDropSubscriptions,
  campaigns,
  campaignDeliveries,
  notifyMeEvents,
} from './schema/messaging.schema'
import { events, analyticsAggregates } from './schema/analytics.schema'

// IAM
export type User = InferSelectModel<typeof users>
export type UserInsert = InferInsertModel<typeof users>
export type Admin = InferSelectModel<typeof admins>
export type AdminInsert = InferInsertModel<typeof admins>
export type AdminInvite = InferSelectModel<typeof adminInvites>
export type AdminInviteInsert = InferInsertModel<typeof adminInvites>
export type Session = InferSelectModel<typeof sessions>
export type SessionInsert = InferInsertModel<typeof sessions>
export type Wishlist = InferSelectModel<typeof wishlists>
export type WishlistInsert = InferInsertModel<typeof wishlists>
export type SavedAddress = InferSelectModel<typeof savedAddresses>
export type SavedAddressInsert = InferInsertModel<typeof savedAddresses>
export type SavedPaymentMethod = InferSelectModel<typeof savedPaymentMethods>
export type SavedPaymentMethodInsert = InferInsertModel<typeof savedPaymentMethods>

// Catalog
export type Category = InferSelectModel<typeof categories>
export type CategoryInsert = InferInsertModel<typeof categories>
export type Product = InferSelectModel<typeof products>
export type ProductInsert = InferInsertModel<typeof products>
export type ProductPrice = InferSelectModel<typeof productPrices>
export type ProductPriceInsert = InferInsertModel<typeof productPrices>
export type ProductImage = InferSelectModel<typeof productImages>
export type ProductImageInsert = InferInsertModel<typeof productImages>
export type ProductRelation = InferSelectModel<typeof productRelations>
export type ProductRelationInsert = InferInsertModel<typeof productRelations>
export type ProductStylingGuide = InferSelectModel<typeof productStylingGuides>
export type ProductStylingGuideInsert = InferInsertModel<
  typeof productStylingGuides
>
export type BestsellerListEntry = InferSelectModel<typeof bestsellerList>
export type BestsellerListEntryInsert = InferInsertModel<typeof bestsellerList>
export type Banner = InferSelectModel<typeof banners>
export type BannerInsert = InferInsertModel<typeof banners>

// Inventory
export type ProductVariant = InferSelectModel<typeof productVariants>
export type ProductVariantInsert = InferInsertModel<typeof productVariants>
export type VariantStock = InferSelectModel<typeof variantStock>
export type VariantStockInsert = InferInsertModel<typeof variantStock>
export type InventoryUnit = InferSelectModel<typeof inventoryUnits>
export type InventoryUnitInsert = InferInsertModel<typeof inventoryUnits>
export type InventoryMovement = InferSelectModel<typeof inventoryMovements>
export type InventoryMovementInsert = InferInsertModel<typeof inventoryMovements>
export type InventoryReconciliationLog = InferSelectModel<
  typeof inventoryReconciliationLog
>
export type InventoryReconciliationLogInsert = InferInsertModel<
  typeof inventoryReconciliationLog
>

// Cart
export type Cart = InferSelectModel<typeof carts>
export type CartInsert = InferInsertModel<typeof carts>
export type CartItem = InferSelectModel<typeof cartItems>
export type CartItemInsert = InferInsertModel<typeof cartItems>
export type Reservation = InferSelectModel<typeof reservations>
export type ReservationInsert = InferInsertModel<typeof reservations>
export type ReservationItem = InferSelectModel<typeof reservationItems>
export type ReservationItemInsert = InferInsertModel<typeof reservationItems>

// Shipping
export type ShippingZone = InferSelectModel<typeof shippingZones>
export type ShippingZoneInsert = InferInsertModel<typeof shippingZones>
export type ShippingMethod = InferSelectModel<typeof shippingMethods>
export type ShippingMethodInsert = InferInsertModel<typeof shippingMethods>
export type ShippingSettings = InferSelectModel<typeof shippingSettings>
export type ShippingSettingsInsert = InferInsertModel<typeof shippingSettings>

// Orders
export type PromoCode = InferSelectModel<typeof promoCodes>
export type PromoCodeInsert = InferInsertModel<typeof promoCodes>
export type Order = InferSelectModel<typeof ordersTable>
export type OrderInsert = InferInsertModel<typeof ordersTable>
export type PromoRedemption = InferSelectModel<typeof promoRedemptions>
export type PromoRedemptionInsert = InferInsertModel<typeof promoRedemptions>
export type OrderItem = InferSelectModel<typeof orderItems>
export type OrderItemInsert = InferInsertModel<typeof orderItems>
export type OrderAddress = InferSelectModel<typeof orderAddresses>
export type OrderAddressInsert = InferInsertModel<typeof orderAddresses>
export type OrderContact = InferSelectModel<typeof orderContacts>
export type OrderContactInsert = InferInsertModel<typeof orderContacts>
export type OrderEvent = InferSelectModel<typeof orderEvents>
export type OrderEventInsert = InferInsertModel<typeof orderEvents>
export type OrderUnitAllocation = InferSelectModel<typeof orderUnitAllocations>
export type OrderUnitAllocationInsert = InferInsertModel<
  typeof orderUnitAllocations
>

// Payments
export type PaymentIntent = InferSelectModel<typeof paymentIntents>
export type PaymentIntentInsert = InferInsertModel<typeof paymentIntents>
export type PaymentTransaction = InferSelectModel<typeof paymentTransactions>
export type PaymentTransactionInsert = InferInsertModel<
  typeof paymentTransactions
>

// Returns
export type ReturnRequest = InferSelectModel<typeof returnRequests>
export type ReturnRequestInsert = InferInsertModel<typeof returnRequests>
export type ReturnRequestItem = InferSelectModel<typeof returnRequestItems>
export type ReturnRequestItemInsert = InferInsertModel<typeof returnRequestItems>
export type ReturnEvent = InferSelectModel<typeof returnEvents>
export type ReturnEventInsert = InferInsertModel<typeof returnEvents>

// Reviews
export type ReviewRequestToken = InferSelectModel<typeof reviewRequestTokens>
export type ReviewRequestTokenInsert = InferInsertModel<
  typeof reviewRequestTokens
>
export type Review = InferSelectModel<typeof reviewsTable>
export type ReviewInsert = InferInsertModel<typeof reviewsTable>
export type ReviewMedia = InferSelectModel<typeof reviewMedia>
export type ReviewMediaInsert = InferInsertModel<typeof reviewMedia>
export type ReviewFlag = InferSelectModel<typeof reviewFlags>
export type ReviewFlagInsert = InferInsertModel<typeof reviewFlags>

// Loyalty
export type LoyaltyAccount = InferSelectModel<typeof loyaltyAccounts>
export type LoyaltyAccountInsert = InferInsertModel<typeof loyaltyAccounts>
export type LoyaltyLedgerEntry = InferSelectModel<typeof loyaltyLedger>
export type LoyaltyLedgerEntryInsert = InferInsertModel<typeof loyaltyLedger>
export type LoyaltyRules = InferSelectModel<typeof loyaltyRules>
export type LoyaltyRulesInsert = InferInsertModel<typeof loyaltyRules>
export type LoyaltyGrant = InferSelectModel<typeof loyaltyGrants>
export type LoyaltyGrantInsert = InferInsertModel<typeof loyaltyGrants>

// Messaging
export type InboxMessage = InferSelectModel<typeof inboxMessages>
export type InboxMessageInsert = InferInsertModel<typeof inboxMessages>
export type NotificationPreferences = InferSelectModel<
  typeof notificationPreferences
>
export type NotificationPreferencesInsert = InferInsertModel<
  typeof notificationPreferences
>
export type NotificationOutbox = InferSelectModel<typeof notificationOutbox>
export type NotificationOutboxInsert = InferInsertModel<typeof notificationOutbox>
export type EmailDeliveryLog = InferSelectModel<typeof emailDeliveryLog>
export type EmailDeliveryLogInsert = InferInsertModel<typeof emailDeliveryLog>
export type BackInStockSubscription = InferSelectModel<
  typeof backInStockSubscriptions
>
export type BackInStockSubscriptionInsert = InferInsertModel<
  typeof backInStockSubscriptions
>
export type PriceDropSubscription = InferSelectModel<
  typeof priceDropSubscriptions
>
export type PriceDropSubscriptionInsert = InferInsertModel<
  typeof priceDropSubscriptions
>
export type Campaign = InferSelectModel<typeof campaigns>
export type CampaignInsert = InferInsertModel<typeof campaigns>
export type CampaignDelivery = InferSelectModel<typeof campaignDeliveries>
export type CampaignDeliveryInsert = InferInsertModel<typeof campaignDeliveries>
export type NotifyMeEvent = InferSelectModel<typeof notifyMeEvents>
export type NotifyMeEventInsert = InferInsertModel<typeof notifyMeEvents>

// Analytics
export type AnalyticsEvent = InferSelectModel<typeof events>
export type AnalyticsEventInsert = InferInsertModel<typeof events>
export type AnalyticsAggregate = InferSelectModel<typeof analyticsAggregates>
export type AnalyticsAggregateInsert = InferInsertModel<
  typeof analyticsAggregates
>
