// Global TypeScript types for apps/web
// Feature-specific types live alongside their components

export type Nullable<T>  = T | null
export type Optional<T>  = T | undefined
export type ID           = string

export interface ApiResponse<T> {
  data:     T
  message?: string
}

export interface ApiError {
  code:    string
  message: string
  status:  number
}

// ── Money ─────────────────────────────────────────────
export type CurrencyCode = 'LKR' | 'SGD' | 'USD'

export interface Money {
  amount:   string
  currency: CurrencyCode
}

// ── Auth ──────────────────────────────────────────────
export interface User {
  id:              string
  firstName:       string
  lastName:        string
  email:           string
  newsletterOptIn: boolean
  createdAt:       string
  dob?:            string | null
}

export interface Admin {
  id:     string
  userId: string
  role:   'OWNER' | 'ADMIN'
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
}

// ── Category ──────────────────────────────────────────
export interface Category {
  id:        string
  name:      string
  slug:      string
  active:    boolean
  sortOrder: number
}

// ── Product image ─────────────────────────────────────
export interface ProductImage {
  id:        string
  url:       string
  altText:   string | null
  sortOrder: number
}

// ── Product variant ───────────────────────────────────
export interface ProductVariant {
  id:                string
  color:             string
  size:              string
  skuGroup:          string
  stockStatus:       'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  availableQty:      number
  lowStockThreshold: number
}

// ── Lightweight variant info included in product listings ─
export interface ProductListingVariant {
  variantId:    string
  color:        string
  size:         string
  availableQty: number
  stockStatus:  'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
}

// ── Product summary (listing, bestsellers, related) ───
export interface ProductSummary {
  id:          string
  slug:        string
  displayName: string
  shortName:   string
  isSale:      boolean
  categoryId:  string | null
  keyImage:    ProductImage | null
  /** Next image after the key image in gallery order — card hover / touch peek */
  hoverImage?: ProductImage | null
  price:       Money
  /** When on sale and provided by API: discounted price; `price` is shown struck through */
  salePrice?:  Money
  variants:    ProductListingVariant[]
}

// ── Product detail (PDP) ──────────────────────────────
export interface ProductDetail extends Omit<ProductSummary, 'variants'> {
  description: string | null
  fabricInfo:  string | null
  productCode: string
  images:      ProductImage[]
  variants:    ProductVariant[]
  relations:   ProductSummary[]
}

// ── Paginated response ────────────────────────────────
export interface PaginatedResponse<T> {
  products:   T[]
  total:      number
  page:       number
  limit:      number
  totalPages: number
}

// ── Cart ──────────────────────────────────────────────
export interface Cart {
  id:        string
  sessionId: string
  status:    'ACTIVE' | 'ABANDONED' | 'CHECKED_OUT'
  expiresAt: string
}

export interface CartItem {
  id:           string
  variantId:    string
  qty:          number
  productId:    string
  productSlug:  string
  displayName:  string
  shortName:    string
  color:        string
  size:         string
  image:        ProductImage | null
  unitPrice:    Money
  totalPrice:   Money
  stockStatus:  'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  availableQty: number
}

export interface CartSummary {
  itemCount: number
  subtotal:  Money
  currency:  CurrencyCode
}

// ── Banner ────────────────────────────────────────────
export interface Banner {
  id:      string
  message: string
  linkUrl: string | null
}

// ── Wishlist ──────────────────────────────────────────
export interface WishlistItem {
  id:        string
  productId: string
  variantId: string | null
  product:   ProductSummary
  createdAt: string
}

// ── Shipping ─────────────────────────────────────────
export interface ShippingEstimate {
  available:         boolean
  methods:           ShippingMethodEstimate[]
  thresholdAmount:   string | null
  thresholdCurrency: CurrencyCode
  freeShippingLabel: string
  amountUntilFree:   string | null
}

export interface ShippingMethodEstimate {
  id:            string
  name:          string
  carrier:       string | null
  estimatedDays: string | null
  rateType:      'FLAT' | 'FREE' | 'CALCULATED'
  cost: {
    amount:         string
    currency:       CurrencyCode
    isFree:         boolean
    originalAmount: string | null
    label:          string
  }
}

export interface ShippingSettings {
  id:                string
  freeThresholdLkr:  string | null
  freeThresholdSgd:  string | null
  freeThresholdUsd:  string | null
  freeShippingLabel: string
  updatedAt:         string
}

export type {
  Review,
  RatingAggregate,
  ProductReviewsResponse,
} from '@modett/types'

export * from './admin'
