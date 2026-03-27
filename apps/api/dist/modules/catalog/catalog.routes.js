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
exports.catalogRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const multer_config_1 = require("../../infrastructure/upload/multer.config");
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
router.get('/catalog/categories', async (_req, res) => {
    const categories = await catalogService.getCategories();
    res.status(200).json({ data: { categories } });
});
const productListSortSchema = zod_1.z.enum(['newest', 'price-asc', 'price-desc']);
const productsQuerySchema = zod_1.z.object({
    category: zod_1.z.string().optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(24),
    currency: currencySchema.optional(),
    q: zod_1.z.string().optional(),
    sort: productListSortSchema.optional(),
});
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
            sort: query.sort,
        });
        return res.status(200).json({ data: result });
    }
    const result = await catalogService.getProductListing({
        categorySlug: query.category ?? null,
        page: query.page,
        limit: query.limit,
        currency,
        sort: query.sort,
    });
    res.status(200).json({ data: result });
});
router.get('/catalog/products/:slug', async (req, res) => {
    const slug = req.params.slug;
    const currency = getCurrency(req);
    const product = await catalogService.getProductDetail({ slug, currency });
    res.status(200).json({ data: { product } });
});
router.get('/catalog/homepage', async (req, res) => {
    const currency = getCurrency(req);
    const result = await catalogService.getHomepage({ currency });
    res.status(200).json({ data: result });
});
const adminProductsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    includeInactive: zod_1.z
        .string()
        .optional()
        .transform((v) => v === 'true' || v === '1'),
});
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
router.post('/admin/catalog/products', auth_1.requireAdmin, (0, validate_1.validate)(createProductSchema), async (req, res) => {
    const body = req.body;
    const product = await catalogService.adminCreateProduct({
        ...body,
        categoryId: body.categoryId ?? undefined,
    });
    res.status(201).json({ data: { product } });
});
const updateProductSchema = createProductSchema.partial();
router.patch('/admin/catalog/products/:id', auth_1.requireAdmin, (0, validate_1.validate)(updateProductSchema), async (req, res) => {
    const body = req.body;
    const product = await catalogService.adminUpdateProduct({
        id: req.params.id,
        data: body,
    });
    res.status(200).json({ data: { product } });
});
router.delete('/admin/catalog/products/:id', auth_1.requireAdmin, async (req, res) => {
    await catalogService.adminDeleteProduct({ id: req.params.id });
    res.status(200).json({ data: { ok: true } });
});
router.post('/admin/catalog/products/:id/images', auth_1.requireAdmin, (req, res, next) => {
    const multerHandler = multer_config_1.imageUpload.array('images', 6);
    multerHandler(req, res, (err) => {
        if (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            return res.status(400).json({
                error: { code: 'UPLOAD_ERROR', message },
            });
        }
        next();
    });
}, async (req, res) => {
    const files = req.files;
    if (!files?.length) {
        return res.status(400).json({
            error: { code: 'NO_FILES', message: 'At least one image is required' },
        });
    }
    const images = await catalogService.adminUploadProductImagesFromFiles({
        productId: req.params.id,
        files: files.map((f) => ({
            buffer: f.buffer,
            originalname: f.originalname,
            mimetype: f.mimetype,
        })),
    });
    res.status(201).json({ data: { images } });
});
router.delete('/admin/catalog/products/:id/images/:imageId', auth_1.requireAdmin, async (req, res) => {
    await catalogService.adminDeleteProductImage({
        productId: req.params.id,
        imageId: req.params.imageId,
    });
    res.status(204).send();
});
const setKeyImageSchema = zod_1.z.object({
    imageId: zod_1.z.string().uuid(),
});
router.post('/admin/catalog/products/:id/images/key', auth_1.requireAdmin, (0, validate_1.validate)(setKeyImageSchema), async (req, res) => {
    const body = req.body;
    await catalogService.adminSetKeyImage({
        productId: req.params.id,
        imageId: body.imageId,
    });
    res.status(200).json({ data: { ok: true } });
});
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
router.post('/admin/catalog/products/:id/variants', auth_1.requireAdmin, (0, validate_1.validate)(createVariantSchema), async (req, res) => {
    const body = req.body;
    const variant = await catalogService.adminCreateVariant({
        productId: req.params.id,
        ...body,
    });
    res.status(201).json({ data: { variant } });
});
router.delete('/admin/catalog/products/:productId/variants/:variantId', auth_1.requireAdmin, async (req, res) => {
    await catalogService.adminDeleteVariant({
        productId: req.params.productId,
        variantId: req.params.variantId,
    });
    res.status(200).json({ data: { ok: true } });
});
const presignedUploadUrlSchema = zod_1.z.object({
    contentType: zod_1.z.string().min(1),
    fileName: zod_1.z.string().min(1),
});
router.post('/admin/catalog/products/:id/styling-guides/upload-url', auth_1.requireAdmin, (0, validate_1.validate)(presignedUploadUrlSchema), async (req, res) => {
    const body = req.body;
    const result = await catalogService.adminGetPresignedStylingGuideUploadUrl({
        productId: req.params.id,
        contentType: body.contentType,
        fileName: body.fileName,
    });
    res.status(200).json({ data: result });
});
const confirmStylingGuideSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    type: zod_1.z.literal('VIDEO'),
    linkUrl: zod_1.z.string().url().optional().nullable(),
});
router.post('/admin/catalog/products/:id/styling-guides', auth_1.requireAdmin, (0, validate_1.validate)(confirmStylingGuideSchema), async (req, res) => {
    const body = req.body;
    const stylingGuide = await catalogService.adminConfirmStylingGuideVideo({
        productId: req.params.id,
        key: body.key,
        linkUrl: body.linkUrl ?? undefined,
    });
    res.status(200).json({ data: { stylingGuide } });
});
const stylingGuideSchema = zod_1.z.object({
    type: zod_1.z.enum(['VIDEO', 'GALLERY', 'TEXT']),
    linkUrl: zod_1.z.string().url().optional().nullable(),
    contentJson: zod_1.z.record(zod_1.z.unknown()).optional().nullable(),
    active: zod_1.z.boolean().default(true),
});
router.put('/admin/catalog/products/:id/styling-guide', auth_1.requireAdmin, (0, validate_1.validate)(stylingGuideSchema), async (req, res) => {
    const body = req.body;
    const stylingGuide = await catalogService.adminUpsertStylingGuide({
        productId: req.params.id,
        ...body,
    });
    res.status(200).json({ data: { stylingGuide } });
});
router.get('/admin/catalog/bestsellers', auth_1.requireAdmin, async (_req, res) => {
    const bestsellers = await catalogService.adminGetBestsellerList();
    res.status(200).json({ data: { bestsellers } });
});
const addBestsellerSchema = zod_1.z.object({
    productId: zod_1.z.string().uuid(),
    sortOrder: zod_1.z.number().int().min(0).optional().default(0),
});
router.post('/admin/catalog/bestsellers', auth_1.requireAdmin, (0, validate_1.validate)(addBestsellerSchema), async (req, res) => {
    const body = req.body;
    const entry = await catalogService.adminAddToBestsellerList({
        productId: body.productId,
        sortOrder: body.sortOrder,
        adminId: adminReq(req).admin.id,
    });
    res.status(201).json({ data: { entry } });
});
router.delete('/admin/catalog/bestsellers/:productId', auth_1.requireAdmin, async (req, res) => {
    await catalogService.adminRemoveFromBestsellerList({
        productId: req.params.productId,
    });
    res.status(200).json({ data: { ok: true } });
});
const reorderBestsellersSchema = zod_1.z.object({
    orderedProductIds: zod_1.z.array(zod_1.z.string().uuid()),
});
router.patch('/admin/catalog/bestsellers/reorder', auth_1.requireAdmin, (0, validate_1.validate)(reorderBestsellersSchema), async (req, res) => {
    const body = req
        .body;
    await catalogService.adminReorderBestsellerList({
        orderedProductIds: body.orderedProductIds,
    });
    res.status(200).json({ data: { ok: true } });
});
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
router.post('/admin/catalog/banners', auth_1.requireAdmin, (0, validate_1.validate)(createBannerSchema), async (req, res) => {
    const body = req.body;
    const banner = await catalogService.adminCreateBanner({
        ...body,
        adminId: adminReq(req).admin.id,
    });
    res.status(201).json({ data: { banner } });
});
const updateBannerSchema = createBannerSchema.partial();
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
router.post('/admin/catalog/banners/:id/enable', auth_1.requireAdmin, async (req, res) => {
    const banner = await catalogService.adminEnableBanner({
        id: req.params.id,
    });
    res.status(200).json({ data: { banner } });
});
router.post('/admin/catalog/banners/:id/disable', auth_1.requireAdmin, async (req, res) => {
    const banner = await catalogService.adminDisableBanner({
        id: req.params.id,
    });
    res.status(200).json({ data: { banner } });
});
exports.catalogRoutes = router;
