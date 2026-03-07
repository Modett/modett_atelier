"use strict";
/**
 * Reviews module — token-gated verified reviews, moderation, aggregates.
 * Export routes and generateTokensAfterDelivery for Orders module (post-delivery hook).
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokensAfterDelivery = exports.reviewsRoutes = void 0;
var reviews_routes_1 = require("./reviews.routes");
Object.defineProperty(exports, "reviewsRoutes", { enumerable: true, get: function () { return __importDefault(reviews_routes_1).default; } });
var reviews_service_1 = require("./reviews.service");
Object.defineProperty(exports, "generateTokensAfterDelivery", { enumerable: true, get: function () { return reviews_service_1.generateTokensAfterDelivery; } });
//# sourceMappingURL=index.js.map