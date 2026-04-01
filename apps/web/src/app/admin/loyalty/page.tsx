'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import type { LoyaltyRulesPublic } from '@modett/types'
import { useAdminSession } from '@/hooks/useAdminSession'
import {
  useAdminLoyaltyUserSearch,
  useAdminUserLoyalty,
  useAdminLoyaltyRules,
  useAdminLoyaltyTopUsers,
  useGrantPoints,
  useAdjustPoints,
  useReEvaluateTier,
  useReconcileBalance,
  useUpdateLoyaltyRules,
} from '@/hooks/useAdminLoyalty'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

function tierBadgeClass(tier: string): string {
  const u = tier.toUpperCase()
  if (u === 'GOLD') return 'bg-yellow-100 text-yellow-700'
  if (u === 'SILVER') return 'bg-gray-100 text-gray-700'
  return 'bg-amber-100 text-amber-800'
}

function AdminLoyaltySkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

function defaultRulesForm(r: LoyaltyRulesPublic): LoyaltyRulesPublic {
  return {
    ...r,
    earnRateJson: { ...r.earnRateJson },
    redemptionRateByCurrencyJson: { ...r.redemptionRateByCurrencyJson },
    tierThresholdsJson: { ...r.tierThresholdsJson },
    multipliersJson: { ...r.multipliersJson },
  }
}

