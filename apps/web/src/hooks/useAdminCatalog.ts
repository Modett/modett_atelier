'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AdminCategory,
  AdminProductDetail,
  AdminProductsListResponse,
  CategoryFormValues,
  ProductFormValues,
} from '@modett/types'

export const ADMIN_CATEGORIES_KEY = ['admin', 'categories'] as const

export function adminProductsListKey(filters: AdminProductsListFilters) {
  return ['admin', 'products', filters] as const
}

export function adminProductDetailKey(productId: string) {
  return ['admin', 'products', productId] as const
}

export interface AdminProductsListFilters {
  page?: number
  limit?: number
  includeInactive?: boolean
  categoryId?: string
  search?: string
}

function mapCategory(raw: Record<string, unknown>): AdminCategory {
  return {
    id: String(raw.id),
    name: String(raw.name),
    slug: String(raw.slug),
    active: Boolean(raw.active),
    sortOrder: Number(raw.sortOrder ?? 0),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: String(raw.updatedAt ?? ''),
  }
}

function mapProductDetail(raw: Record<string, unknown>): AdminProductDetail {
  const prices = raw.prices as Record<string, unknown> | null | undefined
  const images = Array.isArray(raw.images) ? raw.images : []
  const variants = Array.isArray(raw.variants) ? raw.variants : []
  return {
    id: String(raw.id),
    slug: String(raw.slug),
    displayName: String(raw.displayName),
    shortName: String(raw.shortName),
    description: raw.description != null ? String(raw.description) : null,
    fabricInfo: raw.fabricInfo != null ? String(raw.fabricInfo) : null,
    productCode: String(raw.productCode),
    active: Boolean(raw.active),
    isSale: Boolean(raw.isSale),
    categoryId: raw.categoryId != null ? String(raw.categoryId) : null,
    keyImageId: raw.keyImageId != null ? String(raw.keyImageId) : null,
    prices: prices
      ? {
          lkrAmount: String(prices.lkrAmount ?? '0'),
          sgdAmount: String(prices.sgdAmount ?? '0'),
          usdAmount: String(prices.usdAmount ?? '0'),
          updatedAt:
            typeof prices.updatedAt === 'string'
              ? prices.updatedAt
              : new Date(prices.updatedAt as string).toISOString(),
        }
      : null,
    images: images.map((img) => {
      const i = img as Record<string, unknown>
      return {
        id: String(i.id),
        productId: String(i.productId),
        url: String(i.url),
        altText: i.altText != null ? String(i.altText) : null,
        sortOrder: Number(i.sortOrder ?? 0),
      }
    }),
    variants: variants.map((v) => {
      const row = v as Record<string, unknown>
      const stock = row.stock as Record<string, unknown> | undefined
      return {
        id: String(row.id),
        productId: String(row.productId),
        color: String(row.color ?? ''),
        colorHex: row.colorHex != null ? String(row.colorHex) : null,
        size: String(row.size ?? ''),
        skuGroup: String(row.skuGroup ?? ''),
        deletedAt: row.deletedAt != null ? String(row.deletedAt) : null,
        stock: stock
          ? {
              inStockQty: Number(stock.inStockQty ?? 0),
              heldQty: Number(stock.heldQty ?? 0),
              availableQty: Number(stock.availableQty ?? 0),
              lowStockThreshold: Number(stock.lowStockThreshold ?? 0),
            }
          : undefined,
      }
    }),
    createdAt:
      typeof raw.createdAt === 'string'
        ? raw.createdAt
        : new Date(raw.createdAt as string).toISOString(),
    updatedAt:
      typeof raw.updatedAt === 'string'
        ? raw.updatedAt
        : new Date(raw.updatedAt as string).toISOString(),
    deletedAt: raw.deletedAt != null ? String(raw.deletedAt) : null,
  }
}

