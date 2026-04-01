/**
 * Admin catalog API shapes (camelCase, ISO date strings).
 * Distinct from table-mirror types in entities.ts.
 */

export interface AdminCategory {
  id: string
  name: string
  slug: string
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface AdminProductImage {
  id: string
  productId: string
  url: string
  altText: string | null
  sortOrder: number
}

export interface AdminProductVariant {
  id: string
  productId: string
  color: string
  colorHex: string | null
  size: string
  skuGroup: string
  deletedAt: string | null
  stock?: {
    inStockQty: number
    heldQty: number
    availableQty: number
    lowStockThreshold: number
  }
}

export interface AdminProductPrices {
  lkrAmount: string
  sgdAmount: string
  usdAmount: string
  updatedAt: string
}

export interface AdminProductListItem {
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
  prices: AdminProductPrices | null
  variantCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface AdminProductDetail {
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
  prices: AdminProductPrices | null
  images: AdminProductImage[]
  variants: AdminProductVariant[]
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface AdminProductsListResponse {
  products: AdminProductListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ProductFormValues {
  displayName: string
  shortName: string
  slug: string
  productCode: string
  categoryId: string | null
  description: string
  fabricInfo: string
  active: boolean
  isSale: boolean
  prices: {
    lkrAmount: string
    sgdAmount: string
    usdAmount: string
  }
}

export interface CategoryFormValues {
  name: string
  slug: string
  active: boolean
  sortOrder: number
}
