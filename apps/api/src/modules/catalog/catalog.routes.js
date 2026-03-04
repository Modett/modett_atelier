"use strict";
/**
 * Catalog route handlers — storefront (no auth) and admin (requireAdmin).
 * Zod for body and query. Success: { data: T }.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogRoutes = void 0;
var express_1 = require("express");
var zod_1 = require("zod");
var validate_1 = require("../../middleware/validate");
var auth_1 = require("../../middleware/auth");
var catalogService = require("./catalog.service");
var router = (0, express_1.Router)();
var currencySchema = zod_1.z.enum(['LKR', 'SGD', 'USD']);
function getCurrency(req) {
    var _a, _b, _c;
    var fromQuery = req.query.currency;
    var fromCookie = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.currency;
    var value = (_c = (_b = fromQuery) !== null && _b !== void 0 ? _b : fromCookie) !== null && _c !== void 0 ? _c : 'LKR';
    var parsed = currencySchema.safeParse(value);
    return parsed.success ? parsed.data : 'LKR';
}
// —— Storefront (no auth) ——
/**
 * @swagger
 * /catalog/categories:
 *   get:
 *     tags: [Catalog]
 *     summary: List all active categories
 *     security: []
 *     responses:
 *       200:
 *         description: Active categories ordered by sort_order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Category' }
 */
router.get('/catalog/categories', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var categories;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.getCategories()];
            case 1:
                categories = _a.sent();
                res.status(200).json({ data: { categories: categories } });
                return [2 /*return*/];
        }
    });
}); });
var productsQuerySchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(24),
    currency: currencySchema.optional(),
    q: zod_1.z.string().optional(),
});
/**
 * @swagger
 * /catalog/products:
 *   get:
 *     tags: [Catalog]
 *     summary: List products or search (pass ?q= to search)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Category slug filter
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query (min 2 chars). If present, runs search instead of listing.
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 24, maximum: 100 }
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [LKR, SGD, USD], default: LKR }
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:   { type: array, items: { $ref: '#/components/schemas/ProductListItem' } }
 *                     total:      { type: integer }
 *                     page:       { type: integer }
 *                     limit:      { type: integer }
 *                     totalPages: { type: integer }
 */
router.get('/catalog/products', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, query, currency, result_1, result;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                parsed = productsQuerySchema.safeParse(req.query);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid query parameters',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                query = parsed.data;
                currency = getCurrency(req);
                if (!(query.q != null && String(query.q).trim().length >= 2)) return [3 /*break*/, 2];
                return [4 /*yield*/, catalogService.searchProducts({
                        query: String(query.q).trim(),
                        page: query.page,
                        limit: query.limit,
                        currency: currency,
                    })];
            case 1:
                result_1 = _b.sent();
                return [2 /*return*/, res.status(200).json({ data: result_1 })];
            case 2: return [4 /*yield*/, catalogService.getProductListing({
                    categorySlug: (_a = query.category) !== null && _a !== void 0 ? _a : null,
                    page: query.page,
                    limit: query.limit,
                    currency: currency,
                })];
            case 3:
                result = _b.sent();
                res.status(200).json({ data: result });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /catalog/products/{slug}:
 *   get:
 *     tags: [Catalog]
 *     summary: Get full product detail by slug
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string, example: sofia-dress }
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [LKR, SGD, USD], default: LKR }
 *     responses:
 *       200:
 *         description: Full product detail with variants and stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     product: { $ref: '#/components/schemas/ProductDetail' }
 *       404: { description: Product not found }
 */
