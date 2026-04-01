'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// —— Banners ——

export const ADMIN_BANNERS_KEY = ['admin', 'banners'] as const

export interface AdminBannerRow {
  id: string
  message: string
  linkUrl: string | null
  enabled: boolean
  startAt: string | null
  endAt: string | null
  createdAt: string
  updatedAt: string
}

function mapBanner(b: Record<string, unknown>): AdminBannerRow {
  return {
    id: String(b.id),
    message: String(b.message ?? ''),
    linkUrl: b.linkUrl != null ? String(b.linkUrl) : null,
    enabled: Boolean(b.enabled),
    startAt: b.startAt != null ? String(b.startAt) : null,
    endAt: b.endAt != null ? String(b.endAt) : null,
    createdAt: String(b.createdAt ?? ''),
    updatedAt: String(b.updatedAt ?? ''),
  }
}

export function useAdminBanners() {
  return useQuery({
    queryKey: ADMIN_BANNERS_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: { banners: Record<string, unknown>[] } }>(
        '/admin/catalog/banners',
      )
      return res.data.banners.map(mapBanner)
    },
    staleTime: 30_000,
  })
}

export function useCreateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      message: string
      linkUrl?: string | null
      startAt?: string | null
      endAt?: string | null
    }) => {
      const res = await api.post<{ data: { banner: Record<string, unknown> } }>(
        '/admin/catalog/banners',
        body,
      )
      return mapBanner(res.data.banner)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BANNERS_KEY })
    },
  })
}

export function useUpdateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...body
    }: {
      id: string
      message?: string
      linkUrl?: string | null
      startAt?: string | null
      endAt?: string | null
      enabled?: boolean
    }) => {
      const res = await api.patch<{ data: { banner: Record<string, unknown> } }>(
        `/admin/catalog/banners/${id}`,
        body,
      )
      return mapBanner(res.data.banner)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BANNERS_KEY })
    },
  })
}

export function useActivateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/catalog/banners/${id}/activate`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BANNERS_KEY })
    },
  })
}

export function useDeactivateBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/admin/catalog/banners/${id}/deactivate`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BANNERS_KEY })
    },
  })
}

export function useDeleteBanner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/admin/catalog/banners/${id}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_BANNERS_KEY })
    },
  })
}

// —— Team ——

export const ADMIN_TEAM_KEY = ['admin', 'team'] as const

export interface AdminTeamMemberRow {
  id: string
  userId: string
  role: 'OWNER' | 'ADMIN'
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED'
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface AdminPendingInviteRow {
  id: string
  email: string
  expiresAt: string
  createdByAdminId: string
  role: 'OWNER' | 'ADMIN'
}

function mapTeamMember(r: Record<string, unknown>): AdminTeamMemberRow {
  const u = r.user as Record<string, unknown>
  return {
    id: String(r.id),
    userId: String(r.userId ?? r.user_id),
    role: r.role as AdminTeamMemberRow['role'],
    status: r.status as AdminTeamMemberRow['status'],
    user: {
      id: String(u.id),
      firstName: String(u.firstName ?? u.first_name ?? ''),
      lastName: String(u.lastName ?? u.last_name ?? ''),
      email: String(u.email ?? ''),
    },
  }
}

function mapInvite(r: Record<string, unknown>): AdminPendingInviteRow {
  return {
    id: String(r.id),
    email: String(r.email),
    expiresAt: String(r.expiresAt ?? r.expires_at),
    createdByAdminId: String(r.createdByAdminId ?? r.created_by_admin_id),
    role: (r.role as AdminPendingInviteRow['role']) ?? 'ADMIN',
  }
}

export function useAdminTeamMembers() {
  return useQuery({
    queryKey: [...ADMIN_TEAM_KEY, 'admins'] as const,
    queryFn: async () => {
      const res = await api.get<{ data: { admins: Record<string, unknown>[] } }>(
        '/admin/admins',
      )
      return res.data.admins.map(mapTeamMember)
    },
    staleTime: 30_000,
  })
}

export function useAdminPendingInvites() {
  return useQuery({
    queryKey: [...ADMIN_TEAM_KEY, 'invites'] as const,
    queryFn: async () => {
      const res = await api.get<{ data: { invites: Record<string, unknown>[] } }>(
        '/admin/invites',
      )
      return res.data.invites.map(mapInvite)
    },
    staleTime: 30_000,
  })
}

export function useInviteAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { email: string; role: 'ADMIN' | 'OWNER' }) => {
      await api.post('/admin/invites', body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_TEAM_KEY })
    },
  })
}

export function useResendInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      await api.post(`/admin/invites/${inviteId}/resend`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_TEAM_KEY })
    },
  })
}

