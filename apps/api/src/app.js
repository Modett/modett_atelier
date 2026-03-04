"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
var express_1 = require("express");
var cookie_parser_1 = require("cookie-parser");
var swagger_1 = require("./docs/swagger");
var iam_1 = require("./modules/iam");
var catalog_1 = require("./modules/catalog");
var inventory_1 = require("./modules/inventory");
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
exports.app.use('/api', iam_1.iamRoutes);
exports.app.use('/api', catalog_1.catalogRoutes);
exports.app.use('/api', inventory_1.inventoryRoutes);
(0, swagger_1.setupSwagger)(exports.app);
// Global error handler — catches all AppError throws from routes
exports.app.use(function (err, req, res, next) {
    if (err.code && err.statusCode) {
        return res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    }
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
});
