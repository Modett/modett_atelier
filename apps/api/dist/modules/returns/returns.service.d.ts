/**
 * Returns service — eligibility check, customer submit/list/detail,
 * admin list/detail and status transitions. RORO. Throws AppError.
 */
export declare function checkReturnEligibility({ orderId, requestedItems, }: {
    orderId: string;
    requestedItems: Array<{
        orderItemId: string;
        qty: number;
    }>;
}): Promise<{
    eligibleUntil: Date;
    deliveredAt: Date;
}>;
export declare function createReturn({ orderId, userId, type, reason, policyVersion, items, }: {
    orderId: string;
    userId: string;
    type: 'REFUND' | 'EXCHANGE';
    reason: string;
    policyVersion: string;
    items: Array<{
        orderItemId: string;
        qty: number;
        requestedVariantChangeJson?: Record<string, unknown>;
    }>;
}): Promise<{
    returnRequest: {
        id: string;
        created_at: Date;
        updated_at: Date;
        status: "FULFILLED" | "SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
        type: "REFUND" | "EXCHANGE";
        reason: string;
        order_id: string;
        policy_accepted_at: Date;
        policy_version: string;
        eligible_until: Date;
    };
    items: never[] | {
        id: string;
        created_at: Date;
        qty: number;
        order_item_id: string;
        return_request_id: string;
        requested_variant_change_json: unknown;
        request_status: "FULFILLED" | "SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    }[];
}>;
export declare function getMyReturnRequests({ orderId, userId, }: {
    orderId: string;
    userId: string;
}): Promise<{
    returns: {
        id: string;
        created_at: Date;
        updated_at: Date;
        status: "FULFILLED" | "SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
        type: "REFUND" | "EXCHANGE";
        reason: string;
        order_id: string;
        policy_accepted_at: Date;
        policy_version: string;
        eligible_until: Date;
    }[];
}>;
export declare function getMyReturnDetail({ returnRequestId, userId, }: {
    returnRequestId: string;
    userId: string;
}): Promise<{
    request: {
        id: string;
        created_at: Date;
        updated_at: Date;
        status: "FULFILLED" | "SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
        type: "REFUND" | "EXCHANGE";
        reason: string;
        order_id: string;
        policy_accepted_at: Date;
        policy_version: string;
        eligible_until: Date;
    };
    items: {
        id: string;
        created_at: Date;
        qty: number;
        order_item_id: string;
        return_request_id: string;
        requested_variant_change_json: unknown;
        request_status: "FULFILLED" | "SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    }[];
    events: {
        admin_note: null;
        id: string;
        created_at: Date;
        event_type: string;
        payload_json: unknown;
        return_request_id: string;
        admin_id: string | null;
    }[];
}>;
export declare function adminListReturns({ page, limit, status, type, }: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
}): Promise<{
    returns: import("@modett/db").ReturnRequestSummary[];
    page: number;
    limit: number;
    total: number;
}>;
export declare function adminGetReturnDetail({ returnRequestId, }: {
    returnRequestId: string;
}): Promise<{
    request: {
        id: string;
        created_at: Date;
        updated_at: Date;
        status: "FULFILLED" | "SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
        type: "REFUND" | "EXCHANGE";
        reason: string;
        order_id: string;
        policy_accepted_at: Date;
        policy_version: string;
        eligible_until: Date;
    };
    items: {
        id: string;
        created_at: Date;
        qty: number;
        order_item_id: string;
        return_request_id: string;
        requested_variant_change_json: unknown;
        request_status: "FULFILLED" | "SUBMITTED" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
    }[];
    events: {
        id: string;
        created_at: Date;
        event_type: string;
        payload_json: unknown;
        admin_note: string | null;
        return_request_id: string;
        admin_id: string | null;
    }[];
}>;
export declare function adminOpenForReview({ returnRequestId, adminId, }: {
    returnRequestId: string;
    adminId: string;
}): Promise<void>;
export declare function adminApprove({ returnRequestId, adminId, adminNote, }: {
    returnRequestId: string;
    adminId: string;
    adminNote?: string;
}): Promise<void>;
export declare function adminReject({ returnRequestId, adminId, reason, adminNote, }: {
    returnRequestId: string;
    adminId: string;
    reason: string;
    adminNote?: string;
}): Promise<void>;
export declare function adminFulfil({ returnRequestId, adminId, adminNote, }: {
    returnRequestId: string;
    adminId: string;
    adminNote?: string;
}): Promise<void>;
//# sourceMappingURL=returns.service.d.ts.map