router.get('/catalog/products/:slug', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var slug, currency, product;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                slug = req.params.slug;
                currency = getCurrency(req);
                return [4 /*yield*/, catalogService.getProductDetail({ slug: slug, currency: currency })];
            case 1:
                product = _a.sent();
                res.status(200).json({ data: { product: product } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /catalog/homepage:
 *   get:
 *     tags: [Catalog]
 *     summary: Get homepage data (featured products + active banner)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [LKR, SGD, USD], default: LKR }
 *     responses:
 *       200:
 *         description: Homepage content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     featuredProducts:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/ProductListItem' }
 *                     banner:
 *                       nullable: true
 *                       $ref: '#/components/schemas/Banner'
 */
router.get('/catalog/homepage', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var currency, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                currency = getCurrency(req);
                return [4 /*yield*/, catalogService.getHomepage({ currency: currency })];
            case 1:
                result = _a.sent();
                res.status(200).json({ data: result });
                return [2 /*return*/];
        }
    });
}); });
// —— Admin catalog (requireAdmin) ——
var adminProductsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    includeInactive: zod_1.z
        .string()
        .optional()
        .transform(function (v) { return v === 'true' || v === '1'; }),
});
/**
 * @swagger
 * /admin/catalog/products:
 *   get:
 *     tags: [Admin Catalog]
 *     summary: List all products (admin)
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200: { description: Paginated product list including inactive }
 */
router.get('/admin/catalog/products', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, query, result;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                parsed = adminProductsQuerySchema.safeParse(req.query);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid query parameters',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                query = parsed.data;
                return [4 /*yield*/, catalogService.adminGetAllProducts({
                        page: query.page,
                        limit: query.limit,
                        includeInactive: (_a = query.includeInactive) !== null && _a !== void 0 ? _a : false,
                    })];
            case 1:
                result = _b.sent();
                res.status(200).json({ data: result });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/products/{id}:
 *   get:
 *     tags: [Admin Catalog]
 *     summary: Get a single product by ID (admin)
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Product detail }
 *       404: { description: Product not found }
 */
router.get('/admin/catalog/products/:id', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var product;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminGetProduct({
                    id: req.params.id,
                })];
            case 1:
                product = _a.sent();
                res.status(200).json({ data: { product: product } });
                return [2 /*return*/];
        }
    });
}); });
var createProductSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid().optional().nullable(),
    slug: zod_1.z.string().min(1).max(200),
    displayName: zod_1.z.string().min(1).max(500),
    shortName: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional().nullable(),
    fabricInfo: zod_1.z.string().optional().nullable(),
    productCode: zod_1.z.string().min(1).max(100),
    active: zod_1.z.boolean().default(true),
    isSale: zod_1.z.boolean().default(false),
    prices: zod_1.z.object({
        lkrAmount: zod_1.z.number().min(0),
        sgdAmount: zod_1.z.number().min(0),
        usdAmount: zod_1.z.number().min(0),
    }),
});
/**
 * @swagger
 * /admin/catalog/products:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Create a new product
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, displayName, shortName, productCode, prices]
 *             properties:
 *               categoryId:  { type: string, format: uuid }
 *               slug:        { type: string, example: sofia-dress }
 *               displayName: { type: string, example: Sofia Dress }
 *               shortName:   { type: string, example: Sofia }
 *               description: { type: string }
 *               fabricInfo:  { type: string }
 *               productCode: { type: string, example: MOD-001 }
 *               active:      { type: boolean, default: true }
 *               isSale:      { type: boolean, default: false }
 *               prices:
 *                 type: object
 *                 required: [lkrAmount, sgdAmount, usdAmount]
 *                 properties:
 *                   lkrAmount: { type: number, minimum: 0, example: 12500 }
 *                   sgdAmount: { type: number, minimum: 0, example: 65.00 }
 *                   usdAmount: { type: number, minimum: 0, example: 48.00 }
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     product: { $ref: '#/components/schemas/ProductDetail' }
 */
router.post('/admin/catalog/products', auth_1.requireAdmin, (0, validate_1.validate)(createProductSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, product;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminCreateProduct(__assign(__assign({}, body), { categoryId: (_a = body.categoryId) !== null && _a !== void 0 ? _a : undefined }))];
            case 1:
                product = _b.sent();
                res.status(201).json({ data: { product: product } });
                return [2 /*return*/];
        }
    });
}); });
var updateProductSchema = createProductSchema.partial();
/**
 * @swagger
 * /admin/catalog/products/{id}:
 *   patch:
 *     tags: [Admin Catalog]
 *     summary: Update a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: All fields optional — only send what you want to change
 *     responses:
 *       200: { description: Product updated }
 *       404: { description: Product not found }
 */
