'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useGeo } from './useCurrency'
import type { ProductDetail, ProductVariant } from '@/types'

// Raw shape returned by the API — variants use 'variantId', relations are 'relatedProducts'
interface ApiVariant {
  variantId:         string
  color:             string
  size:              string
  skuGroup?:         string
  availableQty:      number
  stockStatus:       'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  lowStockThreshold: number
}

interface ApiProductDetail extends Omit<ProductDetail, 'variants' | 'relations'> {
  variants:         ApiVariant[]
  relatedProducts?: ProductDetail['relations']
}

function normalizeProduct(raw: ApiProductDetail): ProductDetail {
  const variants: ProductVariant[] = raw.variants.map((v) => ({
    id:                v.variantId,
    color:             v.color,
    size:              v.size,
    skuGroup:          v.skuGroup ?? '',
    stockStatus:       v.stockStatus,
    availableQty:      v.availableQty,
    lowStockThreshold: v.lowStockThreshold,
  }))

  return {
    ...raw,
    variants,
    relations: raw.relatedProducts ?? [],
  }
}

interface UseProductOptions {
  enabled?: boolean
}

export function useProduct(slug: string, options?: UseProductOptions) {
  const { currency } = useGeo()

  return useQuery({
    queryKey: ['product', slug, currency],
    queryFn: async () => {
      const res = await api.get<{ data: { product: ApiProductDetail } }>(
        `/catalog/products/${slug}`,
        { params: { currency } }
      )
      return normalizeProduct(res.data.product)
    },
    enabled:   options?.enabled !== false && !!slug,
    staleTime: 2 * 60 * 1000,
  })
}
