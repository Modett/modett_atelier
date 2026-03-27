'use client'

import { useState, createContext, useContext, useCallback } from 'react'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { useLogout } from '@/hooks/useLogout'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [view, setView]     = useState<'login' | 'register'>('login')
  const logoutMutation       = useLogout()

  const openPanel  = useCallback(() => setIsOpen(true), [])
  const closePanel = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => setView('login'), 350)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isOpen,
        openPanel,
        closePanel,
        view,
        setView,
        logout:       () => logoutMutation.mutate(),
        isLoggingOut: logoutMutation.isPending,
      }}
    >
      {children}
      <AuthPanel open={isOpen} onClose={closePanel} />
    </AuthContext.Provider>
  )
}

export function useAuthPanel() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthPanel must be used within AuthProvider')
  return ctx
}

interface AuthContextValue {
  isOpen:       boolean
  openPanel:    () => void
  closePanel:   () => void
  view:         'login' | 'register'
  setView:      (v: 'login' | 'register') => void
  logout:       () => void
  isLoggingOut: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
