/**
 * Messaging query functions — outbox, inbox, preferences, BIS/price-drop subscriptions,
 * notify-me events, campaigns. No business logic. RORO. Outbox claim uses withOutboxLock.
 */
import type { InboxMessage, NotificationPreferences, NotificationOutboxRow, BackInStockSubscription, PriceDropSubscription, Campaign } from '../schema/messaging.schema';
export declare const TemplateKey: {
    readonly ORDER_RECEIPT: "ORDER_RECEIPT";
    readonly ORDER_SHIPPED: "ORDER_SHIPPED";
    readonly ORDER_DELIVERED: "ORDER_DELIVERED";
    readonly ORDER_CANCELLED: "ORDER_CANCELLED";
    readonly RETURN_SUBMITTED: "RETURN_SUBMITTED";
    readonly RETURN_APPROVED: "RETURN_APPROVED";
    readonly RETURN_REJECTED: "RETURN_REJECTED";
    readonly REVIEW_REQUEST: "REVIEW_REQUEST";
    readonly BACK_IN_STOCK: "BACK_IN_STOCK";
    readonly PRICE_DROP: "PRICE_DROP";
    readonly LOYALTY_POINTS_EARNED: "LOYALTY_POINTS_EARNED";
    readonly LOYALTY_TIER_UPGRADED: "LOYALTY_TIER_UPGRADED";
    readonly CAMPAIGN: "CAMPAIGN";
};
export type TemplateKeyValue = (typeof TemplateKey)[keyof typeof TemplateKey];
export declare function withOutboxLock<T>(outboxId: string, fn: () => Promise<T>): Promise<T>;
export declare function createNotificationPreferences({ userId, }: {
    userId: string;
}): Promise<void>;
export declare function getNotificationPreferences({ userId, }: {
    userId: string;
}): Promise<NotificationPreferences | null>;
export declare function updateNotificationPreferences({ userId, emailOptIn, smsOptIn, whatsappOptIn, pushOptIn, }: {
    userId: string;
    emailOptIn?: boolean;
    smsOptIn?: boolean;
    whatsappOptIn?: boolean;
    pushOptIn?: boolean;
}): Promise<NotificationPreferences>;
export declare function enqueueNotification({ userId, channel, templateKey, payloadJson, dedupeKey, }: {
    userId?: string | null;
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
    templateKey: string;
    payloadJson: Record<string, unknown>;
    dedupeKey: string;
}): Promise<void>;
export declare function enqueueNotificationBatch(notifications: Array<{
    userId?: string | null;
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
    templateKey: string;
    payloadJson: Record<string, unknown>;
    dedupeKey: string;
}>): Promise<void>;
export declare function claimOutboxRow({ id, }: {
    id: string;
}): Promise<NotificationOutboxRow>;
export declare function markOutboxSent({ id, providerMessageId, }: {
    id: string;
    providerMessageId?: string | null;
}): Promise<void>;
export declare function markOutboxFailed({ id }: {
    id: string;
}): Promise<void>;
export declare function getPendingOutboxRows({ limit, }?: {
    limit?: number;
}): Promise<NotificationOutboxRow[]>;
export declare function retryFailedOutboxRows({ maxAttempts, limit, }?: {
    maxAttempts?: number;
    limit?: number;
}): Promise<number>;
export declare function createInboxMessage({ userId, type, title, body, ctaLabel, ctaUrl, metadataJson, }: {
    userId: string;
    type: string;
    title: string;
    body: string;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    metadataJson?: Record<string, unknown> | null;
}): Promise<InboxMessage>;
export declare function getInboxForUser({ userId, page, limit, unreadOnly, }: {
    userId: string;
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
}): Promise<{
    messages: InboxMessage[];
    unreadCount: number;
    page: number;
    limit: number;
    total: number;
}>;
export declare function markInboxMessageRead({ id, userId, }: {
    id: string;
    userId: string;
}): Promise<void>;
export declare function markAllInboxRead({ userId, }: {
    userId: string;
}): Promise<void>;
export declare function subscribeBIS({ userId, variantId, channelsJson, }: {
    userId?: string | null;
    variantId: string;
    channelsJson?: string[] | null;
}): Promise<void>;
export declare function unsubscribeBIS({ userId, variantId, }: {
    userId: string;
    variantId: string;
}): Promise<void>;
export declare function getActiveBISSubscribers({ variantId, }: {
    variantId: string;
}): Promise<BackInStockSubscription[]>;
export declare function stampBISNotified({ id }: {
    id: string;
}): Promise<void>;
export declare function subscribePriceDrop({ userId, variantId, targetPrice, channelsJson, }: {
    userId: string;
    variantId: string;
    targetPrice?: string | null;
    channelsJson?: string[] | null;
}): Promise<void>;
export declare function unsubscribePriceDrop({ userId, variantId, }: {
    userId: string;
    variantId: string;
}): Promise<void>;
export declare function getPriceDropSubscribers({ variantId, newPrice, currency, }: {
    variantId: string;
    newPrice: string;
    currency: string;
}): Promise<PriceDropSubscription[]>;
export declare function recordNotifyMeEvent({ variantId, userId, sessionId, }: {
    variantId: string;
    userId?: string | null;
    sessionId: string;
}): Promise<void>;
export interface NotifyMeDemandRow {
    variantId: string;
    clickCount: number;
    registeredUserCount: number;
    lastClickAt: Date;
}
export declare function getNotifyMeDemand({ limit, }?: {
    limit?: number;
}): Promise<NotifyMeDemandRow[]>;
export declare function createCampaign({ name, contentJson, channelsJson, audienceFilterJson, adminId, }: {
    name: string;
    contentJson: Record<string, unknown>;
    channelsJson?: string[] | null;
    audienceFilterJson?: Record<string, unknown> | null;
    adminId?: string | null;
}): Promise<Campaign>;
export declare function getCampaignById({ id, }: {
    id: string;
}): Promise<Campaign | null>;
export declare function getCampaignCount({ status, }?: {
    status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED';
}): Promise<number>;
export declare function listCampaigns({ page, limit, status, }: {
    page?: number;
    limit?: number;
    status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED';
}): Promise<Campaign[]>;
export declare function updateCampaign({ id, name, contentJson, channelsJson, audienceFilterJson, }: {
    id: string;
    name?: string;
    contentJson?: Record<string, unknown>;
    channelsJson?: string[];
    audienceFilterJson?: Record<string, unknown>;
}): Promise<Campaign>;
export declare function scheduleCampaign({ id, scheduledAt, }: {
    id: string;
    scheduledAt: Date;
}): Promise<void>;
export declare function cancelCampaign({ id }: {
    id: string;
}): Promise<void>;
export declare function markCampaignSent({ id }: {
    id: string;
}): Promise<void>;
export declare function getScheduledCampaignsDue(): Promise<Campaign[]>;
//# sourceMappingURL=messaging.d.ts.map