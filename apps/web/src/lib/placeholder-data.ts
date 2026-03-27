/**
 * Placeholder data for the homepage until GET /catalog/home is wired.
 * Replace with real API data later.
 */
import type { ProductCardProps } from '@modett/ui'
import type { CarouselSlide } from '@modett/ui'

const PLACEHOLDER_IMAGE_BASE = '/images/products'

export const HOMEPAGE_BESTSELLERS: ProductCardProps[] = [
  {
    id: '1',
    slug: 'crispy-silk-shirt',
    displayName: 'Crispy silk shirt',
    price: 'Rs 8,500.00',
    primaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-1-a`,
      altText: 'Crispy silk shirt front view',
    },
    secondaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-1-b`,
      altText: 'Crispy silk shirt back view',
    },
    colours: [
      { value: 'terracotta', name: 'Terracotta', hex: '#C78869', inStock: true },
      { value: 'cream', name: 'Cream', hex: '#F5F0E8', inStock: true },
      { value: 'sage', name: 'Sage', hex: '#C1D2CC', inStock: true },
      { value: 'mist', name: 'Mist', hex: '#D4DDD9', inStock: true },
    ],
    sizes: [
      { value: 'UK 6', label: 'UK 6', inStock: true },
      { value: 'UK 8', label: 'UK 8', inStock: true },
      { value: 'UK 10', label: 'UK 10', inStock: true },
      { value: 'UK 12', label: 'UK 12', inStock: true },
      { value: 'UK 14', label: 'UK 14', inStock: false },
      { value: 'UK 16', label: 'UK 16', inStock: true },
    ],
    isWishlisted: false,
  },
  {
    id: '2',
    slug: 'draped-midi-dress',
    displayName: 'Draped midi dress',
    price: 'Rs 12,500.00',
    primaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-2-a`,
      altText: 'Draped midi dress front view',
    },
    secondaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-2-b`,
      altText: 'Draped midi dress detail',
    },
    colours: [
      { value: 'blush', name: 'Blush', hex: '#E8C4C4', inStock: true },
      { value: 'charcoal', name: 'Charcoal', hex: '#4A4A4A', inStock: true },
      { value: 'ivory', name: 'Ivory', hex: '#FFFFF0', inStock: true },
    ],
    sizes: [
      { value: 'UK 6', label: 'UK 6', inStock: true },
      { value: 'UK 8', label: 'UK 8', inStock: true },
      { value: 'UK 10', label: 'UK 10', inStock: true },
      { value: 'UK 12', label: 'UK 12', inStock: true },
      { value: 'UK 14', label: 'UK 14', inStock: true },
    ],
    isWishlisted: false,
  },
  {
    id: '3',
    slug: 'tailored-blazer',
    displayName: 'Tailored blazer',
    price: 'Rs 15,000.00',
    primaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-3-a`,
      altText: 'Tailored blazer front view',
    },
    secondaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-3-b`,
      altText: 'Tailored blazer back view',
    },
    colours: [
      { value: 'grey', name: 'Grey', hex: '#8B8B8B', inStock: true },
      { value: 'navy', name: 'Navy', hex: '#2C3E50', inStock: true },
      { value: 'black', name: 'Black', hex: '#232D35', inStock: true },
    ],
    sizes: [
      { value: 'UK 6', label: 'UK 6', inStock: true },
      { value: 'UK 8', label: 'UK 8', inStock: true },
      { value: 'UK 10', label: 'UK 10', inStock: true },
      { value: 'UK 12', label: 'UK 12', inStock: true },
    ],
    isWishlisted: false,
  },
  {
    id: '4',
    slug: 'linen-wrap-skirt',
    displayName: 'Linen wrap skirt',
    price: 'Rs 7,200.00',
    primaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-4-a`,
      altText: 'Linen wrap skirt front view',
    },
    secondaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-4-b`,
      altText: 'Linen wrap skirt side view',
    },
    colours: [
      { value: 'oatmeal', name: 'Oatmeal', hex: '#D4C4A8', inStock: true },
      { value: 'olive', name: 'Olive', hex: '#6B7B5C', inStock: true },
      { value: 'white', name: 'White', hex: '#F8F5F2', inStock: true },
    ],
    sizes: [
      { value: 'UK 6', label: 'UK 6', inStock: true },
      { value: 'UK 8', label: 'UK 8', inStock: true },
      { value: 'UK 10', label: 'UK 10', inStock: true },
      { value: 'UK 12', label: 'UK 12', inStock: false },
    ],
    isWishlisted: false,
  },
  {
    id: '5',
    slug: 'silk-cami-top',
    displayName: 'Silk cami top',
    price: 'Rs 5,800.00',
    originalPrice: 'Rs 7,500.00',
    isSale: true,
    primaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-5-a`,
      altText: 'Silk cami top front view',
    },
    secondaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-5-b`,
      altText: 'Silk cami top back view',
    },
    colours: [
      { value: 'champagne', name: 'Champagne', hex: '#C1AB85', inStock: true },
      { value: 'dusty-rose', name: 'Dusty Rose', hex: '#C9A9A6', inStock: true },
      { value: 'black', name: 'Black', hex: '#232D35', inStock: true },
    ],
    sizes: [
      { value: 'UK 6', label: 'UK 6', inStock: true },
      { value: 'UK 8', label: 'UK 8', inStock: true },
      { value: 'UK 10', label: 'UK 10', inStock: true },
      { value: 'UK 12', label: 'UK 12', inStock: true },
    ],
    isWishlisted: false,
  },
  {
    id: '6',
    slug: 'wide-leg-trousers',
    displayName: 'Wide-leg trousers',
    price: 'Rs 9,800.00',
    primaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-6-a`,
      altText: 'Wide-leg trousers front view',
    },
    secondaryImage: {
      url: `${PLACEHOLDER_IMAGE_BASE}/product-6-b`,
      altText: 'Wide-leg trousers side view',
    },
    colours: [
      { value: 'black', name: 'Black', hex: '#232D35', inStock: true },
      { value: 'cream', name: 'Cream', hex: '#F5F0E8', inStock: true },
      { value: 'taupe', name: 'Taupe', hex: '#A89F91', inStock: true },
    ],
    sizes: [
      { value: 'UK 6', label: 'UK 6', inStock: true },
      { value: 'UK 8', label: 'UK 8', inStock: true },
      { value: 'UK 10', label: 'UK 10', inStock: true },
      { value: 'UK 12', label: 'UK 12', inStock: true },
      { value: 'UK 14', label: 'UK 14', inStock: true },
    ],
    isWishlisted: true,
  },
]

export const HOMEPAGE_CAROUSEL_SLIDES: CarouselSlide[] = [
  {
    id: 'slide-1',
    imageUrl: '/images/studio.png',
    altText: 'Modett atelier — studio workspace',
  },
  {
    id: 'slide-2',
    imageUrl: '/images/tag.png',
    altText: 'Modett branded hang tag on finished garment',
  },
  {
    id: 'slide-3',
    imageUrl: '/images/stamp.png',
    altText: 'Modett quality stamp detail',
  },
]
