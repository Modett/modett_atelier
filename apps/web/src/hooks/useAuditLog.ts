'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AuditLogFilters {
  page?: number
  limit?: number
  adminId?: string
  action?: string
  entityType?: string
  entityId?: string
  from?: string
  to?: string
}

export interface AuditLogRow {
  id: string
  adminId: string | null
  adminEmail: string
  adminRole: string
  currentRole: string | null
  action: string
  entityType: string
  entityId: string | null
  entityLabel: string | null
  beforeJson: unknown
  afterJson: unknown
  ipAddress: string | null
  createdAt: string
}

export function useAuditLog(filters: AuditLogFilters) {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 50
  return useQuery({
    queryKey: ['admin', 'audit-log', { page, limit, ...filters }] as const,
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      }
      if (filters.adminId) params.adminId = filters.adminId
      if (filters.action) params.action = filters.action
      if (filters.entityType) params.entityType = filters.entityType
      if (filters.entityId) params.entityId = filters.entityId
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      const res = await api.get<{
        data: {
          logs: AuditLogRow[]
          total: number
          page: number
          limit: number
        }
      }>('/admin/audit-log', { params })
      return res.data
    },
    staleTime: 30_000,
  })
}

export function useAdminAdminsList() {
  return useQuery({
    queryKey: ['admin', 'admins', 'list'] as const,
    queryFn: async () => {
      const res = await api.get<{
        data: {
          admins: Array<{
            id: string
            role: string
            user: { email: string; firstName: string; lastName: string }
          }>
        }
      }>('/admin/admins')
      return res.data.admins
    },
    staleTime: 60_000,
  })
}
