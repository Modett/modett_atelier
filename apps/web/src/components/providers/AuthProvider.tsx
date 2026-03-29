'use client'

import {
  Suspense,
  useState,
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { AuthPanel } from '@/components/auth/AuthPanel'
import { useLogout } from '@/hooks/useLogout'
import { storePostAuthPath } from '@/lib/postAuthRedirect'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen]               = useState(false)
  const [view, setView]                   = useState<'login' | 'register'>('login')
  const [registerPrefillEmail, setRegisterPrefillEmail] = useState<string | null>(null)
  const logoutMutation                    = useLogout()

  const openPanel = useCallback(() => setIsOpen(true), [])

  const openRegisterWithEmail = useCallback((email: string) => {
    setRegisterPrefillEmail(email.trim())
    setView('register')
    setIsOpen(true)
  }, [])

  const clearRegisterPrefill = useCallback(() => {
    setRegisterPrefillEmail(null)
  }, [])

  const closePanel = useCallback(() => {
    setIsOpen(false)
    setTimeout(() => {
      setView('login')
      setRegisterPrefillEmail(null)
    }, 350)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isOpen,
        openPanel,
        openRegisterWithEmail,
        closePanel,
        view,
        setView,
        registerPrefillEmail,
        clearRegisterPrefill,
        logout:       () => logoutMutation.mutate(),
        isLoggingOut: logoutMutation.isPending,
      }}
    >
      {children}
      <Suspense fallback={null}>
        <AuthOpenAuthQuerySync openPanel={openPanel} />
      </Suspense>
      <AuthPanel open={isOpen} onClose={closePanel} />
    </AuthContext.Provider>
  )
}

function AuthOpenAuthQuerySync({ openPanel }: { openPanel: () => void }) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const pathname     = usePathname()
  const processedRef = useRef<string | null>(null)

  useEffect(() => {
    if (searchParams.get('openAuth') !== '1') return
    const next = searchParams.get('next')
    const sig  = `${pathname}|${searchParams.toString()}`
    if (processedRef.current === sig) return
    processedRef.current = sig

    if (next?.startsWith('/')) {
      storePostAuthPath(next)
    }
    openPanel()

    const params = new URLSearchParams(searchParams.toString())
    params.delete('openAuth')
    params.delete('next')
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [searchParams, pathname, openPanel, router])

  return null
}

export function useAuthPanel() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthPanel must be used within AuthProvider')
  return ctx
}

interface AuthContextValue {
  isOpen:                 boolean
  openPanel:              () => void
  openRegisterWithEmail:  (email: string) => void
  closePanel:             () => void
  view:                   'login' | 'register'
  setView:                (v: 'login' | 'register') => void
  registerPrefillEmail:   string | null
  clearRegisterPrefill:   () => void
  logout:                 () => void
  isLoggingOut:           boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)
