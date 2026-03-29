'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Package, Heart, Star, Award } from 'lucide-react'
import { OutlineButton } from '@modett/ui'
import { cn } from '@/lib/utils'
import { useInbox, useMarkMessageRead } from '@/hooks/useAccount'

export default function AccountInboxPage() {
  const { data, isLoading } = useInbox(1)
  const markRead             = useMarkMessageRead()
  const [expanded, setExpanded] = useState<string | null>(null)

  const messages = data?.messages ?? []
  const unread   = data?.unreadCount ?? 0

  if (isLoading) {
    return <div className="h-40 bg-muted animate-pulse rounded-none" />
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <h1 className="font-display font-bold text-[24px] text-umber">
          Inbox
        </h1>
        {unread > 0 && (
          <span className="font-body font-light text-[12px] text-background bg-umber px-2 py-0.5 rounded-none">
            {unread}
          </span>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="text-center py-16 border border-muted px-6">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" strokeWidth={1} />
          <p className="font-body font-medium text-[14px] text-umber mb-2">
            No messages yet
          </p>
          <p className="font-body font-light text-[13px] text-muted-foreground">
            Your notifications will appear here when you place an order.
          </p>
        </div>
      ) : (
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
                  'w-full text-left border border-muted p-4 transition-colors',
                  m.is_read ? 'bg-background' : 'bg-surface-raised',
                )}
              >
                <div className="flex gap-3">
                  <MessageIcon type={m.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2 items-start">
                      <p className="font-body font-medium text-[14px] text-umber">
                        {m.title}
                      </p>
                      <span className="font-body font-light text-[11px] text-muted-foreground shrink-0">
                        {new Date(m.created_at).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                    <p className="font-body font-light text-[12px] text-muted-foreground truncate mt-1">
                      {m.body}
                    </p>
                  </div>
                  {!m.is_read && (
                    <span className="w-2 h-2 rounded-full bg-umber shrink-0 mt-2" aria-hidden />
                  )}
                </div>

                {expanded === m.id && (
                  <div className="mt-4 pt-4 border-t border-muted">
                    <p className="font-body font-light text-[13px] text-umber whitespace-pre-wrap">
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
      )}
    </div>
  )
}

function MessageIcon({ type }: { type: string }) {
  const c = 'w-5 h-5 text-umber shrink-0 mt-0.5'
  switch (type) {
    case 'ORDER_UPDATE':
      return <Package className={c} aria-hidden />
    case 'CARE_GUIDE':
      return <Heart className={c} aria-hidden />
    case 'REVIEW_REQUEST':
      return <Star className={c} aria-hidden />
    case 'LOYALTY_TIER':
      return <Award className={c} aria-hidden />
    default:
      return <Mail className={c} aria-hidden />
  }
}
