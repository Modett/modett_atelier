'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AuditLogEntry, AuditLogFilters } from '@/types/admin'

interface AuditLogResponse {
  logs: AuditLogEntry[]
  total: number
  page: number
  limit: number
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v == null) return null
  if (typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>
  }
  return null
}

function mapAuditLogRow(raw: Record<string, unknown>): AuditLogEntry {
  return {
    id: String(raw.id),
    adminId: raw.adminId != null ? String(raw.adminId) : '',
    adminEmail: String(raw.adminEmail ?? ''),
    adminRole: String(raw.adminRole ?? ''),
    action: String(raw.action ?? ''),
    entityType: String(raw.entityType ?? ''),
    entityId: raw.entityId != null ? String(raw.entityId) : null,
    entityLabel: raw.entityLabel != null ? String(raw.entityLabel) : null,
    beforeJson: asRecord(raw.beforeJson),
    afterJson: asRecord(raw.afterJson),
    ipAddress: raw.ipAddress != null ? String(raw.ipAddress) : null,
    createdAt: String(raw.createdAt ?? ''),
  }
}

export const AUDIT_LOG_KEYS = {
  all: ['admin', 'audit-log'] as const,
  list: (filters: AuditLogFilters) => [...AUDIT_LOG_KEYS.all, 'list', filters] as const,
} as const

export function useAuditLog(filters: AuditLogFilters = {}) {
  return useQuery<AuditLogResponse>({
    queryKey: AUDIT_LOG_KEYS.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters.page) params.page = String(filters.page)
      if (filters.limit) params.limit = String(filters.limit)
      if (filters.adminId) params.adminId = filters.adminId
      if (filters.action) params.action = filters.action
      if (filters.entityType) params.entityType = filters.entityType
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to

      const res = await api.get<{
        data: {
          logs: Record<string, unknown>[]
          total: number
          page: number
          limit: number
        }
      }>('/admin/audit-log', { params })
      return {
        logs: res.data.logs.map((row) => mapAuditLogRow(row)),
        total: res.data.total,
        page: res.data.page,
        limit: res.data.limit,
      }
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
