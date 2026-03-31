'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/hooks/useSession'
import { storePostAuthPath } from '@/lib/postAuthRedirect'

export function AccountAuthGuard({ children }: { children: ReactNode }) {
  const { isLoggedIn, isLoading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isLoggedIn) {
      storePostAuthPath('/account')
      router.replace('/?openAuth=1')
    }
  }, [isLoggedIn, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <div className="w-8 h-8 border-2 border-muted border-t-umber rounded-full animate-spin" />
          <span className="sr-only">Checking your session</span>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) return null

  return <>{children}</>
}
