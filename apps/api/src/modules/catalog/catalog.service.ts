/**
 * Catalog service — business logic, validation, currency resolution.
 * RORO. Uses query functions from @modett/db. Throws AppError for expected failures.
 */

import type { CurrencyCode } from '@modett/types'
import { AppError } from '../../lib/errors'
import {
  listCategories,
  getCategoryBySlug,
  listProducts as listProductsQuery,
  searchProducts as searchProductsQuery,
  getFeaturedProducts,
  getProductBySlug,
  getVariantsWithStock,
  getRelatedProducts,
  getActiveStylingGuide,
  getActiveBanner,
  getProductById,
  listAllProducts,
  listAllCategoriesAdmin,
  insertCategory,
  updateCategoryById,
  deleteCategoryById,
  createProduct,
  updateProduct,
  softDeleteProduct,
  createProductImage,
  deleteProductImage,
  updateProductImageById,
  setKeyImage,
  reorderImages,
  createVariant,
  softDeleteVariant,
  listProductVariantsWithStockForAdmin,
  upsertStylingGuide,
  getBestsellerList,
  addToBestsellerList,
  removeFromBestsellerList,
  reorderBestsellerList,
  listBanners,
  createBanner,
  updateBanner,
  enableBanner,
  disableBanner,
  deleteBanner,
} from '@modett/db'
import type {
  ProductListItemRow,
  ProductDetailRow,
  VariantWithStockRow,
  ProductListSort,
} from '@modett/db'
import type { Category, ProductImage, ProductStylingGuide, Banner } from '@modett/db'
import { getStorageService } from '../../infrastructure/storage'
import { StorageError } from '../../infrastructure/storage'

export interface Money {
  amount: string
  currency: CurrencyCode
}

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function resolvePriceForCurrency({
  lkrAmount,
  sgdAmount,
  usdAmount,
  currency,
}: {
  lkrAmount: string
  sgdAmount: string
  usdAmount: string
  currency: CurrencyCode
}): Money {
  const amount =
    currency === 'LKR'
      ? (typeof lkrAmount === 'string' ? lkrAmount : String(lkrAmount))
      : currency === 'SGD'
        ? (typeof sgdAmount === 'string' ? sgdAmount : String(sgdAmount))
        : (typeof usdAmount === 'string' ? usdAmount : String(usdAmount))
  return { amount, currency }
}

export interface ProductListVariant {
  variantId: string
  color: string
  size: string
  availableQty: number
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
}

export interface ProductListItem {
  id: string
  slug: string
  displayName: string
  shortName: string
  isSale: boolean
  keyImage: { url: string; altText: string | null } | null
  /** Next gallery image after the key image — used for card hover / touch peek */
  hoverImage: { url: string; altText: string | null } | null
  price: Money
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  variants: ProductListVariant[]
}

export interface VariantWithStock {
  variantId: string
  color: string
  size: string
  availableQty: number
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  lowStockThreshold: number
}

export interface ProductDetail {
  id: string
  slug: string
  displayName: string
  shortName: string
  description: string | null
  fabricInfo: string | null
  isSale: boolean
  price: Money
  images: Array<{ id: string; url: string; altText: string | null; sortOrder: number }>
  variants: VariantWithStock[]
  relatedProducts: ProductListItem[]
  stylingGuide: ProductStylingGuide | null
  category: Category | null
}

function rowToProductListItem(
  row: ProductListItemRow,
  currency: CurrencyCode,
): ProductListItem {
  return {
    id: row.id,
    slug: row.slug,
    displayName: row.displayName,
    shortName: row.shortName,
    isSale: row.isSale,
    keyImage:
      row.keyImageUrl != null
        ? { url: row.keyImageUrl, altText: row.keyImageAltText }
        : null,
    hoverImage:
      row.hoverImageUrl != null
        ? { url: row.hoverImageUrl, altText: row.hoverImageAltText }
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
  }
}

// —— Storefront ——

export async function getCategories(): Promise<Category[]> {
  return listCategories()
}

