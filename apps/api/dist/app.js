"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const swagger_1 = require("./docs/swagger");
const iam_1 = require("./modules/iam");
const catalog_1 = require("./modules/catalog");
const inventory_1 = require("./modules/inventory");
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.use('/api', iam_1.iamRoutes);
exports.app.use('/api', catalog_1.catalogRoutes);
exports.app.use('/api', inventory_1.inventoryRoutes);
(0, swagger_1.setupSwagger)(exports.app);
// Global error handler — catches all AppError throws from routes
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
//# sourceMappingURL=app.js.map