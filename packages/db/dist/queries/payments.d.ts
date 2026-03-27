/**
 * Payments query functions — payment_intents, payment_transactions,
 * confirmOrderTransaction (atomic 6-step). No business logic. RORO.
 */
import type { PaymentIntent, PaymentTransaction } from '../schema/payments.schema';
export declare function createPaymentIntent({ orderId, providerIntentId, amount, currency, }: {
    orderId: string;
    providerIntentId: string;
    amount: string;
    currency: 'LKR' | 'SGD' | 'USD';
}): Promise<PaymentIntent>;
export declare function getPaymentIntentByOrderId({ orderId, }: {
    orderId: string;
}): Promise<PaymentIntent | null>;
export declare function updatePaymentIntentStatus({ orderId, newStatus, }: {
    orderId: string;
    newStatus: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
}): Promise<void>;
export declare function createPaymentTransaction({ orderId, providerChargeId, status, amount, currency, rawPayloadJson, }: {
    orderId: string;
    providerChargeId: string;
    status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
    amount: string;
    currency: 'LKR' | 'SGD' | 'USD';
    rawPayloadJson: Record<string, unknown>;
}): Promise<PaymentTransaction>;
export declare function getPaymentTransactionByChargeId({ providerChargeId, }: {
    providerChargeId: string;
}): Promise<PaymentTransaction | null>;
export interface ConfirmOrderTransactionParams {
    orderId: string;
    reservationId: string;
    cartId: string;
    providerChargeId: string;
    amount: string;
    currency: 'LKR' | 'SGD' | 'USD';
    rawPayloadJson: Record<string, unknown>;
    items: Array<{
        variantId: string;
        qty: number;
    }>;
}
export declare function confirmOrderTransaction(params: ConfirmOrderTransactionParams): Promise<void>;
//# sourceMappingURL=payments.d.ts.map