/**
 * PAYable IPG config — check_value generation and webhook verification.
 * Credentials from env; never hard-coded.
 */
export declare const payableConfig: {
    merchantKey: string;
    merchantToken: string;
    sandboxMode: boolean;
};
export declare function generateCheckValue({ invoiceId, amount, currencyCode, }: {
    invoiceId: string;
    amount: string;
    currencyCode: string;
}): string;
export declare function verifyCallbackCheckValue(payload: PayableWebhookPayload): boolean;
export type PayableWebhookPayload = {
    merchantKey: string;
    payableOrderId: string;
    payableTransactionId: string;
    payableAmount: string;
    payableCurrency: string;
    invoiceNo: string;
    statusCode: number;
    statusMessage: string;
    paymentType: number;
    paymentMethod: number;
    paymentScheme: string;
    custom1?: string;
    custom2?: string;
    cardHolderName?: string;
    cardNumber?: string;
    checkValue: string;
};
//# sourceMappingURL=payable.d.ts.map