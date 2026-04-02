'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Analytics } from '@/lib/analytics'
import { useSession } from '@/hooks/useSession'

export function PageTracker() {
  const pathname = usePathname()
  const { user } = useSession()

  useEffect(() => {
    Analytics.pageView({ path: pathname, userId: user?.id })
  }, [pathname, user?.id])

  return null
}
