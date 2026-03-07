"use strict";
/**
 * Payments service — createPaymentSession, handleWebhook, getPaymentStatus.
 * PAYable IPG; two-layer idempotency; atomic order confirmation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentSession = createPaymentSession;
exports.handleWebhook = handleWebhook;
exports.getPaymentStatus = getPaymentStatus;
const decimal_js_1 = __importDefault(require("decimal.js"));
const errors_1 = require("../../lib/errors");
const payable_1 = require("../../config/payable");
const db_1 = require("@modett/db");
const db_2 = require("@modett/db");
const loyalty_1 = require("../loyalty");
function isUniqueViolation(err) {
    return err?.code === '23505';
}
async function createPaymentSession(params) {
    const { orderId, reservationId, cartId, amount, currency, customerFirstName, customerLastName, customerEmail, customerMobilePhone, billingAddress, } = params;
    const existing = await (0, db_2.getPaymentIntentByOrderId)({ orderId });
    if (existing && existing.status === 'PENDING') {
        const checkValue = (0, payable_1.generateCheckValue)({
            invoiceId: orderId,
            amount: new decimal_js_1.default(amount).toFixed(2),
            currencyCode: currency,
        });
        return {
            intentId: existing.id,
            payhereParams: {
                notify_url: `${process.env.API_URL}/api/payments/webhook`,
                return_url: `${process.env.FRONTEND_URL}/checkout/confirmation`,
                cancel_url: `${process.env.FRONTEND_URL}/checkout/cancelled`,
                merchant_key: payable_1.payableConfig.merchantKey,
                check_value: checkValue,
                amount: new decimal_js_1.default(amount).toFixed(2),
                invoice_id: orderId,
                order_description: 'Modett Order',
                currency_code: currency,
                customer_first_name: customerFirstName,
                customer_last_name: customerLastName,
                customer_email: customerEmail,
                customer_mobile_phone: customerMobilePhone,
                customer_phone: customerMobilePhone,
                billing_address_street: billingAddress.street,
                billing_address_city: billingAddress.city,
                billing_address_province: billingAddress.province,
                billing_address_country: billingAddress.country,
                billing_address_postcode: billingAddress.postcode,
                custom_1: orderId,
            },
            sandboxMode: payable_1.payableConfig.sandboxMode,
        };
    }
    const checkValue = (0, payable_1.generateCheckValue)({
        invoiceId: orderId,
        amount: new decimal_js_1.default(amount).toFixed(2),
        currencyCode: currency,
    });
    await db_1.redis.set(`checkout:context:${orderId}`, JSON.stringify({ reservationId, cartId }), 'EX', 3600);
    const paymentIntent = await (0, db_2.createPaymentIntent)({
        orderId,
        providerIntentId: orderId,
        amount: new decimal_js_1.default(amount).toFixed(2),
        currency,
    });
    return {
        intentId: paymentIntent.id,
        payhereParams: {
            notify_url: `${process.env.API_URL}/api/payments/webhook`,
            return_url: `${process.env.FRONTEND_URL}/checkout/confirmation`,
            cancel_url: `${process.env.FRONTEND_URL}/checkout/cancelled`,
            merchant_key: payable_1.payableConfig.merchantKey,
            check_value: checkValue,
            amount: new decimal_js_1.default(amount).toFixed(2),
            invoice_id: orderId,
            order_description: 'Modett Order',
            currency_code: currency,
            customer_first_name: customerFirstName,
            customer_last_name: customerLastName,
            customer_email: customerEmail,
            customer_mobile_phone: customerMobilePhone,
            customer_phone: customerMobilePhone,
            billing_address_street: billingAddress.street,
            billing_address_city: billingAddress.city,
            billing_address_province: billingAddress.province,
            billing_address_country: billingAddress.country,
            billing_address_postcode: billingAddress.postcode,
            custom_1: orderId,
        },
        sandboxMode: payable_1.payableConfig.sandboxMode,
    };
}
async function handleWebhook({ payload, }) {
    // STEP 1 — Verify checkValue first
    const valid = (0, payable_1.verifyCallbackCheckValue)(payload);
    if (!valid) {
        throw new errors_1.AppError('INVALID_WEBHOOK_SIGNATURE', 400);
    }
    // STEP 2 — Redis idempotency (Layer 1)
    const redisKey = `payment:event:${payload.payableTransactionId}`;
    const hit = await db_1.redis.get(redisKey);
    if (hit)
        return { status: 'already_processed' };
    // STEP 3 — Set Redis key BEFORE DB write
    await db_1.redis.set(redisKey, '1', 'EX', 86400);
    // STEP 4 — Parse status
    if (payload.statusCode === 2) {
        // FAILURE
        try {
            await (0, db_2.createPaymentTransaction)({
                orderId: payload.invoiceNo,
                providerChargeId: payload.payableTransactionId,
                status: 'FAILED',
                amount: payload.payableAmount,
                currency: payload.payableCurrency,
                rawPayloadJson: payload,
            });
        }
        catch (err) {
            if (isUniqueViolation(err))
                return { status: 'already_processed' };
            throw err;
        }
        await (0, db_2.appendOrderEvent)({
            orderId: payload.invoiceNo,
            eventType: 'PAYMENT_FAILED',
            payloadJson: {
                payableTransactionId: payload.payableTransactionId,
                statusMessage: payload.statusMessage,
            },
        }).catch((err) => console.error('[webhook] appendOrderEvent failed:', err));
        return { status: 'recorded_failure' };
    }
    if (payload.statusCode !== 1) {
        return { status: 'unknown_status' };
    }
    // STEP 5 — Load order and items
    const order = await (0, db_2.getOrderById)({ id: payload.invoiceNo });
    if (!order) {
        console.error(`[webhook] Order not found: ${payload.invoiceNo}`);
        return { status: 'order_not_found' };
    }
    const orderItems = await (0, db_2.getOrderItems)({ orderId: order.id });
    // STEP 6 — Load checkout context from Redis
    const contextRaw = await db_1.redis.get(`checkout:context:${payload.invoiceNo}`);
    if (!contextRaw) {
        console.error(`[webhook] Context missing for order: ${payload.invoiceNo}`);
        return { status: 'context_missing' };
    }
    const { reservationId, cartId } = JSON.parse(contextRaw);
    // STEP 7 — Confirmation transaction (DB Layer 2 idempotency)
    try {
        await (0, db_2.confirmOrderTransaction)({
            orderId: payload.invoiceNo,
            reservationId,
            cartId,
            providerChargeId: payload.payableTransactionId,
            amount: payload.payableAmount,
            currency: payload.payableCurrency,
            rawPayloadJson: payload,
            items: orderItems
                .filter((i) => i.variant_id != null)
                .map((i) => ({ variantId: i.variant_id, qty: i.qty })),
        });
    }
    catch (err) {
        if (isUniqueViolation(err))
            return { status: 'already_processed' };
        throw err;
    }
    // STEP 8 — Post-transaction side effects
    await (0, db_2.updatePaymentIntentStatus)({
        orderId: payload.invoiceNo,
        newStatus: 'SUCCEEDED',
    }).catch((err) => console.error('[webhook] intent update failed:', err));
    await db_1.redis.del(`checkout:context:${payload.invoiceNo}`).catch(() => { });
    if (order.user_id) {
        const { notifyOrderReceipt } = await Promise.resolve().then(() => __importStar(require('../messaging')));
        await notifyOrderReceipt({
            userId: order.user_id,
            orderId: payload.invoiceNo,
            orderRef: order.order_ref,
            totalAmount: String(order.total),
            currency: order.currency,
        }).catch(() => { });
        (0, loyalty_1.earnPointsForOrder)({
            userId: order.user_id,
            orderId: payload.invoiceNo,
        }).catch((err) => console.error('[payments] earn points failed:', err));
    }
    return { status: 'confirmed' };
}
async function getPaymentStatus({ orderId, userId, guestEmail, }) {
    const order = await (0, db_2.getOrderById)({ id: orderId });
    if (!order)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    if (userId != null) {
        if (order.user_id !== userId)
            throw new errors_1.AppError('ORDER_ACCESS_DENIED', 403);
    }
    else if (guestEmail != null) {
        const orderGuest = order.guest_email?.trim().toLowerCase() ?? '';
        const requestedGuest = guestEmail.trim().toLowerCase();
        if (orderGuest !== requestedGuest) {
            throw new errors_1.AppError('ORDER_ACCESS_DENIED', 403);
        }
    }
    else {
        throw new errors_1.AppError('ORDER_ACCESS_DENIED', 403);
    }
    const intent = await (0, db_2.getPaymentIntentByOrderId)({ orderId });
    return {
        orderId: order.id,
        orderRef: order.order_ref,
        orderState: order.order_state,
        paymentState: order.payment_state,
        intent: intent
            ? {
                id: intent.id,
                status: intent.status,
                amount: String(intent.amount),
                currency: intent.currency,
            }
            : null,
    };
}
//# sourceMappingURL=payments.service.js.map