export default function AdminLoyaltyPage() {
  const router = useRouter()
  const { admin, isLoading: authLoading } = useAdminSession()
  const isOwner = admin?.role === 'OWNER'

  const [searchEmail, setSearchEmail] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [grantPts, setGrantPts] = useState('')
  const [grantReason, setGrantReason] = useState('')
  const [adjPts, setAdjPts] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [weightError, setWeightError] = useState('')

  const searchQ = useAdminLoyaltyUserSearch(searchEmail)
  const userDetailQ = useAdminUserLoyalty(selectedUserId)
  const rulesQ = useAdminLoyaltyRules()
  const topQ = useAdminLoyaltyTopUsers(25)

  const [rulesForm, setRulesForm] = useState<LoyaltyRulesPublic | null>(null)

  useEffect(() => {
    if (rulesQ.data) {
      setRulesForm(defaultRulesForm(rulesQ.data))
    }
  }, [rulesQ.data])

  const spendWeightDerived = useMemo(() => {
    if (!rulesForm) return 0.4
    return Math.round((1 - rulesForm.frequencyWeight) * 100) / 100
  }, [rulesForm])

  const grantM = useGrantPoints()
  const adjM = useAdjustPoints()
  const reEvalM = useReEvaluateTier()
  const reconM = useReconcileBalance()
  const updateRulesM = useUpdateLoyaltyRules()

  useEffect(() => {
    if (!authLoading && !admin) {
      router.push('/admin/login')
    }
  }, [authLoading, admin, router])

  if (authLoading || (!admin && !authLoading)) {
    return <AdminLoyaltySkeleton />
  }

  if (!admin) return null

  const previewA = rulesForm
    ? (() => {
        const freq = rulesForm.frequencyWeight
        const spendW = 1 - freq
        const norm = rulesForm.spendNormalisationFactor
        const nS = 300 / norm
        const scoreA = 12 * freq + nS * spendW
        const nB = 500 / norm
        const scoreB = 1 * freq + nB * spendW
        const th = rulesForm.tierThresholdsJson
        const tierA =
          scoreA >= th.GOLD ? 'GOLD' : scoreA >= th.SILVER ? 'SILVER' : 'BRONZE'
        const tierB =
          scoreB >= th.GOLD ? 'GOLD' : scoreB >= th.SILVER ? 'SILVER' : 'BRONZE'
        return { scoreA, scoreB, tierA, tierB, norm, freq, spendW }
      })()
    : null

  async function onSaveRules() {
    if (!rulesForm || !isOwner) return
    setWeightError('')
    const fw = rulesForm.frequencyWeight
    const sw = 1 - fw
    if (Math.abs(fw + sw - 1) > 0.001) {
      setWeightError('Frequency weight + spend weight must equal 1.0')
      return
    }
    try {
      await updateRulesM.mutateAsync({
        ...rulesForm,
        spendWeight: sw,
      })
      toast.success('Loyalty rules updated.')
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string }
      if (err.code === 'WEIGHTS_MUST_SUM_TO_ONE') {
        setWeightError('Frequency weight + spend weight must equal 1.0')
      }
      toast.error(err.message ?? 'Failed to update rules')
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-10 p-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Loyalty</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer tiers, point grants, and programme rules
          </p>
        </div>

        {!isOwner && (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Point management requires Owner access</AlertTitle>
            <AlertDescription>
              Contact the store Owner to grant or adjust points. You can search customers and
              review activity below.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Grant / adjust points</CardTitle>
            <CardDescription>Search by email, then select a customer</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-search">Search customer by email</Label>
              <Input
                id="email-search"
                type="email"
                placeholder="Search by email address..."
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>
            {searchQ.isFetching && searchEmail.trim().length >= 2 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching…
              </div>
            )}
            {searchQ.data && searchEmail.trim().length >= 2 && (
              <ul className="space-y-2 border rounded-md p-2">
                {searchQ.data.length === 0 && (
                  <li className="text-sm text-muted-foreground px-2 py-3">
                    No customers found matching &apos;{searchEmail}&apos;
                  </li>
                )}
                {searchQ.data.map((u) => (
                  <li
                    key={u.userId}
                    className="flex flex-wrap items-center justify-between gap-2 border-b last:border-0 py-3 px-2"
                  >
                    <div>
                      <p className="font-medium">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                      <p className="text-xs mt-1">
                        <span className={`rounded px-1.5 py-0.5 ${tierBadgeClass(u.tier)}`}>
                          {u.tier}
                        </span>{' '}
                        · Balance: {u.balance} pts · Score: {u.compositeScore.toFixed(2)} ·{' '}
                        {u.frequencyLast12m} orders / window
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedUserId(u.userId)}
                    >
                      Select →
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            {selectedUserId && userDetailQ.data && (
              <div className="border rounded-lg p-4 space-y-6 mt-4">
                <div>
                  <p className="font-semibold">
                    {userDetailQ.data.firstName} {userDetailQ.data.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">{userDetailQ.data.email}</p>
                  <p className="text-sm mt-2">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${tierBadgeClass(userDetailQ.data.account.tier)}`}
                    >
                      {userDetailQ.data.account.tier}
                    </span>{' '}
                    Balance: {userDetailQ.data.account.balance} pts · Composite:{' '}
                    {userDetailQ.data.account.compositeScore.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Freq: {userDetailQ.data.frequencyLast12m} orders · Spend pts:{' '}
                    {userDetailQ.data.spendLast12m} · Last activity:{' '}
                    {userDetailQ.data.account.lastActivityAt
                      ? new Date(userDetailQ.data.account.lastActivityAt).toLocaleDateString(
                          'en-GB',
                          { day: 'numeric', month: 'short', year: 'numeric' },
                        )
                      : '—'}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3 border rounded-md p-3">
                    <h3 className="text-sm font-medium">Grant points</h3>
                    <div className="space-y-2">
                      <Label>Points (1–10,000)</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10_000}
                        step={1}
                        value={grantPts}
                        onChange={(e) => setGrantPts(e.target.value)}
                        disabled={!isOwner}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Input
                        placeholder="e.g. Birthday gift"
                        value={grantReason}
                        onChange={(e) => setGrantReason(e.target.value)}
                        disabled={!isOwner}
                      />
                    </div>
                    <div className="inline-block">
                      <Tooltip>
                        <TooltipTrigger className="inline-flex">
                          <Button
                            type="button"
                            disabled={
                              !isOwner ||
                              grantM.isPending ||
                              !grantPts ||
                              !grantReason.trim()
                            }
                            onClick={async () => {
                              const n = Number(grantPts)
                              if (!selectedUserId || n < 1) return
                              try {
                                await grantM.mutateAsync({
                                  userId: selectedUserId,
                                  points: n,
                                  reason: grantReason.trim(),
                                })
                                toast.success(
                                  `✓ ${n} points granted to ${userDetailQ.data?.firstName}.`,
                                )
                                setGrantPts('')
                                setGrantReason('')
                              } catch (e: unknown) {
                                const err = e as { message?: string }
                                toast.error(err.message ?? 'Grant failed')
                              }
                            }}
                          >
                            {grantM.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Grant points'
                            )}
                          </Button>
                        </TooltipTrigger>
                        {!isOwner && (
                          <TooltipContent>Only the account Owner can grant points</TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  </div>

                  <div className="space-y-3 border rounded-md p-3">
                    <h3 className="text-sm font-medium">Adjust points</h3>
                    <div className="space-y-2">
                      <Label>Points (+/−)</Label>
                      <Input
                        type="number"
                        min={-10_000}
                        max={10_000}
                        step={1}
                        value={adjPts}
                        onChange={(e) => setAdjPts(e.target.value)}
                        disabled={!isOwner}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Reason</Label>
                      <Input
                        placeholder="Required"
                        value={adjReason}
                        onChange={(e) => setAdjReason(e.target.value)}
                        disabled={!isOwner}
                      />
                    </div>
                    <div className="inline-block">
                      <Tooltip>
                        <TooltipTrigger className="inline-flex">
                          <Button
                            type="button"
                            variant="outline"
                            disabled={
                              !isOwner ||
                              adjM.isPending ||
                              adjPts === '' ||
                              Number(adjPts) === 0 ||
                              !adjReason.trim()
                            }
                            onClick={async () => {
                              const n = Number(adjPts)
                              if (!selectedUserId || n === 0) return
                              try {
                                await adjM.mutateAsync({
                                  userId: selectedUserId,
                                  points: n,
                                  reason: adjReason.trim(),
                                })
                                toast.success(`✓ Points adjusted by ${n > 0 ? '+' : ''}${n}.`)
                                setAdjPts('')
                                setAdjReason('')
                              } catch (e: unknown) {
                                const err = e as { message?: string }
                                toast.error(err.message ?? 'Adjust failed')
                              }
                            }}
                          >
                            {adjM.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Apply adjustment'
                            )}
                          </Button>
                        </TooltipTrigger>
                        {!isOwner && (
                          <TooltipContent>Only the account Owner can adjust points</TooltipContent>
                        )}
                      </Tooltip>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reEvalM.isPending}
                    onClick={async () => {
                      if (!selectedUserId) return
                      try {
                        const r = await reEvalM.mutateAsync({ userId: selectedUserId })
                        toast.success(
                          `Tier re-evaluated: ${r.newTier} (score: ${r.compositeScore.toFixed(2)}).`,
                        )
                      } catch (e: unknown) {
                        const err = e as { message?: string }
                        toast.error(err.message ?? 'Failed')
                      }
                    }}
                  >
                    Re-evaluate tier
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reconM.isPending}
                    onClick={async () => {
                      if (!selectedUserId || !userDetailQ.data) return
                      const prev = userDetailQ.data.account.balance
                      try {
                        const r = await reconM.mutateAsync({ userId: selectedUserId })
                        if (r.hadDrift) {
                          toast.warning(
                            `Balance corrected from ${prev} to ${r.correctedBalance} pts.`,
                          )
                        } else {
                          toast.success('Balance is accurate — no correction needed.')
                        }
                      } catch (e: unknown) {
                        const err = e as { message?: string }
                        toast.error(err.message ?? 'Reconcile failed')
                      }
                    }}
                  >
                    Reconcile balance
                  </Button>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-2">Recent ledger</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Pts</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userDetailQ.data.recentLedger.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(row.createdAt).toLocaleDateString('en-GB')}
                          </TableCell>
                          <TableCell>{row.type}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.points > 0 ? '+' : ''}
                            {row.points}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {!isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>Top customers by tier</CardTitle>
              <CardDescription>Read-only overview</CardDescription>
            </CardHeader>
            <CardContent>
              {topQ.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(topQ.data ?? []).map((r) => (
                      <TableRow key={r.userId}>
                        <TableCell>
                          <div className="font-medium">
                            {r.firstName} {r.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">{r.email}</div>
                        </TableCell>
                        <TableCell>
                          <span className={`rounded px-2 py-0.5 text-xs ${tierBadgeClass(r.tier)}`}>
                            {r.tier}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">{r.balance}</TableCell>
                        <TableCell className="text-right">
                          {r.compositeScore.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Loyalty rules</CardTitle>
            <CardDescription className="flex items-center gap-2">
              {!isOwner && <Lock className="h-3.5 w-3.5" />}
              {!isOwner ? 'Owner access required to edit' : 'Dual-axis tier & redemption'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {rulesQ.isLoading || !rulesForm ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Tier system</CardTitle>
                    <CardDescription>
                      Tier = (purchase frequency × frequency weight) + (normalised spend × spend
                      weight). Weights sum to 1.0.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>
                        Frequency weight ({rulesForm.frequencyWeight.toFixed(2)}) — spend weight
                        auto: {spendWeightDerived.toFixed(2)}
                      </Label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={rulesForm.frequencyWeight}
                        disabled={!isOwner}
                        onChange={(e) =>
                          setRulesForm((f) =>
                            f
                              ? {
                                  ...f,
                                  frequencyWeight: Number(e.target.value),
                                  spendWeight: Math.round((1 - Number(e.target.value)) * 100) / 100,
                                }
                              : f,
                          )
                        }
                        className="w-full"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Spend normalisation factor</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rulesForm.spendNormalisationFactor}
                          disabled={!isOwner}
                          onChange={(e) =>
                            setRulesForm((f) =>
                              f
                                ? {
                                    ...f,
                                    spendNormalisationFactor: Number(e.target.value) || 1,
                                  }
                                : f,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Evaluation window (months)</Label>
                        <Input
                          type="number"
                          min={1}
                          max={36}
                          value={rulesForm.evaluationWindowMonths}
                          disabled={!isOwner}
                          onChange={(e) =>
                            setRulesForm((f) =>
                              f
                                ? {
                                    ...f,
                                    evaluationWindowMonths: Number(e.target.value) || 12,
                                  }
                                : f,
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Silver threshold (composite)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={rulesForm.tierThresholdsJson.SILVER}
                          disabled={!isOwner}
                          onChange={(e) =>
                            setRulesForm((f) =>
                              f
                                ? {
                                    ...f,
                                    tierThresholdsJson: {
                                      ...f.tierThresholdsJson,
                                      SILVER: Number(e.target.value),
                                    },
                                  }
                                : f,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gold threshold (composite)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={rulesForm.tierThresholdsJson.GOLD}
                          disabled={!isOwner}
                          onChange={(e) =>
                            setRulesForm((f) =>
                              f
                                ? {
                                    ...f,
                                    tierThresholdsJson: {
                                      ...f.tierThresholdsJson,
                                      GOLD: Number(e.target.value),
                                    },
                                  }
                                : f,
                            )
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(['BRONZE', 'SILVER', 'GOLD'] as const).map((k) => (
                        <div key={k} className="space-y-2">
                          <Label>{k} multiplier</Label>
                          <Input
                            type="number"
                            step="0.05"
                            value={rulesForm.multipliersJson[k]}
                            disabled={!isOwner}
                            onChange={(e) =>
                              setRulesForm((f) =>
                                f
                                  ? {
                                      ...f,
                                      multipliersJson: {
                                        ...f.multipliersJson,
                                        [k]: Number(e.target.value),
                                      },
                                    }
                                  : f,
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Points expiry</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Label>Months of inactivity before expiry</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={rulesForm.pointsExpiryMonths}
                      disabled={!isOwner}
                      onChange={(e) =>
                        setRulesForm((f) =>
                          f
                            ? { ...f, pointsExpiryMonths: Number(e.target.value) || 12 }
                            : f,
                        )
                      }
                    />
                    <p className="text-xs text-muted-foreground">
                      Full balance expires; customer receives inbox notification; ledger EXPIRY
                      entry.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Earn rates</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-3">
                    {(['LKR', 'SGD', 'USD'] as const).map((c) => (
                      <div key={c} className="space-y-2 border rounded-md p-3">
                        <p className="text-sm font-medium">{c}</p>
                        <div className="flex gap-2 items-center">
                          <Input
                            type="number"
                            className="w-16"
                            value={rulesForm.earnRateJson[c].points}
                            disabled={!isOwner}
                            onChange={(e) =>
                              setRulesForm((f) =>
                                f
                                  ? {
                                      ...f,
                                      earnRateJson: {
                                        ...f.earnRateJson,
                                        [c]: {
                                          ...f.earnRateJson[c],
                                          points: Number(e.target.value),
                                        },
                                      },
                                    }
                                  : f,
                              )
                            }
                          />
                          <span className="text-xs text-muted-foreground">pt per</span>
                          <Input
                            type="number"
                            className="w-20"
                            value={rulesForm.earnRateJson[c].per_amount}
                            disabled={!isOwner}
                            onChange={(e) =>
                              setRulesForm((f) =>
                                f
                                  ? {
                                      ...f,
                                      earnRateJson: {
                                        ...f.earnRateJson,
                                        [c]: {
                                          ...f.earnRateJson[c],
                                          per_amount: Number(e.target.value),
                                        },
                                      },
                                    }
                                  : f,
                              )
                            }
                          />
                          <span className="text-xs">{c}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Redemption</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-3">
                      {(['LKR', 'SGD', 'USD'] as const).map((c) => (
                        <div key={c} className="space-y-2 border rounded-md p-3 text-sm">
                          <p className="font-medium">{c}</p>
                          <div className="flex gap-2 items-center flex-wrap">
                            <Input
                              type="number"
                              className="w-20"
                              value={rulesForm.redemptionRateByCurrencyJson[c].points}
                              disabled={!isOwner}
                              onChange={(e) =>
                                setRulesForm((f) =>
                                  f
                                    ? {
                                        ...f,
                                        redemptionRateByCurrencyJson: {
                                          ...f.redemptionRateByCurrencyJson,
                                          [c]: {
                                            ...f.redemptionRateByCurrencyJson[c],
                                            points: Number(e.target.value),
                                          },
                                        },
                                      }
                                    : f,
                                )
                              }
                            />
                            <span className="text-xs">pts =</span>
                            <Input
                              type="number"
                              step="0.01"
                              className="w-24"
                              value={rulesForm.redemptionRateByCurrencyJson[c].value}
                              disabled={!isOwner}
                              onChange={(e) =>
                                setRulesForm((f) =>
                                  f
                                    ? {
                                        ...f,
                                        redemptionRateByCurrencyJson: {
                                          ...f.redemptionRateByCurrencyJson,
                                          [c]: {
                                            ...f.redemptionRateByCurrencyJson[c],
                                            value: Number(e.target.value),
                                          },
                                        },
                                      }
                                    : f,
                                )
                              }
                            />
                            <span className="text-xs">off</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>Min redeem (pts)</Label>
                        <Input
                          type="number"
                          min={1}
                          value={rulesForm.minRedeem}
                          disabled={!isOwner}
                          onChange={(e) =>
                            setRulesForm((f) =>
                              f ? { ...f, minRedeem: Number(e.target.value) || 1 } : f,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Max % of subtotal</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={rulesForm.maxRedeemPercent}
                          disabled={!isOwner}
                          onChange={(e) =>
                            setRulesForm((f) =>
                              f
                                ? { ...f, maxRedeemPercent: Number(e.target.value) }
                                : f,
                            )
                          }
                        />
                      </div>
                      <div className="space-y-2 flex items-end">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!rulesForm.noStackWithSale}
                            disabled={!isOwner}
                            onChange={(e) =>
                              setRulesForm((f) =>
                                f ? { ...f, noStackWithSale: !e.target.checked } : f,
                              )
                            }
                          />
                          Stack with sale items
                        </label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {weightError && <p className="text-sm text-destructive">{weightError}</p>}

                <div className="inline-block">
                  <Tooltip>
                    <TooltipTrigger className="inline-flex">
                      <Button
                        type="button"
                        disabled={!isOwner || updateRulesM.isPending}
                        onClick={() => void onSaveRules()}
                      >
                        {updateRulesM.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save loyalty rules'
                        )}
                      </Button>
                    </TooltipTrigger>
                    {!isOwner && (
                      <TooltipContent>Only the Owner can save rule changes</TooltipContent>
                    )}
                  </Tooltip>
                </div>

                {previewA && rulesForm && (
                  <Card className="bg-muted/40">
                    <CardHeader>
                      <CardTitle className="text-base">Example calculation</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 font-mono">
                      <p>
                        Customer A — 12 orders, 300 pts earned · normalised spend: 300 ÷{' '}
                        {rulesForm.spendNormalisationFactor} = {(300 / rulesForm.spendNormalisationFactor).toFixed(1)}
                      </p>
                      <p>
                        Score = (12 × {previewA.freq.toFixed(2)}) + (
                        {(300 / rulesForm.spendNormalisationFactor).toFixed(1)} ×{' '}
                        {previewA.spendW.toFixed(2)}) = {previewA.scoreA.toFixed(2)} → tier{' '}
                        {previewA.tierA}
                      </p>
                      <p>
                        Customer B — 1 order, 500 pts · normalised:{' '}
                        {(500 / rulesForm.spendNormalisationFactor).toFixed(1)} · score ={' '}
                        {previewA.scoreB.toFixed(2)} → tier {previewA.tierB}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}
