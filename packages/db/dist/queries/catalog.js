/**
 * Catalog query functions — categories, products (view + tables), images, styling guides, bestsellers, banners.
 * No business logic. RORO. Return null for not-found. Use views where specified.
 */
import { eq, and, isNull, asc, desc, sql } from 'drizzle-orm';
import { db } from '../client';
import { categories, products, productPrices, productImages, productStylingGuides, bestsellerList, banners, } from '../schema/catalog.schema';
import { productVariants, variantStock } from '../schema/inventory.schema';
// —— Category queries ——
export async function listCategories() {
    const rows = await db
        .select()
        .from(categories)
        .where(eq(categories.active, true))
        .orderBy(asc(categories.sortOrder), asc(categories.name));
    return rows;
}
export async function getCategoryBySlug({ slug, }) {
    const rows = await db
        .select()
        .from(categories)
        .where(and(eq(categories.slug, slug), eq(categories.active, true)));
    return rows[0] ?? null;
}
// —— Storefront listing (view + stock aggregate) ——
const stockStatusSubquery = sql `
  SELECT va.product_id,
    CASE
      WHEN bool_or(va.stock_status = 'IN_STOCK') THEN 'IN_STOCK'
      WHEN bool_or(va.available_qty > 0) THEN 'LOW_STOCK'
      ELSE 'OUT_OF_STOCK'
    END AS stock_status
  FROM inventory.variant_availability va
  GROUP BY va.product_id
`;
export async function listProducts({ categorySlug, page = 1, limit = 24, currency, }) {
    const offset = (page - 1) * limit;
    let total;
    if (categorySlug != null && categorySlug !== '') {
        const countResult = await db.execute(sql `
      SELECT count(*)::int AS total
      FROM catalog.active_products_with_prices v
      JOIN catalog.categories c ON c.id = v.category_id AND c.active = true AND c.slug = ${categorySlug}
    `);
        total = countResult.rows[0]?.total ?? 0;
    }
    else {
        const countResult = await db.execute(sql `
      SELECT count(*)::int AS total
      FROM catalog.active_products_with_prices v
    `);
        total = countResult.rows[0]?.total ?? 0;
    }
    const listResult = await db.execute(sql `
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
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus"
    FROM catalog.active_products_with_prices v
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    ${categorySlug != null && categorySlug !== ''
        ? sql `JOIN catalog.categories c ON c.id = v.category_id AND c.active = true AND c.slug = ${categorySlug}`
        : sql ``}
    ORDER BY v.slug
    LIMIT ${limit}
    OFFSET ${offset}
  `);
    const products = listResult.rows ?? [];
    return { products, total };
}
export async function searchProducts({ query, page = 1, limit = 24, currency, }) {
    const offset = (page - 1) * limit;
    const pattern = `%${query}%`;
    const countResult = await db.execute(sql `
    SELECT count(*)::int AS total
    FROM catalog.active_products_with_prices v
    WHERE (v.display_name ILIKE ${pattern} OR v.product_code ILIKE ${pattern})
  `);
    const total = countResult.rows[0]?.total ?? 0;
    const listResult = await db.execute(sql `
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
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus"
    FROM catalog.active_products_with_prices v
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    WHERE (v.display_name ILIKE ${pattern} OR v.product_code ILIKE ${pattern})
    ORDER BY v.slug
    LIMIT ${limit}
    OFFSET ${offset}
  `);
    const products = listResult.rows ?? [];
    return { products, total };
}
export async function getFeaturedProducts({ currency, }) {
    const rows = await db.execute(sql `
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
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus"
    FROM catalog.bestseller_list bl
    JOIN catalog.active_products_with_prices v ON v.id = bl.product_id
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    ORDER BY bl.sort_order ASC, v.slug
  `);
    return rows.rows ?? [];
}
// —— Product detail ——
export async function getProductBySlug({ slug, currency, }) {
    const productRows = await db
        .select({
        id: products.id,
        slug: products.slug,
        displayName: products.displayName,
        shortName: products.shortName,
        description: products.description,
        fabricInfo: products.fabricInfo,
        isSale: products.isSale,
        categoryId: products.categoryId,
        lkrAmount: productPrices.lkrAmount,
        sgdAmount: productPrices.sgdAmount,
        usdAmount: productPrices.usdAmount,
    })
        .from(products)
        .innerJoin(productPrices, eq(productPrices.productId, products.id))
        .where(and(eq(products.slug, slug), eq(products.active, true), isNull(products.deletedAt)));
    const row = productRows[0];
    if (!row)
        return null;
    const imageRows = await db
        .select({
        id: productImages.id,
        url: productImages.url,
        altText: productImages.altText,
        sortOrder: productImages.sortOrder,
    })
        .from(productImages)
        .where(eq(productImages.productId, row.id))
        .orderBy(asc(productImages.sortOrder));
    let category = null;
    if (row.categoryId) {
        const catRows = await db
            .select()
            .from(categories)
            .where(eq(categories.id, row.categoryId));
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
export async function getVariantsWithStock({ productId, }) {
    const rows = await db.execute(sql `
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
export async function getRelatedProducts({ productId, currency, }) {
    const rows = await db.execute(sql `
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
      COALESCE(agg.stock_status, 'OUT_OF_STOCK') AS "stockStatus"
    FROM catalog.product_relations pr
    JOIN catalog.active_products_with_prices v ON v.id = pr.related_product_id
    LEFT JOIN catalog.product_images img ON img.id = v.key_image_id
    LEFT JOIN (${stockStatusSubquery}) agg ON agg.product_id = v.id
    WHERE pr.product_id = ${productId}
    ORDER BY v.slug
    LIMIT 8
  `);
    return rows.rows ?? [];
}
export async function getActiveStylingGuide({ productId, }) {
    const rows = await db
        .select()
        .from(productStylingGuides)
        .where(and(eq(productStylingGuides.productId, productId), eq(productStylingGuides.active, true)));
    return rows[0] ?? null;
}
// —— Banner ——
export async function getActiveBanner() {
    const rows = await db
        .select()
        .from(banners)
        .where(and(eq(banners.enabled, true), sql `(${banners.startAt} IS NULL OR ${banners.startAt} <= now())`, sql `(${banners.endAt} IS NULL OR ${banners.endAt} > now())`))
        .orderBy(desc(banners.createdAt))
        .limit(1);
    return rows[0] ?? null;
}
// —— Admin product queries ——
export async function getProductById({ id, }) {
    const productRows = await db
        .select()
        .from(products)
        .where(and(eq(products.id, id), isNull(products.deletedAt)));
    const product = productRows[0];
    if (!product)
        return null;
    const [priceRow] = await db
        .select()
        .from(productPrices)
        .where(eq(productPrices.productId, id));
    const imageRows = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, id))
        .orderBy(asc(productImages.sortOrder));
    if (!priceRow)
        return null;
    return {
        ...product,
        prices: priceRow,
        images: imageRows,
    };
}
export async function listAllProducts({ page = 1, limit = 50, includeInactive = false, }) {
    const offset = (page - 1) * limit;
    const baseWhere = isNull(products.deletedAt);
    const where = includeInactive
        ? baseWhere
        : and(baseWhere, eq(products.active, true));
    const countResult = await db
        .select({ count: sql `count(*)::int` })
        .from(products)
        .where(where);
    const total = countResult[0]?.count ?? 0;
    const productRows = await db
        .select()
        .from(products)
        .where(where)
        .orderBy(desc(products.updatedAt))
        .limit(limit)
        .offset(offset);
    const result = [];
    for (const p of productRows) {
        const [priceRow] = await db
            .select()
            .from(productPrices)
            .where(eq(productPrices.productId, p.id));
        const imageRows = await db
            .select()
            .from(productImages)
            .where(eq(productImages.productId, p.id))
            .orderBy(asc(productImages.sortOrder));
        const variantCountResult = await db
            .select({ count: sql `count(*)::int` })
            .from(productVariants)
            .where(and(eq(productVariants.product_id, p.id), isNull(productVariants.deleted_at)));
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
export async function createProduct({ categoryId, slug, displayName, shortName, description, fabricInfo, productCode, active, isSale, prices, }) {
    return await db.transaction(async (tx) => {
        const [product] = await tx
            .insert(products)
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
            .insert(productPrices)
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
export async function updateProduct({ id, data, }) {
    const { lkrAmount, sgdAmount, usdAmount, ...productData } = data;
    await db.transaction(async (tx) => {
        const updatePayload = { ...productData, updatedAt: new Date() };
        if (Object.keys(updatePayload).length > 1) {
            await tx.update(products).set(updatePayload).where(eq(products.id, id));
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
                .update(productPrices)
                .set(priceUpdate)
                .where(eq(productPrices.productId, id));
        }
    });
    return getProductById({ id });
}
export async function softDeleteProduct({ id }) {
    await db
        .update(products)
        .set({ deletedAt: new Date(), active: false, updatedAt: new Date() })
        .where(and(eq(products.id, id), isNull(products.deletedAt)));
}
export async function createProductImage({ productId, url, altText, sortOrder = 0, }) {
    const [row] = await db
        .insert(productImages)
        .values({ productId, url, altText: altText ?? null, sortOrder })
        .returning();
    if (!row)
        throw new Error('createProductImage: no row returned');
    return row;
}
export async function deleteProductImage({ id, productId, }) {
    await db
        .delete(productImages)
        .where(and(eq(productImages.id, id), eq(productImages.productId, productId)));
}
export async function setKeyImage({ productId, imageId, }) {
    await db
        .update(products)
        .set({ keyImageId: imageId, updatedAt: new Date() })
        .where(eq(products.id, productId));
}
export async function reorderImages({ productId, imageIds, }) {
    await db.transaction(async (tx) => {
        for (let i = 0; i < imageIds.length; i++) {
            await tx
                .update(productImages)
                .set({ sortOrder: i })
                .where(and(eq(productImages.id, imageIds[i]), eq(productImages.productId, productId)));
        }
    });
}
export async function createVariant({ productId, color, size, skuGroup, }) {
    return await db.transaction(async (tx) => {
        const [variant] = await tx
            .insert(productVariants)
            .values({
            product_id: productId,
            color,
            size,
            sku_group: skuGroup,
        })
            .returning();
        if (!variant)
            throw new Error('createVariant: no row returned');
        await tx.insert(variantStock).values({
            variant_id: variant.id,
        });
        return variant;
    });
}
export async function softDeleteVariant({ id, productId, }) {
    await db
        .update(productVariants)
        .set({ deleted_at: new Date(), updated_at: new Date() })
        .where(and(eq(productVariants.id, id), eq(productVariants.product_id, productId)));
}
export async function upsertStylingGuide({ productId, type, linkUrl, contentJson, active = true, }) {
    const existing = await db
        .select()
        .from(productStylingGuides)
        .where(eq(productStylingGuides.productId, productId));
    if (existing[0]) {
        const [updated] = await db
            .update(productStylingGuides)
            .set({
            type,
            linkUrl: linkUrl ?? null,
            contentJson: contentJson ?? null,
            active,
            updatedAt: new Date(),
        })
            .where(eq(productStylingGuides.productId, productId))
            .returning();
        if (!updated)
            throw new Error('upsertStylingGuide: update failed');
        return updated;
    }
    const [inserted] = await db
        .insert(productStylingGuides)
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
export async function getBestsellerList() {
    const rows = await db.execute(sql `
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
export async function addToBestsellerList({ productId, sortOrder = 0, addedByAdminId, }) {
    const [row] = await db
        .insert(bestsellerList)
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
export async function removeFromBestsellerList({ productId, }) {
    await db.delete(bestsellerList).where(eq(bestsellerList.productId, productId));
}
export async function reorderBestsellerList({ orderedProductIds, }) {
    await db.transaction(async (tx) => {
        for (let i = 0; i < orderedProductIds.length; i++) {
            await tx
                .update(bestsellerList)
                .set({ sortOrder: i })
                .where(eq(bestsellerList.productId, orderedProductIds[i]));
        }
    });
}
export async function listBanners() {
    return await db
        .select()
        .from(banners)
        .orderBy(desc(banners.createdAt));
}
export async function createBanner({ message, linkUrl, startAt, endAt, createdBy, }) {
    const [row] = await db
        .insert(banners)
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
export async function updateBanner({ id, data, }) {
    const [row] = await db
        .update(banners)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(banners.id, id))
        .returning();
    return row ?? null;
}
export async function enableBanner({ id }) {
    const [row] = await db
        .update(banners)
        .set({ enabled: true, updatedAt: new Date() })
        .where(eq(banners.id, id))
        .returning();
    return row ?? null;
}
export async function disableBanner({ id }) {
    const [row] = await db
        .update(banners)
        .set({ enabled: false, updatedAt: new Date() })
        .where(eq(banners.id, id))
        .returning();
    return row ?? null;
}
