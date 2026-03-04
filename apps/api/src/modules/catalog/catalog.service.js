"use strict";
/**
 * Catalog service — business logic, validation, currency resolution.
 * RORO. Uses query functions from @modett/db. Throws AppError for expected failures.
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
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
var errors_1 = require("../../lib/errors");
var db_1 = require("@modett/db");
var SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function resolvePriceForCurrency(_a) {
    var lkrAmount = _a.lkrAmount, sgdAmount = _a.sgdAmount, usdAmount = _a.usdAmount, currency = _a.currency;
    var amount = currency === 'LKR'
        ? (typeof lkrAmount === 'string' ? lkrAmount : String(lkrAmount))
        : currency === 'SGD'
            ? (typeof sgdAmount === 'string' ? sgdAmount : String(sgdAmount))
            : (typeof usdAmount === 'string' ? usdAmount : String(usdAmount));
    return { amount: amount, currency: currency };
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
            currency: currency,
        }),
        stockStatus: row.stockStatus,
    };
}
// —— Storefront ——
function getCategories() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, db_1.listCategories)()];
        });
    });
}
function getProductListing(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _c, products, total, totalPages;
        var categorySlug = _b.categorySlug, _d = _b.page, page = _d === void 0 ? 1 : _d, _e = _b.limit, limit = _e === void 0 ? 24 : _e, _f = _b.currency, currency = _f === void 0 ? 'LKR' : _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, (0, db_1.listProducts)({
                        categorySlug: categorySlug,
                        page: page,
                        limit: limit,
                        currency: currency,
                    })];
                case 1:
                    _c = _g.sent(), products = _c.products, total = _c.total;
                    totalPages = Math.ceil(total / limit) || 1;
                    return [2 /*return*/, {
                            products: products.map(function (r) { return rowToProductListItem(r, currency); }),
                            total: total,
                            page: page,
                            limit: limit,
                            totalPages: totalPages,
                        }];
            }
        });
    });
}
function searchProducts(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _c, products, total, totalPages;
        var query = _b.query, _d = _b.page, page = _d === void 0 ? 1 : _d, _e = _b.limit, limit = _e === void 0 ? 24 : _e, _f = _b.currency, currency = _f === void 0 ? 'LKR' : _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    if (!query || query.trim().length < 2) {
                        throw new errors_1.AppError('QUERY_TOO_SHORT', 400);
                    }
                    return [4 /*yield*/, (0, db_1.searchProducts)({
                            query: query.trim(),
                            page: page,
                            limit: limit,
                            currency: currency,
                        })];
                case 1:
                    _c = _g.sent(), products = _c.products, total = _c.total;
                    totalPages = Math.ceil(total / limit) || 1;
                    return [2 /*return*/, {
                            products: products.map(function (r) { return rowToProductListItem(r, currency); }),
                            total: total,
                            page: page,
                            limit: limit,
                            totalPages: totalPages,
                        }];
            }
        });
    });
}
function getProductDetail(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var product, _c, variants, relatedRows, stylingGuide, variantsMapped, relatedProducts;
        var slug = _b.slug, _d = _b.currency, currency = _d === void 0 ? 'LKR' : _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, db_1.getProductBySlug)({ slug: slug, currency: currency })];
                case 1:
                    product = _e.sent();
                    if (!product)
                        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
                    return [4 /*yield*/, Promise.all([
                            (0, db_1.getVariantsWithStock)({ productId: product.id }),
                            (0, db_1.getRelatedProducts)({ productId: product.id, currency: currency }),
                            (0, db_1.getActiveStylingGuide)({ productId: product.id }),
                        ])];
                case 2:
                    _c = _e.sent(), variants = _c[0], relatedRows = _c[1], stylingGuide = _c[2];
                    variantsMapped = variants.map(function (v) { return ({
                        variantId: v.variantId,
                        color: v.color,
                        size: v.size,
                        availableQty: v.availableQty,
                        stockStatus: v.stockStatus,
                        lowStockThreshold: v.lowStockThreshold,
                    }); });
                    relatedProducts = relatedRows.map(function (r) { return rowToProductListItem(r, currency); });
                    return [2 /*return*/, {
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
                                currency: currency,
                            }),
                            images: product.images,
                            variants: variantsMapped,
                            relatedProducts: relatedProducts,
                            stylingGuide: stylingGuide,
                            category: product.category,
                        }];
            }
        });
    });
}
function getHomepage(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _c, featuredRows, banner, featuredProducts;
        var _d = _b.currency, currency = _d === void 0 ? 'LKR' : _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        (0, db_1.getFeaturedProducts)({ currency: currency }),
                        (0, db_1.getActiveBanner)(),
                    ])];
                case 1:
                    _c = _e.sent(), featuredRows = _c[0], banner = _c[1];
                    featuredProducts = featuredRows.map(function (r) { return rowToProductListItem(r, currency); });
                    return [2 /*return*/, { featuredProducts: featuredProducts, banner: banner }];
            }
        });
    });
}
// —— Admin ——
function adminGetAllProducts(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _c, products, total, totalPages;
        var _d = _b.page, page = _d === void 0 ? 1 : _d, _e = _b.limit, limit = _e === void 0 ? 50 : _e, _f = _b.includeInactive, includeInactive = _f === void 0 ? false : _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0: return [4 /*yield*/, (0, db_1.listAllProducts)({
                        page: page,
                        limit: limit,
                        includeInactive: includeInactive,
                    })];
                case 1:
                    _c = _g.sent(), products = _c.products, total = _c.total;
                    totalPages = Math.ceil(total / limit) || 1;
                    return [2 /*return*/, { products: products, total: total, page: page, limit: limit, totalPages: totalPages }];
            }
        });
    });
}
function adminGetProduct(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var product;
        var id = _b.id;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getProductById)({ id: id })];
                case 1:
                    product = _c.sent();
                    if (!product)
                        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
                    return [2 /*return*/, product];
            }
        });
    });
}
function validateSlug(slug) {
    if (!SLUG_REGEX.test(slug)) {
        throw new errors_1.AppError('INVALID_SLUG', 400);
    }
}
function validatePriceAmounts(_a) {
    var lkrAmount = _a.lkrAmount, sgdAmount = _a.sgdAmount, usdAmount = _a.usdAmount;
    if (lkrAmount < 0 ||
        sgdAmount < 0 ||
        usdAmount < 0 ||
        !Number.isFinite(lkrAmount) ||
        !Number.isFinite(sgdAmount) ||
        !Number.isFinite(usdAmount)) {
        throw new errors_1.AppError('INVALID_PRICE', 400);
    }
}
function adminCreateProduct(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var lkr, sgd, usd;
        var categoryId = _b.categoryId, slug = _b.slug, displayName = _b.displayName, shortName = _b.shortName, description = _b.description, fabricInfo = _b.fabricInfo, productCode = _b.productCode, _c = _b.active, active = _c === void 0 ? true : _c, _d = _b.isSale, isSale = _d === void 0 ? false : _d, prices = _b.prices;
        return __generator(this, function (_e) {
            validateSlug(slug);
            validatePriceAmounts(prices);
            lkr = prices.lkrAmount.toFixed(2);
            sgd = prices.sgdAmount.toFixed(2);
            usd = prices.usdAmount.toFixed(2);
            return [2 /*return*/, (0, db_1.createProduct)({
                    categoryId: categoryId,
                    slug: slug,
                    displayName: displayName,
                    shortName: shortName,
                    description: description,
                    fabricInfo: fabricInfo,
                    productCode: productCode,
                    active: active,
                    isSale: isSale,
                    prices: { lkrAmount: lkr, sgdAmount: sgd, usdAmount: usd },
                })];
        });
    });
}
function adminUpdateProduct(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var existing, priceData, lkrAmount, sgdAmount, usdAmount, rest, updatePayload, result;
        var id = _b.id, data = _b.data;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getProductById)({ id: id })];
                case 1:
                    existing = _c.sent();
                    if (!existing)
                        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
                    if (data.slug !== undefined)
                        validateSlug(data.slug);
                    priceData = {};
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
                    lkrAmount = data.lkrAmount, sgdAmount = data.sgdAmount, usdAmount = data.usdAmount, rest = __rest(data, ["lkrAmount", "sgdAmount", "usdAmount"]);
                    updatePayload = __assign(__assign({}, rest), priceData);
                    return [4 /*yield*/, (0, db_1.updateProduct)({ id: id, data: updatePayload })];
                case 2:
                    result = _c.sent();
                    if (!result)
                        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
                    return [2 /*return*/, result];
            }
        });
    });
}
function adminDeleteProduct(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var existing;
        var id = _b.id;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getProductById)({ id: id })];
                case 1:
                    existing = _c.sent();
                    if (!existing)
                        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
                    return [4 /*yield*/, (0, db_1.softDeleteProduct)({ id: id })];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function adminUploadProductImage(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var product, image, isFirstImage;
        var productId = _b.productId, url = _b.url, altText = _b.altText, _c = _b.sortOrder, sortOrder = _c === void 0 ? 0 : _c, _d = _b.setAsKey, setAsKey = _d === void 0 ? false : _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, (0, db_1.getProductById)({ id: productId })];
                case 1:
                    product = _e.sent();
                    if (!product)
                        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
                    return [4 /*yield*/, (0, db_1.createProductImage)({
                            productId: productId,
                            url: url,
                            altText: altText,
                            sortOrder: sortOrder,
                        })];
                case 2:
                    image = _e.sent();
                    isFirstImage = !product.images || product.images.length <= 1;
                    if (!(setAsKey || isFirstImage)) return [3 /*break*/, 4];
                    return [4 /*yield*/, (0, db_1.setKeyImage)({ productId: productId, imageId: image.id })];
                case 3:
                    _e.sent();
                    _e.label = 4;
                case 4: return [2 /*return*/, image];
            }
        });
    });
}
function adminDeleteProductImage(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var imageId = _b.imageId, productId = _b.productId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.deleteProductImage)({ id: imageId, productId: productId })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function adminSetKeyImage(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var product;
        var productId = _b.productId, imageId = _b.imageId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getProductById)({ id: productId })];
                case 1:
                    product = _c.sent();
                    if (!product)
                        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
                    return [4 /*yield*/, (0, db_1.setKeyImage)({ productId: productId, imageId: imageId })];
                case 2:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function adminReorderImages(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var productId = _b.productId, imageIds = _b.imageIds;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.reorderImages)({ productId: productId, imageIds: imageIds })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function adminCreateVariant(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var product;
        var productId = _b.productId, color = _b.color, size = _b.size, skuGroup = _b.skuGroup;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.getProductById)({ id: productId })];
                case 1:
                    product = _c.sent();
                    if (!product)
                        throw new errors_1.AppError('PRODUCT_NOT_FOUND', 404);
                    return [2 /*return*/, (0, db_1.createVariant)({ productId: productId, color: color, size: size, skuGroup: skuGroup })];
            }
        });
    });
}
function adminDeleteVariant(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var variantId = _b.variantId, productId = _b.productId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.softDeleteVariant)({ id: variantId, productId: productId })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function adminUpsertStylingGuide(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var productId = _b.productId, type = _b.type, linkUrl = _b.linkUrl, contentJson = _b.contentJson, _c = _b.active, active = _c === void 0 ? true : _c;
        return __generator(this, function (_d) {
            if (type === 'VIDEO' && (linkUrl == null || linkUrl === '')) {
                throw new errors_1.AppError('VIDEO_STYLING_GUIDE_REQUIRES_LINK_URL', 400);
            }
            if (type === 'GALLERY' && (contentJson == null || typeof contentJson !== 'object')) {
                throw new errors_1.AppError('GALLERY_STYLING_GUIDE_REQUIRES_CONTENT_JSON', 400);
            }
            return [2 /*return*/, (0, db_1.upsertStylingGuide)({ productId: productId, type: type, linkUrl: linkUrl, contentJson: contentJson, active: active })];
        });
    });
}
function adminGetBestsellerList() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, db_1.getBestsellerList)()];
        });
    });
}
function adminAddToBestsellerList(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var productId = _b.productId, _c = _b.sortOrder, sortOrder = _c === void 0 ? 0 : _c, adminId = _b.adminId;
        return __generator(this, function (_d) {
            return [2 /*return*/, (0, db_1.addToBestsellerList)({ productId: productId, sortOrder: sortOrder, addedByAdminId: adminId })];
        });
    });
}
function adminRemoveFromBestsellerList(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var productId = _b.productId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.removeFromBestsellerList)({ productId: productId })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function adminReorderBestsellerList(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var orderedProductIds = _b.orderedProductIds;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.reorderBestsellerList)({ orderedProductIds: orderedProductIds })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function adminListBanners() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, db_1.listBanners)()];
        });
    });
}
function adminCreateBanner(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var now, end, start;
        var message = _b.message, linkUrl = _b.linkUrl, startAt = _b.startAt, endAt = _b.endAt, adminId = _b.adminId;
        return __generator(this, function (_c) {
            now = new Date();
            if (endAt != null && endAt !== '') {
                end = new Date(endAt);
                if (end <= now)
                    throw new errors_1.AppError('END_AT_MUST_BE_FUTURE', 400);
                if (startAt != null && startAt !== '') {
                    start = new Date(startAt);
                    if (start >= end)
                        throw new errors_1.AppError('START_AT_MUST_BE_BEFORE_END_AT', 400);
                }
            }
            return [2 /*return*/, (0, db_1.createBanner)({
                    message: message,
                    linkUrl: linkUrl !== null && linkUrl !== void 0 ? linkUrl : null,
                    startAt: startAt ? new Date(startAt) : null,
                    endAt: endAt ? new Date(endAt) : null,
                    createdBy: adminId,
                })];
        });
    });
}
function adminUpdateBanner(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var banner;
        var id = _b.id, data = _b.data;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.updateBanner)({ id: id, data: data })];
                case 1:
                    banner = _c.sent();
                    if (!banner)
                        throw new errors_1.AppError('BANNER_NOT_FOUND', 404);
                    return [2 /*return*/, banner];
            }
        });
    });
}
function adminEnableBanner(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var banner;
        var id = _b.id;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.enableBanner)({ id: id })];
                case 1:
                    banner = _c.sent();
                    if (!banner)
                        throw new errors_1.AppError('BANNER_NOT_FOUND', 404);
                    return [2 /*return*/, banner];
            }
        });
    });
}
function adminDisableBanner(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var banner;
        var id = _b.id;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_1.disableBanner)({ id: id })];
                case 1:
                    banner = _c.sent();
                    if (!banner)
                        throw new errors_1.AppError('BANNER_NOT_FOUND', 404);
                    return [2 /*return*/, banner];
            }
        });
    });
}