router.patch('/admin/catalog/products/:id', auth_1.requireAdmin, (0, validate_1.validate)(updateProductSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, product;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminUpdateProduct({
                        id: req.params.id,
                        data: body,
                    })];
            case 1:
                product = _a.sent();
                res.status(200).json({ data: { product: product } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/products/{id}:
 *   delete:
 *     tags: [Admin Catalog]
 *     summary: Soft-delete a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Product soft-deleted (sets deleted_at and active=false) }
 *       404: { description: Product not found }
 */
router.delete('/admin/catalog/products/:id', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminDeleteProduct({ id: req.params.id })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
var addImageSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    altText: zod_1.z.string().optional().nullable(),
    sortOrder: zod_1.z.number().int().min(0).optional().default(0),
    setAsKey: zod_1.z.boolean().optional().default(false),
});
/**
 * @swagger
 * /admin/catalog/products/{id}/images:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Register a product image URL (upload to R2 first, then call this)
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [url]
 *             properties:
 *               url:       { type: string, format: uri }
 *               altText:   { type: string }
 *               sortOrder: { type: integer, default: 0 }
 *               setAsKey:  { type: boolean, default: false }
 *     responses:
 *       201: { description: Image registered }
 */
router.post('/admin/catalog/products/:id/images', auth_1.requireAdmin, (0, validate_1.validate)(addImageSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, image;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminUploadProductImage(__assign({ productId: req.params.id }, body))];
            case 1:
                image = _a.sent();
                res.status(201).json({ data: { image: image } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/products/{id}/images/{imageId}:
 *   delete:
 *     tags: [Admin Catalog]
 *     summary: Remove a product image
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Image removed }
 */
router.delete('/admin/catalog/products/:id/images/:imageId', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminDeleteProductImage({
                    productId: req.params.id,
                    imageId: req.params.imageId,
                })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
var setKeyImageSchema = zod_1.z.object({
    imageId: zod_1.z.string().uuid(),
});
/**
 * @swagger
 * /admin/catalog/products/{id}/images/key:
 *   patch:
 *     tags: [Admin Catalog]
 *     summary: Set the key image for a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageId]
 *             properties:
 *               imageId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Key image updated }
 */
router.patch('/admin/catalog/products/:id/images/key', auth_1.requireAdmin, (0, validate_1.validate)(setKeyImageSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminSetKeyImage({
                        productId: req.params.id,
                        imageId: body.imageId,
                    })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
var reorderImagesSchema = zod_1.z.object({
    imageIds: zod_1.z.array(zod_1.z.string().uuid()),
});
/**
 * @swagger
 * /admin/catalog/products/{id}/images/reorder:
 *   patch:
 *     tags: [Admin Catalog]
 *     summary: Reorder product images
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageIds]
 *             properties:
 *               imageIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Images reordered }
 */
router.patch('/admin/catalog/products/:id/images/reorder', auth_1.requireAdmin, (0, validate_1.validate)(reorderImagesSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminReorderImages({
                        productId: req.params.id,
                        imageIds: body.imageIds,
                    })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
var createVariantSchema = zod_1.z.object({
    color: zod_1.z.string().min(1),
    size: zod_1.z.string().min(1),
    skuGroup: zod_1.z.string().min(1),
});
/**
 * @swagger
 * /admin/catalog/products/{id}/variants:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Add a variant to a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [color, size, skuGroup]
 *             properties:
 *               color:    { type: string, example: Ivory }
 *               size:     { type: string, example: S }
 *               skuGroup: { type: string, example: MOD-001-IVORY }
 *     responses:
 *       201:
 *         description: Variant created with stock row initialised at 0
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     variant: { $ref: '#/components/schemas/VariantWithStock' }
 */
router.post('/admin/catalog/products/:id/variants', auth_1.requireAdmin, (0, validate_1.validate)(createVariantSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, variant;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminCreateVariant(__assign({ productId: req.params.id }, body))];
            case 1:
                variant = _a.sent();
                res.status(201).json({ data: { variant: variant } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/products/{productId}/variants/{variantId}:
 *   delete:
 *     tags: [Admin Catalog]
 *     summary: Remove a variant from a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Variant removed }
 */
router.delete('/admin/catalog/products/:productId/variants/:variantId', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminDeleteVariant({
                    productId: req.params.productId,
                    variantId: req.params.variantId,
                })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
var stylingGuideSchema = zod_1.z.object({
    type: zod_1.z.enum(['VIDEO', 'GALLERY', 'TEXT']),
    linkUrl: zod_1.z.string().url().optional().nullable(),
    contentJson: zod_1.z.record(zod_1.z.unknown()).optional().nullable(),
    active: zod_1.z.boolean().default(true),
});
/**
 * @swagger
 * /admin/catalog/products/{id}/styling-guide:
 *   put:
 *     tags: [Admin Catalog]
 *     summary: Create or update product styling guide
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [VIDEO, GALLERY, TEXT] }
 *               linkUrl: { type: string, format: uri }
 *               contentJson: { type: object }
 *               active: { type: boolean }
 *     responses:
 *       200: { description: Styling guide saved }
 */
router.put('/admin/catalog/products/:id/styling-guide', auth_1.requireAdmin, (0, validate_1.validate)(stylingGuideSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, stylingGuide;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminUpsertStylingGuide(__assign({ productId: req.params.id }, body))];
            case 1:
                stylingGuide = _a.sent();
                res.status(200).json({ data: { stylingGuide: stylingGuide } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/bestsellers:
 *   get:
 *     tags: [Admin Bestsellers]
 *     summary: Get the curated bestseller list
 *     security: [{ adminCookieAuth: [] }]
 *     responses:
 *       200: { description: Bestseller list ordered by sort_order }
 */
router.get('/admin/catalog/bestsellers', auth_1.requireAdmin, function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var bestsellers;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminGetBestsellerList()];
            case 1:
                bestsellers = _a.sent();
                res.status(200).json({ data: { bestsellers: bestsellers } });
                return [2 /*return*/];
        }
    });
}); });
var addBestsellerSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    sortOrder: zod_1.z.number().int().min(0).optional().default(0),
});
/**
 * @swagger
 * /admin/catalog/bestsellers:
 *   post:
 *     tags: [Admin Bestsellers]
 *     summary: Add a product to the bestseller list
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               sortOrder: { type: integer, default: 0 }
 *     responses:
 *       201: { description: Added to bestseller list }
 */
router.post('/admin/catalog/bestsellers', auth_1.requireAdmin, (0, validate_1.validate)(addBestsellerSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, entry;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminAddToBestsellerList({
                        productId: body.productId,
                        sortOrder: body.sortOrder,
                        adminId: req.admin.id,
                    })];
            case 1:
                entry = _a.sent();
                res.status(201).json({ data: { entry: entry } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/bestsellers/{productId}:
 *   delete:
 *     tags: [Admin Bestsellers]
 *     summary: Remove a product from the bestseller list
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Removed from bestseller list }
 */
router.delete('/admin/catalog/bestsellers/:productId', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminRemoveFromBestsellerList({
                    productId: req.params.productId,
                })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
var reorderBestsellersSchema = zod_1.z.object({
    orderedProductIds: zod_1.z.array(zod_1.z.string().uuid()),
});
/**
 * @swagger
 * /admin/catalog/bestsellers/reorder:
 *   patch:
 *     tags: [Admin Bestsellers]
 *     summary: Reorder the bestseller list
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderedProductIds]
 *             properties:
 *               orderedProductIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Bestsellers reordered }
 */
router.patch('/admin/catalog/bestsellers/reorder', auth_1.requireAdmin, (0, validate_1.validate)(reorderBestsellersSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req
                    .body;
                return [4 /*yield*/, catalogService.adminReorderBestsellerList({
                        orderedProductIds: body.orderedProductIds,
                    })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/banners:
 *   get:
 *     tags: [Admin Banners]
 *     summary: List all banners
 *     security: [{ adminCookieAuth: [] }]
 *     responses:
 *       200: { description: All banners ordered by created_at desc }
 */
router.get('/admin/catalog/banners', auth_1.requireAdmin, function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var banners;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminListBanners()];
            case 1:
                banners = _a.sent();
                res.status(200).json({ data: { banners: banners } });
                return [2 /*return*/];
        }
    });
}); });
var createBannerSchema = zod_1.z.object({
    message: zod_1.z.string().min(1),
    linkUrl: zod_1.z.string().url().optional().nullable(),
    startAt: zod_1.z.string().datetime().optional().nullable(),
    endAt: zod_1.z.string().datetime().optional().nullable(),
});
/**
 * @swagger
 * /admin/catalog/banners:
 *   post:
 *     tags: [Admin Banners]
 *     summary: Create a new banner (disabled by default)
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, example: 'Free shipping this weekend!' }
 *               linkUrl: { type: string, format: uri }
 *               startAt: { type: string, format: date-time }
 *               endAt:   { type: string, format: date-time }
 *     responses:
 *       201: { description: Banner created (enabled=false) }
 */
router.post('/admin/catalog/banners', auth_1.requireAdmin, (0, validate_1.validate)(createBannerSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, banner;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, catalogService.adminCreateBanner(__assign(__assign({}, body), { adminId: req.admin.id }))];
            case 1:
                banner = _a.sent();
                res.status(201).json({ data: { banner: banner } });
                return [2 /*return*/];
        }
    });
}); });
var updateBannerSchema = createBannerSchema.partial();
/**
 * @swagger
 * /admin/catalog/banners/{id}:
 *   patch:
 *     tags: [Admin Banners]
 *     summary: Update a banner
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string }
 *               linkUrl: { type: string, format: uri }
 *               startAt: { type: string, format: date-time }
 *               endAt:   { type: string, format: date-time }
 *     responses:
 *       200: { description: Banner updated }
 */
