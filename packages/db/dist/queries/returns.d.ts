/**
 * Returns query functions — eligibility, return requests CRUD, status transitions,
 * events. No business logic. RORO. All status transitions are atomic (WHERE fromStatus).
 */
import type { ReturnRequest, ReturnRequestItem, ReturnEvent } from '../schema/returns.schema';
export declare function getDeliveredAt({ orderId, }: {
    orderId: string;
}): Promise<Date | null>;
export declare function getAlreadyReturnedQty({ orderItemId, }: {
    orderItemId: string;
}): Promise<number>;
export declare function getReturnRequestById({ id, }: {
    id: string;
}): Promise<ReturnRequest | null>;
export declare function getReturnRequestWithItems({ id, }: {
    id: string;
}): Promise<{
    request: ReturnRequest;
    items: ReturnRequestItem[];
} | null>;
export declare function getReturnRequestsForOrder({ orderId, }: {
    orderId: string;
}): Promise<ReturnRequest[]>;
export declare function getReturnEventsForRequest({ returnRequestId, }: {
    returnRequestId: string;
}): Promise<ReturnEvent[]>;
export interface ReturnRequestSummary extends ReturnRequest {
    order_ref: string;
    user_id: string | null;
    guest_email: string | null;
}
export interface ListReturnRequestsAdminResult {
    returns: ReturnRequestSummary[];
    page: number;
    limit: number;
    total: number;
}
export declare function listReturnRequestsAdmin({ page, limit, status, type, }: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
}): Promise<ListReturnRequestsAdminResult>;
export declare function createReturnRequest({ orderId, type, reason, policyAcceptedAt, policyVersion, eligibleUntil, items, }: {
    orderId: string;
    type: 'REFUND' | 'EXCHANGE';
    reason: string;
    policyAcceptedAt: Date;
    policyVersion: string;
    eligibleUntil: Date;
    items: Array<{
        orderItemId: string;
        qty: number;
        requestedVariantChangeJson?: Record<string, unknown> | null;
    }>;
}): Promise<ReturnRequest>;
export declare function transitionReturnStatus({ returnRequestId, orderId, fromStatus, toStatus, adminId, adminNote, eventType, extraPayload, }: {
    returnRequestId: string;
    orderId: string;
    fromStatus: string;
    toStatus: string;
    adminId?: string | null;
    adminNote?: string | null;
    eventType: string;
    extraPayload?: Record<string, unknown>;
}): Promise<void>;
//# sourceMappingURL=returns.d.ts.map