export async function getProductListing({
  categorySlug,
  page = 1,
  limit = 24,
  currency = 'LKR',
  sort,
}: {
  categorySlug?: string | null
  page?: number
  limit?: number
  currency?: CurrencyCode
  sort?: ProductListSort
}): Promise<{
  products: ProductListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { products, total } = await listProductsQuery({
    categorySlug,
    page,
    limit,
    currency,
    sort,
  })
  const totalPages = Math.ceil(total / limit) || 1
  return {
    products: products.map((r) => rowToProductListItem(r, currency)),
    total,
    page,
    limit,
    totalPages,
  }
}

export async function searchProducts({
  query,
  page = 1,
  limit = 24,
  currency = 'LKR',
  sort,
}: {
  query: string
  page?: number
  limit?: number
  currency?: CurrencyCode
  sort?: ProductListSort
}): Promise<{
  products: ProductListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  if (!query || query.trim().length < 2) {
    throw new AppError('QUERY_TOO_SHORT', 400)
  }
  const { products, total } = await searchProductsQuery({
    query: query.trim(),
    page,
    limit,
    currency,
    sort,
  })
  const totalPages = Math.ceil(total / limit) || 1
  return {
    products: products.map((r) => rowToProductListItem(r, currency)),
    total,
    page,
    limit,
    totalPages,
  }
}

export async function getProductDetail({
  slug,
  currency = 'LKR',
}: {
  slug: string
  currency?: CurrencyCode
}): Promise<ProductDetail> {
  const product = await getProductBySlug({ slug, currency })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)

  const [variants, relatedRows, stylingGuide] = await Promise.all([
    getVariantsWithStock({ productId: product.id }),
    getRelatedProducts({ productId: product.id, currency }),
    getActiveStylingGuide({ productId: product.id }),
  ])

  const variantsMapped: VariantWithStock[] = variants.map((v: VariantWithStockRow) => ({
    variantId: v.variantId,
    color: v.color,
    size: v.size,
    availableQty: v.availableQty,
    stockStatus: v.stockStatus,
    lowStockThreshold: v.lowStockThreshold,
  }))

  const relatedProducts = relatedRows.map((r) => rowToProductListItem(r, currency))

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
  }
}

export async function getHomepage({
  currency = 'LKR',
}: {
  currency?: CurrencyCode
}): Promise<{
  featuredProducts: ProductListItem[]
  banner: Banner | null
}> {
  const [featuredRows, banner] = await Promise.all([
    getFeaturedProducts({ currency }),
    getActiveBanner(),
  ])
  const featuredProducts = featuredRows.map((r) => rowToProductListItem(r, currency))
  return { featuredProducts, banner }
}

// —— Admin ——

function numericToPriceString(v: unknown): string {
  if (v == null) return '0.00'
  if (typeof v === 'string') return v
  const n = Number(v)
  return Number.isFinite(n) ? n.toFixed(2) : '0.00'
}

export async function adminGetAllProducts({
  page = 1,
  limit = 50,
  includeInactive = false,
  categoryId,
  search,
}: {
  page?: number
  limit?: number
  includeInactive?: boolean
  categoryId?: string | null
  search?: string | null
}): Promise<{
  products: Array<{
    id: string
    slug: string
    displayName: string
    shortName: string
    productCode: string
    active: boolean
    isSale: boolean
    categoryId: string | null
    categoryName: string | null
    keyImageUrl: string | null
    prices: {
      lkrAmount: string
      sgdAmount: string
      usdAmount: string
      updatedAt: string
    }
    variantCount: number
    createdAt: string
    updatedAt: string
    deletedAt: string | null
  }>
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { products, total } = await listAllProducts({
    page,
    limit,
    includeInactive,
    categoryId: categoryId ?? undefined,
    search: search ?? undefined,
  })
  const totalPages = Math.ceil(total / limit) || 1
  const mapped = products.map((p) => {
    const keyImg =
      p.keyImageId != null
        ? p.images.find((i) => i.id === p.keyImageId)
        : undefined
    const keyImageUrl = keyImg?.url ?? p.images[0]?.url ?? null
    return {
      id: p.id,
      slug: p.slug,
      displayName: p.displayName,
      shortName: p.shortName,
      productCode: p.productCode,
      active: p.active,
      isSale: p.isSale,
      categoryId: p.categoryId ?? null,
      categoryName: p.categoryName ?? null,
      keyImageUrl,
      prices: {
        lkrAmount: numericToPriceString(p.prices.lkrAmount),
        sgdAmount: numericToPriceString(p.prices.sgdAmount),
        usdAmount: numericToPriceString(p.prices.usdAmount),
        updatedAt: p.prices.updatedAt.toISOString(),
      },
      variantCount: p.variantCount,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      deletedAt: p.deletedAt?.toISOString() ?? null,
    }
  })
  return { products: mapped, total, page, limit, totalPages }
}

