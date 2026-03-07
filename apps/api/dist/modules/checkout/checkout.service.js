"use strict";
/**
 * Checkout service — start checkout, address/contact/shipping, payment initiation,
 * confirmation. RORO. Uses Decimal.js for all money. Throws AppError.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startCheckout = startCheckout;
exports.saveAddress = saveAddress;
exports.saveContact = saveContact;
exports.getShippingMethods = getShippingMethods;
exports.selectShippingMethod = selectShippingMethod;
exports.initiatePayment = initiatePayment;
exports.getOrderConfirmation = getOrderConfirmation;
const decimal_js_1 = __importDefault(require("decimal.js"));
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
const shipping_1 = require("../shipping");
const db_2 = require("@modett/db");
const db_3 = require("@modett/db");
const TAX_RATES = { LKR: 0.18, SGD: 0.09, USD: 0 };
function resolvePriceAmount({ lkrAmount, sgdAmount, usdAmount, currency, }) {
    const amount = currency === 'LKR'
        ? lkrAmount
        : currency === 'SGD'
            ? sgdAmount
            : usdAmount;
    return new decimal_js_1.default(amount);
}
function resolveCountryFromCurrency(currency) {
    if (currency === 'LKR')
        return 'LK';
    if (currency === 'SGD')
        return 'SG';
    return 'US';
}
function buildProductSnapshot(item) {
    return {
        displayName: item.product.displayName,
        shortName: item.product.shortName,
        slug: item.product.slug,
        color: item.variant.color,
        size: item.variant.size,
        imageUrl: item.keyImage?.url ?? null,
    };
}
function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
async function startCheckout({ userId, sessionId, currency, guestEmail, }) {
    const cart = userId
        ? await (0, db_2.getActiveCartByUserId)({ userId })
        : await (0, db_2.getActiveCartBySessionId)({ sessionId });
    if (!cart)
        throw new errors_1.AppError('CART_NOT_FOUND', 404);
    const cartItems = await (0, db_2.getCartItems)({ cartId: cart.id });
    if (cartItems.length === 0)
        throw new errors_1.AppError('CART_IS_EMPTY', 400);
    for (const item of cartItems) {
        if (item.stock.availableQty < item.qty) {
            throw new errors_1.AppError('INSUFFICIENT_STOCK', 409, `Variant ${item.variantId}: requested ${item.qty}, available ${item.stock.availableQty}`);
        }
    }
    if (!userId && !guestEmail) {
        throw new errors_1.AppError('GUEST_EMAIL_REQUIRED', 400);
    }
    if (guestEmail && !isValidEmail(guestEmail)) {
        throw new errors_1.AppError('INVALID_EMAIL', 400);
    }
    const taxRate = TAX_RATES[currency];
    let subtotal = new decimal_js_1.default(0);
    for (const item of cartItems) {
        const unitPrice = resolvePriceAmount({
            lkrAmount: item.prices.lkrAmount,
            sgdAmount: item.prices.sgdAmount,
            usdAmount: item.prices.usdAmount,
            currency,
        });
        const lineTotal = unitPrice.mul(item.qty);
        subtotal = subtotal.add(lineTotal);
    }
    let taxAmount;
    let total;
    if (currency === 'LKR') {
        taxAmount = subtotal
            .mul(taxRate)
            .div(new decimal_js_1.default(1).add(taxRate))
            .toDecimalPlaces(2);
        total = subtotal;
    }
    else {
        taxAmount = subtotal.mul(taxRate).toDecimalPlaces(2);
        total = subtotal.add(taxAmount);
    }
    const taxRateSnapshot = new decimal_js_1.default(taxRate);
    const reservation = await (0, db_1.createReservation)({
        userId: userId ?? null,
        cartId: cart.id,
        items: cartItems.map((i) => ({ variantId: i.variantId, qty: i.qty })),
    });
    let order;
    try {
        order = await (0, db_1.createDraftOrder)({
            userId: userId ?? null,
            guestEmail: guestEmail ?? null,
            currency,
            countryCode: resolveCountryFromCurrency(currency),
            subtotal: subtotal.toFixed(2),
            taxRateSnapshot: taxRateSnapshot.toFixed(4),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2),
            items: cartItems.map((item) => ({
                variantId: item.variantId,
                qty: item.qty,
                unitPriceSnapshotAmount: resolvePriceAmount({
                    lkrAmount: item.prices.lkrAmount,
                    sgdAmount: item.prices.sgdAmount,
                    usdAmount: item.prices.usdAmount,
                    currency,
                }).toFixed(2),
                unitPriceSnapshotCurrency: currency,
                taxAmount: '0',
                productSnapshotJson: buildProductSnapshot(item),
            })),
        });
    }
    catch (err) {
        for (const item of cartItems) {
            await (0, db_2.atomicReleaseHold)({
                variantId: item.variantId,
                qty: item.qty,
            }).catch(() => { });
        }
        throw err;
    }
    return {
        reservationId: reservation.id,
        orderId: order.id,
        orderRef: order.order_ref,
        expiresAt: reservation.expires_at,
        currency,
        summary: {
            subtotal: subtotal.toFixed(2),
            taxAmount: taxAmount.toFixed(2),
            total: total.toFixed(2),
            itemCount: cartItems.length,
        },
    };
}
// —— saveAddress ——
async function saveAddress({ orderId, kind, addressJson, countryCode, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    if (order.order_state !== 'DRAFT')
        throw new errors_1.AppError('ORDER_NOT_DRAFT', 409);
    await (0, db_1.upsertOrderAddress)({ orderId, kind, addressJson, countryCode });
    await (0, db_1.appendOrderEvent)({
        orderId,
        eventType: 'ADDRESS_SAVED',
        payloadJson: { kind, countryCode },
    });
    const details = await (0, db_1.getOrderWithDetails)({ id: orderId });
    if (!details)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    return details;
}
// —— saveContact ——
async function saveContact({ orderId, primaryPhone, extraPhones, isGift, giftReceiver, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    if (order.order_state !== 'DRAFT')
        throw new errors_1.AppError('ORDER_NOT_DRAFT', 409);
    let giftReceiverJson = null;
    if (isGift === true) {
        if (giftReceiver == null) {
            throw new errors_1.AppError('GIFT_RECEIVER_REQUIRED', 400);
        }
        giftReceiverJson = giftReceiver;
    }
    if (isGift === true) {
        await (0, db_1.updateOrderIsGift)({ orderId, isGift: true });
    }
    await (0, db_1.upsertOrderContact)({
        orderId,
        primaryPhone,
        extraPhonesJson: extraPhones ?? [],
        giftReceiverJson,
    });
    await (0, db_1.appendOrderEvent)({
        orderId,
        eventType: 'CONTACT_SAVED',
        payloadJson: { isGift: isGift ?? false },
    });
    const details = await (0, db_1.getOrderWithDetails)({ id: orderId });
    if (!details)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    return details;
}
async function getShippingMethods({ countryCode, currency, }) {
    return (0, shipping_1.getMethodsForCheckout)({ countryCode, currency });
}
// —— selectShippingMethod ——
async function selectShippingMethod({ orderId, shippingMethodId, currency, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    if (order.order_state !== 'DRAFT')
        throw new errors_1.AppError('ORDER_NOT_DRAFT', 409);
    const { method, cost } = await (0, shipping_1.getMethodForOrder)({
        methodId: shippingMethodId,
        currency,
    });
    if (cost == null) {
        throw new errors_1.AppError('SHIPPING_COST_NOT_AVAILABLE', 400);
    }
    const shippingCost = new decimal_js_1.default(cost.amount);
    const subtotal = new decimal_js_1.default(String(order.subtotal));
    const taxAmount = new decimal_js_1.default(String(order.tax_amount));
    let newTotal;
    if (currency === 'LKR') {
        newTotal = subtotal.add(shippingCost);
    }
    else {
        newTotal = subtotal.add(shippingCost).add(taxAmount);
    }
    const shippingMethodSnapshot = method.carrier
        ? `${method.name} — ${method.carrier}`
        : method.name;
    await (0, db_1.updateOrderShipping)({
        orderId,
        shippingMethodId,
        shippingMethodSnapshot,
        shippingCost: shippingCost.toFixed(2),
        total: newTotal.toFixed(2),
    });
    await (0, db_1.appendOrderEvent)({
        orderId,
        eventType: 'SHIPPING_SELECTED',
        payloadJson: {
            shippingMethodId,
            shippingMethodSnapshot,
            shippingCost: shippingCost.toFixed(2),
        },
    });
    const details = await (0, db_1.getOrderWithDetails)({ id: orderId });
    if (!details)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    return details;
}
async function initiatePayment({ orderId, reservationId, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    if (order.order_state !== 'DRAFT')
        throw new errors_1.AppError('ORDER_NOT_DRAFT', 409);
    if (!order.shipping_method_id) {
        throw new errors_1.AppError('SHIPPING_NOT_SELECTED', 400);
    }
    const addresses = await (0, db_1.getOrderAddresses)({ orderId });
    const hasShipping = addresses.some((a) => a.kind === 'SHIPPING');
    if (!hasShipping)
        throw new errors_1.AppError('SHIPPING_ADDRESS_REQUIRED', 400);
    const contact = await (0, db_1.getOrderContact)({ orderId });
    if (!contact)
        throw new errors_1.AppError('CONTACT_REQUIRED', 400);
    try {
        await (0, db_1.stampPaymentSubmitted)({ reservationId });
    }
    catch (err) {
        if (err instanceof db_3.ReservationNotHeldError) {
            throw new errors_1.AppError('RESERVATION_EXPIRED', 410);
        }
        throw err;
    }
    return {
        orderId: order.id,
        orderRef: order.order_ref,
        reservationId,
        total: String(order.total),
        currency: order.currency,
        stripeReady: true,
    };
}
// —— getOrderConfirmation ——
async function getOrderConfirmation({ orderId, userId, guestEmail, }) {
    const details = await (0, db_1.getOrderWithDetails)({ id: orderId });
    if (!details)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    const { order } = details;
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
    return details;
}
//# sourceMappingURL=checkout.service.js.map