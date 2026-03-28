/**
 * Placeholder data for the homepage until GET /catalog/home is wired.
 * Replace with real API data later.
 */
import type { ProductCardProps } from '@modett/ui'
import type { CarouselSlide } from '@modett/ui'

/** Same R2 public URL prefix as packages/db seeds (product photography). */
const R2_PRODUCT_IMAGES =
  'https://pub-8804bb39c26f4399a33c5a5d1c2182f9.r2.dev/product_images'

export const HOMEPAGE_BESTSELLERS: ProductCardProps[] = [
  {
    id: '1',
    slug: 'crispy-silk-shirt',
    displayName: 'Crispy silk shirt',
    price: 'Rs 8,500.00',
    primaryImage: {
      url: `${R2_PRODUCT_IMAGES}/tops/top1/1.jpeg`,
      altText: 'Crispy silk shirt front view',
    },
    secondaryImage: {
      url: `${R2_PRODUCT_IMAGES}/tops/top1/2.jpeg`,
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
      url: `${R2_PRODUCT_IMAGES}/dresses/dress2/1.webp`,
      altText: 'Draped midi dress front view',
    },
    secondaryImage: {
      url: `${R2_PRODUCT_IMAGES}/dresses/dress2/2.webp`,
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
      url: `${R2_PRODUCT_IMAGES}/blazer/blazer2/28.webp`,
      altText: 'Tailored blazer front view',
    },
    secondaryImage: {
      url: `${R2_PRODUCT_IMAGES}/blazer/blazer2/29.webp`,
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
      url: `${R2_PRODUCT_IMAGES}/skirts/skirt1/33.webp`,
      altText: 'Linen wrap skirt front view',
    },
    secondaryImage: {
      url: `${R2_PRODUCT_IMAGES}/skirts/skirt1/34.webp`,
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
      url: `${R2_PRODUCT_IMAGES}/tops/top2/5.jpeg`,
      altText: 'Silk cami top front view',
    },
    secondaryImage: {
      url: `${R2_PRODUCT_IMAGES}/tops/top2/6.jpeg`,
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
      url: `${R2_PRODUCT_IMAGES}/pant/pant1/8.jpeg`,
      altText: 'Wide-leg trousers front view',
    },
    secondaryImage: {
      url: `${R2_PRODUCT_IMAGES}/pant/pant1/9.webp`,
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
