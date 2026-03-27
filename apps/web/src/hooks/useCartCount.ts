'use client'

import { useCart } from './useCart'

export function useCartCount(): number {
  const { itemCount } = useCart()
  return itemCount
}
