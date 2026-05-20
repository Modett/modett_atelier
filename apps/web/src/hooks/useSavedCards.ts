'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSession } from './useSession'

export const SAVED_CARDS_QUERY_KEY = ['saved-cards'] as const

export interface SavedCardSummary {
  id:             string
  maskedCardNo:   string
  cardScheme:     string | null
  cardHolderName: string | null
  cardExp:        string | null
  nickname:       string | null
  isDefault:      boolean
  createdAt:      string
}

interface SavedCardsResponse {
  data: { cards: SavedCardSummary[] }
}

export function useSavedCards() {
  const { isLoggedIn } = useSession()
  return useQuery({
    queryKey: SAVED_CARDS_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<SavedCardsResponse>('/payments/saved-cards')
      return res.data.cards
    },
    enabled: isLoggedIn,
    staleTime: 60_000,
  })
}

export function useDeleteSavedCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/payments/saved-cards/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_CARDS_QUERY_KEY }),
  })
}

export function useSetDefaultSavedCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/payments/saved-cards/${id}/default`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_CARDS_QUERY_KEY }),
  })
}

interface PayWithSavedCardResponse {
  data: {
    status:                'confirmed' | 'failed' | 'pending'
    orderId:               string
    orderRef:              string
    payableTransactionId?: string
    statusMessage?:        string
  }
}

export function usePayWithSavedCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      savedCardId,
      orderId,
    }: {
      savedCardId: string
      orderId:     string
    }) => {
      const res = await api.post<PayWithSavedCardResponse>(
        `/payments/saved-cards/${savedCardId}/pay`,
        { orderId },
      )
      return res.data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: SAVED_CARDS_QUERY_KEY }),
  })
}
