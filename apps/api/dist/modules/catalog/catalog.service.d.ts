/**
 * Catalog service — business logic, validation, currency resolution.
 * RORO. Uses query functions from @modett/db. Throws AppError for expected failures.
 */
import type { CurrencyCode } from '@modett/types';
import { getProductById, listAllProducts, createProduct, updateProduct, createVariant, getBestsellerList, addToBestsellerList, updateBanner, enableBanner, disableBanner } from '@modett/db';
import type { Category, ProductImage, ProductStylingGuide, Banner } from '@modett/db';
export interface Money {
    amount: string;
    currency: CurrencyCode;
}
export interface ProductListItem {
    id: string;
    slug: string;
    displayName: string;
    shortName: string;
    isSale: boolean;
    keyImage: {
        url: string;
        altText: string | null;
    } | null;
    price: Money;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}
export interface VariantWithStock {
    variantId: string;
    color: string;
    size: string;
    availableQty: number;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    lowStockThreshold: number;
}
export interface ProductDetail {
    id: string;
    slug: string;
    displayName: string;
    shortName: string;
    description: string | null;
    fabricInfo: string | null;
    isSale: boolean;
    price: Money;
    images: Array<{
        id: string;
        url: string;
        altText: string | null;
        sortOrder: number;
    }>;
    variants: VariantWithStock[];
    relatedProducts: ProductListItem[];
    stylingGuide: ProductStylingGuide | null;
    category: Category | null;
}
export declare function getCategories(): Promise<Category[]>;
export declare function getProductListing({ categorySlug, page, limit, currency, }: {
    categorySlug?: string | null;
    page?: number;
    limit?: number;
    currency?: CurrencyCode;
}): Promise<{
    products: ProductListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}>;
export declare function searchProducts({ query, page, limit, currency, }: {
    query: string;
    page?: number;
    limit?: number;
    currency?: CurrencyCode;
}): Promise<{
    products: ProductListItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}>;
export declare function getProductDetail({ slug, currency, }: {
    slug: string;
    currency?: CurrencyCode;
}): Promise<ProductDetail>;
export declare function getHomepage({ currency, }: {
    currency?: CurrencyCode;
}): Promise<{
    featuredProducts: ProductListItem[];
    banner: Banner | null;
}>;
export declare function adminGetAllProducts({ page, limit, includeInactive, }: {
    page?: number;
    limit?: number;
    includeInactive?: boolean;
}): Promise<{
    products: Awaited<ReturnType<typeof listAllProducts>>['products'];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}>;
export declare function adminGetProduct({ id, }: {
    id: string;
}): Promise<NonNullable<Awaited<ReturnType<typeof getProductById>>>>;
export declare function adminCreateProduct({ categoryId, slug, displayName, shortName, description, fabricInfo, productCode, active, isSale, prices, }: {
    categoryId?: string | null;
    slug: string;
    displayName: string;
    shortName: string;
    description?: string | null;
    fabricInfo?: string | null;
    productCode: string;
    active?: boolean;
    isSale?: boolean;
    prices: {
        lkrAmount: number;
        sgdAmount: number;
        usdAmount: number;
    };
}): Promise<Awaited<ReturnType<typeof createProduct>>>;
type AdminUpdateProductData = Partial<{
    categoryId: string | null;
    slug: string;
    displayName: string;
    shortName: string;
    description: string | null;
    fabricInfo: string | null;
    productCode: string;
    active: boolean;
    isSale: boolean;
    keyImageId: string | null;
    lkrAmount: number;
    sgdAmount: number;
    usdAmount: number;
}>;
export declare function adminUpdateProduct({ id, data, }: {
    id: string;
    data: AdminUpdateProductData;
}): Promise<NonNullable<Awaited<ReturnType<typeof updateProduct>>>>;
export declare function adminDeleteProduct({ id }: {
    id: string;
}): Promise<void>;
export declare function adminUploadProductImage({ productId, url, altText, sortOrder, setAsKey, }: {
    productId: string;
    url: string;
    altText?: string | null;
    sortOrder?: number;
    setAsKey?: boolean;
}): Promise<ProductImage>;
export declare function adminDeleteProductImage({ imageId, productId, }: {
    imageId: string;
    productId: string;
}): Promise<void>;
export declare function adminSetKeyImage({ productId, imageId, }: {
    productId: string;
    imageId: string;
}): Promise<void>;
export declare function adminReorderImages({ productId, imageIds, }: {
    productId: string;
    imageIds: string[];
}): Promise<void>;
export declare function adminCreateVariant({ productId, color, size, skuGroup, }: {
    productId: string;
    color: string;
    size: string;
    skuGroup: string;
}): Promise<Awaited<ReturnType<typeof createVariant>>>;
export declare function adminDeleteVariant({ variantId, productId, }: {
    variantId: string;
    productId: string;
}): Promise<void>;
export declare function adminUpsertStylingGuide({ productId, type, linkUrl, contentJson, active, }: {
    productId: string;
    type: 'VIDEO' | 'GALLERY' | 'TEXT';
    linkUrl?: string | null;
    contentJson?: unknown;
    active?: boolean;
}): Promise<ProductStylingGuide>;
export declare function adminGetBestsellerList(): Promise<Awaited<ReturnType<typeof getBestsellerList>>>;
export declare function adminAddToBestsellerList({ productId, sortOrder, adminId, }: {
    productId: string;
    sortOrder?: number;
    adminId: string;
}): Promise<Awaited<ReturnType<typeof addToBestsellerList>>>;
export declare function adminRemoveFromBestsellerList({ productId, }: {
    productId: string;
}): Promise<void>;
export declare function adminReorderBestsellerList({ orderedProductIds, }: {
    orderedProductIds: string[];
}): Promise<void>;
export declare function adminListBanners(): Promise<Banner[]>;
export declare function adminCreateBanner({ message, linkUrl, startAt, endAt, adminId, }: {
    message: string;
    linkUrl?: string | null;
    startAt?: string | null;
    endAt?: string | null;
    adminId: string;
}): Promise<Banner>;
type AdminUpdateBannerData = Partial<{
    message: string;
    linkUrl: string | null;
    startAt: Date | null;
    endAt: Date | null;
}>;
export declare function adminUpdateBanner({ id, data, }: {
    id: string;
    data: AdminUpdateBannerData;
}): Promise<NonNullable<Awaited<ReturnType<typeof updateBanner>>>>;
export declare function adminEnableBanner({ id, }: {
    id: string;
}): Promise<NonNullable<Awaited<ReturnType<typeof enableBanner>>>>;
export declare function adminDisableBanner({ id, }: {
    id: string;
}): Promise<NonNullable<Awaited<ReturnType<typeof disableBanner>>>>;
export {};
//# sourceMappingURL=catalog.service.d.ts.map