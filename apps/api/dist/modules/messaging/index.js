"use strict";
/**
 * Messaging module — routes and public API for other modules.
 * Other modules import: queueNotification, createNotificationPreferences,
 * notifyOrderReceipt, notifyOrderShipped, notifyOrderDelivered, notifyOrderCancelled,
 * notifyReviewRequest, notifyLoyaltyPointsEarned, notifyLoyaltyTierUpgraded,
 * notifyBackInStockSubscribers, notifyPriceDropSubscribers, TemplateKey.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateKey = exports.notifyPriceDropSubscribers = exports.notifyBackInStockSubscribers = exports.notifyLoyaltyTierUpgraded = exports.notifyLoyaltyPointsEarned = exports.notifyReviewRequest = exports.notifyOrderCancelled = exports.notifyOrderDelivered = exports.notifyOrderShipped = exports.notifyOrderReceipt = exports.createNotificationPreferences = exports.queueNotification = exports.messagingRoutes = void 0;
var messaging_routes_1 = require("./messaging.routes");
Object.defineProperty(exports, "messagingRoutes", { enumerable: true, get: function () { return messaging_routes_1.messagingRoutes; } });
var messaging_service_1 = require("./messaging.service");
Object.defineProperty(exports, "queueNotification", { enumerable: true, get: function () { return messaging_service_1.queueNotification; } });
var db_1 = require("@modett/db");
Object.defineProperty(exports, "createNotificationPreferences", { enumerable: true, get: function () { return db_1.createNotificationPreferences; } });
var messaging_service_2 = require("./messaging.service");
Object.defineProperty(exports, "notifyOrderReceipt", { enumerable: true, get: function () { return messaging_service_2.notifyOrderReceipt; } });
Object.defineProperty(exports, "notifyOrderShipped", { enumerable: true, get: function () { return messaging_service_2.notifyOrderShipped; } });
Object.defineProperty(exports, "notifyOrderDelivered", { enumerable: true, get: function () { return messaging_service_2.notifyOrderDelivered; } });
Object.defineProperty(exports, "notifyOrderCancelled", { enumerable: true, get: function () { return messaging_service_2.notifyOrderCancelled; } });
Object.defineProperty(exports, "notifyReviewRequest", { enumerable: true, get: function () { return messaging_service_2.notifyReviewRequest; } });
Object.defineProperty(exports, "notifyLoyaltyPointsEarned", { enumerable: true, get: function () { return messaging_service_2.notifyLoyaltyPointsEarned; } });
Object.defineProperty(exports, "notifyLoyaltyTierUpgraded", { enumerable: true, get: function () { return messaging_service_2.notifyLoyaltyTierUpgraded; } });
Object.defineProperty(exports, "notifyBackInStockSubscribers", { enumerable: true, get: function () { return messaging_service_2.notifyBackInStockSubscribers; } });
Object.defineProperty(exports, "notifyPriceDropSubscribers", { enumerable: true, get: function () { return messaging_service_2.notifyPriceDropSubscribers; } });
var db_2 = require("@modett/db");
Object.defineProperty(exports, "TemplateKey", { enumerable: true, get: function () { return db_2.TemplateKey; } });
//# sourceMappingURL=index.js.map