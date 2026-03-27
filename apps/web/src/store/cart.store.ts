import { create } from 'zustand'

interface CartState {
  itemCount: number
}

export const useCartStore = create<CartState>(() => ({
  itemCount: 0,
}))
