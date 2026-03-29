'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Award, Sparkles, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLoyalty, useLoyaltyLedger, type LoyaltyLedgerRow } from '@/hooks/useAccount'

const TIER_THRESHOLDS = { SILVER: 1000, GOLD: 5000 } as const

export default function AccountLoyaltyPage() {
  const { data: account, isLoading: aLoad } = useLoyalty()
  const [page, setPage]                     = useState(1)
  const [ledgerRows, setLedgerRows]         = useState<LoyaltyLedgerRow[]>([])
  const { data: ledgerPage, isLoading: lLoad, isFetching } = useLoyaltyLedger(page)

  useEffect(() => {
    if (!ledgerPage?.ledger) return
    if (page === 1) {
      setLedgerRows(ledgerPage.ledger)
      return
    }
    setLedgerRows((prev) => [...prev, ...ledgerPage.ledger])
  }, [ledgerPage, page])

  if (aLoad && !account) {
    return <div className="h-48 bg-muted animate-pulse rounded-none" />
  }

  if (!account) return null

  const tier     = account.tier.toUpperCase()
  const earned12 = account.earned12m

  let progress = 0
  let nextLabel = ''
  let topNote = ''
  if (tier === 'GOLD') {
    progress  = 100
    topNote   = 'You’ve reached our highest tier ✦'
  } else if (tier === 'SILVER') {
    const target = TIER_THRESHOLDS.GOLD
    progress     = Math.min(100, Math.round((earned12 / target) * 100))
    nextLabel    = 'GOLD'
  } else {
    const target = TIER_THRESHOLDS.SILVER
    progress     = Math.min(100, Math.round((earned12 / target) * 100))
    nextLabel    = 'SILVER'
  }

  const barFill = tier === 'GOLD' ? 'bg-highlight' : 'bg-umber'

  const hasMore = ledgerPage ? page * ledgerPage.limit < ledgerPage.total : false

  return (
    <div className="space-y-10">
      <h1 className="font-display font-bold text-[24px] text-umber">
        Loyalty
      </h1>

      <section>
        <p className="font-display font-bold text-[48px] text-umber leading-none">
          {account.balance.toLocaleString()} Points
        </p>
        <div className="mt-4">
          <TierBadgeLarge tier={tier} />
        </div>

        <div className="mt-8">
          {tier === 'GOLD' ? (
            <p className="font-body font-light text-[14px] text-umber">
              {topNote}
            </p>
          ) : (
            <>
              <div className="flex justify-between font-body font-light text-[12px] text-muted-foreground mb-2">
                <span>{tier}</span>
                <span>{nextLabel}</span>
              </div>
              <div className="h-2 bg-muted rounded-none overflow-hidden">
                <div
                  className={cn('h-full rounded-none transition-all duration-500', barFill)}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {account.nextTier && account.nextTier.pointsNeeded > 0 && (
                <p className="font-body font-light text-[12px] text-muted-foreground mt-2">
                  {account.nextTier.pointsNeeded.toLocaleString()} points to{' '}
                  {account.nextTier.tier}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Tier benefits
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BenefitCard
            tier="BRONZE"
            active={tier === 'BRONZE'}
            icon={<Gift className="w-6 h-6" />}
            lines={[
              '1 point per LKR 100 spent.',
              'Free standard shipping over LKR 15,000.',
            ]}
          />
          <BenefitCard
            tier="SILVER"
            active={tier === 'SILVER'}
            icon={<Sparkles className="w-6 h-6" />}
            lines={[
              '1.25× points.',
              'Priority customer care.',
              'Early access to new arrivals.',
            ]}
          />
          <BenefitCard
            tier="GOLD"
            active={tier === 'GOLD'}
            icon={<Award className="w-6 h-6" />}
            lines={[
              '1.5× points.',
              'Complimentary gift packaging.',
              'Personal styling session.',
            ]}
          />
        </div>
      </section>

      <section>
        <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Points history
        </h2>
        <div className="border border-muted hidden md:block overflow-x-auto">
          <table className="w-full text-left min-w-[480px]">
            <thead>
              <tr className="border-b border-muted bg-surface-raised/30">
                <th className="px-4 py-3 font-body font-light text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 font-body font-light text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
                  Description
                </th>
                <th className="px-4 py-3 font-body font-light text-[11px] uppercase tracking-[0.1em] text-muted-foreground text-right">
                  Points
                </th>
              </tr>
            </thead>
            <tbody>
              {ledgerRows.map((row) => (
                <LedgerRow key={row.id} row={row} />
              ))}
            </tbody>
          </table>
        </div>
        <ul className="md:hidden space-y-3">
          {ledgerRows.map((row) => (
            <li key={row.id} className="border border-muted p-4">
              <LedgerRowMobile row={row} />
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            disabled={isFetching}
            onClick={() => setPage((p) => p + 1)}
            className={cn(
              'mt-6 h-11 px-10 border border-umber text-umber rounded-none',
              'font-body font-light uppercase tracking-[0.25em] text-[12px]',
              'hover:bg-umber hover:text-background transition-all duration-200',
              'disabled:opacity-40',
            )}
          >
            {lLoad ? 'Loading…' : 'Load more'}
          </button>
        )}
      </section>

      <section className="border border-muted p-6 bg-surface-raised/20">
        <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
          How to earn
        </h2>
        <p className="font-body font-light text-[14px] text-umber leading-relaxed">
          Earn 1 point for every LKR 100 spent at Modett. Points are added to your account
          after your order is delivered.
        </p>
      </section>
    </div>
  )
}

function TierBadgeLarge({ tier }: { tier: string }) {
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
        'inline-block px-4 py-2 text-[12px] font-body font-light uppercase tracking-[0.15em] rounded-none',
        styles,
      )}
    >
      {t}
    </span>
  )
}

function BenefitCard({
  tier,
  active,
  icon,
  lines,
}: {
  tier: string
  active: boolean
  icon: ReactNode
  lines: string[]
}) {
  return (
    <div
      className={cn(
        'border p-5 rounded-none',
        active ? 'border-umber bg-surface-raised/30' : 'border-muted',
      )}
    >
      <div className="text-umber mb-3">{icon}</div>
      <p className="font-body font-medium text-[14px] text-umber mb-2">{tier}</p>
      <ul className="font-body font-light text-[13px] text-muted-foreground space-y-1 list-disc list-inside">
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  )
}

function ledgerDescription(row: LoyaltyLedgerRow): string {
  const meta = row.metadata_json ?? {}
  switch (row.type) {
    case 'EARN':
      return `Purchase — ${String(meta.order_ref ?? meta.orderRef ?? 'order')}`
    case 'REDEEM':
      return 'Redeemed at checkout'
    case 'BONUS':
      return String(meta.reason ?? 'Bonus points')
    case 'EXPIRY':
      return 'Points expired'
    case 'ADJUST':
      return String(meta.reason ?? 'Adjustment')
    default:
      return row.type
  }
}

function LedgerRow({ row }: { row: LoyaltyLedgerRow }) {
  const pos = row.type === 'EARN' || row.type === 'BONUS'
  return (
    <tr className="border-b border-muted last:border-0">
      <td className="px-4 py-3 font-body font-light text-[13px] text-muted-foreground">
        {new Date(row.created_at).toLocaleDateString('en-GB')}
      </td>
      <td className="px-4 py-3 font-body text-[13px] text-umber">
        {ledgerDescription(row)}
      </td>
      <td
        className={cn(
          'px-4 py-3 font-body text-[13px] text-right tabular-nums',
          pos ? 'text-[#4A7C59]' : 'text-red-400',
        )}
      >
        {pos ? '+' : '−'}
        {Math.abs(row.points)}
      </td>
    </tr>
  )
}

function LedgerRowMobile({ row }: { row: LoyaltyLedgerRow }) {
  const pos = row.type === 'EARN' || row.type === 'BONUS'
  return (
    <div>
      <div className="flex justify-between gap-2">
        <span className="font-body font-light text-[12px] text-muted-foreground">
          {new Date(row.created_at).toLocaleDateString('en-GB')}
        </span>
        <span
          className={cn(
            'font-body text-[14px] tabular-nums',
            pos ? 'text-[#4A7C59]' : 'text-red-400',
          )}
        >
          {pos ? '+' : '−'}
          {Math.abs(row.points)}
        </span>
      </div>
      <p className="font-body text-[13px] text-umber mt-2">{ledgerDescription(row)}</p>
    </div>
  )
}
