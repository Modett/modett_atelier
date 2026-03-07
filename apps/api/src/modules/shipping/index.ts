/**
 * Shipping module — public API for Checkout and route mount.
 */

export { shippingRoutes } from './shipping.routes'
export {
  getMethodsForCheckout,
  getMethodForOrder,
  resolveShippingCost,
} from './shipping.service'