export function useAdminCategories() {
  return useQuery({
    queryKey: ADMIN_CATEGORIES_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: { categories: Record<string, unknown>[] } }>(
        '/admin/catalog/categories',
      )
      return res.data.categories.map(mapCategory)
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CategoryFormValues) => {
      const res = await api.post<{ data: { category: Record<string, unknown> } }>(
        '/admin/catalog/categories',
        {
          name: body.name,
          slug: body.slug,
          active: body.active,
          sortOrder: body.sortOrder,
        },
      )
      return mapCategory(res.data.category)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<CategoryFormValues>
    }) => {
      const res = await api.patch<{ data: { category: Record<string, unknown> } }>(
        `/admin/catalog/categories/${id}`,
        data,
      )
      return mapCategory(res.data.category)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await api.delete(`/admin/catalog/categories/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_KEY })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useAdminProductsList(filters: AdminProductsListFilters = {}) {
  const {
    page = 1,
    limit = 50,
    includeInactive = false,
    categoryId,
    search,
  } = filters

  return useQuery({
    queryKey: adminProductsListKey({
      page,
      limit,
      includeInactive,
      categoryId,
      search,
    }),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
        includeInactive: includeInactive ? 'true' : 'false',
      }
      if (categoryId) params.categoryId = categoryId
      if (search?.trim()) params.search = search.trim()

      const res = await api.get<{ data: AdminProductsListResponse }>(
        '/admin/catalog/products',
        { params },
      )
      return res.data
    },
    staleTime: 30 * 1000,
  })
}

export function useAdminProductDetail(productId: string | undefined) {
  const id = productId?.trim() ?? ''
  return useQuery({
    queryKey: adminProductDetailKey(id || '__none__'),
    queryFn: async () => {
      const res = await api.get<{ data: { product: Record<string, unknown> } }>(
        `/admin/catalog/products/${id}`,
      )
      return mapProductDetail(res.data.product)
    },
    enabled: Boolean(id),
    staleTime: 15 * 1000,
  })
}

function buildCreateProductBody(values: ProductFormValues) {
  return {
    displayName: values.displayName,
    shortName: values.shortName,
    slug: values.slug,
    productCode: values.productCode,
    categoryId: values.categoryId,
    description: values.description || null,
    fabricInfo: values.fabricInfo || null,
    active: values.active,
    isSale: values.isSale,
    prices: {
      lkrAmount: Number.parseFloat(values.prices.lkrAmount),
      sgdAmount: Number.parseFloat(values.prices.sgdAmount),
      usdAmount: Number.parseFloat(values.prices.usdAmount),
    },
  }
}

export function useCreateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (values: ProductFormValues) => {
      const res = await api.post<{ data: { product: Record<string, unknown> } }>(
        '/admin/catalog/products',
        buildCreateProductBody(values),
      )
      return mapProductDetail(res.data.product)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

function buildPatchProductBody(
  data: Partial<ProductFormValues>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  if (data.displayName !== undefined) out.displayName = data.displayName
  if (data.shortName !== undefined) out.shortName = data.shortName
  if (data.slug !== undefined) out.slug = data.slug
  if (data.productCode !== undefined) out.productCode = data.productCode
  if (data.categoryId !== undefined) out.categoryId = data.categoryId
  if (data.description !== undefined) out.description = data.description || null
  if (data.fabricInfo !== undefined) out.fabricInfo = data.fabricInfo || null
  if (data.active !== undefined) out.active = data.active
  if (data.isSale !== undefined) out.isSale = data.isSale
  if (data.prices !== undefined) {
    out.prices = {
      lkrAmount: Number.parseFloat(data.prices.lkrAmount),
      sgdAmount: Number.parseFloat(data.prices.sgdAmount),
      usdAmount: Number.parseFloat(data.prices.usdAmount),
    }
  }
  return out
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: Partial<ProductFormValues>
    }) => {
      const res = await api.patch<{ data: { product: Record<string, unknown> } }>(
        `/admin/catalog/products/${id}`,
        buildPatchProductBody(data),
      )
      return mapProductDetail(res.data.product)
    },
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
      void queryClient.invalidateQueries({ queryKey: adminProductDetailKey(id) })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await api.delete(`/admin/catalog/products/${id}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'products'] })
    },
  })
}

export function useRegisterProductImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      url,
      altText,
      sortOrder,
      setAsKey,
    }: {
      productId: string
      url: string
      altText?: string
      sortOrder?: number
      setAsKey?: boolean
    }) => {
      await api.post(`/admin/catalog/products/${productId}/images/register`, {
        url,
        altText,
        sortOrder,
        setAsKey,
      })
    },
    onSuccess: (_void, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: adminProductDetailKey(productId) })
    },
  })
}

export function useSetKeyImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      imageId,
    }: {
      productId: string
      imageId: string
    }) => {
      await api.patch(`/admin/catalog/products/${productId}/images/key`, {
        imageId,
      })
    },
    onSuccess: (_void, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: adminProductDetailKey(productId) })
    },
  })
}

export function useReorderImages() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      imageIds,
    }: {
      productId: string
      imageIds: string[]
    }) => {
      await api.patch(`/admin/catalog/products/${productId}/images/reorder`, {
        imageIds,
      })
    },
    onSuccess: (_void, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: adminProductDetailKey(productId) })
    },
  })
}

export function useDeleteProductImage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      imageId,
    }: {
      productId: string
      imageId: string
    }) => {
      await api.delete(`/admin/catalog/products/${productId}/images/${imageId}`)
    },
    onSuccess: (_void, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: adminProductDetailKey(productId) })
    },
  })
}

export function usePatchProductImageAlt() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      imageId,
      altText,
    }: {
      productId: string
      imageId: string
      altText: string
    }) => {
      await api.patch(`/admin/catalog/products/${productId}/images/${imageId}`, {
        altText,
      })
    },
    onSuccess: (_void, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: adminProductDetailKey(productId) })
    },
  })
}

export function useCreateVariant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      color,
      colorHex,
      size,
      skuGroup,
    }: {
      productId: string
      color: string
      colorHex: string
      size: string
      skuGroup: string
    }) => {
      await api.post(`/admin/catalog/products/${productId}/variants`, {
        color,
        colorHex,
        size,
        skuGroup,
      })
    },
    onSuccess: (_void, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: adminProductDetailKey(productId) })
    },
  })
}

export function useDeleteVariant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      productId,
      variantId,
    }: {
      productId: string
      variantId: string
    }) => {
      await api.delete(
        `/admin/catalog/products/${productId}/variants/${variantId}`,
      )
    },
    onSuccess: (_void, { productId }) => {
      void queryClient.invalidateQueries({ queryKey: adminProductDetailKey(productId) })
    },
  })
}

export async function fetchProductImageUploadUrl({
  productId,
  filename,
  contentType,
}: {
  productId: string
  filename: string
  contentType: string
}): Promise<{ uploadUrl: string; key: string; publicUrl: string; expiresIn: number }> {
  const res = await api.get<{
    data: { uploadUrl: string; key: string; publicUrl: string; expiresIn: number }
  }>(`/admin/catalog/products/${productId}/images/upload-url`, {
    params: { filename, contentType },
  })
  return res.data
}
