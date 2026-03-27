"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyPreferences = getMyPreferences;
exports.updateMyPreferences = updateMyPreferences;
exports.queueNotification = queueNotification;
exports.notifyOrderReceipt = notifyOrderReceipt;
exports.notifyOrderShipped = notifyOrderShipped;
exports.notifyOrderDelivered = notifyOrderDelivered;
exports.notifyOrderCancelled = notifyOrderCancelled;
exports.notifyReviewRequest = notifyReviewRequest;
exports.notifyLoyaltyPointsEarned = notifyLoyaltyPointsEarned;
exports.notifyLoyaltyTierUpgraded = notifyLoyaltyTierUpgraded;
exports.subscribeBackInStock = subscribeBackInStock;
exports.unsubscribeBackInStock = unsubscribeBackInStock;
exports.notifyBackInStockSubscribers = notifyBackInStockSubscribers;
exports.subscribePriceDrop = subscribePriceDrop;
exports.unsubscribePriceDrop = unsubscribePriceDrop;
exports.notifyPriceDropSubscribers = notifyPriceDropSubscribers;
exports.recordNotifyMe = recordNotifyMe;
exports.getNotifyMeDemand = getNotifyMeDemand;
exports.getMyInbox = getMyInbox;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
exports.adminCreateCampaign = adminCreateCampaign;
exports.adminUpdateCampaign = adminUpdateCampaign;
exports.adminScheduleCampaign = adminScheduleCampaign;
exports.adminCancelCampaign = adminCancelCampaign;
exports.adminListCampaigns = adminListCampaigns;
exports.adminGetCampaign = adminGetCampaign;
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
function isChannelAllowed({ prefs, channel, isTransactional, }) {
    if (isTransactional)
        return true;
    switch (channel) {
        case 'EMAIL':
            return prefs.email_opt_in;
        case 'SMS':
            return prefs.sms_opt_in;
        case 'WHATSAPP':
            return prefs.whatsapp_opt_in;
        case 'PUSH':
            return prefs.push_opt_in;
        default:
            return false;
    }
}
async function getMyPreferences({ userId, }) {
    const prefs = await (0, db_1.getNotificationPreferences)({ userId });
    if (!prefs)
        throw new errors_1.AppError('PREFERENCES_NOT_FOUND', 404);
    return prefs;
}
async function updateMyPreferences({ userId, emailOptIn, smsOptIn, whatsappOptIn, pushOptIn, }) {
    return (0, db_1.updateNotificationPreferences)({
        userId,
        emailOptIn,
        smsOptIn,
        whatsappOptIn,
        pushOptIn,
    });
}
async function queueNotification({ userId, channel, templateKey, payloadJson, dedupeKey, isTransactional = false, inboxMessage, }) {
    const prefs = userId != null && userId !== ''
        ? await (0, db_1.getNotificationPreferences)({ userId })
        : null;
    if (prefs &&
        !isChannelAllowed({ prefs, channel, isTransactional })) {
        return { queued: false, reason: 'OPT_OUT' };
    }
    await (0, db_1.enqueueNotification)({
        userId: userId ?? null,
        channel,
        templateKey,
        payloadJson,
        dedupeKey,
    });
    if (inboxMessage && userId != null && userId !== '') {
        await (0, db_1.createInboxMessage)({
            userId,
            type: inboxMessage.type,
            title: inboxMessage.title,
            body: inboxMessage.body,
            ctaLabel: inboxMessage.ctaLabel ?? null,
            ctaUrl: inboxMessage.ctaUrl ?? null,
            metadataJson: inboxMessage.metadataJson ?? null,
        });
    }
    return { queued: true };
}
async function notifyOrderReceipt({ userId, orderId, orderRef, totalAmount, currency, }) {
    await queueNotification({
        userId,
        channel: 'EMAIL',
        templateKey: db_1.TemplateKey.ORDER_RECEIPT,
        payloadJson: { orderId, orderRef, totalAmount, currency },
        dedupeKey: `order:${orderId}:ORDER_RECEIPT:EMAIL`,
        isTransactional: true,
        inboxMessage: {
            type: 'ORDER_UPDATE',
            title: `Order ${orderRef} confirmed`,
            body: `Your order of ${currency} ${totalAmount} has been confirmed.`,
            ctaLabel: 'View Order',
            ctaUrl: `/orders/${orderId}`,
        },
    });
}
async function notifyOrderShipped({ userId, orderId, orderRef, trackingNumber, carrier, }) {
    await queueNotification({
        userId,
        channel: 'EMAIL',
        templateKey: db_1.TemplateKey.ORDER_SHIPPED,
        payloadJson: { orderId, orderRef, trackingNumber, carrier },
        dedupeKey: `order:${orderId}:ORDER_SHIPPED:EMAIL`,
        isTransactional: true,
        inboxMessage: {
            type: 'ORDER_UPDATE',
            title: `Order ${orderRef} shipped`,
            body: `Your order is on its way.${trackingNumber != null ? ` Tracking: ${trackingNumber}` : ''}`,
            ctaLabel: 'Track Order',
            ctaUrl: `/orders/${orderId}`,
        },
    });
}
async function notifyOrderDelivered({ userId, orderId, orderRef, }) {
    await queueNotification({
        userId,
        channel: 'EMAIL',
        templateKey: db_1.TemplateKey.ORDER_DELIVERED,
        payloadJson: { orderId, orderRef },
        dedupeKey: `order:${orderId}:ORDER_DELIVERED:EMAIL`,
        isTransactional: true,
        inboxMessage: {
            type: 'ORDER_UPDATE',
            title: `Order ${orderRef} delivered`,
            body: 'Your order has been delivered. Let us know how you liked it!',
            ctaLabel: 'Leave a Review',
            ctaUrl: `/orders/${orderId}`,
        },
    });
}
async function notifyOrderCancelled({ userId, orderId, orderRef, reason, }) {
    await queueNotification({
        userId,
        channel: 'EMAIL',
        templateKey: db_1.TemplateKey.ORDER_CANCELLED,
        payloadJson: { orderId, orderRef, reason },
        dedupeKey: `order:${orderId}:ORDER_CANCELLED:EMAIL`,
        isTransactional: true,
        inboxMessage: {
            type: 'ORDER_UPDATE',
            title: `Order ${orderRef} cancelled`,
            body: reason ?? 'Your order has been cancelled.',
        },
    });
}
async function notifyReviewRequest({ userId, orderItemId, productName, plainToken, }) {
    await queueNotification({
        userId,
        channel: 'EMAIL',
        templateKey: db_1.TemplateKey.REVIEW_REQUEST,
        payloadJson: { orderItemId, productName, plainToken },
        dedupeKey: `review:${orderItemId}:REVIEW_REQUEST:EMAIL`,
        isTransactional: false,
        inboxMessage: {
            type: 'REVIEW_REQUEST',
            title: `How was your ${productName}?`,
            body: 'Share your experience to help other shoppers.',
            ctaLabel: 'Write a Review',
            ctaUrl: `/review?token=${plainToken}&orderItemId=${orderItemId}`,
        },
    });
}
async function notifyLoyaltyPointsEarned({ userId, points, newBalance, orderRef, }) {
    await queueNotification({
        userId,
        channel: 'EMAIL',
        templateKey: db_1.TemplateKey.LOYALTY_POINTS_EARNED,
        payloadJson: { points, newBalance, orderRef },
        dedupeKey: `loyalty:${userId}:${orderRef}:POINTS_EARNED:EMAIL`,
        isTransactional: false,
        inboxMessage: {
            type: 'LOYALTY',
            title: `You earned ${points} points`,
            body: `Your loyalty balance is now ${newBalance} points.`,
            ctaLabel: 'View Balance',
            ctaUrl: '/loyalty',
        },
    });
}
async function notifyLoyaltyTierUpgraded({ userId, newTier, previousTier, }) {
    await queueNotification({
        userId,
        channel: 'EMAIL',
        templateKey: db_1.TemplateKey.LOYALTY_TIER_UPGRADED,
        payloadJson: { newTier, previousTier },
        dedupeKey: `loyalty:${userId}:${newTier}:TIER_UPGRADED:EMAIL`,
        isTransactional: false,
        inboxMessage: {
            type: 'LOYALTY',
            title: `You're now ${newTier} tier!`,
            body: `Congratulations — you've been upgraded from ${previousTier} to ${newTier}.`,
        },
    });
}
async function subscribeBackInStock({ userId, variantId, channels, }) {
    await (0, db_1.subscribeBIS)({
        userId,
        variantId,
        channelsJson: channels ?? ['EMAIL'],
    });
}
async function unsubscribeBackInStock({ userId, variantId, }) {
    await (0, db_1.unsubscribeBIS)({ userId, variantId });
}
async function notifyBackInStockSubscribers({ variantId, productName, variantLabel, }) {
    const subscribers = await (0, db_1.getActiveBISSubscribers)({ variantId });
    for (const sub of subscribers) {
        const channels = sub.channels_json ?? ['EMAIL'];
        for (const ch of channels) {
            const channel = ch;
            await queueNotification({
                userId: sub.user_id ?? undefined,
                channel,
                templateKey: db_1.TemplateKey.BACK_IN_STOCK,
                payloadJson: { variantId, productName, variantLabel },
                dedupeKey: `bis:${sub.user_id ?? 'anon'}:${variantId}:BACK_IN_STOCK:${channel}`,
                isTransactional: false,
            }).catch(() => { });
            await (0, db_1.stampBISNotified)({ id: sub.id }).catch(() => { });
        }
    }
}
async function subscribePriceDrop({ userId, variantId, targetPrice, channels, }) {
    await (0, db_1.subscribePriceDrop)({
        userId,
        variantId,
        targetPrice: targetPrice != null ? String(targetPrice) : null,
        channelsJson: channels ?? ['EMAIL'],
    });
}
async function unsubscribePriceDrop({ userId, variantId, }) {
    await (0, db_1.unsubscribePriceDrop)({ userId, variantId });
}
async function notifyPriceDropSubscribers({ variantId, newPrice, currency, productName, }) {
    const subscribers = await (0, db_1.getPriceDropSubscribers)({
        variantId,
        newPrice,
        currency,
    });
    for (const sub of subscribers) {
        const channels = sub.channels_json ?? ['EMAIL'];
        for (const ch of channels) {
            const channel = ch;
            await queueNotification({
                userId: sub.user_id ?? undefined,
                channel,
                templateKey: db_1.TemplateKey.PRICE_DROP,
                payloadJson: { variantId, newPrice, currency, productName },
                dedupeKey: `pricedrop:${sub.user_id ?? 'anon'}:${variantId}:${newPrice}:${channel}`,
                isTransactional: false,
            }).catch(() => { });
        }
    }
}
async function recordNotifyMe({ variantId, userId, sessionId, }) {
    await (0, db_1.recordNotifyMeEvent)({ variantId, userId, sessionId });
}
async function getNotifyMeDemand({ limit, } = {}) {
    return (0, db_1.getNotifyMeDemand)({ limit });
}
async function getMyInbox({ userId, page, limit, unreadOnly, }) {
    return (0, db_1.getInboxForUser)({ userId, page, limit, unreadOnly });
}
async function markRead({ messageId, userId, }) {
    await (0, db_1.markInboxMessageRead)({ id: messageId, userId });
}
async function markAllRead({ userId }) {
    await (0, db_1.markAllInboxRead)({ userId });
}
async function adminCreateCampaign({ name, contentJson, channelsJson, audienceFilterJson, adminId, }) {
    return (0, db_1.createCampaign)({
        name,
        contentJson,
        channelsJson: channelsJson ?? ['EMAIL'],
        audienceFilterJson: audienceFilterJson ?? {},
        adminId,
    });
}
async function adminUpdateCampaign({ id, name, contentJson, channelsJson, audienceFilterJson, }) {
    return (0, db_1.updateCampaign)({
        id,
        name,
        contentJson,
        channelsJson,
        audienceFilterJson,
    });
}
async function adminScheduleCampaign({ id, scheduledAt, }) {
    if (new Date(scheduledAt) <= new Date()) {
        throw new errors_1.AppError('SCHEDULED_AT_MUST_BE_FUTURE', 400);
    }
    await (0, db_1.scheduleCampaign)({ id, scheduledAt });
}
async function adminCancelCampaign({ id }) {
    await (0, db_1.cancelCampaign)({ id });
}
async function adminListCampaigns({ page = 1, limit = 50, status, }) {
    const [campaignsList, total] = await Promise.all([
        (0, db_1.listCampaigns)({ page, limit, status }),
        (0, db_1.getCampaignCount)({ status }),
    ]);
    return { campaigns: campaignsList, page, limit, total };
}
async function adminGetCampaign({ id, }) {
    const campaign = await (0, db_1.getCampaignById)({ id });
    if (!campaign)
        throw new errors_1.AppError('CAMPAIGN_NOT_FOUND', 404);
    return campaign;
}
