/**
 * Cart route handlers — GET/POST/PATCH/DELETE cart and items.
 * optionalAuth + resolveCartIdentity on all routes. Success: { data: T }.
 */
import { type Request, type IRouter } from 'express';
export type CartIdentityRequest = Request & {
    cartUserId?: string;
    cartSession: string;
};
export declare const cartRoutes: IRouter;
//# sourceMappingURL=cart.routes.d.ts.map