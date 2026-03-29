'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ACCOUNT_LINKS } from './AccountSidebar'

export function AccountMobileNav() {
  const pathname = usePathname()

  return (
    <div className="overflow-x-auto flex gap-1 border-b border-muted pb-0 -mx-1 px-1">
      {ACCOUNT_LINKS.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'whitespace-nowrap px-4 py-3 flex-shrink-0',
              'font-body font-light text-[12px] uppercase tracking-[0.15em]',
              'border-b-2 transition-all duration-200',
              active
                ? 'border-umber text-umber'
                : 'border-transparent text-muted-foreground',
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </div>
  )
}
