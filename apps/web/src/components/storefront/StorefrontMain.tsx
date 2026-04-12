'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface StorefrontMainProps {
  children: React.ReactNode
}

export function StorefrontMain({ children }: StorefrontMainProps) {
  const pathname = usePathname()
  const isHome = pathname === '/'

  return (
    <main
      className={cn(
        'min-h-screen bg-background',
        !isHome && 'pt-13 md:pt-14',
      )}
    >
      {children}
    </main>
  )
}
