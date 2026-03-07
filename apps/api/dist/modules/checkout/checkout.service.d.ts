/**
 * Checkout service — start checkout, address/contact/shipping, payment initiation,
 * confirmation. RORO. Uses Decimal.js for all money. Throws AppError.
 */
import type { OrderWithDetails } from '@modett/db';
type CurrencyCode = 'LKR' | 'SGD' | 'USD';
export interface StartCheckoutParams {
    userId?: string | null;
    sessionId: string;
    currency: CurrencyCode;
    guestEmail?: string | null;
}
export interface StartCheckoutResult {
    reservationId: string;
    orderId: string;
    orderRef: string;
    expiresAt: Date;
    currency: CurrencyCode;
    summary: {
        subtotal: string;
        taxAmount: string;
        total: string;
        itemCount: number;
    };
}
export declare function startCheckout({ userId, sessionId, currency, guestEmail, }: StartCheckoutParams): Promise<StartCheckoutResult>;
export declare function saveAddress({ orderId, kind, addressJson, countryCode, }: {
    orderId: string;
    kind: 'SHIPPING' | 'BILLING';
    addressJson: Record<string, unknown>;
    countryCode: string;
}): Promise<OrderWithDetails>;
export declare function saveContact({ orderId, primaryPhone, extraPhones, isGift, giftReceiver, }: {
    orderId: string;
    primaryPhone: string;
    extraPhones?: unknown[];
    isGift?: boolean;
    giftReceiver?: Record<string, unknown> | null;
}): Promise<OrderWithDetails>;
export interface Money {
    amount: string;
    currency: CurrencyCode;
}
export interface ShippingMethodOption {
    id: string;
    name: string;
    carrier: string | null;
    estimatedDays: string | null;
    rateType: string;
    cost: Money | null;
}
export declare function getShippingMethods({ countryCode, currency, }: {
    countryCode: string;
    currency: CurrencyCode;
}): Promise<ShippingMethodOption[]>;
export declare function selectShippingMethod({ orderId, shippingMethodId, currency, }: {
    orderId: string;
    shippingMethodId: string;
    currency: CurrencyCode;
}): Promise<OrderWithDetails>;
export interface InitiatePaymentResult {
    orderId: string;
    orderRef: string;
    reservationId: string;
    total: string;
    currency: string;
    stripeReady: boolean;
}
export declare function initiatePayment({ orderId, reservationId, }: {
    orderId: string;
    reservationId: string;
}): Promise<InitiatePaymentResult>;
export declare function getOrderConfirmation({ orderId, userId, guestEmail, }: {
    orderId: string;
    userId?: string | null;
    guestEmail?: string | null;
}): Promise<OrderWithDetails>;
export {};
//# sourceMappingURL=checkout.service.d.ts.map