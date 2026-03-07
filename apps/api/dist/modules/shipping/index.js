"use strict";
/**
 * Shipping module — public API for Checkout and route mount.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveShippingCost = exports.getMethodForOrder = exports.getMethodsForCheckout = exports.shippingRoutes = void 0;
var shipping_routes_1 = require("./shipping.routes");
Object.defineProperty(exports, "shippingRoutes", { enumerable: true, get: function () { return shipping_routes_1.shippingRoutes; } });
var shipping_service_1 = require("./shipping.service");
Object.defineProperty(exports, "getMethodsForCheckout", { enumerable: true, get: function () { return shipping_service_1.getMethodsForCheckout; } });
Object.defineProperty(exports, "getMethodForOrder", { enumerable: true, get: function () { return shipping_service_1.getMethodForOrder; } });
Object.defineProperty(exports, "resolveShippingCost", { enumerable: true, get: function () { return shipping_service_1.resolveShippingCost; } });
//# sourceMappingURL=index.js.map