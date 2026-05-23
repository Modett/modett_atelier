/**
 * @modett/db — database client, schema, and inferred types
 *
 * Usage:
 *   import { db, users } from '@modett/db'
 *   import type { User, Order } from '@modett/db'
 *   const [user] = await db.select().from(users).where(eq(users.email, '...'))
 */

export { db, type Database, type TransactionClient } from './client'
export {
  redis,
  withInventoryLock,
  withPaymentLock,
  PaymentInProgressError,
} from './redis'
export {
  LockNotAcquiredError,
  ReservationNotHeldError,
  InsufficientStockError,
  OrderNotDraftError,
  IntentNotPendingError,
  CartAlreadyCheckedOutError,
  StockConfirmFailedError,
  OrderOperationError,
  LoyaltyAccountNotFoundError,
  InsufficientPointsError,
  LoyaltyRulesNotFoundError,
  BalanceWouldGoNegativeError,
  LoyaltyLockNotAcquiredError,
  MessagingError,
} from './errors'
export * from './schema/index'
export * from './queries/iam'
export * from './queries/catalog'
export * from './queries/inventory'
export * from './queries/cart'
export * from './queries/checkout'
export * from './queries/orders'
export * from './queries/payments'
export * from './queries/shipping'
export * from './queries/returns'
export * from './queries/reviews'
export * from './queries/loyalty'
export * from './queries/messaging'
export * from './queries/analytics'
export * from './queries/adminAnalytics'
export * from './queries/adminCustomers'
export * from './queries/adminNotifications'
export * from './queries/reports'
export * from './queries/referrals'
