'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminCustomerSummary, AdminCustomerDetail } from '@/types/admin'

export type AdminCustomerDetailPayload = AdminCustomerDetail & {
  preferences: Record<string, unknown> | null
}

interface CustomerSearchResponse {
  customers: AdminCustomerSummary[]
  total: number
  page: number
  limit: number
}

interface RawSearchRow {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
  loyalty_balance: number | null
  loyalty_tier: string | null
  composite_score: string | null
  order_count: number
  total_spent_lkr: string
}

function toIso(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (v instanceof Date) return v.toISOString()
  return String(v)
}

function mapSearchRow(row: RawSearchRow): AdminCustomerSummary {
  const tierRaw = row.loyalty_tier?.toUpperCase() ?? null
  const loyaltyTier =
    tierRaw === 'BRONZE' || tierRaw === 'SILVER' || tierRaw === 'GOLD' ? tierRaw : null
  const rawScore = row.composite_score?.trim() ?? ''
  const compositeScore =
    rawScore !== '' ? Number(row.composite_score) : null
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    createdAt: toIso(row.created_at),
    loyaltyBalance: row.loyalty_balance ?? 0,
    loyaltyTier,
    compositeScore:
      compositeScore != null && !Number.isNaN(compositeScore) ? compositeScore : null,
    orderCount: row.order_count,
    totalSpentLkr: row.total_spent_lkr,
  }
}

function transformAdminCustomerDetail(raw: Record<string, unknown>): AdminCustomerDetailPayload {
  const user = raw.user as Record<string, unknown>
  const loyaltyBlock = raw.loyalty as
    | { account?: Record<string, unknown> | null; ledger?: Record<string, unknown>[] }
    | undefined

  const account = loyaltyBlock?.account ?? null
  const ledgerRows = loyaltyBlock?.ledger ?? []

  const tierRaw = account?.tier != null ? String(account.tier).toUpperCase() : null
  const tier: 'BRONZE' | 'SILVER' | 'GOLD' | null =
    tierRaw === 'BRONZE' || tierRaw === 'SILVER' || tierRaw === 'GOLD' ? tierRaw : null

  const loyalty: AdminCustomerDetail['loyalty'] =
    account == null
      ? null
      : {
          balance: Number(account.balance ?? 0),
          tier,
          compositeScore:
            account.composite_score != null && String(account.composite_score).trim() !== ''
              ? Number(account.composite_score)
              : null,
          lastActivityAt:
            account.last_activity_at != null ? toIso(account.last_activity_at) : null,
          recentLedger: ledgerRows.map((row) => ({
            id: String(row.id),
            type: String(row.type),
            points: Number(row.points ?? 0),
            createdAt: toIso(row.created_at),
            metadataJson: (row.metadata_json as Record<string, unknown>) ?? {},
          })),
        }

  const orders = ((raw.orders as Record<string, unknown>[]) ?? []).map((o) => ({
    id: String(o.id),
    orderRef: String(o.order_ref ?? ''),
    paymentState: String(o.payment_state ?? ''),
    fulfillmentState: String(o.fulfillment_state ?? ''),
    currency: String(o.currency ?? ''),
    total: String(o.total ?? '0'),
    createdAt: toIso(o.created_at ?? o.placed_at),
  }))

  const reviews = ((raw.reviews as Record<string, unknown>[]) ?? []).map((r) => ({
    id: String(r.id),
    productName: String(r.product_name ?? ''),
    rating: Number(r.rating ?? 0),
    status: String(r.status ?? ''),
    createdAt: toIso(r.created_at),
    body: r.body != null ? String(r.body) : null,
  }))

  const returns = ((raw.returns as Record<string, unknown>[]) ?? []).map((r) => ({
    id: String(r.id),
    orderRef: String(r.order_ref ?? ''),
    status: String(r.status ?? ''),
    createdAt: toIso(r.created_at),
    itemCount:
      r.item_count != null ? Number(r.item_count) : undefined,
  }))

  const addresses = ((raw.addresses as Record<string, unknown>[]) ?? []).map((a) => {
    const aj = (a.addressJson ?? a.address_json) as Record<string, unknown> | undefined
    return {
      id: String(a.id),
      label: a.label != null ? String(a.label) : null,
      line1: aj && typeof aj.line1 === 'string' ? aj.line1 : '',
      city: aj && typeof aj.city === 'string' ? aj.city : '',
      country:
        (aj && typeof aj.country === 'string' ? aj.country : '') ||
        String(a.countryCode ?? a.country_code ?? ''),
      isDefault: Boolean(a.isDefault ?? a.is_default),
    }
  })

  return {
    user: {
      id: String(user.id),
      email: String(user.email ?? ''),
      firstName: String(user.firstName ?? user.first_name ?? ''),
      lastName: String(user.lastName ?? user.last_name ?? ''),
      createdAt: toIso(user.createdAt ?? user.created_at),
    },
    loyalty,
    orders,
    reviews,
    returns,
    addresses,
    preferences: (raw.preferences as Record<string, unknown> | null) ?? null,
  }
}

export const ADMIN_CUSTOMER_KEYS = {
  all: ['admin', 'customers'] as const,
  search: (q: string, page: number) => [...ADMIN_CUSTOMER_KEYS.all, 'search', q, page] as const,
  detail: (userId: string) => [...ADMIN_CUSTOMER_KEYS.all, 'detail', userId] as const,
} as const

export function useAdminCustomerSearch(q: string, page: number = 1) {
  return useQuery<CustomerSearchResponse>({
    queryKey: ADMIN_CUSTOMER_KEYS.search(q, page),
    queryFn: async () => {
      const res = await api.get<{
        data: {
          customers: RawSearchRow[]
          total: number
          page: number
          limit: number
        }
      }>('/admin/customers/search', {
        params: { q, page: String(page), limit: '20' },
      })
      return {
        customers: res.data.customers.map(mapSearchRow),
        total: res.data.total,
        page: res.data.page,
        limit: res.data.limit,
      }
    },
    enabled: q.trim().length >= 2,
    staleTime: 30_000,
  })
}

export function useAdminCustomerDetail(userId: string | null) {
  return useQuery<AdminCustomerDetailPayload>({
    queryKey: ADMIN_CUSTOMER_KEYS.detail(userId ?? '__none__'),
    queryFn: async () => {
      if (!userId) throw new Error('No user id')
      const res = await api.get<{ data: Record<string, unknown> }>(
        `/admin/customers/${userId}`,
      )
      return transformAdminCustomerDetail(res.data)
    },
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}
