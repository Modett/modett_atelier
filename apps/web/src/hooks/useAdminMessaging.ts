'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CampaignContent } from '@modett/types'

export const ADMIN_CAMPAIGNS_KEYS = {
  all: ['admin', 'campaigns'] as const,
  list: (filters: AdminCampaignsListParams) =>
    [...ADMIN_CAMPAIGNS_KEYS.all, filters] as const,
  detail: (id: string) => [...ADMIN_CAMPAIGNS_KEYS.all, id] as const,
  audienceEstimate: (filterJson: string) =>
    [...ADMIN_CAMPAIGNS_KEYS.all, 'audience-estimate', filterJson] as const,
} as const

export type CampaignStatusFilter =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'SENT'
  | 'CANCELLED'
  | 'ALL'

export interface AdminCampaignsListParams {
  page?: number
  limit?: number
  status?: CampaignStatusFilter
}

export interface AdminCampaignRow {
  id: string
  name: string
  content_json: Record<string, unknown>
  channels_json: string[]
  audience_filter_json: Record<string, unknown>
  status: string
  created_by_admin_id: string | null
  scheduled_at: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  delivery_count?: number
}

interface CampaignsListResponse {
  data: {
    campaigns: AdminCampaignRow[]
    page: number
    limit: number
    total: number
  }
}

export function useAdminCampaignsList(params: AdminCampaignsListParams = {}) {
  const page = params.page ?? 1
  const limit = params.limit ?? 20
  const status = params.status ?? 'ALL'
  return useQuery({
    queryKey: ADMIN_CAMPAIGNS_KEYS.list({ page, limit, status }),
    queryFn: async () => {
      const q: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      }
      if (status !== 'ALL') q.status = status
      const res = await api.get<CampaignsListResponse>('/admin/campaigns', {
        params: q,
      })
      return res.data
    },
    staleTime: 30 * 1000,
  })
}

export function useAdminCampaignDetail(campaignId: string) {
  return useQuery({
    queryKey: ADMIN_CAMPAIGNS_KEYS.detail(campaignId),
    queryFn: async () => {
      const res = await api.get<{ data: { campaign: AdminCampaignRow } }>(
        `/admin/campaigns/${campaignId}`,
      )
      return res.data.campaign
    },
    enabled: Boolean(campaignId),
    staleTime: 15 * 1000,
  })
}

export function useAudienceEstimate(
  audienceFilterJson: Record<string, unknown>,
  enabled = true,
) {
  const filterJson = JSON.stringify(audienceFilterJson)
  return useQuery({
    queryKey: ADMIN_CAMPAIGNS_KEYS.audienceEstimate(filterJson),
    queryFn: async () => {
      const res = await api.get<{ data: { count: number } }>(
        '/admin/campaigns/audience-estimate',
        { params: { filter: filterJson } },
      )
      return res.data.count
    },
    enabled,
    staleTime: 60 * 1000,
  })
}

export function useCreateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      contentJson: CampaignContent
      channelsJson?: string[]
      audienceFilterJson?: Record<string, unknown>
    }) => {
      const res = await api.post<{ data: { campaign: AdminCampaignRow } }>(
        '/admin/campaigns',
        {
          name: input.name,
          contentJson: input.contentJson as unknown as Record<string, unknown>,
          channelsJson: input.channelsJson,
          audienceFilterJson: input.audienceFilterJson,
        },
      )
      return res.data.campaign
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_CAMPAIGNS_KEYS.all })
    },
  })
}

export function useUpdateCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      contentJson?: CampaignContent
      channelsJson?: string[]
      audienceFilterJson?: Record<string, unknown>
    }) => {
      const { id, ...body } = input
      const payload: Record<string, unknown> = {}
      if (body.name !== undefined) payload.name = body.name
      if (body.contentJson !== undefined) {
        payload.contentJson = body.contentJson
      }
      if (body.channelsJson !== undefined) {
        payload.channelsJson = body.channelsJson
      }
      if (body.audienceFilterJson !== undefined) {
        payload.audienceFilterJson = body.audienceFilterJson
      }
      const res = await api.patch<{ data: { campaign: AdminCampaignRow } }>(
        `/admin/campaigns/${id}`,
        payload,
      )
      return res.data.campaign
    },
    onSuccess: (row) => {
      void qc.invalidateQueries({ queryKey: ADMIN_CAMPAIGNS_KEYS.all })
      void qc.invalidateQueries({
        queryKey: ADMIN_CAMPAIGNS_KEYS.detail(row.id),
      })
    },
  })
}

export function useScheduleCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string; scheduledAt: string }) => {
      await api.post(`/admin/campaigns/${input.id}/schedule`, {
        scheduledAt: input.scheduledAt,
      })
    },
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ADMIN_CAMPAIGNS_KEYS.all })
      void qc.invalidateQueries({ queryKey: ADMIN_CAMPAIGNS_KEYS.detail(id) })
    },
  })
}

export function useCancelCampaign() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      await api.post(`/admin/campaigns/${input.id}/cancel`, {})
    },
    onSuccess: (_, { id }) => {
      void qc.invalidateQueries({ queryKey: ADMIN_CAMPAIGNS_KEYS.all })
      void qc.invalidateQueries({ queryKey: ADMIN_CAMPAIGNS_KEYS.detail(id) })
    },
  })
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: async (input: { id: string; recipientEmail: string }) => {
      await api.post(`/admin/campaigns/${input.id}/send-test`, {
        recipientEmail: input.recipientEmail,
      })
    },
  })
}

export function useSendCampaignNow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      const res = await api.post<{
        data: {
          ok: boolean
          recipientCount: number
          sentCount: number
        }
      }>(`/admin/campaigns/${input.id}/send-now`, {})
      return res.data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_CAMPAIGNS_KEYS.all })
    },
  })
}

export interface UploadAssetResponse {
  url: string
  type: 'image' | 'video'
  method: 'direct' | 'presigned'
  uploadUrl?: string
}

export function useUploadCampaignAsset() {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.postForm<{ data: UploadAssetResponse }>(
        '/admin/campaigns/upload-asset',
        formData,
      )
      return res.data
    },
  })
}