export interface AdminProductDetailPayload {
  id: string
  slug: string
  displayName: string
  shortName: string
  description: string | null
  fabricInfo: string | null
  productCode: string
  active: boolean
  isSale: boolean
  categoryId: string | null
  keyImageId: string | null
  prices: {
    lkrAmount: string
    sgdAmount: string
    usdAmount: string
    updatedAt: string
  } | null
  images: Array<{
    id: string
    productId: string
    url: string
    altText: string | null
    sortOrder: number
  }>
  variants: Array<{
    id: string
    productId: string
    color: string
    colorHex: string | null
    size: string
    skuGroup: string
    deletedAt: string | null
    stock: {
      inStockQty: number
      heldQty: number
      availableQty: number
      lowStockThreshold: number
    }
  }>
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export async function adminGetProduct({
  id,
}: {
  id: string
}): Promise<AdminProductDetailPayload> {
  const product = await getProductById({ id })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  const variantRows = await listProductVariantsWithStockForAdmin({ productId: id })
  const prices = product.prices
    ? {
        lkrAmount: numericToPriceString(product.prices.lkrAmount),
        sgdAmount: numericToPriceString(product.prices.sgdAmount),
        usdAmount: numericToPriceString(product.prices.usdAmount),
        updatedAt: product.prices.updatedAt.toISOString(),
      }
    : null
  return {
    id: product.id,
    slug: product.slug,
    displayName: product.displayName,
    shortName: product.shortName,
    description: product.description ?? null,
    fabricInfo: product.fabricInfo ?? null,
    productCode: product.productCode,
    active: product.active,
    isSale: product.isSale,
    categoryId: product.categoryId ?? null,
    keyImageId: product.keyImageId ?? null,
    prices,
    images: product.images.map((img) => ({
      id: img.id,
      productId: img.productId,
      url: img.url,
      altText: img.altText ?? null,
      sortOrder: img.sortOrder,
    })),
    variants: variantRows.map((v) => ({
      id: v.id,
      productId: v.productId,
      color: v.color,
      colorHex: v.colorHex,
      size: v.size,
      skuGroup: v.skuGroup,
      deletedAt: v.deletedAt?.toISOString() ?? null,
      stock: {
        inStockQty: v.inStockQty,
        heldQty: v.heldQty,
        availableQty: v.availableQty,
        lowStockThreshold: v.lowStockThreshold,
      },
    })),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    deletedAt: product.deletedAt?.toISOString() ?? null,
  }
}

function validateSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug)) {
    throw new AppError('INVALID_SLUG', 400)
  }
}

function validatePriceAmounts({
  lkrAmount,
  sgdAmount,
  usdAmount,
}: {
  lkrAmount: number
  sgdAmount: number
  usdAmount: number
}): void {
  if (
    lkrAmount < 0 ||
    sgdAmount < 0 ||
    usdAmount < 0 ||
    !Number.isFinite(lkrAmount) ||
    !Number.isFinite(sgdAmount) ||
    !Number.isFinite(usdAmount)
  ) {
    throw new AppError('INVALID_PRICE', 400)
  }
}

