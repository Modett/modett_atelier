'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AdminLoyaltySearchRow,
  AdminTopLoyaltyUserRow,
  AdminUserLoyaltySummary,
  LoyaltyRulesPublic,
} from '@modett/types'

const ADMIN_LOYALTY_ROOT = ['admin', 'loyalty'] as const

export const ADMIN_LOYALTY_KEYS = {
  all: ADMIN_LOYALTY_ROOT,
  search: (email: string) => [...ADMIN_LOYALTY_ROOT, 'users', 'search', email] as const,
  user: (userId: string) => [...ADMIN_LOYALTY_ROOT, 'users', userId] as const,
  rules: [...ADMIN_LOYALTY_ROOT, 'rules'] as const,
  top: (limit: number) => [...ADMIN_LOYALTY_ROOT, 'users', 'top', limit] as const,
}

function useDebouncedValue(value: string, ms: number): string {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

export function useAdminLoyaltyUserSearch(email: string) {
  const debounced = useDebouncedValue(email.trim(), 300)
  return useQuery({
    queryKey: ADMIN_LOYALTY_KEYS.search(debounced),
    queryFn: async () => {
      const res = await api.get<{ data: { users: AdminLoyaltySearchRow[] } }>(
        '/admin/loyalty/users/search',
        { params: { email: debounced } },
      )
      return res.data.users
    },
    enabled: debounced.length >= 2,
    staleTime: 30 * 1000,
  })
}

export function useAdminUserLoyalty(userId: string | null) {
  return useQuery({
    queryKey: ADMIN_LOYALTY_KEYS.user(userId ?? '__none__'),
    queryFn: async () => {
      if (!userId) throw new Error('No user')
      const res = await api.get<{ data: AdminUserLoyaltySummary }>(
        `/admin/loyalty/users/${userId}`,
      )
      return res.data
    },
    enabled: Boolean(userId),
    staleTime: 15 * 1000,
  })
}

export function useAdminLoyaltyRules() {
  return useQuery({
    queryKey: ADMIN_LOYALTY_KEYS.rules,
    queryFn: async () => {
      const res = await api.get<{ data: { rules: LoyaltyRulesPublic } }>(
        '/admin/loyalty/rules',
      )
      return res.data.rules
    },
    staleTime: 60 * 1000,
  })
}

export function useAdminLoyaltyTopUsers(limit = 25) {
  return useQuery({
    queryKey: ADMIN_LOYALTY_KEYS.top(limit),
    queryFn: async () => {
      const res = await api.get<{ data: { users: AdminTopLoyaltyUserRow[] } }>(
        '/admin/loyalty/users/top',
        { params: { limit: String(limit) } },
      )
      return res.data.users
    },
    staleTime: 60 * 1000,
  })
}

export function useGrantPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      points,
      reason,
    }: {
      userId: string
      points: number
      reason: string
    }) => {
      const res = await api.post<{ data: { newBalance: number } }>(
        `/admin/loyalty/users/${userId}/grant`,
        { points, reason },
      )
      return res.data
    },
    onSuccess: (_, { userId }) => {
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.user(userId) })
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.all })
    },
  })
}

export function useAdjustPoints() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      points,
      reason,
    }: {
      userId: string
      points: number
      reason: string
    }) => {
      const res = await api.post<{ data: { newBalance: number } }>(
        `/admin/loyalty/users/${userId}/adjust`,
        { points, reason },
      )
      return res.data
    },
    onSuccess: (_, { userId }) => {
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.user(userId) })
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.all })
    },
  })
}

export function useReEvaluateTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const res = await api.post<{
        data: { newTier: string; compositeScore: number }
      }>(`/admin/loyalty/users/${userId}/re-evaluate-tier`, {})
      return res.data
    },
    onSuccess: (_, { userId }) => {
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.user(userId) })
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.all })
    },
  })
}

export function useReconcileBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const res = await api.post<{
        data: { correctedBalance: number; ledgerSum: number; hadDrift: boolean }
      }>(`/admin/loyalty/users/${userId}/reconcile`, {})
      return res.data
    },
    onSuccess: (_, { userId }) => {
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.user(userId) })
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.all })
    },
  })
}

export function useUpdateLoyaltyRules() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<LoyaltyRulesPublic>) => {
      const res = await api.patch<{ data: { rules: LoyaltyRulesPublic } }>(
        '/admin/loyalty/rules',
        {
          earnRateJson: body.earnRateJson,
          redemptionRateByCurrencyJson: body.redemptionRateByCurrencyJson,
          tierThresholdsJson: body.tierThresholdsJson,
          multipliersJson: body.multipliersJson,
          frequencyWeight: body.frequencyWeight,
          spendWeight: body.spendWeight,
          spendNormalisationFactor: body.spendNormalisationFactor,
          evaluationWindowMonths: body.evaluationWindowMonths,
          pointsExpiryMonths: body.pointsExpiryMonths,
          minRedeem: body.minRedeem,
          maxRedeemPercent: body.maxRedeemPercent,
          noStackWithSale: body.noStackWithSale,
        },
      )
      return res.data.rules
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ADMIN_LOYALTY_KEYS.rules })
    },
  })
}
