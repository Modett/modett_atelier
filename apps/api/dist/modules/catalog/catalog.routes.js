"use strict";
/**
 * Catalog route handlers — storefront (no auth) and admin (requireAdmin).
 * Zod for body and query. Success: { data: T }.
 */
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
exports.catalogRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const catalogService = __importStar(require("./catalog.service"));
const router = (0, express_1.Router)();
function adminReq(req) {
    return req;
}
const currencySchema = zod_1.z.enum(['LKR', 'SGD', 'USD']);
function getCurrency(req) {
    const fromQuery = req.query.currency;
    const fromCookie = req.cookies?.currency;
    const value = fromQuery ?? fromCookie ?? 'LKR';
    const parsed = currencySchema.safeParse(value);
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
router.get('/catalog/categories', async (_req, res) => {
    const categories = await catalogService.getCategories();
    res.status(200).json({ data: { categories } });
});
const productsQuerySchema = zod_1.z.object({
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
router.get('/catalog/products', async (req, res) => {
    const parsed = productsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const query = parsed.data;
    const currency = getCurrency(req);
    if (query.q != null && String(query.q).trim().length >= 2) {
        const result = await catalogService.searchProducts({
            query: String(query.q).trim(),
            page: query.page,
            limit: query.limit,
            currency,
        });
        return res.status(200).json({ data: result });
    }
    const result = await catalogService.getProductListing({
        categorySlug: query.category ?? null,
        page: query.page,
        limit: query.limit,
        currency,
    });
    res.status(200).json({ data: result });
});
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
router.get('/catalog/products/:slug', async (req, res) => {
    const slug = req.params.slug;
    const currency = getCurrency(req);
    const product = await catalogService.getProductDetail({ slug, currency });
    res.status(200).json({ data: { product } });
});
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
router.get('/catalog/homepage', async (req, res) => {
    const currency = getCurrency(req);
    const result = await catalogService.getHomepage({ currency });
    res.status(200).json({ data: result });
});
// —— Admin catalog (requireAdmin) ——
const adminProductsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    includeInactive: zod_1.z
        .string()
        .optional()
        .transform((v) => v === 'true' || v === '1'),
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
router.get('/admin/catalog/products', auth_1.requireAdmin, async (req, res) => {
    const parsed = adminProductsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const query = parsed.data;
    const result = await catalogService.adminGetAllProducts({
        page: query.page,
        limit: query.limit,
        includeInactive: query.includeInactive ?? false,
    });
    res.status(200).json({ data: result });
});
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
router.get('/admin/catalog/products/:id', auth_1.requireAdmin, async (req, res) => {
    const product = await catalogService.adminGetProduct({
        id: req.params.id,
    });
    res.status(200).json({ data: { product } });
});
const createProductSchema = zod_1.z.object({
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
router.post('/admin/catalog/products', auth_1.requireAdmin, (0, validate_1.validate)(createProductSchema), async (req, res) => {
    const body = req.body;
    const product = await catalogService.adminCreateProduct({
        ...body,
        categoryId: body.categoryId ?? undefined,
    });
    res.status(201).json({ data: { product } });
});
const updateProductSchema = createProductSchema.partial();
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
router.patch('/admin/catalog/products/:id', auth_1.requireAdmin, (0, validate_1.validate)(updateProductSchema), async (req, res) => {
    const body = req.body;
    const product = await catalogService.adminUpdateProduct({
        id: req.params.id,
        data: body,
    });
    res.status(200).json({ data: { product } });
});
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
router.delete('/admin/catalog/products/:id', auth_1.requireAdmin, async (req, res) => {
    await catalogService.adminDeleteProduct({ id: req.params.id });
    res.status(200).json({ data: { ok: true } });
});
const addImageSchema = zod_1.z.object({
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
router.post('/admin/catalog/products/:id/images', auth_1.requireAdmin, (0, validate_1.validate)(addImageSchema), async (req, res) => {
    const body = req.body;
    const image = await catalogService.adminUploadProductImage({
        productId: req.params.id,
        ...body,
    });
    res.status(201).json({ data: { image } });
});
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
router.delete('/admin/catalog/products/:id/images/:imageId', auth_1.requireAdmin, async (req, res) => {
    await catalogService.adminDeleteProductImage({
        productId: req.params.id,
        imageId: req.params.imageId,
    });
    res.status(200).json({ data: { ok: true } });
});
const setKeyImageSchema = zod_1.z.object({
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
router.patch('/admin/catalog/products/:id/images/key', auth_1.requireAdmin, (0, validate_1.validate)(setKeyImageSchema), async (req, res) => {
    const body = req.body;
    await catalogService.adminSetKeyImage({
        productId: req.params.id,
        imageId: body.imageId,
    });
    res.status(200).json({ data: { ok: true } });
});
const reorderImagesSchema = zod_1.z.object({
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
router.patch('/admin/catalog/products/:id/images/reorder', auth_1.requireAdmin, (0, validate_1.validate)(reorderImagesSchema), async (req, res) => {
    const body = req.body;
    await catalogService.adminReorderImages({
        productId: req.params.id,
        imageIds: body.imageIds,
    });
    res.status(200).json({ data: { ok: true } });
});
const createVariantSchema = zod_1.z.object({
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
router.post('/admin/catalog/products/:id/variants', auth_1.requireAdmin, (0, validate_1.validate)(createVariantSchema), async (req, res) => {
    const body = req.body;
    const variant = await catalogService.adminCreateVariant({
        productId: req.params.id,
        ...body,
    });
    res.status(201).json({ data: { variant } });
});
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
router.delete('/admin/catalog/products/:productId/variants/:variantId', auth_1.requireAdmin, async (req, res) => {
    await catalogService.adminDeleteVariant({
        productId: req.params.productId,
        variantId: req.params.variantId,
    });
    res.status(200).json({ data: { ok: true } });
});
const stylingGuideSchema = zod_1.z.object({
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
router.put('/admin/catalog/products/:id/styling-guide', auth_1.requireAdmin, (0, validate_1.validate)(stylingGuideSchema), async (req, res) => {
    const body = req.body;
    const stylingGuide = await catalogService.adminUpsertStylingGuide({
        productId: req.params.id,
        ...body,
    });
    res.status(200).json({ data: { stylingGuide } });
});
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
router.get('/admin/catalog/bestsellers', auth_1.requireAdmin, async (_req, res) => {
    const bestsellers = await catalogService.adminGetBestsellerList();
    res.status(200).json({ data: { bestsellers } });
});
const addBestsellerSchema = zod_1.z.object({
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
router.post('/admin/catalog/bestsellers', auth_1.requireAdmin, (0, validate_1.validate)(addBestsellerSchema), async (req, res) => {
    const body = req.body;
    const entry = await catalogService.adminAddToBestsellerList({
        productId: body.productId,
        sortOrder: body.sortOrder,
        adminId: adminReq(req).admin.id,
    });
    res.status(201).json({ data: { entry } });
});
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
router.delete('/admin/catalog/bestsellers/:productId', auth_1.requireAdmin, async (req, res) => {
    await catalogService.adminRemoveFromBestsellerList({
        productId: req.params.productId,
    });
    res.status(200).json({ data: { ok: true } });
});
const reorderBestsellersSchema = zod_1.z.object({
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
router.patch('/admin/catalog/bestsellers/reorder', auth_1.requireAdmin, (0, validate_1.validate)(reorderBestsellersSchema), async (req, res) => {
    const body = req
        .body;
    await catalogService.adminReorderBestsellerList({
        orderedProductIds: body.orderedProductIds,
    });
    res.status(200).json({ data: { ok: true } });
});
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
router.get('/admin/catalog/banners', auth_1.requireAdmin, async (_req, res) => {
    const banners = await catalogService.adminListBanners();
    res.status(200).json({ data: { banners } });
});
const createBannerSchema = zod_1.z.object({
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
router.post('/admin/catalog/banners', auth_1.requireAdmin, (0, validate_1.validate)(createBannerSchema), async (req, res) => {
    const body = req.body;
    const banner = await catalogService.adminCreateBanner({
        ...body,
        adminId: adminReq(req).admin.id,
    });
    res.status(201).json({ data: { banner } });
});
const updateBannerSchema = createBannerSchema.partial();
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
router.patch('/admin/catalog/banners/:id', auth_1.requireAdmin, (0, validate_1.validate)(updateBannerSchema), async (req, res) => {
    const body = req.body;
    const data = {};
    if (body.message != null)
        data.message = body.message;
    if (body.linkUrl != null)
        data.linkUrl = body.linkUrl;
    if (body.startAt != null)
        data.startAt = new Date(body.startAt);
    if (body.endAt != null)
        data.endAt = new Date(body.endAt);
    const banner = await catalogService.adminUpdateBanner({
        id: req.params.id,
        data,
    });
    res.status(200).json({ data: { banner } });
});
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
router.post('/admin/catalog/banners/:id/enable', auth_1.requireAdmin, async (req, res) => {
    const banner = await catalogService.adminEnableBanner({
        id: req.params.id,
    });
    res.status(200).json({ data: { banner } });
});
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
router.post('/admin/catalog/banners/:id/disable', auth_1.requireAdmin, async (req, res) => {
    const banner = await catalogService.adminDisableBanner({
        id: req.params.id,
    });
    res.status(200).json({ data: { banner } });
});
exports.catalogRoutes = router;
//# sourceMappingURL=catalog.routes.js.map