export async function adminCreateProduct({
  categoryId,
  slug,
  displayName,
  shortName,
  description,
  fabricInfo,
  productCode,
  active = true,
  isSale = false,
  prices,
}: {
  categoryId?: string | null
  slug: string
  displayName: string
  shortName: string
  description?: string | null
  fabricInfo?: string | null
  productCode: string
  active?: boolean
  isSale?: boolean
  prices: { lkrAmount: number; sgdAmount: number; usdAmount: number }
}): Promise<Awaited<ReturnType<typeof createProduct>>> {
  validateSlug(slug)
  validatePriceAmounts(prices)
  const lkr = prices.lkrAmount.toFixed(2)
  const sgd = prices.sgdAmount.toFixed(2)
  const usd = prices.usdAmount.toFixed(2)
  return createProduct({
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
  })
}

type AdminUpdateProductData = Partial<{
  categoryId: string | null
  slug: string
  displayName: string
  shortName: string
  description: string | null
  fabricInfo: string | null
  productCode: string
  active: boolean
  isSale: boolean
  keyImageId: string | null
  lkrAmount: number
  sgdAmount: number
  usdAmount: number
}>

type AdminUpdateProductBody = AdminUpdateProductData & {
  prices?: { lkrAmount?: number; sgdAmount?: number; usdAmount?: number }
}

export async function adminUpdateProduct({
  id,
  data,
}: {
  id: string
  data: AdminUpdateProductBody
}): Promise<NonNullable<Awaited<ReturnType<typeof updateProduct>>>> {
  const existing = await getProductById({ id })
  if (!existing) throw new AppError('PRODUCT_NOT_FOUND', 404)

  const { prices, ...bodyWithoutPrices } = data
  const dataFlat: AdminUpdateProductData = { ...bodyWithoutPrices }
  if (prices != null) {
    if (prices.lkrAmount !== undefined) dataFlat.lkrAmount = prices.lkrAmount
    if (prices.sgdAmount !== undefined) dataFlat.sgdAmount = prices.sgdAmount
    if (prices.usdAmount !== undefined) dataFlat.usdAmount = prices.usdAmount
  }

  if (dataFlat.slug !== undefined) validateSlug(dataFlat.slug)
  const priceData: { lkrAmount?: string; sgdAmount?: string; usdAmount?: string } = {}
  if (dataFlat.lkrAmount !== undefined) {
    if (dataFlat.lkrAmount < 0 || !Number.isFinite(dataFlat.lkrAmount))
      throw new AppError('INVALID_PRICE', 400)
    priceData.lkrAmount = dataFlat.lkrAmount.toFixed(2)
  }
  if (dataFlat.sgdAmount !== undefined) {
    if (dataFlat.sgdAmount < 0 || !Number.isFinite(dataFlat.sgdAmount))
      throw new AppError('INVALID_PRICE', 400)
    priceData.sgdAmount = dataFlat.sgdAmount.toFixed(2)
  }
  if (dataFlat.usdAmount !== undefined) {
    if (dataFlat.usdAmount < 0 || !Number.isFinite(dataFlat.usdAmount))
      throw new AppError('INVALID_PRICE', 400)
    priceData.usdAmount = dataFlat.usdAmount.toFixed(2)
  }

  const {
    lkrAmount: _lkr,
    sgdAmount: _sgd,
    usdAmount: _usd,
    ...productFieldUpdates
  } = dataFlat
  const updatePayload = { ...productFieldUpdates, ...priceData }
  const result = await updateProduct({ id, data: updatePayload })
  if (!result) throw new AppError('PRODUCT_NOT_FOUND', 404)
  return result
}

export async function adminDeleteProduct({ id }: { id: string }): Promise<void> {
  const existing = await getProductById({ id })
  if (!existing) throw new AppError('PRODUCT_NOT_FOUND', 404)
  await softDeleteProduct({ id })
}

export async function adminListCategories(): Promise<Category[]> {
  return listAllCategoriesAdmin()
}

export async function adminCreateCategory({
  name,
  slug,
  active = true,
  sortOrder = 0,
}: {
  name: string
  slug: string
  active?: boolean
  sortOrder?: number
}): Promise<Category> {
  return insertCategory({ name, slug, active, sortOrder })
}

export async function adminUpdateCategory({
  id,
  data,
}: {
  id: string
  data: Partial<{ name: string; slug: string; active: boolean; sortOrder: number }>
}): Promise<Category> {
  const row = await updateCategoryById({ id, data })
  if (!row) throw new AppError('CATEGORY_NOT_FOUND', 404)
  return row
}

