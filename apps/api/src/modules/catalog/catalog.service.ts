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
  createProduct,
  updateProduct,
  softDeleteProduct,
  createProductImage,
  deleteProductImage,
  setKeyImage,
  reorderImages,
  createVariant,
  softDeleteVariant,
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
} from '@modett/db'
import type {
  ProductListItemRow,
  ProductDetailRow,
  VariantWithStockRow,
} from '@modett/db'
import type { Category, ProductImage, ProductStylingGuide, Banner } from '@modett/db'

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

export interface ProductListItem {
  id: string
  slug: string
  displayName: string
  shortName: string
  isSale: boolean
  keyImage: { url: string; altText: string | null } | null
  price: Money
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
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
    price: resolvePriceForCurrency({
      lkrAmount: row.lkrAmount,
      sgdAmount: row.sgdAmount,
      usdAmount: row.usdAmount,
      currency,
    }),
    stockStatus: row.stockStatus,
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
}: {
  categorySlug?: string | null
  page?: number
  limit?: number
  currency?: CurrencyCode
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
}: {
  query: string
  page?: number
  limit?: number
  currency?: CurrencyCode
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

export async function adminGetAllProducts({
  page = 1,
  limit = 50,
  includeInactive = false,
}: {
  page?: number
  limit?: number
  includeInactive?: boolean
}): Promise<{
  products: Awaited<ReturnType<typeof listAllProducts>>['products']
  total: number
  page: number
  limit: number
  totalPages: number
}> {
  const { products, total } = await listAllProducts({
    page,
    limit,
    includeInactive,
  })
  const totalPages = Math.ceil(total / limit) || 1
  return { products, total, page, limit, totalPages }
}

export async function adminGetProduct({
  id,
}: {
  id: string
}): Promise<NonNullable<Awaited<ReturnType<typeof getProductById>>>> {
  const product = await getProductById({ id })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  return product
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

export async function adminUpdateProduct({
  id,
  data,
}: {
  id: string
  data: AdminUpdateProductData
}): Promise<NonNullable<Awaited<ReturnType<typeof updateProduct>>>> {
  const existing = await getProductById({ id })
  if (!existing) throw new AppError('PRODUCT_NOT_FOUND', 404)

  if (data.slug !== undefined) validateSlug(data.slug)
  const priceData: { lkrAmount?: string; sgdAmount?: string; usdAmount?: string } = {}
  if (data.lkrAmount !== undefined) {
    if (data.lkrAmount < 0 || !Number.isFinite(data.lkrAmount))
      throw new AppError('INVALID_PRICE', 400)
    priceData.lkrAmount = data.lkrAmount.toFixed(2)
  }
  if (data.sgdAmount !== undefined) {
    if (data.sgdAmount < 0 || !Number.isFinite(data.sgdAmount))
      throw new AppError('INVALID_PRICE', 400)
    priceData.sgdAmount = data.sgdAmount.toFixed(2)
  }
  if (data.usdAmount !== undefined) {
    if (data.usdAmount < 0 || !Number.isFinite(data.usdAmount))
      throw new AppError('INVALID_PRICE', 400)
    priceData.usdAmount = data.usdAmount.toFixed(2)
  }

  const { lkrAmount, sgdAmount, usdAmount, ...rest } = data
  const updatePayload = { ...rest, ...priceData }
  const result = await updateProduct({ id, data: updatePayload })
  if (!result) throw new AppError('PRODUCT_NOT_FOUND', 404)
  return result
}

export async function adminDeleteProduct({ id }: { id: string }): Promise<void> {
  const existing = await getProductById({ id })
  if (!existing) throw new AppError('PRODUCT_NOT_FOUND', 404)
  await softDeleteProduct({ id })
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

  const isFirstImage = !product.images || product.images.length <= 1
  if (setAsKey || isFirstImage) {
    await setKeyImage({ productId, imageId: image.id })
  }
  return image
}

export async function adminDeleteProductImage({
  imageId,
  productId,
}: {
  imageId: string
  productId: string
}): Promise<void> {
  await deleteProductImage({ id: imageId, productId })
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
  size,
  skuGroup,
}: {
  productId: string
  color: string
  size: string
  skuGroup: string
}): Promise<Awaited<ReturnType<typeof createVariant>>> {
  const product = await getProductById({ id: productId })
  if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)
  return createVariant({ productId, color, size, skuGroup })
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
