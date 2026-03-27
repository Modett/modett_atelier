'use client'

import { useState, useEffect } from 'react'
import type { CurrencyCode, Money } from '@/types'

const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  LK: 'LKR',
  SG: 'SGD',
}

export function getCountryCookie(): string {
  if (typeof document === 'undefined') return 'LK'
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('country='))
  const value = match?.split('=')?.[1]
  if (value && value.length === 2) return value.toUpperCase()
  return 'LK'
}

export function getCurrencyCookie(): CurrencyCode {
  if (typeof document === 'undefined') return 'LKR'
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith('currency='))
  const value = match?.split('=')?.[1]
  if (value === 'LKR' || value === 'SGD' || value === 'USD') {
    return value
  }
  // Fall back to deriving from country cookie
  const country = getCountryCookie()
  return COUNTRY_CURRENCY[country] ?? 'LKR'
}

interface GeoContext {
  currency:    CurrencyCode
  countryCode: string
}

export function useGeo(): GeoContext {
  const [geo, setGeo] = useState<GeoContext>({
    currency:    'LKR',
    countryCode: 'LK',
  })

  useEffect(() => {
    setGeo({
      currency:    getCurrencyCookie(),
      countryCode: getCountryCookie(),
    })
  }, [])

  return geo
}

// Backwards-compatible — existing callers continue to work unchanged
export function useCurrency(): CurrencyCode {
  const { currency } = useGeo()
  return currency
}

export function formatMoney(money: Money): string {
  const { amount, currency } = money
  const num = parseFloat(amount)

  switch (currency) {
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
  }
}
