"use strict";
/**
 * Catalog query functions — categories, products (view + tables), images, styling guides, bestsellers, banners.
 * No business logic. RORO. Return null for not-found. Use views where specified.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listCategories = listCategories;
exports.getCategoryBySlug = getCategoryBySlug;
exports.listProducts = listProducts;
exports.searchProducts = searchProducts;
exports.getFeaturedProducts = getFeaturedProducts;
exports.getProductBySlug = getProductBySlug;
exports.getVariantsWithStock = getVariantsWithStock;
exports.getRelatedProducts = getRelatedProducts;
exports.getActiveStylingGuide = getActiveStylingGuide;
exports.getActiveBanner = getActiveBanner;
exports.getProductById = getProductById;
exports.listAllProducts = listAllProducts;
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.softDeleteProduct = softDeleteProduct;
exports.createProductImage = createProductImage;
exports.deleteProductImage = deleteProductImage;
exports.setKeyImage = setKeyImage;
exports.reorderImages = reorderImages;
exports.createVariant = createVariant;
exports.softDeleteVariant = softDeleteVariant;
exports.upsertStylingGuide = upsertStylingGuide;
exports.getBestsellerList = getBestsellerList;
exports.addToBestsellerList = addToBestsellerList;
exports.removeFromBestsellerList = removeFromBestsellerList;
exports.reorderBestsellerList = reorderBestsellerList;
exports.listBanners = listBanners;
exports.createBanner = createBanner;
exports.updateBanner = updateBanner;
exports.enableBanner = enableBanner;
exports.disableBanner = disableBanner;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const catalog_schema_1 = require("../schema/catalog.schema");
const inventory_schema_1 = require("../schema/inventory.schema");
// —— Category queries ——
async function listCategories() {
    const rows = await client_1.db
        .select()
        .from(catalog_schema_1.categories)
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.categories.active, true))
        .orderBy((0, drizzle_orm_1.asc)(catalog_schema_1.categories.sortOrder), (0, drizzle_orm_1.asc)(catalog_schema_1.categories.name));
    return rows;
}
async function getCategoryBySlug({ slug, }) {
    const rows = await client_1.db
        .select()
        .from(catalog_schema_1.categories)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(catalog_schema_1.categories.slug, slug), (0, drizzle_orm_1.eq)(catalog_schema_1.categories.active, true)));
    return rows[0] ?? null;
}
// —— Storefront listing (view + stock aggregate) ——
const stockStatusSubquery = (0, drizzle_orm_1.sql) `
  SELECT va.product_id,
    CASE
      WHEN bool_or(va.stock_status = 'IN_STOCK') THEN 'IN_STOCK'
      WHEN bool_or(va.available_qty > 0) THEN 'LOW_STOCK'
      ELSE 'OUT_OF_STOCK'
    END AS stock_status
  FROM inventory.variant_availability va
  GROUP BY va.product_id
`;
function productListJoinForSort(sort) {
    if (sort === 'newest') {
        return (0, drizzle_orm_1.sql) `JOIN catalog.products p ON p.id = v.id`;
    }
    return (0, drizzle_orm_1.sql) ``;
}
function productListOrderBy({ sort, currency, }) {
    if (sort === 'newest') {
        return (0, drizzle_orm_1.sql) `ORDER BY p.created_at DESC, v.slug ASC`;
    }
    const priceCol = currency === 'LKR'
        ? (0, drizzle_orm_1.sql) `v.lkr_amount`
        : currency === 'SGD'
            ? (0, drizzle_orm_1.sql) `v.sgd_amount`
            : (0, drizzle_orm_1.sql) `v.usd_amount`;
    if (sort === 'price-asc') {
        return (0, drizzle_orm_1.sql) `ORDER BY ${priceCol} ASC, v.slug ASC`;
    }
    if (sort === 'price-desc') {
        return (0, drizzle_orm_1.sql) `ORDER BY ${priceCol} DESC, v.slug ASC`;
    }
    return (0, drizzle_orm_1.sql) `ORDER BY v.slug ASC`;
}
async function listProducts({ categorySlug, page = 1, limit = 24, currency, sort, }) {
    const offset = (page - 1) * limit;
    let total;
    if (categorySlug != null && categorySlug !== '') {
        const countResult = await client_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT count(*)::int AS total
      FROM catalog.active_products_with_prices v
      JOIN catalog.categories c ON c.id = v.category_id AND c.active = true AND c.slug = ${categorySlug}
    `);
        total = countResult.rows[0]?.total ?? 0;
    }
    else {
        const countResult = await client_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT count(*)::int AS total
      FROM catalog.active_products_with_prices v
    `);
        total = countResult.rows[0]?.total ?? 0;
    }
    const listResult = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      v.id,
      v.slug,
      v.display_name AS "displayName",
      v.short_name AS "shortName",
      v.is_sale AS "isSale",
      img.url AS "keyImageUrl",
      img.alt_text AS "keyImageAltText",
      v.lkr_amount AS "lkrAmount",
      v.sgd_amount AS "sgdAmount",
      v.usd_amount AS "usdAmount",
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus",
      COALESCE(var_agg.variants, '[]'::json) AS variants
    FROM catalog.active_products_with_prices v
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'variantId', va.variant_id,
          'color', va.color,
          'size', va.size,
          'availableQty', va.available_qty,
          'stockStatus', va.stock_status
        ) ORDER BY va.color, va.size
      ) AS variants
      FROM inventory.variant_availability va
      WHERE va.product_id = v.id
    ) var_agg ON true
    ${productListJoinForSort(sort)}
    ${categorySlug != null && categorySlug !== ''
        ? (0, drizzle_orm_1.sql) `JOIN catalog.categories c ON c.id = v.category_id AND c.active = true AND c.slug = ${categorySlug}`
        : (0, drizzle_orm_1.sql) ``}
    ${productListOrderBy({ sort, currency })}
    LIMIT ${limit}
    OFFSET ${offset}
  `);
    const rows = listResult.rows ?? [];
    const products = rows.map((r) => ({
        ...r,
        variants: typeof r.variants === 'string' ? JSON.parse(r.variants) : (r.variants ?? []),
    }));
    return { products, total };
}
async function searchProducts({ query, page = 1, limit = 24, currency, sort, }) {
    const offset = (page - 1) * limit;
    const pattern = `%${query}%`;
    const countResult = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT count(*)::int AS total
    FROM catalog.active_products_with_prices v
    WHERE (v.display_name ILIKE ${pattern} OR v.product_code ILIKE ${pattern})
  `);
    const total = countResult.rows[0]?.total ?? 0;
    const listResult = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      v.id,
      v.slug,
      v.display_name AS "displayName",
      v.short_name AS "shortName",
      v.is_sale AS "isSale",
      img.url AS "keyImageUrl",
      img.alt_text AS "keyImageAltText",
      v.lkr_amount AS "lkrAmount",
      v.sgd_amount AS "sgdAmount",
      v.usd_amount AS "usdAmount",
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus",
      COALESCE(var_agg.variants, '[]'::json) AS variants
    FROM catalog.active_products_with_prices v
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'variantId', va.variant_id,
          'color', va.color,
          'size', va.size,
          'availableQty', va.available_qty,
          'stockStatus', va.stock_status
        ) ORDER BY va.color, va.size
      ) AS variants
      FROM inventory.variant_availability va
      WHERE va.product_id = v.id
    ) var_agg ON true
    ${productListJoinForSort(sort)}
    WHERE (v.display_name ILIKE ${pattern} OR v.product_code ILIKE ${pattern})
    ${productListOrderBy({ sort, currency })}
    LIMIT ${limit}
    OFFSET ${offset}
  `);
    const rows = listResult.rows ?? [];
    const products = rows.map((r) => ({
        ...r,
        variants: typeof r.variants === 'string' ? JSON.parse(r.variants) : (r.variants ?? []),
    }));
    return { products, total };
}
async function getFeaturedProducts({ currency, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      v.id,
      v.slug,
      v.display_name AS "displayName",
      v.short_name AS "shortName",
      v.is_sale AS "isSale",
      img.url AS "keyImageUrl",
      img.alt_text AS "keyImageAltText",
      v.lkr_amount AS "lkrAmount",
      v.sgd_amount AS "sgdAmount",
      v.usd_amount AS "usdAmount",
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus",
      COALESCE(var_agg.variants, '[]'::json) AS variants
    FROM catalog.bestseller_list bl
    JOIN catalog.active_products_with_prices v ON v.id = bl.product_id
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'variantId', va.variant_id,
          'color', va.color,
          'size', va.size,
          'availableQty', va.available_qty,
          'stockStatus', va.stock_status
        ) ORDER BY va.color, va.size
      ) AS variants
      FROM inventory.variant_availability va
      WHERE va.product_id = v.id
    ) var_agg ON true
    ORDER BY bl.sort_order ASC, v.slug
  `);
    const rows = result.rows ?? [];
    return rows.map((r) => ({
        ...r,
        variants: typeof r.variants === 'string' ? JSON.parse(r.variants) : (r.variants ?? []),
    }));
}
// —— Product detail ——
async function getProductBySlug({ slug, currency, }) {
    const productRows = await client_1.db
        .select({
        id: catalog_schema_1.products.id,
        slug: catalog_schema_1.products.slug,
        displayName: catalog_schema_1.products.displayName,
        shortName: catalog_schema_1.products.shortName,
        description: catalog_schema_1.products.description,
        fabricInfo: catalog_schema_1.products.fabricInfo,
        isSale: catalog_schema_1.products.isSale,
        categoryId: catalog_schema_1.products.categoryId,
        lkrAmount: catalog_schema_1.productPrices.lkrAmount,
        sgdAmount: catalog_schema_1.productPrices.sgdAmount,
        usdAmount: catalog_schema_1.productPrices.usdAmount,
    })
        .from(catalog_schema_1.products)
        .innerJoin(catalog_schema_1.productPrices, (0, drizzle_orm_1.eq)(catalog_schema_1.productPrices.productId, catalog_schema_1.products.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(catalog_schema_1.products.slug, slug), (0, drizzle_orm_1.eq)(catalog_schema_1.products.active, true), (0, drizzle_orm_1.isNull)(catalog_schema_1.products.deletedAt)));
    const row = productRows[0];
    if (!row)
        return null;
    const imageRows = await client_1.db
        .select({
        id: catalog_schema_1.productImages.id,
        url: catalog_schema_1.productImages.url,
        altText: catalog_schema_1.productImages.altText,
        sortOrder: catalog_schema_1.productImages.sortOrder,
    })
        .from(catalog_schema_1.productImages)
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.productImages.productId, row.id))
        .orderBy((0, drizzle_orm_1.asc)(catalog_schema_1.productImages.sortOrder));
    let category = null;
    if (row.categoryId) {
        const catRows = await client_1.db
            .select()
            .from(catalog_schema_1.categories)
            .where((0, drizzle_orm_1.eq)(catalog_schema_1.categories.id, row.categoryId));
        category = catRows[0] ?? null;
    }
    const lkr = typeof row.lkrAmount === 'string' ? row.lkrAmount : String(row.lkrAmount);
    const sgd = typeof row.sgdAmount === 'string' ? row.sgdAmount : String(row.sgdAmount);
    const usd = typeof row.usdAmount === 'string' ? row.usdAmount : String(row.usdAmount);
    return {
        id: row.id,
        slug: row.slug,
        displayName: row.displayName,
        shortName: row.shortName,
        description: row.description,
        fabricInfo: row.fabricInfo,
        isSale: row.isSale,
        lkrAmount: lkr,
        sgdAmount: sgd,
        usdAmount: usd,
        images: imageRows.map((img) => ({
            id: img.id,
            url: img.url,
            altText: img.altText,
            sortOrder: img.sortOrder,
        })),
        category,
    };
}
async function getVariantsWithStock({ productId, }) {
    const rows = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      va.variant_id AS "variantId",
      va.color,
      va.size,
      va.available_qty AS "availableQty",
      va.stock_status AS "stockStatus",
      va.low_stock_threshold AS "lowStockThreshold"
    FROM inventory.variant_availability va
    WHERE va.product_id = ${productId}
  `);
    return rows.rows ?? [];
}
async function getRelatedProducts({ productId, currency, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      v.id,
      v.slug,
      v.display_name AS "displayName",
      v.short_name AS "shortName",
      v.is_sale AS "isSale",
      img.url AS "keyImageUrl",
      img.alt_text AS "keyImageAltText",
      v.lkr_amount AS "lkrAmount",
      v.sgd_amount AS "sgdAmount",
      v.usd_amount AS "usdAmount",
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus",
      COALESCE(var_agg.variants, '[]'::json) AS variants
    FROM catalog.product_relations pr
    JOIN catalog.active_products_with_prices v ON v.id = pr.related_product_id
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    LEFT JOIN LATERAL (
      SELECT json_agg(
        json_build_object(
          'variantId', va.variant_id,
          'color', va.color,
          'size', va.size,
          'availableQty', va.available_qty,
          'stockStatus', va.stock_status
        ) ORDER BY va.color, va.size
      ) AS variants
      FROM inventory.variant_availability va
      WHERE va.product_id = v.id
    ) var_agg ON true
    WHERE pr.product_id = ${productId}
    ORDER BY v.slug
    LIMIT 8
  `);
    const rows = result.rows ?? [];
    return rows.map((r) => ({
        ...r,
        variants: typeof r.variants === 'string' ? JSON.parse(r.variants) : (r.variants ?? []),
    }));
}
async function getActiveStylingGuide({ productId, }) {
    const rows = await client_1.db
        .select()
        .from(catalog_schema_1.productStylingGuides)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(catalog_schema_1.productStylingGuides.productId, productId), (0, drizzle_orm_1.eq)(catalog_schema_1.productStylingGuides.active, true)));
    return rows[0] ?? null;
}
// —— Banner ——
async function getActiveBanner() {
    const rows = await client_1.db
        .select()
        .from(catalog_schema_1.banners)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(catalog_schema_1.banners.enabled, true), (0, drizzle_orm_1.sql) `(${catalog_schema_1.banners.startAt} IS NULL OR ${catalog_schema_1.banners.startAt} <= now())`, (0, drizzle_orm_1.sql) `(${catalog_schema_1.banners.endAt} IS NULL OR ${catalog_schema_1.banners.endAt} > now())`))
        .orderBy((0, drizzle_orm_1.desc)(catalog_schema_1.banners.createdAt))
        .limit(1);
    return rows[0] ?? null;
}
// —— Admin product queries ——
async function getProductById({ id, }) {
    const productRows = await client_1.db
        .select()
        .from(catalog_schema_1.products)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(catalog_schema_1.products.id, id), (0, drizzle_orm_1.isNull)(catalog_schema_1.products.deletedAt)));
    const product = productRows[0];
    if (!product)
        return null;
    const [priceRow] = await client_1.db
        .select()
        .from(catalog_schema_1.productPrices)
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.productPrices.productId, id));
    const imageRows = await client_1.db
        .select()
        .from(catalog_schema_1.productImages)
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.productImages.productId, id))
        .orderBy((0, drizzle_orm_1.asc)(catalog_schema_1.productImages.sortOrder));
    if (!priceRow)
        return null;
    return {
        ...product,
        prices: priceRow,
        images: imageRows,
    };
}
async function listAllProducts({ page = 1, limit = 50, includeInactive = false, }) {
    const offset = (page - 1) * limit;
    const baseWhere = (0, drizzle_orm_1.isNull)(catalog_schema_1.products.deletedAt);
    const where = includeInactive
        ? baseWhere
        : (0, drizzle_orm_1.and)(baseWhere, (0, drizzle_orm_1.eq)(catalog_schema_1.products.active, true));
    const countResult = await client_1.db
        .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
        .from(catalog_schema_1.products)
        .where(where);
    const total = countResult[0]?.count ?? 0;
    const productRows = await client_1.db
        .select()
        .from(catalog_schema_1.products)
        .where(where)
        .orderBy((0, drizzle_orm_1.desc)(catalog_schema_1.products.updatedAt))
        .limit(limit)
        .offset(offset);
    const result = [];
    for (const p of productRows) {
        const [priceRow] = await client_1.db
            .select()
            .from(catalog_schema_1.productPrices)
            .where((0, drizzle_orm_1.eq)(catalog_schema_1.productPrices.productId, p.id));
        const imageRows = await client_1.db
            .select()
            .from(catalog_schema_1.productImages)
            .where((0, drizzle_orm_1.eq)(catalog_schema_1.productImages.productId, p.id))
            .orderBy((0, drizzle_orm_1.asc)(catalog_schema_1.productImages.sortOrder));
        const variantCountResult = await client_1.db
            .select({ count: (0, drizzle_orm_1.sql) `count(*)::int` })
            .from(inventory_schema_1.productVariants)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(inventory_schema_1.productVariants.product_id, p.id), (0, drizzle_orm_1.isNull)(inventory_schema_1.productVariants.deleted_at)));
        const variantCount = variantCountResult[0]?.count ?? 0;
        if (priceRow) {
            result.push({
                ...p,
                prices: priceRow,
                images: imageRows,
                variantCount,
            });
        }
    }
    return { products: result, total };
}
async function createProduct({ categoryId, slug, displayName, shortName, description, fabricInfo, productCode, active, isSale, prices, }) {
    return await client_1.db.transaction(async (tx) => {
        const [product] = await tx
            .insert(catalog_schema_1.products)
            .values({
            categoryId: categoryId ?? null,
            slug,
            displayName,
            shortName,
            description: description ?? null,
            fabricInfo: fabricInfo ?? null,
            productCode,
            active,
            isSale,
        })
            .returning();
        if (!product)
            throw new Error('createProduct: no row returned');
        const [priceRow] = await tx
            .insert(catalog_schema_1.productPrices)
            .values({
            productId: product.id,
            lkrAmount: prices.lkrAmount,
            sgdAmount: prices.sgdAmount,
            usdAmount: prices.usdAmount,
        })
            .returning();
        if (!priceRow)
            throw new Error('createProduct: price insert failed');
        return { ...product, prices: priceRow };
    });
}
async function updateProduct({ id, data, }) {
    const { lkrAmount, sgdAmount, usdAmount, ...productData } = data;
    await client_1.db.transaction(async (tx) => {
        const updatePayload = { ...productData, updatedAt: new Date() };
        if (Object.keys(updatePayload).length > 1) {
            await tx.update(catalog_schema_1.products).set(updatePayload).where((0, drizzle_orm_1.eq)(catalog_schema_1.products.id, id));
        }
        if (lkrAmount !== undefined ||
            sgdAmount !== undefined ||
            usdAmount !== undefined) {
            const priceUpdate = { updatedAt: new Date() };
            if (lkrAmount !== undefined)
                priceUpdate.lkrAmount = lkrAmount;
            if (sgdAmount !== undefined)
                priceUpdate.sgdAmount = sgdAmount;
            if (usdAmount !== undefined)
                priceUpdate.usdAmount = usdAmount;
            await tx
                .update(catalog_schema_1.productPrices)
                .set(priceUpdate)
                .where((0, drizzle_orm_1.eq)(catalog_schema_1.productPrices.productId, id));
        }
    });
    return getProductById({ id });
}
async function softDeleteProduct({ id }) {
    await client_1.db
        .update(catalog_schema_1.products)
        .set({ deletedAt: new Date(), active: false, updatedAt: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(catalog_schema_1.products.id, id), (0, drizzle_orm_1.isNull)(catalog_schema_1.products.deletedAt)));
}
async function createProductImage({ productId, url, altText, sortOrder = 0, }) {
    const [row] = await client_1.db
        .insert(catalog_schema_1.productImages)
        .values({ productId, url, altText: altText ?? null, sortOrder })
        .returning();
    if (!row)
        throw new Error('createProductImage: no row returned');
    return row;
}
async function deleteProductImage({ id, productId, }) {
    await client_1.db
        .delete(catalog_schema_1.productImages)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(catalog_schema_1.productImages.id, id), (0, drizzle_orm_1.eq)(catalog_schema_1.productImages.productId, productId)));
}
async function setKeyImage({ productId, imageId, }) {
    await client_1.db
        .update(catalog_schema_1.products)
        .set({ keyImageId: imageId, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.products.id, productId));
}
async function reorderImages({ productId, imageIds, }) {
    await client_1.db.transaction(async (tx) => {
        for (let i = 0; i < imageIds.length; i++) {
            await tx
                .update(catalog_schema_1.productImages)
                .set({ sortOrder: i })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(catalog_schema_1.productImages.id, imageIds[i]), (0, drizzle_orm_1.eq)(catalog_schema_1.productImages.productId, productId)));
        }
    });
}
async function createVariant({ productId, color, size, skuGroup, }) {
    return await client_1.db.transaction(async (tx) => {
        const [variant] = await tx
            .insert(inventory_schema_1.productVariants)
            .values({
            product_id: productId,
            color,
            size,
            sku_group: skuGroup,
        })
            .returning();
        if (!variant)
            throw new Error('createVariant: no row returned');
        await tx.insert(inventory_schema_1.variantStock).values({
            variant_id: variant.id,
        });
        return variant;
    });
}
async function softDeleteVariant({ id, productId, }) {
    await client_1.db
        .update(inventory_schema_1.productVariants)
        .set({ deleted_at: new Date(), updated_at: new Date() })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(inventory_schema_1.productVariants.id, id), (0, drizzle_orm_1.eq)(inventory_schema_1.productVariants.product_id, productId)));
}
async function upsertStylingGuide({ productId, type, linkUrl, contentJson, active = true, }) {
    const existing = await client_1.db
        .select()
        .from(catalog_schema_1.productStylingGuides)
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.productStylingGuides.productId, productId));
    if (existing[0]) {
        const [updated] = await client_1.db
            .update(catalog_schema_1.productStylingGuides)
            .set({
            type,
            linkUrl: linkUrl ?? null,
            contentJson: contentJson ?? null,
            active,
            updatedAt: new Date(),
        })
            .where((0, drizzle_orm_1.eq)(catalog_schema_1.productStylingGuides.productId, productId))
            .returning();
        if (!updated)
            throw new Error('upsertStylingGuide: update failed');
        return updated;
    }
    const [inserted] = await client_1.db
        .insert(catalog_schema_1.productStylingGuides)
        .values({
        productId,
        type,
        linkUrl: linkUrl ?? null,
        contentJson: contentJson ?? null,
        active,
    })
        .returning();
    if (!inserted)
        throw new Error('upsertStylingGuide: insert failed');
    return inserted;
}
async function getBestsellerList() {
    const rows = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      bl.id,
      bl.product_id AS "productId",
      bl.sort_order AS "sortOrder",
      bl.added_by_admin_id AS "addedByAdminId",
      bl.added_at AS "addedAt",
      v.slug,
      v.display_name AS "displayName",
      v.short_name AS "shortName",
      v.is_sale AS "isSale",
      img.url AS "keyImageUrl",
      img.alt_text AS "keyImageAltText",
      v.lkr_amount AS "lkrAmount",
      v.sgd_amount AS "sgdAmount",
      v.usd_amount AS "usdAmount",
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus"
    FROM catalog.bestseller_list bl
    JOIN catalog.active_products_with_prices v ON v.id = bl.product_id
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    ORDER BY bl.sort_order ASC
  `);
    return rows.rows ?? [];
}
async function addToBestsellerList({ productId, sortOrder = 0, addedByAdminId, }) {
    const [row] = await client_1.db
        .insert(catalog_schema_1.bestsellerList)
        .values({
        productId,
        sortOrder,
        addedByAdminId: addedByAdminId ?? null,
    })
        .returning();
    if (!row)
        throw new Error('addToBestsellerList: no row returned');
    return row;
}
async function removeFromBestsellerList({ productId, }) {
    await client_1.db.delete(catalog_schema_1.bestsellerList).where((0, drizzle_orm_1.eq)(catalog_schema_1.bestsellerList.productId, productId));
}
async function reorderBestsellerList({ orderedProductIds, }) {
    await client_1.db.transaction(async (tx) => {
        for (let i = 0; i < orderedProductIds.length; i++) {
            await tx
                .update(catalog_schema_1.bestsellerList)
                .set({ sortOrder: i })
                .where((0, drizzle_orm_1.eq)(catalog_schema_1.bestsellerList.productId, orderedProductIds[i]));
        }
    });
}
async function listBanners() {
    return await client_1.db
        .select()
        .from(catalog_schema_1.banners)
        .orderBy((0, drizzle_orm_1.desc)(catalog_schema_1.banners.createdAt));
}
async function createBanner({ message, linkUrl, startAt, endAt, createdBy, }) {
    const [row] = await client_1.db
        .insert(catalog_schema_1.banners)
        .values({
        message,
        linkUrl: linkUrl ?? null,
        enabled: false,
        startAt: startAt ?? null,
        endAt: endAt ?? null,
        createdBy: createdBy ?? null,
    })
        .returning();
    if (!row)
        throw new Error('createBanner: no row returned');
    return row;
}
async function updateBanner({ id, data, }) {
    const [row] = await client_1.db
        .update(catalog_schema_1.banners)
        .set({ ...data, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.banners.id, id))
        .returning();
    return row ?? null;
}
async function enableBanner({ id }) {
    const [row] = await client_1.db
        .update(catalog_schema_1.banners)
        .set({ enabled: true, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.banners.id, id))
        .returning();
    return row ?? null;
}
async function disableBanner({ id }) {
    const [row] = await client_1.db
        .update(catalog_schema_1.banners)
        .set({ enabled: false, updatedAt: new Date() })
        .where((0, drizzle_orm_1.eq)(catalog_schema_1.banners.id, id))
        .returning();
    return row ?? null;
}
