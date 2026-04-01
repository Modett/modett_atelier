'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface NotificationSummary {
  lowStock: number
  outOfStock: number
  newReturns: number
  flaggedReviews: number
  unresolvedDrift: number
  pendingOrders: number
  total: number
}

export interface NotificationAlert {
  type: string
  message: string
  entityRef: string
  href: string
  timestamp: string
  isRead: boolean
}

export function useAdminNotificationsSummary() {
  return useQuery({
    queryKey: ['admin', 'notifications', 'summary'] as const,
    queryFn: async () => {
      const res = await api.get<{ data: NotificationSummary }>(
        '/admin/notifications/summary',
      )
      return res.data
    },
    refetchInterval: 30_000,
    staleTime: 0,
  })
}

export function useAdminNotificationsFeed(enabled: boolean) {
  return useQuery({
    queryKey: ['admin', 'notifications', 'feed'] as const,
    queryFn: async () => {
      const res = await api.get<{
        data: { alerts: NotificationAlert[]; summary: NotificationSummary }
      }>('/admin/notifications/feed', { params: { limit: '20' } })
      return res.data
    },
    enabled,
    staleTime: 15_000,
  })
}
