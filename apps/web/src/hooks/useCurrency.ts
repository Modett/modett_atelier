'use client'

import { useState, useEffect } from 'react'
import type { CurrencyCode, Money } from '@/types'

interface GeoContext {
  currency:    CurrencyCode
  countryCode: string
  isReady:     boolean
}

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
    return value
  }
  return 'LKR'
}

export function useGeo(): GeoContext {
  const [geo, setGeo] = useState<GeoContext>({
    currency:    'LKR',
    countryCode: 'LK',
    isReady:     false,
  })

  useEffect(() => {
    setGeo({
      currency:    getCurrencyCookie(),
      countryCode: getCountryCookie(),
      isReady:     true,
    })
  }, [])

  return geo
}

export function useCurrency(): CurrencyCode {
  return useGeo().currency
}

export function formatMoney(money: Money): string {
  const num = parseFloat(money.amount)
  const formatter = new Intl.NumberFormat(
    money.currency === 'LKR'
      ? 'en-LK'
      : money.currency === 'SGD'
        ? 'en-SG'
        : 'en-US',
    {
      style:                 'currency',
      currency:              money.currency,
      minimumFractionDigits: 2,
    },
  )
  return formatter.format(num)
}
