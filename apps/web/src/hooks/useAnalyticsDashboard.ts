'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y'

export interface AnalyticsToday {
  ordersToday: number
  revenueLkr: string
  revenueSgd: string
  revenueUsd: string
  avgOrderValueLkr: string
  conversionToday: number
  activeSessionsNow: number
}

export function useAnalyticsToday() {
  return useQuery({
    queryKey: ['admin', 'analytics', 'today'] as const,
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsToday }>('/admin/analytics/today')
      return res.data
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export interface RevenueSeriesPoint {
  date: string
  currency: string
  orderCount: number
  revenue: string
  avgOrderValue: string
}

export function useAnalyticsRevenue(
  period: AnalyticsPeriod,
  currency: 'LKR' | 'SGD' | 'USD' | 'ALL',
) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'revenue', period, currency] as const,
    queryFn: async () => {
      const res = await api.get<{ data: RevenueSeriesPoint[] }>(
        '/admin/analytics/revenue',
        { params: { period, currency } },
      )
      return res.data
    },
  })
}

export interface AnalyticsFunnel {
  productViews: number
  addToCart: number
  checkoutStarts: number
  purchases: number
  viewToCartPct: number
  cartToCheckoutPct: number
  checkoutToPurchasePct: number
  overallConversionPct: number
}

export function useAnalyticsFunnel(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'funnel', period] as const,
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsFunnel }>(
        '/admin/analytics/funnel',
        { params: { period } },
      )
      return res.data
    },
  })
}

export interface RevenueByCurrencyRow {
  currency: string
  orders: number
  totalRevenue: string
}

export function useAnalyticsRevenueByCurrency(period: AnalyticsPeriod) {
  return useQuery({
    queryKey: ['admin', 'analytics', 'revenue-by-currency', period] as const,
    queryFn: async () => {
      const res = await api.get<{ data: RevenueByCurrencyRow[] }>(
        '/admin/analytics/revenue-by-currency',
        { params: { period } },
      )
      return res.data
    },
  })
}
