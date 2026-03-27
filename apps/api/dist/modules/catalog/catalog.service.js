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
exports.getCategories = getCategories;
exports.getProductListing = getProductListing;
exports.searchProducts = searchProducts;
exports.getProductDetail = getProductDetail;
exports.getHomepage = getHomepage;
exports.adminGetAllProducts = adminGetAllProducts;
exports.adminGetProduct = adminGetProduct;
exports.adminCreateProduct = adminCreateProduct;
exports.adminUpdateProduct = adminUpdateProduct;
exports.adminDeleteProduct = adminDeleteProduct;
exports.adminUploadProductImage = adminUploadProductImage;
exports.adminDeleteProductImage = adminDeleteProductImage;
exports.adminUploadProductImagesFromFiles = adminUploadProductImagesFromFiles;
exports.adminGetPresignedStylingGuideUploadUrl = adminGetPresignedStylingGuideUploadUrl;
exports.adminConfirmStylingGuideVideo = adminConfirmStylingGuideVideo;
exports.adminSetKeyImage = adminSetKeyImage;
exports.adminReorderImages = adminReorderImages;
exports.adminCreateVariant = adminCreateVariant;
exports.adminDeleteVariant = adminDeleteVariant;
exports.adminUpsertStylingGuide = adminUpsertStylingGuide;
exports.adminGetBestsellerList = adminGetBestsellerList;
exports.adminAddToBestsellerList = adminAddToBestsellerList;
exports.adminRemoveFromBestsellerList = adminRemoveFromBestsellerList;
exports.adminReorderBestsellerList = adminReorderBestsellerList;
exports.adminListBanners = adminListBanners;
exports.adminCreateBanner = adminCreateBanner;
exports.adminUpdateBanner = adminUpdateBanner;
exports.adminEnableBanner = adminEnableBanner;
exports.adminDisableBanner = adminDisableBanner;
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
const storage_1 = require("../../infrastructure/storage");
const storage_2 = require("../../infrastructure/storage");
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function resolvePriceForCurrency({ lkrAmount, sgdAmount, usdAmount, currency, }) {
    const amount = currency === 'LKR'
        ? (typeof lkrAmount === 'string' ? lkrAmount : String(lkrAmount))
        : currency === 'SGD'
            ? (typeof sgdAmount === 'string' ? sgdAmount : String(sgdAmount))
            : (typeof usdAmount === 'string' ? usdAmount : String(usdAmount));
    return { amount, currency };
}
function rowToProductListItem(row, currency) {
    return {
        id: row.id,
        slug: row.slug,
        displayName: row.displayName,
        shortName: row.shortName,
        isSale: row.isSale,
        keyImage: row.keyImageUrl != null
            ? { url: row.keyImageUrl, altText: row.keyImageAltText }
            : null,
        price: resolvePriceForCurrency({
            lkrAmount: row.lkrAmount,
            sgdAmount: row.sgdAmount,
            usdAmount: row.usdAmount,
            currency,
        }),
        stockStatus: row.stockStatus,
        variants: (row.variants ?? []).map((v) => ({
            variantId: v.variantId,
            color: v.color,
            size: v.size,
            availableQty: v.availableQty,
            stockStatus: v.stockStatus,
        })),
    };
}
async function getCategories() {
    return (0, db_1.listCategories)();
}
async function getProductListing({ categorySlug, page = 1, limit = 24, currency = 'LKR', sort, }) {
    const { products, total } = await (0, db_1.listProducts)({
        categorySlug,
        page,
        limit,
        currency,
        sort,
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return {
        products: products.map((r) => rowToProductListItem(r, currency)),
        total,
        page,
        limit,
        totalPages,
    };
}
async function searchProducts({ query, page = 1, limit = 24, currency = 'LKR', sort, }) {
    if (!query || query.trim().length < 2) {
        throw new errors_1.AppError('QUERY_TOO_SHORT', 400);
    }
    const { products, total } = await (0, db_1.searchProducts)({
        query: query.trim(),
        page,
        limit,
        currency,
        sort,
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return {
        products: products.map((r) => rowToProductListItem(r, currency)),
        total,
        page,
        limit,
        totalPages,
    };
}
async function getProductDetail({ slug, currency = 'LKR', }) {
    const product = await (0, db_1.getProductBySlug)({ slug, currency });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    const [variants, relatedRows, stylingGuide] = await Promise.all([
        (0, db_1.getVariantsWithStock)({ productId: product.id }),
        (0, db_1.getRelatedProducts)({ productId: product.id, currency }),
        (0, db_1.getActiveStylingGuide)({ productId: product.id }),
    ]);
    const variantsMapped = variants.map((v) => ({
        variantId: v.variantId,
        color: v.color,
        size: v.size,
        availableQty: v.availableQty,
        stockStatus: v.stockStatus,
        lowStockThreshold: v.lowStockThreshold,
    }));
    const relatedProducts = relatedRows.map((r) => rowToProductListItem(r, currency));
    return {
        id: product.id,
        slug: product.slug,
        displayName: product.displayName,
        shortName: product.shortName,
        description: product.description,
        fabricInfo: product.fabricInfo,
        isSale: product.isSale,
        price: resolvePriceForCurrency({
            lkrAmount: product.lkrAmount,
            sgdAmount: product.sgdAmount,
            usdAmount: product.usdAmount,
            currency,
        }),
        images: product.images,
        variants: variantsMapped,
        relatedProducts,
        stylingGuide,
        category: product.category,
    };
}
async function getHomepage({ currency = 'LKR', }) {
    const [featuredRows, banner] = await Promise.all([
        (0, db_1.getFeaturedProducts)({ currency }),
        (0, db_1.getActiveBanner)(),
    ]);
    const featuredProducts = featuredRows.map((r) => rowToProductListItem(r, currency));
    return { featuredProducts, banner };
}
async function adminGetAllProducts({ page = 1, limit = 50, includeInactive = false, }) {
    const { products, total } = await (0, db_1.listAllProducts)({
        page,
        limit,
        includeInactive,
    });
    const totalPages = Math.ceil(total / limit) || 1;
    return { products, total, page, limit, totalPages };
}
async function adminGetProduct({ id, }) {
    const product = await (0, db_1.getProductById)({ id });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    return product;
}
function validateSlug(slug) {
    if (!SLUG_REGEX.test(slug)) {
        throw new errors_1.AppError('INVALID_SLUG', 400);
    }
}
function validatePriceAmounts({ lkrAmount, sgdAmount, usdAmount, }) {
    if (lkrAmount < 0 ||
        sgdAmount < 0 ||
        usdAmount < 0 ||
        !Number.isFinite(lkrAmount) ||
        !Number.isFinite(sgdAmount) ||
        !Number.isFinite(usdAmount)) {
        throw new errors_1.AppError('INVALID_PRICE', 400);
    }
}
async function adminCreateProduct({ categoryId, slug, displayName, shortName, description, fabricInfo, productCode, active = true, isSale = false, prices, }) {
    validateSlug(slug);
    validatePriceAmounts(prices);
    const lkr = prices.lkrAmount.toFixed(2);
    const sgd = prices.sgdAmount.toFixed(2);
    const usd = prices.usdAmount.toFixed(2);
    return (0, db_1.createProduct)({
        categoryId,
        slug,
        displayName,
        shortName,
        description,
        fabricInfo,
        productCode,
        active,
        isSale,
        prices: { lkrAmount: lkr, sgdAmount: sgd, usdAmount: usd },
    });
}
async function adminUpdateProduct({ id, data, }) {
    const existing = await (0, db_1.getProductById)({ id });
    if (!existing)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    if (data.slug !== undefined)
        validateSlug(data.slug);
    const priceData = {};
    if (data.lkrAmount !== undefined) {
        if (data.lkrAmount < 0 || !Number.isFinite(data.lkrAmount))
            throw new errors_1.AppError('INVALID_PRICE', 400);
        priceData.lkrAmount = data.lkrAmount.toFixed(2);
    }
    if (data.sgdAmount !== undefined) {
        if (data.sgdAmount < 0 || !Number.isFinite(data.sgdAmount))
            throw new errors_1.AppError('INVALID_PRICE', 400);
        priceData.sgdAmount = data.sgdAmount.toFixed(2);
    }
    if (data.usdAmount !== undefined) {
        if (data.usdAmount < 0 || !Number.isFinite(data.usdAmount))
            throw new errors_1.AppError('INVALID_PRICE', 400);
        priceData.usdAmount = data.usdAmount.toFixed(2);
    }
    const { lkrAmount, sgdAmount, usdAmount, ...rest } = data;
    const updatePayload = { ...rest, ...priceData };
    const result = await (0, db_1.updateProduct)({ id, data: updatePayload });
    if (!result)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    return result;
}
async function adminDeleteProduct({ id }) {
    const existing = await (0, db_1.getProductById)({ id });
    if (!existing)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    await (0, db_1.softDeleteProduct)({ id });
}
async function adminUploadProductImage({ productId, url, altText, sortOrder = 0, setAsKey = false, }) {
    const product = await (0, db_1.getProductById)({ id: productId });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    const image = await (0, db_1.createProductImage)({
        productId,
        url,
        altText,
        sortOrder,
    });
    const isFirstImage = !product.images || product.images.length <= 1;
    if (setAsKey || isFirstImage) {
        await (0, db_1.setKeyImage)({ productId, imageId: image.id });
    }
    return image;
}
async function adminDeleteProductImage({ imageId, productId, }) {
    const product = await (0, db_1.getProductById)({ id: productId });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    const image = product.images.find((img) => img.id === imageId);
    if (!image)
        throw new errors_1.AppError('IMAGE_NOT_FOUND', 404);
    const storage = (0, storage_1.getStorageService)();
    try {
        const pathname = new URL(image.url).pathname;
        const prefix = pathname.startsWith('/') ? pathname.slice(1) : pathname;
        await storage.deleteByPrefix(prefix);
    }
    catch (err) {
        if (err instanceof storage_2.StorageError) {
            throw new errors_1.AppError('STORAGE_ERROR', 500, err.message);
        }
        throw err;
    }
    await (0, db_1.deleteProductImage)({ id: imageId, productId });
    if (product.keyImageId === imageId) {
        const remaining = product.images.filter((img) => img.id !== imageId);
        if (remaining.length > 0) {
            await (0, db_1.setKeyImage)({ productId, imageId: remaining[0].id });
        }
        else {
            await (0, db_1.updateProduct)({ id: productId, data: { keyImageId: null } });
        }
    }
}
async function adminUploadProductImagesFromFiles({ productId, files, }) {
    if (files.length === 0)
        throw new errors_1.AppError('NO_FILES', 400);
    if (files.length > 6)
        throw new errors_1.AppError('TOO_MANY_FILES', 400);
    const product = await (0, db_1.getProductById)({ id: productId });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    const storage = (0, storage_1.getStorageService)();
    const nextSortOrder = product.images.length > 0
        ? Math.max(...product.images.map((i) => i.sortOrder)) + 1
        : 0;
    const created = [];
    let sortOrder = nextSortOrder;
    for (const file of files) {
        let variants;
        try {
            variants = await storage.uploadProductImage(product.slug, file.buffer, file.originalname, sortOrder);
        }
        catch (err) {
            if (err instanceof storage_2.StorageError) {
                throw new errors_1.AppError('STORAGE_ERROR', 500, err.message);
            }
            throw err;
        }
        const baseUrl = variants.full.url.replace(/-full\.webp$/, '');
        const altText = `${product.displayName} - Image ${sortOrder + 1}`;
        const image = await (0, db_1.createProductImage)({
            productId,
            url: baseUrl,
            altText,
            sortOrder,
        });
        if (sortOrder === nextSortOrder && product.images.length === 0) {
            await (0, db_1.setKeyImage)({ productId, imageId: image.id });
        }
        created.push(image);
        sortOrder += 1;
    }
    return created;
}
async function adminGetPresignedStylingGuideUploadUrl({ productId, contentType, fileName, }) {
    const product = await (0, db_1.getProductById)({ id: productId });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    const { randomUUID } = await Promise.resolve().then(() => __importStar(require('node:crypto')));
    const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.mp4';
    const subPath = `${product.slug}/video-${randomUUID()}${ext}`;
    const storage = (0, storage_1.getStorageService)();
    try {
        return storage.getPresignedUploadUrl('styling-guides', subPath, contentType);
    }
    catch (err) {
        if (err instanceof storage_2.StorageError) {
            throw new errors_1.AppError('STORAGE_ERROR', 500, err.message);
        }
        throw err;
    }
}
async function adminConfirmStylingGuideVideo({ productId, key, linkUrl: providedLinkUrl, }) {
    const product = await (0, db_1.getProductById)({ id: productId });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    const storage = (0, storage_1.getStorageService)();
    let exists;
    try {
        exists = await storage.objectExists(key);
    }
    catch (err) {
        if (err instanceof storage_2.StorageError) {
            throw new errors_1.AppError('STORAGE_ERROR', 500, err.message);
        }
        throw err;
    }
    if (!exists)
        throw new errors_1.AppError('STYLING_GUIDE_VIDEO_NOT_FOUND', 404);
    const linkUrl = providedLinkUrl ?? storage.getPublicUrl(key);
    return (0, db_1.upsertStylingGuide)({
        productId,
        type: 'VIDEO',
        linkUrl,
        active: true,
    });
}
async function adminSetKeyImage({ productId, imageId, }) {
    const product = await (0, db_1.getProductById)({ id: productId });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    await (0, db_1.setKeyImage)({ productId, imageId });
}
async function adminReorderImages({ productId, imageIds, }) {
    await (0, db_1.reorderImages)({ productId, imageIds });
}
async function adminCreateVariant({ productId, color, size, skuGroup, }) {
    const product = await (0, db_1.getProductById)({ id: productId });
    if (!product)
        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
    return (0, db_1.createVariant)({ productId, color, size, skuGroup });
}
async function adminDeleteVariant({ variantId, productId, }) {
    await (0, db_1.softDeleteVariant)({ id: variantId, productId });
}
async function adminUpsertStylingGuide({ productId, type, linkUrl, contentJson, active = true, }) {
    if (type === 'VIDEO' && (linkUrl == null || linkUrl === '')) {
        throw new errors_1.AppError('VIDEO_STYLING_GUIDE_REQUIRES_LINK_URL', 400);
    }
    if (type === 'GALLERY' && (contentJson == null || typeof contentJson !== 'object')) {
        throw new errors_1.AppError('GALLERY_STYLING_GUIDE_REQUIRES_CONTENT_JSON', 400);
    }
    return (0, db_1.upsertStylingGuide)({ productId, type, linkUrl, contentJson, active });
}
async function adminGetBestsellerList() {
    return (0, db_1.getBestsellerList)();
}
async function adminAddToBestsellerList({ productId, sortOrder = 0, adminId, }) {
    return (0, db_1.addToBestsellerList)({ productId, sortOrder, addedByAdminId: adminId });
}
async function adminRemoveFromBestsellerList({ productId, }) {
    await (0, db_1.removeFromBestsellerList)({ productId });
}
async function adminReorderBestsellerList({ orderedProductIds, }) {
    await (0, db_1.reorderBestsellerList)({ orderedProductIds });
}
async function adminListBanners() {
    return (0, db_1.listBanners)();
}
async function adminCreateBanner({ message, linkUrl, startAt, endAt, adminId, }) {
    const now = new Date();
    if (endAt != null && endAt !== '') {
        const end = new Date(endAt);
        if (end <= now)
            throw new errors_1.AppError('END_AT_MUST_BE_FUTURE', 400);
        if (startAt != null && startAt !== '') {
            const start = new Date(startAt);
            if (start >= end)
                throw new errors_1.AppError('START_AT_MUST_BE_BEFORE_END_AT', 400);
        }
    }
    return (0, db_1.createBanner)({
        message,
        linkUrl: linkUrl ?? null,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        createdBy: adminId,
    });
}
async function adminUpdateBanner({ id, data, }) {
    const banner = await (0, db_1.updateBanner)({ id, data });
    if (!banner)
        throw new errors_1.AppError('BANNER_NOT_FOUND', 404);
    return banner;
}
async function adminEnableBanner({ id, }) {
    const banner = await (0, db_1.enableBanner)({ id });
    if (!banner)
        throw new errors_1.AppError('BANNER_NOT_FOUND', 404);
    return banner;
}
async function adminDisableBanner({ id, }) {
    const banner = await (0, db_1.disableBanner)({ id });
    if (!banner)
        throw new errors_1.AppError('BANNER_NOT_FOUND', 404);
    return banner;
}
