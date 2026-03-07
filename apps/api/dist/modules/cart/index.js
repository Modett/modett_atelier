"use strict";
/**
 * Cart module — routes and mergeCartsOnLogin for IAM to call after login.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeCartsOnLogin = exports.cartRoutes = void 0;
var cart_routes_1 = require("./cart.routes");
Object.defineProperty(exports, "cartRoutes", { enumerable: true, get: function () { return cart_routes_1.cartRoutes; } });
var cart_service_1 = require("./cart.service");
Object.defineProperty(exports, "mergeCartsOnLogin", { enumerable: true, get: function () { return cart_service_1.mergeCartsOnLogin; } });
//# sourceMappingURL=index.js.map