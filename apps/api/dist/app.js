"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const swagger_1 = require("./docs/swagger");
const iam_1 = require("./modules/iam");
const catalog_1 = require("./modules/catalog");
const inventory_1 = require("./modules/inventory");
const cart_1 = require("./modules/cart");
const checkout_1 = require("./modules/checkout");
const payments_1 = require("./modules/payments");
const orders_1 = require("./modules/orders");
const shipping_1 = require("./modules/shipping");
const returns_1 = require("./modules/returns");
const reviews_1 = require("./modules/reviews");
const loyalty_1 = require("./modules/loyalty");
const messaging_1 = require("./modules/messaging");
exports.app = (0, express_1.default)();
exports.app.set('trust proxy', 1);
const ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
    process.env.FRONTEND_URL_WWW,
].filter(Boolean);
exports.app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'ok',
        version: process.env.npm_package_version ?? '1.0.0',
        env: process.env.NODE_ENV ?? 'development',
        time: new Date().toISOString(),
    });
});
exports.app.use('/api', iam_1.iamRoutes);
exports.app.use('/api', catalog_1.catalogRoutes);
exports.app.use('/api', inventory_1.inventoryRoutes);
exports.app.use('/api', cart_1.cartRoutes);
exports.app.use('/api', checkout_1.checkoutRoutes);
exports.app.use('/api', payments_1.paymentsRoutes);
exports.app.use('/api', orders_1.ordersRoutes);
exports.app.use('/api', shipping_1.shippingRoutes);
exports.app.use('/api', returns_1.returnsRoutes);
exports.app.use('/api', reviews_1.reviewsRoutes);
exports.app.use('/api', loyalty_1.loyaltyRoutes);
exports.app.use('/api', messaging_1.messagingRoutes);
(0, swagger_1.setupSwagger)(exports.app);
exports.app.use((err, req, res, _next) => {
    if (err &&
        typeof err === 'object' &&
        'code' in err &&
        'statusCode' in err &&
        typeof err.statusCode === 'number') {
        const e = err;
        return res.status(e.statusCode).json({ error: { code: e.code, message: e.message ?? e.code } });
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
});
