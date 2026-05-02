'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogout } from '@/hooks/useLogout'
import { useSession } from '@/hooks/useSession'

export const ACCOUNT_LINKS = [
  { href: '/account',           label: 'Personal Details' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/orders',    label: 'Order Details' },
  { href: '/account/loyalty',   label: 'Loyalty' },
  { href: '/account/inbox',     label: 'Inbox' },
  { href: '/account/reviews',   label: 'Reviews' },
  { href: '/account/wishlist',  label: 'Wishlist' },
  { href: '/account/login',     label: 'Login Details' },
] as const

export function AccountSidebar() {
  const pathname = usePathname()
  const logout   = useLogout()
  const { user, isLoading } = useSession()

  const accountLine =
    user?.firstName?.trim()
      ? `${user.firstName}'s account`
      : user?.lastName?.trim()
        ? `${user.lastName}'s account`
        : user
          ? 'Your account'
          : ''

  return (
    <nav aria-label="Account">
      <p className="font-display font-bold text-[18px] text-umber mb-1">
        My Modett
      </p>
      {isLoading ? (
        <div className="w-32 h-4 bg-muted animate-pulse mb-5" aria-hidden />
      ) : (
        <p className="font-body font-light text-[13px] text-umber mb-5">
          {accountLine}
        </p>
      )}
      <ul className="space-y-0">
        {ACCOUNT_LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  'py-3 border-b border-muted/40 flex items-center justify-between group',
                  'font-body font-light text-[13px]',
                  'transition-colors duration-200',
                  active
                    ? 'text-umber font-medium'
                    : 'text-umber hover:text-graphite',
                )}
              >
                {link.label}
                <ChevronRight
                  className={cn(
                    'w-4 h-4 shrink-0 transition-opacity duration-200',
                    active
                      ? 'opacity-100 text-umber'
                      : 'opacity-0 group-hover:opacity-40 text-umber',
                  )}
                  aria-hidden
                />
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
          'mt-6 block',
          'font-body font-light text-[12px] uppercase tracking-[0.15em]',
          'text-umber hover:text-graphite transition-colors',
        )}
      >
        Sign Out
      </button>
    </nav>
  )
}
