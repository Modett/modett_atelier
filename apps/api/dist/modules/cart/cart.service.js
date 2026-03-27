"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCart = getCart;
exports.addToCart = addToCart;
exports.updateCartItemQty = updateCartItemQty;
exports.removeFromCart = removeFromCart;
exports.clearCart = clearCart;
exports.mergeCartsOnLogin = mergeCartsOnLogin;
const decimal_js_1 = __importDefault(require("decimal.js"));
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
const db_2 = require("@modett/db");
function resolvePriceForCurrency({ lkrAmount, sgdAmount, usdAmount, currency, }) {
    const amount = currency === 'LKR'
        ? String(lkrAmount)
        : currency === 'SGD'
            ? String(sgdAmount)
            : String(usdAmount);
    return { amount, currency };
}
function resolveCart({ userId, sessionId, }) {
    if (userId) {
        return (0, db_1.getActiveCartByUserId)({ userId }).then((existing) => {
            if (existing) {
                (0, db_1.extendCartExpiry)({ cartId: existing.id });
                return existing;
            }
            return (0, db_1.createCart)({ userId, sessionId });
        });
    }
    return (0, db_1.getActiveCartBySessionId)({ sessionId }).then((existing) => {
        if (existing) {
            (0, db_1.extendCartExpiry)({ cartId: existing.id });
            return existing;
        }
        return (0, db_1.createCart)({ sessionId });
    });
}
async function getCart({ userId, sessionId, currency, }) {
    const cart = await resolveCart({ userId, sessionId });
    const details = await (0, db_1.getCartItems)({ cartId: cart.id });
    const items = details.map((item) => {
        const price = resolvePriceForCurrency({
            lkrAmount: item.prices.lkrAmount,
            sgdAmount: item.prices.sgdAmount,
            usdAmount: item.prices.usdAmount,
            currency,
        });
        const totalPrice = {
            amount: new decimal_js_1.default(price.amount).mul(item.qty).toFixed(2),
            currency,
        };
        return { ...item, price, totalPrice };
    });
    let subtotalAmount = new decimal_js_1.default(0);
    let itemCount = 0;
    let hasOutOfStockItems = false;
    let hasLowStockItems = false;
    for (const item of items) {
        subtotalAmount = subtotalAmount.plus(item.totalPrice.amount);
        itemCount += item.qty;
        if (item.stock.stockStatus === 'OUT_OF_STOCK')
            hasOutOfStockItems = true;
        if (item.stock.stockStatus === 'LOW_STOCK')
            hasLowStockItems = true;
    }
    const summary = {
        subtotal: { amount: subtotalAmount.toFixed(2), currency },
        itemCount,
        hasOutOfStockItems,
        hasLowStockItems,
    };
    return {
        cart,
        items,
        summary,
        sessionId: cart.session_id,
    };
}
async function addToCart({ userId, sessionId, variantId, qty, currency = 'LKR', }) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
        throw new errors_1.AppError('VALIDATION_ERROR', 400, 'qty must be 1–10');
    }
    const cart = await resolveCart({ userId, sessionId });
    const variant = await (0, db_2.getProductVariantById)({ variantId });
    if (!variant)
        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
    const availability = await (0, db_2.getVariantAvailability)({ variantId });
    if (!availability || availability.availableQty <= 0) {
        throw new errors_1.AppError('OUT_OF_STOCK', 409);
    }
    const existing = await (0, db_1.getCartItem)({ cartId: cart.id, variantId });
    const newQty = existing ? existing.qty + qty : qty;
    if (newQty > 10) {
        throw new errors_1.AppError('MAX_QTY_PER_ITEM_EXCEEDED', 400);
    }
    await (0, db_1.upsertCartItem)({ cartId: cart.id, variantId, qty: newQty });
    return getCart({ userId, sessionId, currency });
}
async function updateCartItemQty({ userId, sessionId, variantId, qty, currency = 'LKR', }) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
        throw new errors_1.AppError('VALIDATION_ERROR', 400, 'qty must be 1–10');
    }
    const cart = await resolveCart({ userId, sessionId });
    const existing = await (0, db_1.getCartItem)({ cartId: cart.id, variantId });
    if (!existing)
        throw new errors_1.AppError('ITEM_NOT_IN_CART', 404);
    const availability = await (0, db_2.getVariantAvailability)({ variantId });
    if (availability && qty > availability.availableQty) {
        throw new errors_1.AppError('INSUFFICIENT_STOCK', 409);
    }
    await (0, db_1.upsertCartItem)({ cartId: cart.id, variantId, qty });
    return getCart({ userId, sessionId, currency });
}
async function removeFromCart({ userId, sessionId, variantId, currency = 'LKR', }) {
    const cart = await resolveCart({ userId, sessionId });
    await (0, db_1.removeCartItem)({ cartId: cart.id, variantId });
    return getCart({ userId, sessionId, currency });
}
async function clearCart({ userId, sessionId, currency = 'LKR', }) {
    const cart = await resolveCart({ userId, sessionId });
    await (0, db_1.clearCartItems)({ cartId: cart.id });
    return getCart({ userId, sessionId, currency });
}
async function mergeCartsOnLogin({ userId, guestSessionId, }) {
    const guestCart = await (0, db_1.getActiveCartBySessionId)({
        sessionId: guestSessionId,
    });
    if (!guestCart)
        return null;
    const userCart = await (0, db_1.getActiveCartByUserId)({ userId });
    if (userCart) {
        await (0, db_1.mergeCartItems)({
            sourceCartId: guestCart.id,
            targetCartId: userCart.id,
        });
        return { mergedCartId: userCart.id, sessionId: userCart.session_id };
    }
    const updated = await (0, db_1.updateCartUserId)({
        cartId: guestCart.id,
        userId,
    });
    if (!updated)
        return null;
    return { mergedCartId: updated.id, sessionId: updated.session_id };
}
