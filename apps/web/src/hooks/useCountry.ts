'use client'

import { useState, useEffect } from 'react'
import { getCurrencyCookie } from './useCurrency'
import type { CurrencyCode } from '@/types'

export type CountryCode = 'LK' | 'SG' | 'US' | string

const CURRENCY_TO_COUNTRY: Record<CurrencyCode, CountryCode> = {
  LKR: 'LK',
  SGD: 'SG',
  USD: 'US',
}

export function getCountryFromCookie(): CountryCode {
  if (typeof document === 'undefined') return 'LK'
  const countryMatch = document.cookie
    .split('; ')
    .find((row) => row.startsWith('country='))
  const countryValue = countryMatch?.split('=')?.[1]
  if (countryValue && countryValue.length === 2) {
    return countryValue.toUpperCase()
  }
  const currency = getCurrencyCookie()
  return CURRENCY_TO_COUNTRY[currency] ?? 'LK'
}

export function useCountry(): CountryCode {
  const [country, setCountry] = useState<CountryCode>('LK')

  useEffect(() => {
    setCountry(getCountryFromCookie())
  }, [])

  return country
}
