import { create } from 'zustand'

type CurrencyCode = 'LKR' | 'SGD' | 'USD'

interface CurrencyState {
  currency: CurrencyCode
  countryName: string
}

export const useCurrencyStore = create<CurrencyState>(() => ({
  currency: 'USD',
  countryName: 'Sri Lanka',
}))
