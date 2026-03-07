/**
 * Orders service — customer order history/detail, admin list/detail,
 * fulfillment transitions, cancel, shipping/address updates, scan-to-pack.
 * RORO. Throws AppError. OrderOperationError from db bubbles (has code + statusCode).
 */
export declare function getMyOrders({ userId, page, limit, }: {
    userId: string;
    page?: number;
    limit?: number;
}): Promise<{
    orders: import("@modett/db").OrderSummaryRow[];
    page: number;
    limit: number;
    total: number;
}>;
export declare function getMyOrderDetail({ orderId, userId, }: {
    orderId: string;
    userId: string;
}): Promise<{
    order: {
        currency: "LKR" | "SGD" | "USD";
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string | null;
        country_code: string;
        order_state: "DRAFT" | "PLACED" | "CANCELLED";
        payment_state: "UNPAID" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
        fulfillment_state: "CANCELLED" | "NOT_STARTED" | "IN_PROGRESS" | "PARTIALLY_FULFILLED" | "FULFILLED";
        return_state: "RETURNED" | "NONE" | "REQUESTED" | "PARTIAL";
        order_ref: string;
        guest_email: string | null;
        subtotal: string;
        discount_amount: string;
        shipping_cost: string;
        tax_amount: string;
        tax_rate_snapshot: string;
        total: string;
        shipping_method_id: string | null;
        shipping_method_snapshot: string | null;
        promo_code_id: string | null;
        is_gift: boolean;
        placed_at: Date | null;
    };
    items: {
        id: string;
        created_at: Date;
        variant_id: string | null;
        qty: number;
        tax_amount: string;
        order_id: string;
        unit_price_snapshot_amount: string;
        unit_price_snapshot_currency: "LKR" | "SGD" | "USD";
        product_snapshot_json: unknown;
    }[];
    addresses: {
        id: string;
        kind: "SHIPPING" | "BILLING";
        address_json: unknown;
        country_code: string;
        order_id: string;
    }[];
    contact: {
        id: string;
        order_id: string;
        primary_phone: string;
        extra_phones_json: unknown;
        gift_receiver_json: unknown;
    } | null;
    events: ({
        id: string;
        created_at: Date;
        created_by_admin_id: string | null;
        order_id: string;
        event_type: string;
        payload_json: unknown;
        admin_note: string | null;
    } & {
        admin_note: string | null;
    })[];
    allocations: {
        variant_id: string | null;
        item_qty: number;
        unit_sku: string;
        barcode_value: string;
        unit_status: string;
        id: string;
        order_item_id: string;
        inventory_unit_id: string;
        scanned_by_name_snapshot: string;
        scanned_at: Date;
    }[];
}>;
export declare function adminListOrders({ page, limit, orderState, paymentState, fulfillmentState, search, }: {
    page?: number;
    limit?: number;
    orderState?: string;
    paymentState?: string;
    fulfillmentState?: string;
    search?: string;
}): Promise<{
    orders: import("@modett/db").OrderSummaryRow[];
    page: number;
    limit: number;
    total: number;
}>;
export declare function adminGetOrderDetail({ orderId }: {
    orderId: string;
}): Promise<{
    order: {
        currency: "LKR" | "SGD" | "USD";
        id: string;
        created_at: Date;
        updated_at: Date;
        user_id: string | null;
        country_code: string;
        order_state: "DRAFT" | "PLACED" | "CANCELLED";
        payment_state: "UNPAID" | "PAID" | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";
        fulfillment_state: "CANCELLED" | "NOT_STARTED" | "IN_PROGRESS" | "PARTIALLY_FULFILLED" | "FULFILLED";
        return_state: "RETURNED" | "NONE" | "REQUESTED" | "PARTIAL";
        order_ref: string;
        guest_email: string | null;
        subtotal: string;
        discount_amount: string;
        shipping_cost: string;
        tax_amount: string;
        tax_rate_snapshot: string;
        total: string;
        shipping_method_id: string | null;
        shipping_method_snapshot: string | null;
        promo_code_id: string | null;
        is_gift: boolean;
        placed_at: Date | null;
    } | null;
    items: {
        id: string;
        created_at: Date;
        variant_id: string | null;
        qty: number;
        tax_amount: string;
        order_id: string;
        unit_price_snapshot_amount: string;
        unit_price_snapshot_currency: "LKR" | "SGD" | "USD";
        product_snapshot_json: unknown;
    }[];
    addresses: {
        id: string;
        kind: "SHIPPING" | "BILLING";
        address_json: unknown;
        country_code: string;
        order_id: string;
    }[];
    contact: {
        id: string;
        order_id: string;
        primary_phone: string;
        extra_phones_json: unknown;
        gift_receiver_json: unknown;
    } | null;
    events: {
        id: string;
        created_at: Date;
        created_by_admin_id: string | null;
        order_id: string;
        event_type: string;
        payload_json: unknown;
        admin_note: string | null;
    }[];
    allocations: import("@modett/db").OrderAllocationDetail[];
}>;
export declare function markOrderPacked({ orderId, adminId, note, }: {
    orderId: string;
    adminId: string;
    note?: string | null;
}): Promise<void>;
export declare function markOrderShipped({ orderId, adminId, trackingNumber, carrier, note, }: {
    orderId: string;
    adminId: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    note?: string | null;
}): Promise<void>;
export declare function markOrderOutForDelivery({ orderId, adminId, note, }: {
    orderId: string;
    adminId: string;
    note?: string | null;
}): Promise<void>;
export declare function markOrderDelivered({ orderId, adminId, note, }: {
    orderId: string;
    adminId: string;
    note?: string | null;
}): Promise<void>;
export declare function cancelOrder({ orderId, adminId, reason, }: {
    orderId: string;
    adminId: string;
    reason: string;
}): Promise<void>;
export declare function updateShippingAddress({ orderId, kind, addressJson, countryCode, adminId, }: {
    orderId: string;
    kind: 'SHIPPING' | 'BILLING';
    addressJson: Record<string, unknown>;
    countryCode: string;
    adminId: string;
}): Promise<void>;
export declare function scanUnit({ barcodeValue, orderItemId, adminId, adminFullName, }: {
    barcodeValue: string;
    orderItemId: string;
    adminId: string;
    adminFullName: string;
}): Promise<{
    unit: {
        id: string;
        created_at: Date;
        updated_at: Date;
        status: "IN_STOCK" | "HELD" | "SOLD" | "RETURNED" | "DAMAGED" | "ADJUSTED_OUT";
        variant_id: string;
        unit_sku: string;
        barcode_value: string;
    };
    variant: {
        id: string;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        product_id: string;
        color: string;
        size: string;
        sku_group: string;
    };
    orderItem: {
        id: string;
        created_at: Date;
        variant_id: string | null;
        qty: number;
        tax_amount: string;
        order_id: string;
        unit_price_snapshot_amount: string;
        unit_price_snapshot_currency: "LKR" | "SGD" | "USD";
        product_snapshot_json: unknown;
    };
    allocation: {
        id: string;
        order_item_id: string;
        inventory_unit_id: string;
        scanned_by_admin_id: string | null;
        scanned_by_name_snapshot: string;
        scanned_at: Date;
    };
}>;
export declare function removeUnitAllocation({ inventoryUnitId, adminId, orderId, }: {
    inventoryUnitId: string;
    adminId: string;
    orderId: string;
}): Promise<void>;
export declare function getOrderPackingStatus({ orderId }: {
    orderId: string;
}): Promise<{
    orderId: string;
    isFullyPacked: boolean;
    items: {
        orderItemId: string;
        variantId: string | null;
        productName: string;
        color: string;
        size: string;
        required: number;
        allocated: number;
        isComplete: boolean;
        allocatedUnits: {
            inventoryUnitId: string;
            unitSku: string;
            barcodeValue: string;
            scannedByName: string;
            scannedAt: Date;
        }[];
    }[];
}>;
//# sourceMappingURL=orders.service.d.ts.map