export async function adminDeleteCategory({ id }: { id: string }): Promise<void> {
  await deleteCategoryById({ id })
}

export async function adminGetPresignedProductImageUploadUrl({
  productId,
  fileName,
  contentType,
}: {
  productId: string
  fileName: string
  contentType: string
}): Promise<{ uploadUrl: string; key: string; publicUrl: string; expiresIn: number }> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  const normalizedType =
    contentType === 'image/jpg' ? 'image/jpeg' : contentType
  if (!normalizedType.startsWith('image/')) {
    throw new AppError('INVALID_CONTENT_TYPE', 400)
  }
  const { randomUUID } = await import('node:crypto')
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  const subPath = `${product.slug}/${randomUUID()}-${safeName || 'image'}`
  try {
    const storage = getStorageService()
    const { uploadUrl, key, expiresIn } = await storage.getPresignedUploadUrl(
      'product_images',
      subPath,
      normalizedType,
      3600,
    )
    const publicUrl = storage.getPublicUrl(key)
    return { uploadUrl, key, publicUrl, expiresIn }
  } catch (err) {
    if (err instanceof AppError) throw err
    if (err instanceof StorageError) {
      throw new AppError('STORAGE_ERROR', 500, err.message)
    }
    const message =
      err instanceof Error ? err.message : 'Storage operation failed'
    throw new AppError('STORAGE_ERROR', 500, message)
  }
}

export async function adminUpdateProductImageMetadata({
  productId,
  imageId,
  altText,
  sortOrder,
}: {
  productId: string
  imageId: string
  altText?: string | null
  sortOrder?: number
}): Promise<{
  id: string
  productId: string
  url: string
  altText: string | null
  sortOrder: number
}> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  const image = product.images.find((img) => img.id === imageId)
  if (!image) throw new AppError('IMAGE_NOT_FOUND', 404)
  const row = await updateProductImageById({
    id: imageId,
    productId,
    data: {
      ...(altText !== undefined && { altText }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  })
  if (!row) throw new AppError('IMAGE_NOT_FOUND', 404)
  return {
    id: row.id,
    productId: row.productId,
    url: row.url,
    altText: row.altText ?? null,
    sortOrder: row.sortOrder,
  }
}

export async function adminUploadProductImage({
  productId,
  url,
  altText,
  sortOrder = 0,
  setAsKey = false,
}: {
  productId: string
  url: string
  altText?: string | null
  sortOrder?: number
  setAsKey?: boolean
}): Promise<ProductImage> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)

  const image = await createProductImage({
    productId,
    url,
    altText,
    sortOrder,
  })

  const isFirstImage = product.images.length === 0
  if (setAsKey || isFirstImage) {
    await setKeyImage({ productId, imageId: image.id })
  }
  return image
}

/** Register base image URL after direct R2 upload; appends at end of sort order unless overridden */
export async function adminRegisterProductImageAfterUpload({
  productId,
  url,
  altText,
  sortOrder,
  setAsKey,
}: {
  productId: string
  url: string
  altText?: string | null
  sortOrder?: number
  setAsKey?: boolean
}): Promise<ProductImage> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  const nextSort =
    sortOrder ??
    (product.images.length > 0
      ? Math.max(...product.images.map((i) => i.sortOrder)) + 1
      : 0)
  return adminUploadProductImage({
    productId,
    url,
    altText,
    sortOrder: nextSort,
    setAsKey,
  })
}

export async function adminDeleteProductImage({
  imageId,
  productId,
}: {
  imageId: string
  productId: string
}): Promise<void> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  const image = product.images.find((img) => img.id === imageId)
  if (!image) throw new AppError('IMAGE_NOT_FOUND', 404)

  const storage = getStorageService()
  try {
    const pathname = new URL(image.url).pathname
    const prefix = pathname.startsWith('/') ? pathname.slice(1) : pathname
    await storage.deleteByPrefix(prefix)
  } catch (err) {
    if (err instanceof StorageError) {
      throw new AppError('STORAGE_ERROR', 500, err.message)
    }
    throw err
  }
  await deleteProductImage({ id: imageId, productId })

  if (product.keyImageId === imageId) {
    const remaining = product.images.filter((img) => img.id !== imageId)
    if (remaining.length > 0) {
      await setKeyImage({ productId, imageId: remaining[0].id })
    } else {
      await updateProduct({ id: productId, data: { keyImageId: null } })
    }
  }
}

