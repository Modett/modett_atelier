import { create } from 'zustand'

interface UIStore {
  bagOpen:   boolean
  openBag:   () => void
  closeBag:  () => void
  toggleBag: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  bagOpen:   false,
  openBag:   () => set({ bagOpen: true }),
  closeBag:  () => set({ bagOpen: false }),
  toggleBag: () => set((s) => ({ bagOpen: !s.bagOpen })),
}))
