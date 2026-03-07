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

export interface PaginatedResponse<T> {
  data:    T[]
  total:   number
  page:    number
  limit:   number
  hasMore: boolean
}

export interface Money {
  amount:   number
  currency: 'LKR' | 'SGD' | 'USD'
}
