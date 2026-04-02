'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AnalyticsTodaySummary,
  AnalyticsRevenuePoint,
  AnalyticsFunnelData,
  AnalyticsRevenueByCurrency,
  AnalyticsTimeSeriesPoint,
} from '@/types/admin'

export type Period = '7d' | '30d' | '90d' | '1y'
export type AnalyticsPeriod = Period
export type AnalyticsToday = AnalyticsTodaySummary
export type RevenueSeriesPoint = AnalyticsRevenuePoint
export type AnalyticsFunnel = AnalyticsFunnelData
export type RevenueByCurrencyRow = AnalyticsRevenueByCurrency

export const ANALYTICS_KEYS = {
  today: ['admin', 'analytics', 'today'] as const,
  revenue: (period: Period, currency: string) =>
    ['admin', 'analytics', 'revenue', period, currency] as const,
  funnel: (period: Period) => ['admin', 'analytics', 'funnel', period] as const,
  byCurrency: (period: Period) =>
    ['admin', 'analytics', 'by-currency', period] as const,
  timeSeries: (metric: string, period: Period) =>
    ['admin', 'analytics', 'timeseries', metric, period] as const,
} as const

// Live today summary — auto-refreshes every 60 seconds
export function useAnalyticsToday() {
  return useQuery<AnalyticsTodaySummary>({
    queryKey: ANALYTICS_KEYS.today,
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsTodaySummary }>('/admin/analytics/today')
      return res.data
    },
    refetchInterval: 60_000,
    staleTime: 0,
  })
}

// Historical revenue time series
export function useAnalyticsRevenue(period: Period, currency: string = 'ALL') {
  return useQuery<AnalyticsRevenuePoint[]>({
    queryKey: ANALYTICS_KEYS.revenue(period, currency),
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsRevenuePoint[] }>(
        '/admin/analytics/revenue',
        { params: { period, currency } },
      )
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}

// Conversion funnel
export function useAnalyticsFunnel(period: Period) {
  return useQuery<AnalyticsFunnelData>({
    queryKey: ANALYTICS_KEYS.funnel(period),
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsFunnelData }>(
        '/admin/analytics/funnel',
        { params: { period } },
      )
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}

// Revenue split by currency
export function useAnalyticsRevenueByCurrency(period: Period) {
  return useQuery<AnalyticsRevenueByCurrency[]>({
    queryKey: ANALYTICS_KEYS.byCurrency(period),
    queryFn: async () => {
      const res = await api.get<{ data: AnalyticsRevenueByCurrency[] }>(
        '/admin/analytics/revenue-by-currency',
        { params: { period } },
      )
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}

// Generic time-series (used for line charts)
export function useAnalyticsTimeSeries(metric: string, period: Period) {
  return useQuery<AnalyticsTimeSeriesPoint[]>({
    queryKey: ANALYTICS_KEYS.timeSeries(metric, period),
    queryFn: async () => {
      const res = await api.get<{ data: { series: AnalyticsTimeSeriesPoint[] } }>(
        '/admin/analytics/timeseries',
        { params: { metric, period } },
      )
      return res.data.series
    },
    staleTime: 5 * 60_000,
    enabled: Boolean(metric),
  })
}
