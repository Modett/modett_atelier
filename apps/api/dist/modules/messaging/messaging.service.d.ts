/**
 * Messaging service — preferences, queue notification (opt-in gating),
 * transactional helpers, BIS/price-drop, notify-me, inbox, admin campaigns.
 * RORO. Uses AppError for service-level validation; db layer throws MessagingError.
 */
import { createCampaign, getCampaignById, updateCampaign } from '@modett/db';
import type { NotificationPreferences } from '@modett/db';
type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
export declare function getMyPreferences({ userId, }: {
    userId: string;
}): Promise<NotificationPreferences>;
export declare function updateMyPreferences({ userId, emailOptIn, smsOptIn, whatsappOptIn, pushOptIn, }: {
    userId: string;
    emailOptIn?: boolean;
    smsOptIn?: boolean;
    whatsappOptIn?: boolean;
    pushOptIn?: boolean;
}): Promise<NotificationPreferences>;
export declare function queueNotification({ userId, channel, templateKey, payloadJson, dedupeKey, isTransactional, inboxMessage, }: {
    userId: string | null | undefined;
    channel: Channel;
    templateKey: string;
    payloadJson: Record<string, unknown>;
    dedupeKey: string;
    isTransactional?: boolean;
    inboxMessage?: {
        type: string;
        title: string;
        body: string;
        ctaLabel?: string;
        ctaUrl?: string;
        metadataJson?: Record<string, unknown>;
    };
}): Promise<{
    queued: true;
} | {
    queued: false;
    reason: 'OPT_OUT';
}>;
export declare function notifyOrderReceipt({ userId, orderId, orderRef, totalAmount, currency, }: {
    userId: string;
    orderId: string;
    orderRef: string;
    totalAmount: string;
    currency: string;
}): Promise<void>;
export declare function notifyOrderShipped({ userId, orderId, orderRef, trackingNumber, carrier, }: {
    userId: string;
    orderId: string;
    orderRef: string;
    trackingNumber?: string;
    carrier?: string;
}): Promise<void>;
export declare function notifyOrderDelivered({ userId, orderId, orderRef, }: {
    userId: string;
    orderId: string;
    orderRef: string;
}): Promise<void>;
export declare function notifyOrderCancelled({ userId, orderId, orderRef, reason, }: {
    userId: string;
    orderId: string;
    orderRef: string;
    reason?: string;
}): Promise<void>;
export declare function notifyReviewRequest({ userId, orderItemId, productName, plainToken, }: {
    userId: string;
    orderItemId: string;
    productName: string;
    plainToken: string;
}): Promise<void>;
export declare function notifyLoyaltyPointsEarned({ userId, points, newBalance, orderRef, }: {
    userId: string;
    points: number;
    newBalance: number;
    orderRef: string;
}): Promise<void>;
export declare function notifyLoyaltyTierUpgraded({ userId, newTier, previousTier, }: {
    userId: string;
    newTier: string;
    previousTier: string;
}): Promise<void>;
export declare function subscribeBackInStock({ userId, variantId, channels, }: {
    userId: string;
    variantId: string;
    channels?: Channel[];
}): Promise<void>;
export declare function unsubscribeBackInStock({ userId, variantId, }: {
    userId: string;
    variantId: string;
}): Promise<void>;
export declare function notifyBackInStockSubscribers({ variantId, productName, variantLabel, }: {
    variantId: string;
    productName: string;
    variantLabel: string;
}): Promise<void>;
export declare function subscribePriceDrop({ userId, variantId, targetPrice, channels, }: {
    userId: string;
    variantId: string;
    targetPrice?: number;
    channels?: Channel[];
}): Promise<void>;
export declare function unsubscribePriceDrop({ userId, variantId, }: {
    userId: string;
    variantId: string;
}): Promise<void>;
export declare function notifyPriceDropSubscribers({ variantId, newPrice, currency, productName, }: {
    variantId: string;
    newPrice: string;
    currency: string;
    productName: string;
}): Promise<void>;
export declare function recordNotifyMe({ variantId, userId, sessionId, }: {
    variantId: string;
    userId?: string | null;
    sessionId: string;
}): Promise<void>;
export declare function getNotifyMeDemand({ limit, }?: {
    limit?: number;
}): Promise<import("@modett/db").NotifyMeDemandRow[]>;
export declare function getMyInbox({ userId, page, limit, unreadOnly, }: {
    userId: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
}): Promise<{
    messages: import("@modett/db").InboxMessage[];
    unreadCount: number;
    page: number;
    limit: number;
    total: number;
}>;
export declare function markRead({ messageId, userId, }: {
    messageId: string;
    userId: string;
}): Promise<void>;
export declare function markAllRead({ userId }: {
    userId: string;
}): Promise<void>;
export declare function adminCreateCampaign({ name, contentJson, channelsJson, audienceFilterJson, adminId, }: {
    name: string;
    contentJson: Record<string, unknown>;
    channelsJson?: Channel[];
    audienceFilterJson?: Record<string, unknown>;
    adminId: string;
}): Promise<Awaited<ReturnType<typeof createCampaign>>>;
export declare function adminUpdateCampaign({ id, name, contentJson, channelsJson, audienceFilterJson, }: {
    id: string;
    name?: string;
    contentJson?: Record<string, unknown>;
    channelsJson?: Channel[];
    audienceFilterJson?: Record<string, unknown>;
}): Promise<Awaited<ReturnType<typeof updateCampaign>>>;
export declare function adminScheduleCampaign({ id, scheduledAt, }: {
    id: string;
    scheduledAt: Date;
}): Promise<void>;
export declare function adminCancelCampaign({ id }: {
    id: string;
}): Promise<void>;
export declare function adminListCampaigns({ page, limit, status, }: {
    page?: number;
    limit?: number;
    status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED';
}): Promise<{
    campaigns: {
        id: string;
        name: string;
        created_at: Date;
        updated_at: Date;
        status: "DRAFT" | "CANCELLED" | "SENT" | "SCHEDULED";
        created_by_admin_id: string | null;
        content_json: unknown;
        sent_at: Date | null;
        channels_json: unknown;
        audience_filter_json: unknown;
        scheduled_at: Date | null;
    }[];
    page: number;
    limit: number;
    total: number;
}>;
export declare function adminGetCampaign({ id, }: {
    id: string;
}): Promise<Awaited<ReturnType<typeof getCampaignById>>>;
export {};
//# sourceMappingURL=messaging.service.d.ts.map