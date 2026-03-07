/**
 * Messaging module — routes and public API for other modules.
 * Other modules import: queueNotification, createNotificationPreferences,
 * notifyOrderReceipt, notifyOrderShipped, notifyOrderDelivered, notifyOrderCancelled,
 * notifyReviewRequest, notifyLoyaltyPointsEarned, notifyLoyaltyTierUpgraded,
 * notifyBackInStockSubscribers, notifyPriceDropSubscribers, TemplateKey.
 */
export { messagingRoutes } from './messaging.routes';
export { queueNotification } from './messaging.service';
export { createNotificationPreferences } from '@modett/db';
export { notifyOrderReceipt, notifyOrderShipped, notifyOrderDelivered, notifyOrderCancelled, notifyReviewRequest, notifyLoyaltyPointsEarned, notifyLoyaltyTierUpgraded, notifyBackInStockSubscribers, notifyPriceDropSubscribers, } from './messaging.service';
export { TemplateKey } from '@modett/db';
//# sourceMappingURL=index.d.ts.map