export interface ProductImageUploadFile {
  buffer: Buffer
  originalname: string
  mimetype: string
}

export async function adminUploadProductImagesFromFiles({
  productId,
  files,
}: {
  productId: string
  files: ProductImageUploadFile[]
}): Promise<ProductImage[]> {
  if (files.length === 0) throw new AppError('NO_FILES', 400)
  if (files.length > 6) throw new AppError('TOO_MANY_FILES', 400)

  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)

  const storage = getStorageService()
  const nextSortOrder =
    product.images.length > 0
      ? Math.max(...product.images.map((i) => i.sortOrder)) + 1
      : 0
  const created: ProductImage[] = []
  let sortOrder = nextSortOrder

  for (const file of files) {
    let uploaded
    const mime =
      file.mimetype === 'image/jpg' ? 'image/jpeg' : file.mimetype
    try {
      uploaded = await storage.uploadProductImageOriginal(
        product.slug,
        file.buffer,
        file.originalname,
        mime,
      )
    } catch (err) {
      if (err instanceof StorageError) {
        throw new AppError('STORAGE_ERROR', 500, err.message)
      }
      throw err
    }
    const baseUrl = uploaded.url
    const altText = `${product.displayName} - Image ${sortOrder + 1}`
    const image = await createProductImage({
      productId,
      url: baseUrl,
      altText,
      sortOrder,
    })
    if (sortOrder === nextSortOrder && product.images.length === 0) {
      await setKeyImage({ productId, imageId: image.id })
    }
    created.push(image)
    sortOrder += 1
  }
  return created
}

export async function adminGetPresignedStylingGuideUploadUrl({
  productId,
  contentType,
  fileName,
}: {
  productId: string
  contentType: string
  fileName: string
}): Promise<{ uploadUrl: string; key: string; expiresIn: number }> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  const { randomUUID } = await import('node:crypto')
  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '.mp4'
  const subPath = `${product.slug}/video-${randomUUID()}${ext}`
  const storage = getStorageService()
  try {
    return storage.getPresignedUploadUrl('styling-guides', subPath, contentType)
  } catch (err) {
    if (err instanceof StorageError) {
      throw new AppError('STORAGE_ERROR', 500, err.message)
    }
    throw err
  }
}

export async function adminConfirmStylingGuideVideo({
  productId,
  key,
  linkUrl: providedLinkUrl,
}: {
  productId: string
  key: string
  linkUrl?: string | null
}): Promise<ProductStylingGuide> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  const storage = getStorageService()
  let exists: boolean
  try {
    exists = await storage.objectExists(key)
  } catch (err) {
    if (err instanceof StorageError) {
      throw new AppError('STORAGE_ERROR', 500, err.message)
    }
    throw err
  }
  if (!exists) throw new AppError('STYLING_GUIDE_VIDEO_NOT_FOUND', 404)
  const linkUrl = providedLinkUrl ?? storage.getPublicUrl(key)
  return upsertStylingGuide({
    productId,
    type: 'VIDEO',
    linkUrl,
    active: true,
  })
}

export async function adminSetKeyImage({
  productId,
  imageId,
}: {
  productId: string
  imageId: string
}): Promise<void> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  await setKeyImage({ productId, imageId })
}

export async function adminReorderImages({
  productId,
  imageIds,
}: {
  productId: string
  imageIds: string[]
}): Promise<void> {
  await reorderImages({ productId, imageIds })
}

export async function adminCreateVariant({
  productId,
  color,
  colorHex,
  size,
  skuGroup,
}: {
  productId: string
  color: string
  colorHex?: string | null
  size: string
  skuGroup: string
}): Promise<Awaited<ReturnType<typeof createVariant>>> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  return createVariant({ productId, color, colorHex: colorHex ?? null, size, skuGroup })
}

