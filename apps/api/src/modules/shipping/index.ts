/**
 * Shipping module — public API for Checkout and route mount.
 */

export { shippingRoutes } from './shipping.routes'
export {
  getMethodsForCheckout,
  getMethodForOrder,
  resolveShippingCost,
  resolveShippingCostWithThreshold,
  getShippingEstimate,
} from './shipping.service'
