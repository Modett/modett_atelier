/**
 * Catalog query functions — categories, products (view + tables), images, styling guides, bestsellers, banners.
 * No business logic. RORO. Return null for not-found. Use views where specified.
 */
import type { Category, Product, ProductPrice, ProductImage, ProductStylingGuide, BestsellerEntry, Banner } from '../schema/catalog.schema';
import type { ProductVariant } from '../schema/inventory.schema';
export interface ProductListItemRow {
    id: string;
    slug: string;
    displayName: string;
    shortName: string;
    isSale: boolean;
    keyImageUrl: string | null;
    keyImageAltText: string | null;
    lkrAmount: string;
    sgdAmount: string;
    usdAmount: string;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}
export interface VariantWithStockRow {
    variantId: string;
    color: string;
    size: string;
    availableQty: number;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    lowStockThreshold: number;
}
export interface ProductDetailRow {
    id: string;
    slug: string;
    displayName: string;
    shortName: string;
    description: string | null;
    fabricInfo: string | null;
    isSale: boolean;
    lkrAmount: string;
    sgdAmount: string;
    usdAmount: string;
    images: Array<{
        id: string;
        url: string;
        altText: string | null;
        sortOrder: number;
    }>;
    category: Category | null;
}
export declare function listCategories(): Promise<Category[]>;
export declare function getCategoryBySlug({ slug, }: {
    slug: string;
}): Promise<Category | null>;
export declare function listProducts({ categorySlug, page, limit, currency, }: {
    categorySlug?: string | null;
    page?: number;
    limit?: number;
    currency: 'LKR' | 'SGD' | 'USD';
}): Promise<{
    products: ProductListItemRow[];
    total: number;
}>;
export declare function searchProducts({ query, page, limit, currency, }: {
    query: string;
    page?: number;
    limit?: number;
    currency: 'LKR' | 'SGD' | 'USD';
}): Promise<{
    products: ProductListItemRow[];
    total: number;
}>;
export declare function getFeaturedProducts({ currency, }: {
    currency: 'LKR' | 'SGD' | 'USD';
}): Promise<ProductListItemRow[]>;
export declare function getProductBySlug({ slug, currency, }: {
    slug: string;
    currency: 'LKR' | 'SGD' | 'USD';
}): Promise<ProductDetailRow | null>;
export declare function getVariantsWithStock({ productId, }: {
    productId: string;
}): Promise<VariantWithStockRow[]>;
export declare function getRelatedProducts({ productId, currency, }: {
    productId: string;
    currency: 'LKR' | 'SGD' | 'USD';
}): Promise<ProductListItemRow[]>;
export declare function getActiveStylingGuide({ productId, }: {
    productId: string;
}): Promise<ProductStylingGuide | null>;
export declare function getActiveBanner(): Promise<Banner | null>;
export declare function getProductById({ id, }: {
    id: string;
}): Promise<(Product & {
    prices: ProductPrice;
    images: ProductImage[];
}) | null>;
export declare function listAllProducts({ page, limit, includeInactive, }: {
    page?: number;
    limit?: number;
    includeInactive?: boolean;
}): Promise<{
    products: Array<Product & {
        prices: ProductPrice;
        images: ProductImage[];
        variantCount: number;
    }>;
    total: number;
}>;
export declare function createProduct({ categoryId, slug, displayName, shortName, description, fabricInfo, productCode, active, isSale, prices, }: {
    categoryId?: string | null;
    slug: string;
    displayName: string;
    shortName: string;
    description?: string | null;
    fabricInfo?: string | null;
    productCode: string;
    active: boolean;
    isSale: boolean;
    prices: {
        lkrAmount: string;
        sgdAmount: string;
        usdAmount: string;
    };
}): Promise<Product & {
    prices: ProductPrice;
}>;
export declare function updateProduct({ id, data, }: {
    id: string;
    data: Partial<{
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
    } & {
        lkrAmount?: string;
        sgdAmount?: string;
        usdAmount?: string;
    }>;
}): Promise<(Product & {
    prices: ProductPrice;
    images: ProductImage[];
}) | null>;
export declare function softDeleteProduct({ id }: {
    id: string;
}): Promise<void>;
export declare function createProductImage({ productId, url, altText, sortOrder, }: {
    productId: string;
    url: string;
    altText?: string | null;
    sortOrder?: number;
}): Promise<ProductImage>;
export declare function deleteProductImage({ id, productId, }: {
    id: string;
    productId: string;
}): Promise<void>;
export declare function setKeyImage({ productId, imageId, }: {
    productId: string;
    imageId: string;
}): Promise<void>;
export declare function reorderImages({ productId, imageIds, }: {
    productId: string;
    imageIds: string[];
}): Promise<void>;
export declare function createVariant({ productId, color, size, skuGroup, }: {
    productId: string;
    color: string;
    size: string;
    skuGroup: string;
}): Promise<ProductVariant>;
export declare function softDeleteVariant({ id, productId, }: {
    id: string;
    productId: string;
}): Promise<void>;
export declare function upsertStylingGuide({ productId, type, linkUrl, contentJson, active, }: {
    productId: string;
    type: 'VIDEO' | 'GALLERY' | 'TEXT';
    linkUrl?: string | null;
    contentJson?: unknown;
    active?: boolean;
}): Promise<ProductStylingGuide>;
export declare function getBestsellerList(): Promise<Array<BestsellerEntry & ProductListItemRow>>;
export declare function addToBestsellerList({ productId, sortOrder, addedByAdminId, }: {
    productId: string;
    sortOrder?: number;
    addedByAdminId?: string | null;
}): Promise<BestsellerEntry>;
export declare function removeFromBestsellerList({ productId, }: {
    productId: string;
}): Promise<void>;
export declare function reorderBestsellerList({ orderedProductIds, }: {
    orderedProductIds: string[];
}): Promise<void>;
export declare function listBanners(): Promise<Banner[]>;
export declare function createBanner({ message, linkUrl, startAt, endAt, createdBy, }: {
    message: string;
    linkUrl?: string | null;
    startAt?: Date | null;
    endAt?: Date | null;
    createdBy?: string | null;
}): Promise<Banner>;
export declare function updateBanner({ id, data, }: {
    id: string;
    data: Partial<{
        message: string;
        linkUrl: string | null;
        enabled: boolean;
        startAt: Date | null;
        endAt: Date | null;
    }>;
}): Promise<Banner | null>;
export declare function enableBanner({ id }: {
    id: string;
}): Promise<Banner | null>;
export declare function disableBanner({ id }: {
    id: string;
}): Promise<Banner | null>;
//# sourceMappingURL=catalog.d.ts.map