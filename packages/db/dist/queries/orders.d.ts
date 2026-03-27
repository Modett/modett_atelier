/**
 * Orders query functions — order summary view, full detail, events, allocations,
 * state transitions, shipping/address updates, scan-to-pack. No business logic. RORO.
 * All state transitions use atomic UPDATE with previous state in WHERE; 0 rows → OrderOperationError.
 */
import { type TransactionClient } from '../client';
import { getOrderContact } from './checkout';
import type { OrderEvent, OrderItem, OrderAddress, Order } from '../schema/orders.schema';
import type { OrderUnitAllocation } from '../types';
export interface OrderSummaryRow {
    id: string;
    order_ref: string;
    user_id: string | null;
    guest_email: string | null;
    order_state: string;
    payment_state: string;
    fulfillment_state: string;
    return_state: string;
    currency: string;
    total: string;
    placed_at: string | null;
    created_at: string;
    item_count: string;
}
export interface OrderAllocationDetail extends OrderUnitAllocation {
    variant_id: string | null;
    item_qty: number;
    unit_sku: string;
    barcode_value: string;
    unit_status: string;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
}
export declare function listOrdersForUser({ userId, page, limit, }: {
    userId: string;
    page?: number;
    limit?: number;
}): Promise<{
    rows: OrderSummaryRow[];
    meta: PaginationMeta;
}>;
export declare function listOrdersAdmin({ page, limit, orderState, paymentState, fulfillmentState, search, }: {
    page?: number;
    limit?: number;
    orderState?: string;
    paymentState?: string;
    fulfillmentState?: string;
    search?: string;
}): Promise<{
    rows: OrderSummaryRow[];
    meta: PaginationMeta;
}>;
export declare function getOrderItemById({ orderItemId, }: {
    orderItemId: string;
}): Promise<OrderItem | null>;
export declare function getOrderEvents({ orderId, }: {
    orderId: string;
}): Promise<OrderEvent[]>;
export declare function getOrderAllocations({ orderId, }: {
    orderId: string;
}): Promise<OrderAllocationDetail[]>;
export declare function getOrderWithFullDetail({ id, }: {
    id: string;
}): Promise<{
    order: Order | null;
    items: OrderItem[];
    addresses: OrderAddress[];
    contact: Awaited<ReturnType<typeof getOrderContact>>;
    events: OrderEvent[];
    allocations: OrderAllocationDetail[];
} | null>;
export declare function getAllocationByUnitId({ inventoryUnitId, }: {
    inventoryUnitId: string;
}): Promise<OrderUnitAllocation | null>;
export declare function transitionFulfillmentState({ orderId, fromState, toState, adminId, note, extraPayload, tx, }: {
    orderId: string;
    fromState: string;
    toState: string;
    adminId: string;
    note?: string | null;
    extraPayload?: Record<string, unknown>;
    tx?: TransactionClient;
}): Promise<void>;
export declare function cancelOrder({ orderId, adminId, reason, tx, }: {
    orderId: string;
    adminId: string;
    reason: string;
    tx?: TransactionClient;
}): Promise<void>;
export declare function updateShippingInfo({ orderId, trackingNumber, carrier, adminId, note, }: {
    orderId: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    adminId: string;
    note?: string | null;
}): Promise<void>;
export declare function updateOrderAddress({ orderId, kind, addressJson, countryCode, adminId, }: {
    orderId: string;
    kind: 'SHIPPING' | 'BILLING';
    addressJson: Record<string, unknown>;
    countryCode: string;
    adminId: string;
}): Promise<void>;
export declare function allocateUnitToOrderItem({ orderItemId, inventoryUnitId, scannedByAdminId, scannedByNameSnapshot, }: {
    orderItemId: string;
    inventoryUnitId: string;
    scannedByAdminId: string;
    scannedByNameSnapshot: string;
}): Promise<OrderUnitAllocation>;
export declare function deallocateUnit({ inventoryUnitId, adminId, orderId, }: {
    inventoryUnitId: string;
    adminId: string;
    orderId: string;
}): Promise<void>;
//# sourceMappingURL=orders.d.ts.map