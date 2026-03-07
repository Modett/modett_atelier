/**
 * Cart service — cart resolution, get cart with stock hints and prices,
 * add/update/remove/clear, login merge. RORO. Throws AppError for expected failures.
 */
import type { CurrencyCode } from '@modett/types';
import type { CartItemDetail } from '@modett/db';
import type { Cart } from '@modett/db';
export interface Money {
    amount: string;
    currency: CurrencyCode;
}
export interface CartItemWithPrice extends CartItemDetail {
    price: Money;
    totalPrice: Money;
}
export interface CartSummary {
    subtotal: Money;
    itemCount: number;
    hasOutOfStockItems: boolean;
    hasLowStockItems: boolean;
}
export interface GetCartResult {
    cart: Cart;
    items: CartItemWithPrice[];
    summary: CartSummary;
    sessionId: string;
}
export declare function getCart({ userId, sessionId, currency, }: {
    userId?: string;
    sessionId: string;
    currency: CurrencyCode;
}): Promise<GetCartResult>;
export declare function addToCart({ userId, sessionId, variantId, qty, }: {
    userId?: string;
    sessionId: string;
    variantId: string;
    qty: number;
}): Promise<GetCartResult>;
export declare function updateCartItemQty({ userId, sessionId, variantId, qty, }: {
    userId?: string;
    sessionId: string;
    variantId: string;
    qty: number;
}): Promise<GetCartResult>;
export declare function removeFromCart({ userId, sessionId, variantId, }: {
    userId?: string;
    sessionId: string;
    variantId: string;
}): Promise<GetCartResult>;
export declare function clearCart({ userId, sessionId, }: {
    userId?: string;
    sessionId: string;
}): Promise<GetCartResult>;
export declare function mergeCartsOnLogin({ userId, guestSessionId, }: {
    userId: string;
    guestSessionId: string;
}): Promise<{
    mergedCartId: string;
    sessionId: string;
} | null>;
//# sourceMappingURL=cart.service.d.ts.map