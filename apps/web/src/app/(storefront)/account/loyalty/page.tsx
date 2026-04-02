'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { Award, Sparkles, Gift } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLoyalty, useLoyaltyLedger, type LoyaltyLedgerRow } from '@/hooks/useAccount'

function ledgerDescription(row: LoyaltyLedgerRow): string {
  const meta = row.metadata_json ?? row.metadataJson ?? {}
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

function ledgerDate(row: LoyaltyLedgerRow): string {
  const iso = row.created_at ?? row.createdAt ?? ''
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB')
}

export default function AccountLoyaltyPage() {
  const { data: detail, isLoading: aLoad } = useLoyalty()
  const [page, setPage] = useState(1)
  const [ledgerRows, setLedgerRows] = useState<LoyaltyLedgerRow[]>([])
  const { data: ledgerPage, isLoading: lLoad, isFetching } = useLoyaltyLedger(page)

  useEffect(() => {
    if (!ledgerPage?.ledger) return
    if (page === 1) {
      setLedgerRows(ledgerPage.ledger)
      return
    }
    setLedgerRows((prev) => [...prev, ...ledgerPage.ledger])
  }, [ledgerPage, page])

  // Must be above any early return — Rules of Hooks
  const [explainOpen, setExplainOpen] = useState(false)

  if (aLoad && !detail) {
    return <div className="h-48 bg-muted animate-pulse rounded-none" />
  }

  if (!detail) return null

  const account = detail.account
  const rules = detail.rules
  const tier = account.tier.toUpperCase()
  const compositeScore = account.compositeScore
  const nextTh = detail.nextTierThreshold
  const isGold = tier === 'GOLD'

  let progressPct = 0
  if (!isGold && nextTh > 0) {
    progressPct = Math.min(100, Math.round((compositeScore / nextTh) * 100))
  }
  if (isGold) progressPct = 100

  const barFill =
    tier === 'GOLD' || tier === 'SILVER' ? 'bg-highlight' : 'bg-umber'

  const hasMore = ledgerPage ? page * ledgerPage.limit < ledgerPage.total : false

  const mSilver = rules.multipliersJson.SILVER
  const mGold = rules.multipliersJson.GOLD

  return (
    <div className="space-y-10">
      <h1 className="font-display font-bold text-[24px] text-umber">
        Loyalty
      </h1>

      <section>
        <div className="flex flex-wrap items-end gap-4">
          <TierBadgeLarge tier={tier} />
          <div>
            <p className="font-display font-bold text-[48px] text-umber leading-none tabular-nums">
              {account.balance.toLocaleString()}
            </p>
            <p className="font-body font-light text-[14px] uppercase tracking-[0.2em] text-muted-foreground">
              Points
            </p>
          </div>
        </div>
        <p className="font-body font-light text-[12px] text-muted-foreground mt-3">
          {tier} · Score: {compositeScore.toFixed(2)} · {detail.frequencyLast12m} orders ·{' '}
          {detail.spendLast12m} pts earned in last {rules.evaluationWindowMonths} mo.
        </p>

        <div className="mt-8">
          {isGold ? (
            <p className="font-body font-light text-[13px] text-highlight">
              You&apos;ve reached our highest tier ✦
            </p>
          ) : (
            <>
              <div className="flex justify-between font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                <span>{tier}</span>
                <span>{detail.nextTierName ?? ''}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-none overflow-hidden w-full">
                <div
                  className={cn('h-full rounded-none transition-all duration-500', barFill)}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {detail.pointsUntilNextTier > 0 && (
                <p className="font-body font-light text-[12px] text-muted-foreground mt-2">
                  {compositeScore.toFixed(2)} / {nextTh.toFixed(1)} toward {detail.nextTierName}
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section>
        <button
          type="button"
          onClick={() => setExplainOpen((o) => !o)}
          className="font-body font-light text-[12px] uppercase tracking-[0.15em] text-umber underline text-left"
        >
          How is my tier calculated? {explainOpen ? '▲' : '▼'}
        </button>
        {explainOpen && (
          <div className="mt-4 border border-muted p-4 bg-surface-raised/20 font-body font-light text-[13px] text-umber leading-relaxed space-y-3">
            <p>
              Your Modett tier reflects both how often you shop and how much you spend — because
              frequent shoppers and big spenders are both valuable to us.
            </p>
            <p>
              Tier score = (orders in the last {rules.evaluationWindowMonths} months ×{' '}
              {(rules.frequencyWeight * 100).toFixed(0)}%) + (points earned ÷{' '}
              {rules.spendNormalisationFactor} × {(rules.spendWeight * 100).toFixed(0)}%)
            </p>
            <p>
              Your current score: {compositeScore.toFixed(2)}
              <br />
              Orders this period: {detail.frequencyLast12m}
              <br />
              Points earned: {detail.spendLast12m}
            </p>
          </div>
        )}
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
              'Earn points on every purchase.',
              'Free standard shipping over LKR 15,000.',
            ]}
          />
          <BenefitCard
            tier="SILVER"
            active={tier === 'SILVER'}
            icon={<Sparkles className="w-6 h-6" />}
            lines={[
              `${mSilver}× points on every purchase.`,
              'Priority customer care.',
              'Early access to new arrivals.',
            ]}
          />
          <BenefitCard
            tier="GOLD"
            active={tier === 'GOLD'}
            icon={<Award className="w-6 h-6" />}
            lines={[
              `${mGold}× points.`,
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
        <div className="font-body font-light text-[14px] text-umber leading-relaxed space-y-2">
          <p className="font-display font-medium">Earn Points Every Time You Shop</p>
          <p>
            {rules.earnRateJson.LKR.points} point for every LKR {rules.earnRateJson.LKR.per_amount}{' '}
            spent
          </p>
          <p>Points are added after your order is paid and confirmed.</p>
          <p>
            Redeem {rules.redemptionRateByCurrencyJson.LKR.points} points for LKR{' '}
            {rules.redemptionRateByCurrencyJson.LKR.value} off your next order
          </p>
          <p>
            Points expire after {rules.pointsExpiryMonths} months of inactivity
          </p>
        </div>
      </section>
    </div>
  )
}

function TierBadgeLarge({ tier }: { tier: string }) {
  const t = tier.toUpperCase()
  const styles =
    t === 'BRONZE'
      ? 'bg-amber-100 text-amber-800'
      : t === 'SILVER'
        ? 'bg-gray-100 text-gray-700'
        : 'bg-yellow-100 text-yellow-700'
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
        'border p-5 rounded-none ring-1',
        active ? 'border-umber ring-umber' : 'border-muted ring-transparent',
      )}
    >
      <div className="text-umber mb-3">{icon}</div>
      <p
        className={cn(
          'font-body font-medium text-[14px] mb-2',
          active ? 'text-umber' : 'text-umber/70',
        )}
      >
        {tier}
      </p>
      <ul
        className={cn(
          'font-body font-light text-[13px] space-y-1 list-disc list-inside',
          active ? 'text-muted-foreground' : 'text-muted-foreground/80',
        )}
      >
        {lines.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </div>
  )
}

function LedgerRow({ row }: { row: LoyaltyLedgerRow }) {
  const pos = row.points > 0
  return (
    <tr className="border-b border-muted last:border-0">
      <td className="px-4 py-3 font-body font-light text-[13px] text-muted-foreground">
        {ledgerDate(row)}
      </td>
      <td className="px-4 py-3 font-body text-[13px] text-umber">
        {ledgerDescription(row)}
      </td>
      <td
        className={cn(
          'px-4 py-3 font-body font-medium text-[13px] text-right tabular-nums',
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
  const pos = row.points > 0
  return (
    <div>
      <div className="flex justify-between gap-2">
        <span className="font-body font-light text-[12px] text-muted-foreground">
          {ledgerDate(row)}
        </span>
        <span
          className={cn(
            'font-body font-medium text-[14px] tabular-nums',
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
