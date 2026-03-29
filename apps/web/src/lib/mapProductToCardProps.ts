import type { ProductCardProps } from '@modett/ui'
import type { ProductSummary } from '@/types'
import { formatMoney } from '@/hooks/useCurrency'
import { productImagePlaceholderUrl } from '@/lib/assets'

const COLOUR_HEX_MAP: Record<string, string> = {
  ivory:       '#FFFFF0',
  sage:        '#C1D2CC',
  umber:       '#765C4D',
  ecru:        '#C2B280',
  sand:        '#D2B48C',
  slate:       '#708090',
  black:       '#232D35',
  camel:       '#C19A6B',
  charcoal:    '#4A4A4A',
  blush:       '#E8C4C4',
  white:       '#F8F5F2',
  cream:       '#F5F0E8',
  beige:       '#D4C4A8',
  oatmeal:     '#D4C4A8',
  taupe:       '#A89F91',
  grey:        '#8B8B8B',
  navy:        '#2C3E50',
  olive:       '#6B7B5C',
  terracotta:  '#C78869',
  champagne:   '#C1AB85',
  burgundy:    '#722F37',
  khaki:       '#BDB76B',
  stone:       '#928E85',
  mist:        '#D4DDD9',
  rust:        '#B7410E',
  forest:      '#228B22',
  midnight:    '#191970',
  rose:        '#FF007F',
  coral:       '#FF7F50',
  wine:        '#722F37',
}

export function mapProductSummaryToCardProps(
  product: ProductSummary,
  wishlistIds: Set<string>,
): ProductCardProps {
  const variants = product.variants ?? []

  const colourMap = new Map<string, { hex: string; inStock: boolean }>()
  for (const v of variants) {
    const existing = colourMap.get(v.color)
    if (!existing) {
      colourMap.set(v.color, {
        hex:     COLOUR_HEX_MAP[v.color.toLowerCase()] ?? '#888888',
        inStock: v.stockStatus !== 'OUT_OF_STOCK',
      })
    } else if (v.stockStatus !== 'OUT_OF_STOCK') {
      existing.inStock = true
    }
  }

  const sizeMap = new Map<string, boolean>()
  for (const v of variants) {
    const existing = sizeMap.get(v.size)
    if (!existing) {
      sizeMap.set(v.size, v.stockStatus !== 'OUT_OF_STOCK')
    } else if (v.stockStatus !== 'OUT_OF_STOCK') {
      sizeMap.set(v.size, true)
    }
  }

  return {
    id:           product.id,
    slug:         product.slug,
    displayName:  product.displayName,
    price:        formatMoney(product.price),
    isSale:       product.isSale,
    isWishlisted: wishlistIds.has(product.id),
    primaryImage: product.keyImage
      ? { url: product.keyImage.url, altText: product.keyImage.altText ?? product.displayName }
      : { url: productImagePlaceholderUrl, altText: product.displayName },
    colours: Array.from(colourMap.entries()).map(([name, data]) => ({
      value:   name,
      name:    name.charAt(0).toUpperCase() + name.slice(1),
      hex:     data.hex,
      inStock: data.inStock,
    })),
    sizes: Array.from(sizeMap.entries()).map(([size, inStock]) => ({
      value: size,
      label: size,
      inStock,
    })),
  }
}
