'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminNotificationSummary, AdminNotificationAlert } from '@/types/admin'

interface NotificationFeedResponse {
  alerts: AdminNotificationAlert[]
  summary: AdminNotificationSummary
}

interface RawAdminNotificationAlert {
  type: string
  message: string
  entityId?: string | null
  entityRef?: string | null
  href: string
  timestamp: string
  isRead: boolean
}

function mapAlert(raw: RawAdminNotificationAlert): AdminNotificationAlert {
  const type = raw.type as AdminNotificationAlert['type']
  return {
    type,
    message: raw.message,
    entityId: raw.entityId ?? raw.entityRef ?? null,
    href: raw.href,
    timestamp: raw.timestamp,
    isRead: raw.isRead,
  }
}

export const ADMIN_NOTIFICATION_KEYS = {
  summary: ['admin', 'notifications', 'summary'] as const,
  feed: ['admin', 'notifications', 'feed'] as const,
} as const

// Summary — always running, polled every 30 seconds
// Powers the badge count on the bell icon in the header
export function useAdminNotificationsSummary() {
  return useQuery<AdminNotificationSummary>({
    queryKey: ADMIN_NOTIFICATION_KEYS.summary,
    queryFn: async () => {
      const res = await api.get<{ data: AdminNotificationSummary }>(
        '/admin/notifications/summary',
      )
      return res.data
    },
    refetchInterval: 30_000,
    staleTime: 0,
  })
}

// Feed — only fetched when the notification panel is open
export function useAdminNotificationsFeed(enabled: boolean) {
  return useQuery<NotificationFeedResponse>({
    queryKey: ADMIN_NOTIFICATION_KEYS.feed,
    queryFn: async () => {
      const res = await api.get<{
        data: {
          alerts: RawAdminNotificationAlert[]
          summary: AdminNotificationSummary
        }
      }>('/admin/notifications/feed', { params: { limit: '20' } })
      return {
        summary: res.data.summary,
        alerts: res.data.alerts.map((a) => mapAlert(a)),
      }
    },
    enabled,
    staleTime: 15_000,
  })
}
