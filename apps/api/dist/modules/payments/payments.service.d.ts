/**
 * Payments service — createPaymentSession, handleWebhook, getPaymentStatus.
 * PAYable IPG; two-layer idempotency; atomic order confirmation.
 */
import type { PayableWebhookPayload } from '../../config/payable';
type CurrencyCode = 'LKR' | 'SGD' | 'USD';
export interface CreatePaymentSessionParams {
    orderId: string;
    reservationId: string;
    cartId: string;
    amount: string;
    currency: CurrencyCode;
    customerFirstName: string;
    customerLastName: string;
    customerEmail: string;
    customerMobilePhone: string;
    billingAddress: {
        street: string;
        city: string;
        province: string;
        country: string;
        postcode: string;
    };
}
export interface CreatePaymentSessionResult {
    intentId: string;
    payhereParams: {
        notify_url: string;
        return_url: string;
        cancel_url: string;
        merchant_key: string;
        check_value: string;
        amount: string;
        invoice_id: string;
        order_description: string;
        currency_code: string;
        customer_first_name: string;
        customer_last_name: string;
        customer_email: string;
        customer_mobile_phone: string;
        customer_phone: string;
        billing_address_street: string;
        billing_address_city: string;
        billing_address_province: string;
        billing_address_country: string;
        billing_address_postcode: string;
        custom_1: string;
    };
    sandboxMode: boolean;
}
export declare function createPaymentSession(params: CreatePaymentSessionParams): Promise<CreatePaymentSessionResult>;
export type HandleWebhookResult = {
    status: 'already_processed';
} | {
    status: 'recorded_failure';
} | {
    status: 'unknown_status';
} | {
    status: 'order_not_found';
} | {
    status: 'context_missing';
} | {
    status: 'confirmed';
};
export declare function handleWebhook({ payload, }: {
    payload: PayableWebhookPayload;
}): Promise<HandleWebhookResult>;
export interface GetPaymentStatusResult {
    orderId: string;
    orderRef: string;
    orderState: string;
    paymentState: string;
    intent: {
        id: string;
        status: string;
        amount: string;
        currency: string;
    } | null;
}
export declare function getPaymentStatus({ orderId, userId, guestEmail, }: {
    orderId: string;
    userId?: string | null;
    guestEmail?: string | null;
}): Promise<GetPaymentStatusResult>;
export {};
//# sourceMappingURL=payments.service.d.ts.map