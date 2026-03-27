"use strict";
/**
 * Payments query functions — payment_intents, payment_transactions,
 * confirmOrderTransaction (atomic 6-step). No business logic. RORO.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentIntent = createPaymentIntent;
exports.getPaymentIntentByOrderId = getPaymentIntentByOrderId;
exports.updatePaymentIntentStatus = updatePaymentIntentStatus;
exports.createPaymentTransaction = createPaymentTransaction;
exports.getPaymentTransactionByChargeId = getPaymentTransactionByChargeId;
exports.confirmOrderTransaction = confirmOrderTransaction;
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const client_1 = require("../client");
const payments_schema_1 = require("../schema/payments.schema");
const errors_1 = require("../errors");
const orders_schema_1 = require("../schema/orders.schema");
const checkout_1 = require("./checkout");
const cart_1 = require("./cart");
const inventory_1 = require("./inventory");
// —— PaymentIntent ——
async function createPaymentIntent({ orderId, providerIntentId, amount, currency, }) {
    const [row] = await client_1.db
        .insert(payments_schema_1.paymentIntents)
        .values({
        order_id: orderId,
        provider: 'payable',
        provider_intent_id: providerIntentId,
        amount,
        currency,
        status: 'PENDING',
    })
        .returning();
    if (!row)
        throw new Error('createPaymentIntent: no row returned');
    return row;
}
async function getPaymentIntentByOrderId({ orderId, }) {
    const rows = await client_1.db
        .select()
        .from(payments_schema_1.paymentIntents)
        .where((0, drizzle_orm_1.eq)(payments_schema_1.paymentIntents.order_id, orderId))
        .orderBy((0, drizzle_orm_1.desc)(payments_schema_1.paymentIntents.created_at))
        .limit(1);
    return rows[0] ?? null;
}
async function updatePaymentIntentStatus({ orderId, newStatus, }) {
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    UPDATE payments.payment_intents
    SET status = ${newStatus},
        updated_at = now()
    WHERE order_id = ${orderId}
      AND status = 'PENDING'
    RETURNING id
  `);
    if (result.rows.length === 0) {
        throw new errors_1.IntentNotPendingError();
    }
}
// —— PaymentTransaction ——
async function createPaymentTransaction({ orderId, providerChargeId, status, amount, currency, rawPayloadJson, }) {
    const [row] = await client_1.db
        .insert(payments_schema_1.paymentTransactions)
        .values({
        order_id: orderId,
        provider: 'payable',
        provider_charge_id: providerChargeId,
        status,
        amount,
        currency,
        raw_payload_json: rawPayloadJson,
    })
        .returning();
    if (!row)
        throw new Error('createPaymentTransaction: no row returned');
    return row;
}
async function getPaymentTransactionByChargeId({ providerChargeId, }) {
    const rows = await client_1.db
        .select()
        .from(payments_schema_1.paymentTransactions)
        .where((0, drizzle_orm_1.eq)(payments_schema_1.paymentTransactions.provider_charge_id, providerChargeId));
    return rows[0] ?? null;
}
async function confirmOrderTransaction(params) {
    const { orderId, reservationId, cartId, providerChargeId, amount, currency, rawPayloadJson, items, } = params;
    await client_1.db.transaction(async (tx) => {
        // Step 1: Insert payment transaction
        await tx.insert(payments_schema_1.paymentTransactions).values({
            order_id: orderId,
            provider: 'payable',
            provider_charge_id: providerChargeId,
            status: 'SUCCEEDED',
            amount,
            currency,
            raw_payload_json: rawPayloadJson,
        });
        // Step 2: Confirm stock sale (no Redis lock — uses tx)
        for (const item of items) {
            const ok = await (0, inventory_1.atomicConfirmSale)({
                variantId: item.variantId,
                qty: item.qty,
                tx,
            });
            if (!ok)
                throw new errors_1.StockConfirmFailedError();
        }
        // Step 3: Consume reservation
        await (0, checkout_1.consumeReservation)({ reservationId, tx });
        // Step 4: Place order and set payment state
        await (0, checkout_1.placeOrder)({ orderId, tx });
        await tx
            .update(orders_schema_1.ordersTable)
            .set({ payment_state: 'PAID', updated_at: new Date() })
            .where((0, drizzle_orm_1.eq)(orders_schema_1.ordersTable.id, orderId));
        // Step 5: Mark cart checked out
        await (0, cart_1.markCartCheckedOut)({ cartId, tx });
        // Step 6: Append order event
        await (0, checkout_1.appendOrderEvent)({
            orderId,
            eventType: 'PAYMENT_CONFIRMED',
            payloadJson: { providerChargeId, amount, currency },
            tx,
        });
    });
}
