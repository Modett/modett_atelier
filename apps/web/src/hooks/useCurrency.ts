'use client'

import { useState, useEffect } from 'react'
import type { CurrencyCode }   from '@/types'

// ── Types ─────────────────────────────────────────────────
export interface GeoContext {
  currency:    CurrencyCode
  countryCode: string
  isReady:     boolean
}

// ── Cookie readers (safe for SSR) ─────────────────────────
// These return defaults during SSR when document is unavailable.
// They are called in useEffect (client-only) for the real values.

export function getCountryCookie(): string {
  if (typeof document === 'undefined') return 'LK'
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('country='))
  return match?.split('=')?.[1] ?? 'LK'
}

export function getCurrencyCookie(): CurrencyCode {
  if (typeof document === 'undefined') return 'LKR'
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('currency='))
  const value = match?.split('=')?.[1]
  if (value === 'LKR' || value === 'SGD' || value === 'USD') {
    return value as CurrencyCode
  }
  return 'LKR'
}

// ── useGeo hook ───────────────────────────────────────────
// Returns currency AND countryCode from cookies.
// isReady = false until cookies are read on the client.
// All API calls that use currency should check isReady first.

export function useGeo(): GeoContext {
  const [geo, setGeo] = useState<GeoContext>({
    currency:    'LKR',
    countryCode: 'LK',
    isReady:     false,   // prevents API calls before cookies load
  })

  useEffect(() => {
    // Only runs on the client after hydration
    setGeo({
      currency:    getCurrencyCookie(),
      countryCode: getCountryCookie(),
      isReady:     true,
    })
  }, [])

  return geo
}

// ── useCurrency ───────────────────────────────────────────
// Backwards-compatible hook. Use useGeo() for new code.
// Keep this so existing components don't break.

export function useCurrency(): CurrencyCode {
  return useGeo().currency
}

// ── formatMoney ───────────────────────────────────────────
// Always use this for displaying prices. Never format inline.

export function formatMoney(
  money: { amount: string | number; currency: CurrencyCode }
): string {
  const num = typeof money.amount === 'string'
    ? parseFloat(money.amount)
    : money.amount

  switch (money.currency) {
    case 'LKR':
      return `LKR ${num.toLocaleString('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    case 'SGD':
      return `SGD ${num.toLocaleString('en-SG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    case 'USD':
      return `USD ${num.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    default:
      return `${money.currency} ${num.toFixed(2)}`
  }
}
