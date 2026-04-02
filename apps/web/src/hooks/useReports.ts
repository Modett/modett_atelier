'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type ReportPeriod = '7d' | '30d' | '90d' | '1y'

const STALE = 60 * 60 * 1000

export function useReportSellers(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'sellers', period],
    queryFn: async () =>
      api.get<{
        data: {
          bestSellers:  unknown[]
          leastSellers: unknown[]
          period:       string
        }
      }>(`/admin/reports/sellers?period=${period}`),
    staleTime: STALE,
  })
}

export function useReportMostViewed(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'most-viewed', period],
    queryFn: async () =>
      api.get<{ data: { products: unknown[]; period: string } }>(
        `/admin/reports/most-viewed?period=${period}`,
      ),
    staleTime: STALE,
  })
}

export function useReportCartAbandonment(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'cart-abandonment', period],
    queryFn: async () =>
      api.get<{ data: { rows: unknown[]; period: string } }>(
        `/admin/reports/cart-abandonment?period=${period}`,
      ),
    staleTime: STALE,
  })
}

export function useReportReturns(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'returns', period],
    queryFn: async () =>
      api.get<{ data: Record<string, unknown> & { period: string } }>(
        `/admin/reports/returns?period=${period}`,
      ),
    staleTime: STALE,
  })
}

export function useReportTraffic(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'traffic', period],
    queryFn: async () =>
      api.get<{
        data: {
          sources: unknown[]
          devices: unknown[]
          period:  string
        }
      }>(`/admin/reports/traffic?period=${period}`),
    staleTime: STALE,
  })
}

export function useReportColorsSizes(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'colors-sizes', period],
    queryFn: async () =>
      api.get<{ data: Record<string, unknown> & { period: string } }>(
        `/admin/reports/colors-sizes?period=${period}`,
      ),
    staleTime: STALE,
  })
}

export function useReportGuestVsRegistered(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'guest-vs-registered', period],
    queryFn: async () =>
      api.get<{ data: Record<string, unknown> & { period: string } }>(
        `/admin/reports/guest-vs-registered?period=${period}`,
      ),
    staleTime: STALE,
  })
}

export function useReportWishlist(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'wishlist', period],
    queryFn: async () =>
      api.get<{ data: { rows: unknown[]; period: string } }>(
        `/admin/reports/wishlist?period=${period}`,
      ),
    staleTime: STALE,
  })
}

export function useReportFunnel(period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'funnel', period],
    queryFn: async () =>
      api.get<{
        data: { funnel: Record<string, string>; period: string }
      }>(`/admin/reports/funnel?period=${period}`),
    staleTime: STALE,
  })
}

export function useReportTimeSeries(metric: string, period: ReportPeriod) {
  return useQuery({
    queryKey: ['admin', 'reports', 'timeseries', metric, period],
    queryFn: async () =>
      api.get<{
        data: {
          series: Array<{ date: string; value: number }>
          metric: string
          period: string
        }
      }>(`/admin/reports/timeseries?metric=${encodeURIComponent(metric)}&period=${period}`),
    staleTime: STALE,
  })
}

export function useReportTimeSeriesByDimension(
  metric: string,
  period: ReportPeriod,
  dimension: Record<string, string> | null,
) {
  const dimQ =
    dimension != null && Object.keys(dimension).length > 0
      ? `&dimension=${encodeURIComponent(JSON.stringify(dimension))}`
      : ''
  return useQuery({
    queryKey: ['admin', 'reports', 'timeseries', metric, period, dimension],
    queryFn: async () =>
      api.get<{
        data: {
          series: Array<{ date: string; value: number }>
          metric: string
          period: string
        }
      }>(
        `/admin/reports/timeseries?metric=${encodeURIComponent(metric)}&period=${period}${dimQ}`,
      ),
    staleTime: STALE,
    enabled:   dimension != null,
  })
}