export function useCancelInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      await api.delete(`/admin/invites/${inviteId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_TEAM_KEY })
    },
  })
}

export function useChangeAdminRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ adminId, role }: { adminId: string; role: 'ADMIN' | 'OWNER' }) => {
      await api.patch(`/admin/admins/${adminId}/role`, { role })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_TEAM_KEY })
      void qc.invalidateQueries({ queryKey: ['admin-session'] })
    },
  })
}

export function useSuspendAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (adminId: string) => {
      await api.post(`/admin/admins/${adminId}/suspend`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_TEAM_KEY })
    },
  })
}

export function useReinstateAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (adminId: string) => {
      await api.post(`/admin/admins/${adminId}/reinstate`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_TEAM_KEY })
    },
  })
}

export function useRemoveAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (adminId: string) => {
      await api.delete(`/admin/admins/${adminId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_TEAM_KEY })
    },
  })
}

// —— Shipping (settings tab) ——

export const ADMIN_SHIPPING_SETTINGS_KEY = ['admin', 'shipping', 'settings'] as const
export const ADMIN_SHIPPING_ZONES_KEY = ['admin', 'shipping', 'zones'] as const

export function useAdminShippingSettings() {
  return useQuery({
    queryKey: ADMIN_SHIPPING_SETTINGS_KEY,
    queryFn: async () => {
      const res = await api.get<{
        data: {
          settings: {
            id: string
            freeThresholdLkr: string | null
            freeThresholdSgd: string | null
            freeThresholdUsd: string | null
            freeShippingLabel: string
            updatedAt: string
          } | null
        }
      }>('/admin/shipping/settings')
      return res.data.settings
    },
    staleTime: 30_000,
  })
}

export function useUpdateShippingSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await api.patch<{ data: { settings: unknown } }>(
        '/admin/shipping/settings',
        body,
      )
      return res.data.settings
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_SETTINGS_KEY })
    },
  })
}

export function useAdminShippingZones() {
  return useQuery({
    queryKey: ADMIN_SHIPPING_ZONES_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: { zones: unknown[] } }>('/admin/shipping/zones')
      return res.data.zones
    },
    staleTime: 30_000,
  })
}

export function useAdminShippingMethods(zoneId: string | null, includeInactive = true) {
  return useQuery({
    queryKey: [...ADMIN_SHIPPING_ZONES_KEY, 'methods', zoneId ?? '', includeInactive] as const,
    queryFn: async () => {
      if (!zoneId) return []
      const res = await api.get<{ data: { methods: unknown[] } }>(
        `/admin/shipping/zones/${zoneId}/methods`,
        { params: { includeInactive: String(includeInactive) } },
      )
      return res.data.methods
    },
    enabled: Boolean(zoneId),
    staleTime: 30_000,
  })
}

export function useCreateShippingMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      zoneId,
      body,
    }: {
      zoneId: string
      body: Record<string, unknown>
    }) => {
      await api.post(`/admin/shipping/zones/${zoneId}/methods`, body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useUpdateShippingMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      methodId,
      body,
    }: {
      methodId: string
      body: Record<string, unknown>
    }) => {
      await api.patch(`/admin/shipping/methods/${methodId}`, body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useActivateShippingMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (methodId: string) => {
      await api.post(`/admin/shipping/methods/${methodId}/activate`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useDeactivateShippingMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (methodId: string) => {
      await api.post(`/admin/shipping/methods/${methodId}/deactivate`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useDeleteShippingMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (methodId: string) => {
      await api.delete(`/admin/shipping/methods/${methodId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useCreateShippingZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { name: string; countries: string[] }) => {
      await api.post('/admin/shipping/zones', body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useUpdateShippingZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ zoneId, name }: { zoneId: string; name: string }) => {
      await api.patch(`/admin/shipping/zones/${zoneId}`, { name })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useDeleteShippingZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (zoneId: string) => {
      await api.delete(`/admin/shipping/zones/${zoneId}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useAddShippingZoneCountry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      zoneId,
      countryCode,
    }: {
      zoneId: string
      countryCode: string
    }) => {
      await api.post(`/admin/shipping/zones/${zoneId}/countries`, { countryCode })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

export function useRemoveShippingZoneCountry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      zoneId,
      countryCode,
    }: {
      zoneId: string
      countryCode: string
    }) => {
      await api.delete(`/admin/shipping/zones/${zoneId}/countries/${countryCode}`)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_SHIPPING_ZONES_KEY })
    },
  })
}

// —— Account ——

export function useUpdateAdminProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { firstName?: string; lastName?: string }) => {
      const res = await api.patch<{ data: { user: unknown; admin: unknown } }>(
        '/admin/me',
        body,
      )
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-session'] })
    },
  })
}

export function useAdminChangePassword() {
  return useMutation({
    mutationFn: async (body: { currentPassword: string; newPassword: string }) => {
      await api.post('/admin/auth/change-password', body)
    },
  })
}
