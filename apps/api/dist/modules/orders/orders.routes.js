"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const auth_2 = require("../../middleware/auth");
const ordersService = __importStar(require("./orders.service"));
const router = (0, express_1.Router)();
const myOrdersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
});
router.get('/orders', auth_1.requireAuth, (0, validate_1.validateQuery)(myOrdersQuerySchema), async (req, res) => {
    const authReq = req;
    const query = req
        .validatedQuery;
    const result = await ordersService.getMyOrders({
        userId: authReq.user.id,
        page: query.page,
        limit: query.limit,
    });
    res.status(200).json({ data: result });
});
router.get('/orders/:orderId', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    const orderId = req.params.orderId;
    const result = await ordersService.getMyOrderDetail({
        orderId,
        userId: authReq.user.id,
    });
    res.status(200).json({ data: result });
});
const adminOrdersQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    orderState: zod_1.z
        .enum(['DRAFT', 'PLACED', 'CANCELLED'])
        .optional(),
    paymentState: zod_1.z
        .enum(['UNPAID', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'])
        .optional(),
    fulfillmentState: zod_1.z
        .enum(['NOT_STARTED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'])
        .optional(),
    search: zod_1.z.string().optional(),
});
router.get('/admin/orders', auth_1.requireAdmin, (0, validate_1.validateQuery)(adminOrdersQuerySchema), async (req, res) => {
    const query = req
        .validatedQuery;
    const result = await ordersService.adminListOrders({
        page: query.page,
        limit: query.limit,
        orderState: query.orderState,
        paymentState: query.paymentState,
        fulfillmentState: query.fulfillmentState,
        search: query.search,
    });
    res.status(200).json({ data: result });
});
router.get('/admin/orders/:orderId', auth_1.requireAdmin, async (req, res) => {
    const orderId = req.params.orderId;
    const result = await ordersService.adminGetOrderDetail({ orderId });
    res.status(200).json({ data: result });
});
const packBodySchema = zod_1.z.object({
    note: zod_1.z.string().optional(),
});
router.post('/admin/orders/:orderId/pack', auth_1.requireAdmin, (0, validate_1.validate)(packBodySchema), (0, auth_2.withAdmin)(async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    await ordersService.markOrderPacked({
        orderId,
        adminId: req.admin.id,
        note: body.note,
    });
    res.status(200).json({ data: { ok: true } });
}));
const shipBodySchema = zod_1.z.object({
    trackingNumber: zod_1.z.string().optional(),
    carrier: zod_1.z.string().optional(),
    note: zod_1.z.string().optional(),
});
router.post('/admin/orders/:orderId/ship', auth_1.requireAdmin, (0, validate_1.validate)(shipBodySchema), (0, auth_2.withAdmin)(async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    await ordersService.markOrderShipped({
        orderId,
        adminId: req.admin.id,
        trackingNumber: body.trackingNumber,
        carrier: body.carrier,
        note: body.note,
    });
    res.status(200).json({ data: { ok: true } });
}));
const outForDeliveryBodySchema = zod_1.z.object({
    note: zod_1.z.string().optional(),
});
router.post('/admin/orders/:orderId/out-for-delivery', auth_1.requireAdmin, (0, validate_1.validate)(outForDeliveryBodySchema), (0, auth_2.withAdmin)(async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    await ordersService.markOrderOutForDelivery({
        orderId,
        adminId: req.admin.id,
        note: body.note,
    });
    res.status(200).json({ data: { ok: true } });
}));
const deliverBodySchema = zod_1.z.object({
    note: zod_1.z.string().optional(),
});
router.post('/admin/orders/:orderId/deliver', auth_1.requireAdmin, (0, validate_1.validate)(deliverBodySchema), (0, auth_2.withAdmin)(async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    await ordersService.markOrderDelivered({
        orderId,
        adminId: req.admin.id,
        note: body.note,
    });
    res.status(200).json({ data: { ok: true } });
}));
const cancelBodySchema = zod_1.z.object({
    reason: zod_1.z.string().min(1),
});
router.post('/admin/orders/:orderId/cancel', auth_1.requireAdmin, (0, validate_1.validate)(cancelBodySchema), (0, auth_2.withAdmin)(async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    await ordersService.cancelOrder({
        orderId,
        adminId: req.admin.id,
        reason: body.reason,
    });
    res.status(200).json({ data: { ok: true } });
}));
const shippingAddressBodySchema = zod_1.z.object({
    kind: zod_1.z.enum(['SHIPPING', 'BILLING']),
    addressJson: zod_1.z.object({}).passthrough(),
    countryCode: zod_1.z.string().length(2),
});
router.patch('/admin/orders/:orderId/shipping-address', auth_1.requireAdmin, (0, validate_1.validate)(shippingAddressBodySchema), (0, auth_2.withAdmin)(async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    await ordersService.updateShippingAddress({
        orderId,
        kind: body.kind,
        addressJson: body.addressJson,
        countryCode: body.countryCode,
        adminId: req.admin.id,
    });
    res.status(200).json({ data: { ok: true } });
}));
const scanBodySchema = zod_1.z.object({
    barcodeValue: zod_1.z.string().min(1),
    orderItemId: zod_1.z.string().uuid(),
});
router.post('/admin/orders/scan', auth_1.requireAdmin, (0, validate_1.validate)(scanBodySchema), (0, auth_2.withAdmin)(async (req, res) => {
    const body = req.body;
    const adminReq = req;
    const adminFullName = `${adminReq.user.firstName} ${adminReq.user.lastName}`;
    const result = await ordersService.scanUnit({
        barcodeValue: body.barcodeValue,
        orderItemId: body.orderItemId,
        adminId: adminReq.admin.id,
        adminFullName,
    });
    res.status(200).json({ data: result });
}));
router.delete('/admin/orders/:orderId/allocations/:inventoryUnitId', auth_1.requireAdmin, (0, auth_2.withAdmin)(async (req, res) => {
    const orderId = req.params.orderId;
    const inventoryUnitId = req.params.inventoryUnitId;
    await ordersService.removeUnitAllocation({
        inventoryUnitId,
        adminId: req.admin.id,
        orderId,
    });
    res.status(200).json({ data: { ok: true } });
}));
router.get('/admin/orders/:orderId/packing-status', auth_1.requireAdmin, async (req, res) => {
    const orderId = req.params.orderId;
    const result = await ordersService.getOrderPackingStatus({ orderId });
    res.status(200).json({ data: result });
});
exports.ordersRoutes = router;