router.patch('/admin/catalog/banners/:id', auth_1.requireAdmin, (0, validate_1.validate)(updateBannerSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, data, banner;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                data = __assign({}, body);
                if (body.startAt != null)
                    data.startAt = new Date(body.startAt);
                if (body.endAt != null)
                    data.endAt = new Date(body.endAt);
                return [4 /*yield*/, catalogService.adminUpdateBanner({
                        id: req.params.id,
                        data: data,
                    })];
            case 1:
                banner = _a.sent();
                res.status(200).json({ data: { banner: banner } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/banners/{id}/enable:
 *   post:
 *     tags: [Admin Banners]
 *     summary: Enable a banner
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Banner enabled }
 */
router.post('/admin/catalog/banners/:id/enable', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var banner;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminEnableBanner({
                    id: req.params.id,
                })];
            case 1:
                banner = _a.sent();
                res.status(200).json({ data: { banner: banner } });
                return [2 /*return*/];
        }
    });
}); });
/**
 * @swagger
 * /admin/catalog/banners/{id}/disable:
 *   post:
 *     tags: [Admin Banners]
 *     summary: Disable a banner
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Banner disabled }
 */
router.post('/admin/catalog/banners/:id/disable', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var banner;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, catalogService.adminDisableBanner({
                    id: req.params.id,
                })];
            case 1:
                banner = _a.sent();
                res.status(200).json({ data: { banner: banner } });
                return [2 /*return*/];
        }
    });
}); });
exports.catalogRoutes = router;
