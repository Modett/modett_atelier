/**
 * Checkout route handlers — start, address, contact, shipping, payment-intent, confirmation.
 * optionalAuth + resolveCheckoutIdentity on all routes. Success: { data: T }.
 * No try/catch — errors propagate to global handler.
 */
import { type Request, type IRouter } from 'express';
export type CheckoutIdentityRequest = Request & {
    checkoutUserId?: string;
    checkoutSession: string;
};
export declare const checkoutRoutes: IRouter;
//# sourceMappingURL=checkout.routes.d.ts.map