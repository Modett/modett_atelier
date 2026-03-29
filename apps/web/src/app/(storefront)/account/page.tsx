'use client'

import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { useOrders, useLoyalty, useInbox } from '@/hooks/useAccount'
import { useWishlist } from '@/hooks/useWishlist'
import { formatMoney } from '@/hooks/useCurrency'
import type { CurrencyCode } from '@/types'
import { getOrderStatusBadge, orderBadgeClassName } from '@/lib/orderDisplay'
import { productImagePlaceholderUrl } from '@/lib/assets'

function LinesSkeleton() {
  return (
    <div className="animate-pulse space-y-2 py-1">
      <div className="h-4 w-40 bg-muted rounded-none" />
      <div className="h-4 w-28 bg-muted rounded-none" />
      <div className="h-4 w-full bg-muted/70 rounded-none" />
    </div>
  )
}

export default function AccountDashboardPage() {
  const ordersQ   = useOrders(1)
  const loyaltyQ  = useLoyalty()
  const wishlistQ = useWishlist()
  const inboxQ    = useInbox(1)

  const recentOrders = ordersQ.data?.orders.slice(0, 3) ?? []
  const loyalty      = loyaltyQ.data
  const wishlist     = wishlistQ.data ?? []
  const inbox        = inboxQ.data

  return (
    <div>
      <h1 className="font-display font-bold text-[28px] text-umber mb-8 lg:hidden">
        My Modett
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Recent orders */}
        <div className="bg-background border border-muted p-6">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Recent Orders
          </p>
          {ordersQ.isLoading ? (
            <LinesSkeleton />
          ) : recentOrders.length === 0 ? (
            <p className="font-body text-[14px] text-umber">No orders yet</p>
          ) : (
            <ul className="space-y-3">
              {recentOrders.map((o) => {
                const badge = getOrderStatusBadge(o)
                const cur   = o.currency as CurrencyCode
                return (
                  <li key={o.id}>
                    <Link
                      href={`/account/orders/${encodeURIComponent(o.order_ref)}`}
                      className="block hover:opacity-80 transition-opacity"
                    >
                      <div className="flex justify-between gap-2 items-start">
                        <span className="font-body text-[13px] text-umber font-medium">
                          {o.order_ref}
                        </span>
                        <span
                          className={orderBadgeClassName(badge.className)}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="font-body font-light text-[12px] text-muted-foreground mt-1">
                        {o.placed_at
                          ? new Date(o.placed_at).toLocaleDateString('en-GB')
                          : '—'}
                      </p>
                      <p className="font-body text-[13px] text-umber mt-1">
                        {formatMoney({ amount: o.total, currency: cur })}
                      </p>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          <Link
            href="/account/orders"
            className="inline-block mt-4 font-body font-light text-[12px] uppercase tracking-[0.15em] text-umber hover:underline"
          >
            View all orders
          </Link>
        </div>

        {/* Loyalty */}
        <div className="bg-background border border-muted p-6">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Loyalty Points
          </p>
          {loyaltyQ.isLoading ? (
            <LinesSkeleton />
          ) : loyalty ? (
            <>
              <p className="font-display font-bold text-[36px] text-umber leading-none mb-3">
                {loyalty.balance.toLocaleString()}
              </p>
              <TierBadge tier={loyalty.tier} />
              <Link
                href="/account/loyalty"
                className="inline-block mt-4 font-body font-light text-[12px] uppercase tracking-[0.15em] text-umber hover:underline"
              >
                View loyalty
              </Link>
            </>
          ) : null}
        </div>

        {/* Wishlist */}
        <div className="bg-background border border-muted p-6">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Wishlist
          </p>
          {wishlistQ.isLoading ? (
            <LinesSkeleton />
          ) : wishlist.length === 0 ? (
            <p className="font-body text-[14px] text-umber">No saved items</p>
          ) : (
            <>
              <p className="font-body text-[14px] text-umber mb-3">
                {wishlist.length} item{wishlist.length === 1 ? '' : 's'}
              </p>
              <div className="flex gap-2">
                {wishlist.slice(0, 3).map((w) => (
                  <div
                    key={w.id}
                    className="relative w-16 h-20 bg-muted overflow-hidden shrink-0"
                  >
                    <Image
                      src={w.product.keyImage?.url ?? productImagePlaceholderUrl}
                      alt={w.product.keyImage?.altText ?? w.product.displayName}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
          <Link
            href="/account/wishlist"
            className="inline-block mt-4 font-body font-light text-[12px] uppercase tracking-[0.15em] text-umber hover:underline"
          >
            View wishlist
          </Link>
        </div>

        {/* Inbox */}
        <div className="bg-background border border-muted p-6">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
            Inbox
          </p>
          {inboxQ.isLoading ? (
            <LinesSkeleton />
          ) : !inbox || inbox.messages.length === 0 ? (
            <p className="font-body text-[14px] text-umber">No messages</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-body text-[14px] text-umber">
                  {inbox.unreadCount > 0
                    ? `${inbox.unreadCount} unread`
                    : 'All read'}
                </span>
                {inbox.unreadCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-umber" aria-hidden />
                )}
              </div>
              <p className="font-body font-light text-[13px] text-muted-foreground line-clamp-2">
                {inbox.messages.find((m) => !m.is_read)?.title
                  ?? inbox.messages[0]?.title}
              </p>
            </>
          )}
          <Link
            href="/account/inbox"
            className="inline-block mt-4 font-body font-light text-[12px] uppercase tracking-[0.15em] text-umber hover:underline"
          >
            View inbox
          </Link>
        </div>
      </div>
    </div>
  )
}

function TierBadge({ tier }: { tier: string }) {
  const t = tier.toUpperCase()
  const styles =
    t === 'BRONZE'
      ? 'bg-[#CD7F32]/10 text-[#8B5E3C]'
      : t === 'SILVER'
        ? 'bg-gray-100 text-gray-500'
        : 'bg-highlight/15 text-umber'
  return (
    <span
      className={cn(
        'inline-block px-3 py-1 text-[11px] font-body font-light uppercase tracking-[0.12em] rounded-none',
        styles,
      )}
    >
      {t}
    </span>
  )
}
