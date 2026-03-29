'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useLogout } from '@/hooks/useLogout'

export const ACCOUNT_LINKS = [
  { href: '/account',           label: 'Overview' },
  { href: '/account/orders',    label: 'Orders' },
  { href: '/account/wishlist',  label: 'Wishlist' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/loyalty',   label: 'Loyalty' },
  { href: '/account/inbox',     label: 'Inbox' },
  { href: '/account/profile',   label: 'Profile' },
] as const

export function AccountSidebar() {
  const pathname = usePathname()
  const logout   = useLogout()

  return (
    <nav aria-label="Account">
      <p className="font-display font-bold text-[18px] text-umber mb-5">
        My Modett
      </p>
      <ul className="space-y-0">
        {ACCOUNT_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'flex items-center py-2.5 border-b border-muted/50',
                  'font-body font-light text-[13px] uppercase tracking-[0.15em]',
                  'transition-all duration-200',
                  active
                    ? 'text-umber font-medium border-l-2 border-umber pl-3 -ml-3'
                    : 'text-muted-foreground hover:text-umber',
                )}
              >
                {link.label}
              </Link>
            </li>
          )
        })}
      </ul>
      <button
        type="button"
        onClick={() => logout.mutate()}
        disabled={logout.isPending}
        className={cn(
          'mt-6 font-body font-light text-[12px] uppercase tracking-[0.15em]',
          'text-muted-foreground hover:text-umber transition-colors duration-200',
        )}
      >
        Sign Out
      </button>
    </nav>
  )
}