export async function adminDeleteVariant({
  variantId,
  productId,
}: {
  variantId: string
  productId: string
}): Promise<void> {
  await softDeleteVariant({ id: variantId, productId })
}

export async function adminUpsertStylingGuide({
  productId,
  type,
  linkUrl,
  contentJson,
  active = true,
}: {
  productId: string
  type: 'VIDEO' | 'GALLERY' | 'TEXT'
  linkUrl?: string | null
  contentJson?: unknown
  active?: boolean
}): Promise<ProductStylingGuide> {
  if (type === 'VIDEO' && (linkUrl == null || linkUrl === '')) {
    throw new AppError('VIDEO_STYLING_GUIDE_REQUIRES_LINK_URL', 400)
  }
  if (type === 'GALLERY' && (contentJson == null || typeof contentJson !== 'object')) {
    throw new AppError('GALLERY_STYLING_GUIDE_REQUIRES_CONTENT_JSON', 400)
  }
  return upsertStylingGuide({ productId, type, linkUrl, contentJson, active })
}

export async function adminGetBestsellerList(): Promise<
  Awaited<ReturnType<typeof getBestsellerList>>
> {
  return getBestsellerList()
}

export async function adminAddToBestsellerList({
  productId,
  sortOrder = 0,
  adminId,
}: {
  productId: string
  sortOrder?: number
  adminId: string
}): Promise<Awaited<ReturnType<typeof addToBestsellerList>>> {
  return addToBestsellerList({ productId, sortOrder, addedByAdminId: adminId })
}

export async function adminRemoveFromBestsellerList({
  productId,
}: {
  productId: string
}): Promise<void> {
  await removeFromBestsellerList({ productId })
}

export async function adminReorderBestsellerList({
  orderedProductIds,
}: {
  orderedProductIds: string[]
}): Promise<void> {
  await reorderBestsellerList({ orderedProductIds })
}

export async function adminListBanners(): Promise<Banner[]> {
  return listBanners()
}

export async function adminCreateBanner({
  message,
  linkUrl,
  startAt,
  endAt,
  adminId,
}: {
  message: string
  linkUrl?: string | null
  startAt?: string | null
  endAt?: string | null
  adminId: string
}): Promise<Banner> {
  const now = new Date()
  if (endAt != null && endAt !== '') {
    const end = new Date(endAt)
    if (end <= now) throw new AppError('END_AT_MUST_BE_FUTURE', 400)
    if (startAt != null && startAt !== '') {
      const start = new Date(startAt)
      if (start >= end) throw new AppError('START_AT_MUST_BE_BEFORE_END_AT', 400)
    }
  }
  return createBanner({
    message,
    linkUrl: linkUrl ?? null,
    startAt: startAt ? new Date(startAt) : null,
    endAt: endAt ? new Date(endAt) : null,
    createdBy: adminId,
  })
}

type AdminUpdateBannerData = Partial<{
  message: string
  linkUrl: string | null
  startAt: Date | null
  endAt: Date | null
  enabled: boolean
}>

export async function adminUpdateBanner({
  id,
  data,
}: {
  id: string
  data: AdminUpdateBannerData
}): Promise<NonNullable<Awaited<ReturnType<typeof updateBanner>>>> {
  const banner = await updateBanner({ id, data })
  if (!banner) throw new AppError('BANNER_NOT_FOUND', 404)
  return banner
}

export async function adminEnableBanner({
  id,
}: {
  id: string
}): Promise<NonNullable<Awaited<ReturnType<typeof enableBanner>>>> {
  const banner = await enableBanner({ id })
  if (!banner) throw new AppError('BANNER_NOT_FOUND', 404)
  return banner
}

export async function adminDisableBanner({
  id,
}: {
  id: string
}): Promise<NonNullable<Awaited<ReturnType<typeof disableBanner>>>> {
  const banner = await disableBanner({ id })
  if (!banner) throw new AppError('BANNER_NOT_FOUND', 404)
  return banner
}

export async function adminDeleteBanner({ id }: { id: string }): Promise<void> {
  const ok = await deleteBanner({ id })
  if (!ok) throw new AppError('BANNER_NOT_FOUND', 404)
}
