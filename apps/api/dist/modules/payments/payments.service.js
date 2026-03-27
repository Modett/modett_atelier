"use strict";
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
const TO_LKR = {
    LKR: 1,
    SGD: 230,
    USD: 310,
};
async function createPaymentSession(params) {
    const { orderId, reservationId, cartId, customerFirstName, customerLastName, customerEmail, customerMobilePhone, billingAddress, } = params;
    const order = await (0, db_2.getOrderById)({ id: orderId });
    if (!order)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    if (order.order_state !== 'DRAFT')
        throw new errors_1.AppError('ORDER_NOT_DRAFT', 409);
    const originalAmount = new decimal_js_1.default(String(order.total));
    const lkrAmount = order.currency === 'LKR'
        ? originalAmount.toFixed(2)
        : originalAmount.mul(TO_LKR[order.currency] ?? 1).toDecimalPlaces(2).toFixed(2);
    const invoiceRef = order.order_ref;
    const checkValue = (0, payable_1.generateCheckValue)({
        invoiceId: invoiceRef,
        amount: lkrAmount,
        currencyCode: 'LKR',
    });
    const webhookUrl = process.env.PAYABLE_WEBHOOK_URL ??
        `${payable_1.payableConfig.apiUrl}/api/payments/webhook`;
    const paymentParams = {
        merchant_key: payable_1.payableConfig.merchantKey,
        check_value: checkValue,
        invoice_id: invoiceRef,
        amount: lkrAmount,
        currency_code: 'LKR',
        payment_type: 'ONE_TIME_PAYMENT',
        order_description: 'Modett Order',
        notify_url: webhookUrl,
        return_url: `${payable_1.payableConfig.frontendUrl}/checkout/confirm/${orderId}`,
        cancel_url: `${payable_1.payableConfig.frontendUrl}/checkout`,
        logo_url: payable_1.payableConfig.logoUrl,
        customer_first_name: customerFirstName,
        customer_last_name: customerLastName,
        customer_email: customerEmail,
        customer_mobile_phone: customerMobilePhone,
        customer_phone: customerMobilePhone,
        billing_address_street: billingAddress.street,
        billing_address_city: billingAddress.city,
        billing_address_province: billingAddress.province || billingAddress.city,
        billing_address_country: 'LKA',
        billing_address_postcode: billingAddress.postcode || '0000',
        custom_1: orderId,
        custom_2: reservationId,
    };
    const existing = await (0, db_2.getPaymentIntentByOrderId)({ orderId });
    if (existing && existing.status === 'PENDING') {
        return {
            intentId: existing.id,
            orderId,
            orderRef: order.order_ref,
            sandboxMode: payable_1.payableConfig.sandboxMode,
            paymentParams,
        };
    }
    await (0, db_2.stampPaymentSubmitted)({ reservationId });
    await db_1.redis.set(`checkout:context:${orderId}`, JSON.stringify({ reservationId, cartId }), 'EX', 3600);
    const paymentIntent = await (0, db_2.createPaymentIntent)({
        orderId,
        providerIntentId: invoiceRef,
        amount: lkrAmount,
        currency: 'LKR',
    });
    return {
        intentId: paymentIntent.id,
        orderId,
        orderRef: order.order_ref,
        sandboxMode: payable_1.payableConfig.sandboxMode,
        paymentParams,
    };
}
async function handleWebhook({ payload, }) {
    if (!payload.checkValue) {
        throw new errors_1.AppError('WEBHOOK_INVALID_CHECKVALUE', 400);
    }
    const valid = (0, payable_1.verifyCallbackCheckValue)(payload);
    if (!valid) {
        throw new errors_1.AppError('WEBHOOK_INVALID_CHECKVALUE', 400);
    }
    const txId = payload.payableTransactionId;
    const orderId = payload.custom1 ?? payload.invoiceNo;
    if (!txId || !orderId) {
        console.error('[webhook] Missing transactionId or orderId in payload');
        return { status: 'unknown_status' };
    }
    const redisKey = `payment:event:${txId}`;
    const hit = await db_1.redis.get(redisKey);
    if (hit)
        return { status: 'already_processed' };
    const statusCode = Number(payload.statusCode);
    const isFailure = statusCode === 2;
    const isSuccess = statusCode === 1;
    if (isFailure) {
        try {
            await (0, db_2.createPaymentTransaction)({
                orderId,
                providerChargeId: txId,
                status: 'FAILED',
                amount: payload.payableAmount ?? '0',
                currency: payload.payableCurrency ?? 'LKR',
                rawPayloadJson: payload,
            });
        }
        catch (err) {
            if (isUniqueViolation(err))
                return { status: 'already_processed' };
            throw err;
        }
        await db_1.redis.set(redisKey, '1', 'EX', 86400).catch(() => { });
        await (0, db_2.updatePaymentIntentStatus)({
            orderId,
            newStatus: 'FAILED',
        }).catch((err) => console.error('[webhook] intent update failed:', err));
        await (0, db_2.appendOrderEvent)({
            orderId,
            eventType: 'PAYMENT_FAILED',
            payloadJson: {
                payableTransactionId: txId,
                statusMessage: payload.statusMessage,
            },
        }).catch((err) => console.error('[webhook] appendOrderEvent failed:', err));
        return { status: 'recorded_failure' };
    }
    if (!isSuccess) {
        console.warn('[webhook] Unknown statusCode:', payload.statusCode, payload.statusMessage);
        return { status: 'unknown_status' };
    }
    const order = await (0, db_2.getOrderById)({ id: orderId });
    if (!order) {
        console.error(`[webhook] Order not found: ${orderId}`);
        return { status: 'order_not_found' };
    }
    const orderItems = await (0, db_2.getOrderItems)({ orderId: order.id });
    const contextRaw = await db_1.redis.get(`checkout:context:${orderId}`);
    if (!contextRaw) {
        console.error(`[webhook] Context missing for order: ${orderId}`);
        return { status: 'context_missing' };
    }
    const { reservationId, cartId } = JSON.parse(contextRaw);
    try {
        await (0, db_2.confirmOrderTransaction)({
            orderId,
            reservationId,
            cartId,
            providerChargeId: txId,
            amount: payload.payableAmount ?? String(order.total),
            currency: payload.payableCurrency ?? order.currency,
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
    await db_1.redis.set(redisKey, '1', 'EX', 86400).catch(() => { });
    await (0, db_2.updatePaymentIntentStatus)({
        orderId,
        newStatus: 'SUCCEEDED',
    }).catch((err) => console.error('[webhook] intent update failed:', err));
    await db_1.redis.del(`checkout:context:${orderId}`).catch(() => { });
    await db_1.redis.del(`payable:session:${orderId}`).catch(() => { });
    if (order.user_id) {
        const { notifyOrderReceipt } = await Promise.resolve().then(() => __importStar(require('../messaging')));
        await notifyOrderReceipt({
            userId: order.user_id,
            orderId,
            orderRef: order.order_ref,
            totalAmount: String(order.total),
            currency: order.currency,
        }).catch(() => { });
        (0, loyalty_1.earnPointsForOrder)({
            userId: order.user_id,
            orderId,
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
        if (orderGuest !== requestedGuest)
            throw new errors_1.AppError('ORDER_ACCESS_DENIED', 403);
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
