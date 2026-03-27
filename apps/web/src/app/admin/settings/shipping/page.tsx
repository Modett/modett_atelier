'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, ArrowLeft, Check } from 'lucide-react'
import { api } from '@/lib/api'
import { useAdminSession } from '@/hooks/useAdminSession'
import type { ApiError } from '@/types'

interface ShippingSettingsResponse {
  id: string
  freeThresholdLkr: string | null
  freeThresholdSgd: string | null
  freeThresholdUsd: string | null
  freeShippingLabel: string
  updatedAt: string
}

const SETTINGS_KEY = ['admin-shipping-settings'] as const

export default function AdminShippingSettingsPage() {
  const { isAdmin, isLoading: sessionLoading } = useAdminSession()
  const router = useRouter()

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAdmin) {
    router.push('/admin/login')
    return null
  }

  return <ShippingSettingsForm />
}

function ShippingSettingsForm() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const [thresholdLkr, setThresholdLkr] = useState('')
  const [thresholdSgd, setThresholdSgd] = useState('')
  const [thresholdUsd, setThresholdUsd] = useState('')
  const [label, setLabel] = useState('Free Shipping')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: settings, isLoading } = useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: { settings: ShippingSettingsResponse | null } }>(
        '/admin/shipping/settings',
      )
      return res.data.settings
    },
  })

  useEffect(() => {
    if (settings) {
      setThresholdLkr(settings.freeThresholdLkr ?? '')
      setThresholdSgd(settings.freeThresholdSgd ?? '')
      setThresholdUsd(settings.freeThresholdUsd ?? '')
      setLabel(settings.freeShippingLabel)
    }
  }, [settings])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {}

      body.freeThresholdLkr = thresholdLkr.trim() === '' ? null : Number(thresholdLkr)
      body.freeThresholdSgd = thresholdSgd.trim() === '' ? null : Number(thresholdSgd)
      body.freeThresholdUsd = thresholdUsd.trim() === '' ? null : Number(thresholdUsd)
      if (label.trim()) body.freeShippingLabel = label.trim()

      const res = await api.patch<{ data: { settings: ShippingSettingsResponse } }>(
        '/admin/shipping/settings',
        body,
      )
      return res.data.settings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
      setToast({ type: 'success', message: 'Shipping settings updated' })
    },
    onError: (err: Error) => {
      const apiErr = err as unknown as ApiError
      setToast({
        type: 'error',
        message: apiErr?.message ?? 'Failed to update settings',
      })
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto p-6 pt-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700
                     mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Free Shipping Settings
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          Set minimum order values for free shipping.
          Leave a currency blank to disable free shipping for that currency.
        </p>

        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
          className="space-y-6"
        >
          <ThresholdInput
            label="Minimum order (LKR)"
            prefix="Rs"
            placeholder="e.g. 15000"
            value={thresholdLkr}
            onChange={setThresholdLkr}
          />

          <ThresholdInput
            label="Minimum order (SGD)"
            prefix="S$"
            placeholder="e.g. 120"
            value={thresholdSgd}
            onChange={setThresholdSgd}
          />

          <ThresholdInput
            label="Minimum order (USD)"
            prefix="$"
            placeholder="e.g. 100"
            value={thresholdUsd}
            onChange={setThresholdUsd}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Free shipping badge label
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Free Shipping"
              maxLength={100}
              required
              className="w-full border border-gray-300 rounded px-3 py-2
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-gray-400 focus:border-transparent"
            />
            {label.trim() && (
              <span className="inline-block mt-2 px-2.5 py-0.5 bg-green-50
                               text-green-700 text-xs font-medium rounded">
                {label.trim()}
              </span>
            )}
          </div>

          {toast && (
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded text-sm ${
                toast.type === 'success'
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-800'
              }`}
            >
              {toast.type === 'success' && <Check className="w-4 h-4" />}
              {toast.message}
            </div>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full bg-gray-900 text-white rounded py-2.5
                       text-sm font-medium hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-150"
          >
            {mutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  )
}

function ThresholdInput({
  label,
  prefix,
  placeholder,
  value,
  onChange,
}: {
  label: string
  prefix: string
  placeholder: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-2 text-sm text-gray-400">
          {prefix}
        </span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded pl-10 pr-3 py-2
                     text-sm focus:outline-none focus:ring-2
                     focus:ring-gray-400 focus:border-transparent"
        />
      </div>
    </div>
  )
}
