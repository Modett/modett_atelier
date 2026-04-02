'use client'

/**
 * Account inbox — campaign + transactional messages.
 * Manual E2E: TEST 7–8 (header badge, mark read, mark all read).
 */

import { useState } from 'react'
import Link from 'next/link'
import {
  Mail,
  Package,
  Heart,
  Star,
  Award,
  Megaphone,
  Loader2,
} from 'lucide-react'
import { OutlineButton } from '@modett/ui'
import { cn } from '@/lib/utils'
import {
  useInbox,
  useMarkMessageRead,
  useMarkAllRead,
  useUnreadCount,
} from '@/hooks/useAccount'

export default function AccountInboxPage() {
  const [listLimit, setListLimit] = useState(20)
  const { data, isLoading, isFetching } = useInbox({ page: 1, limit: listLimit })
  const { data: unreadData } = useUnreadCount()
  const markRead = useMarkMessageRead()
  const markAll = useMarkAllRead()
  const [expanded, setExpanded] = useState<string | null>(null)

  const messages = data?.messages ?? []
  const total = data?.total ?? 0
  const unread = unreadData?.count ?? data?.unreadCount ?? 0
  const hasMore = messages.length < total

  if (isLoading && listLimit === 20) {
    return (
      <div className="space-y-3" aria-busy>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-none bg-muted"
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-[24px] font-bold text-umber">
            Inbox
          </h1>
          {unread > 0 && (
            <span className="rounded-none bg-umber px-2 py-0.5 font-body text-[12px] font-light text-background">
              {unread}
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => {
              void markAll.mutateAsync().catch(() => {})
            }}
            disabled={markAll.isPending}
            className="font-body text-[13px] font-light text-umber underline decoration-umber/40 underline-offset-4 transition-colors hover:text-umber/80"
          >
            {markAll.isPending ? 'Updating…' : 'Mark all as read'}
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="border border-muted px-6 py-16 text-center">
          <Mail
            className="mx-auto mb-4 h-10 w-10 text-muted-foreground/40"
            strokeWidth={1}
            aria-hidden
          />
          <p className="mb-2 font-body text-[14px] font-medium text-umber">
            No messages yet
          </p>
          <p className="font-body text-[13px] font-light text-muted-foreground">
            Your order updates, care guides, and exclusive offers will appear
            here.
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-2">
            {messages.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (!m.is_read) {
                      markRead.mutate(m.id)
                    }
                    setExpanded((id) => (id === m.id ? null : m.id))
                  }}
                  className={cn(
                    'w-full border border-muted p-4 text-left transition-colors duration-200 ease-out',
                    m.is_read ? 'bg-background' : 'bg-surface-raised',
                  )}
                >
                  <div className="flex gap-3">
                    {!m.is_read && (
                      <span
                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-umber"
                        aria-hidden
                      />
                    )}
                    {m.is_read && <span className="w-2 shrink-0" aria-hidden />}
                    <MessageIcon type={m.type} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            'font-body text-[14px] text-umber',
                            m.is_read ? 'font-light' : 'font-medium',
                          )}
                        >
                          {m.title}
                        </p>
                        <span className="shrink-0 font-body text-[11px] font-light text-muted-foreground">
                          {new Date(m.created_at).toLocaleDateString('en-GB', {
                            month: 'short',
                            year: 'numeric',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-body text-[12px] font-light text-muted-foreground">
                        {m.body}
                      </p>
                    </div>
                  </div>

                  {expanded === m.id && (
                    <div className="mt-4 border-t border-muted pt-4">
                      <p className="font-body text-[13px] font-light leading-relaxed text-umber/90">
                        {m.body}
                      </p>
                      {m.cta_label && m.cta_url && (
                        <OutlineButton
                          as={Link}
                          href={m.cta_url}
                          variant="deep"
                          size="sm"
                          fullWidth
                          className="mt-4 rounded-none"
                        >
                          {m.cta_label}
                        </OutlineButton>
                      )}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                disabled={isFetching}
                onClick={() => setListLimit((n) => n + 20)}
                className="font-body text-[12px] font-light uppercase tracking-[0.2em] text-umber underline decoration-umber/30 underline-offset-4"
              >
                {isFetching ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading
                  </span>
                ) : (
                  'Load more'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function MessageIcon({ type }: { type: string }) {
  const c = 'mt-0.5 h-5 w-5 shrink-0 text-umber'
  switch (type) {
    case 'ORDER_UPDATE':
      return <Package className={c} aria-hidden />
    case 'CARE_GUIDE':
      return <Heart className={c} aria-hidden />
    case 'REVIEW_REQUEST':
      return <Star className={c} aria-hidden />
    case 'LOYALTY_TIER':
    case 'LOYALTY':
      return <Award className={c} aria-hidden />
    case 'CAMPAIGN':
      return <Megaphone className={c} aria-hidden />
    default:
      return <Mail className={c} aria-hidden />
  }
}
