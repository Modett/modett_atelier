/**
 * Loyalty module — routes and exports for IAM/Payments wiring.
 */

export { loyaltyRoutes } from './loyalty.routes'
export { createLoyaltyAccount } from '@modett/db'
export {
  earnPointsForOrder,
  redeemPointsForOrder,
} from './loyalty.service'
