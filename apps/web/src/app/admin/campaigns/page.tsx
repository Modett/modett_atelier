'use client'

/**
 * Manual E2E (messaging module): TEST 1 — create campaign from here; verify redirect to builder.
 * TODO: FIX — automated Playwright not wired; run checklist from product spec after deploy.
 */

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { DEFAULT_CAMPAIGN_CONTENT } from '@modett/types'
import { useAdminSession } from '@/hooks/useAdminSession'
import {
  useAdminCampaignsList,
  useCancelCampaign,
  useCreateCampaign,
  type AdminCampaignRow,
  type CampaignStatusFilter,
} from '@/hooks/useAdminMessaging'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

function formatListDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function audienceSummary(filter: Record<string, unknown>): string {
  if (filter.noLoyaltyAccount === true) return 'Non-loyalty customers'
  const t = filter.loyaltyTier
  if (t === 'GOLD') return 'Gold tier'
  if (t === 'SILVER') return 'Silver tier'
  if (t === 'BRONZE') return 'Bronze tier'
  if (typeof filter.purchasedAfter === 'string' && filter.purchasedAfter) {
    return `Purchased after ${filter.purchasedAfter}`
  }
  return 'All subscribers'
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
    SCHEDULED: { label: 'Scheduled', className: 'bg-blue-100 text-blue-700' },
    SENT: { label: 'Sent', className: 'bg-green-100 text-green-700' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
  }
  const c = map[status] ?? { label: status, className: 'bg-gray-100 text-gray-800' }
  return (
    <span
      className={cn(
        'inline-flex rounded px-2 py-0.5 text-xs font-medium',
        c.className,
      )}
    >
      {c.label}
    </span>
  )
}

function AdminCampaignsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

export default function AdminCampaignsPage() {
  const router = useRouter()
  const { admin, isLoading: authLoading } = useAdminSession()
  const [statusFilter, setStatusFilter] = useState<CampaignStatusFilter>('ALL')
  const [page, setPage] = useState(1)
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null)

  const { data, isLoading } = useAdminCampaignsList({
    page,
    limit: 20,
    status: statusFilter,
  })
  const createCampaign = useCreateCampaign()
  const cancelCampaign = useCancelCampaign()

  if (authLoading) {
    return <AdminCampaignsSkeleton />
  }

  if (!admin) {
    router.push('/admin/login')
    return null
  }

  const campaigns = data?.campaigns ?? []
  const total = data?.total ?? 0
  const limit = data?.limit ?? 20
  const totalPages = Math.max(1, Math.ceil(total / limit))

  async function handleNewCampaign() {
    const name = `Campaign ${new Date().toLocaleDateString()}`
    try {
      const row = await createCampaign.mutateAsync({
        name,
        contentJson: { ...DEFAULT_CAMPAIGN_CONTENT },
        channelsJson: ['EMAIL'],
        audienceFilterJson: {},
      })
      toast.success('Draft campaign created')
      router.push(`/admin/campaigns/${row.id}`)
    } catch {
      toast.error('Could not create campaign')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
        <Button
          type="button"
          onClick={() => void handleNewCampaign()}
          disabled={createCampaign.isPending}
        >
          {createCampaign.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          New Campaign
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Status</span>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as CampaignStatusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <AdminCampaignsSkeleton />
      ) : (
        <div className="rounded-md border border-gray-200 bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channels</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Deliveries</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500">
                    No campaigns yet.
                  </TableCell>
                </TableRow>
              ) : (
                campaigns.map((c: AdminCampaignRow) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Link
                        href={`/admin/campaigns/${c.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {c.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(c.channels_json ?? ['EMAIL']).map((ch) => (
                          <Badge key={ch} variant="secondary" className="text-xs">
                            {ch}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] text-sm text-gray-600">
                      {audienceSummary(c.audience_filter_json ?? {})}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatListDate(c.scheduled_at)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {formatListDate(c.sent_at)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {c.status === 'SENT' ? (c.delivery_count ?? 0) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/campaigns/${c.id}`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          Edit
                        </Link>
                        {c.status === 'SCHEDULED' && (
                          <>
                            {cancelConfirmId === c.id ? (
                              <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                                <span className="text-xs text-gray-500">
                                  Cancel this scheduled campaign? It will not be
                                  sent.
                                </span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  type="button"
                                  disabled={cancelCampaign.isPending}
                                  onClick={() => {
                                    void cancelCampaign
                                      .mutateAsync({ id: c.id })
                                      .then(() => {
                                        toast.success('Campaign cancelled.')
                                        setCancelConfirmId(null)
                                      })
                                      .catch(() => {
                                        toast.error('Could not cancel')
                                      })
                                  }}
                                >
                                  Confirm Cancel
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={() => setCancelConfirmId(null)}
                                >
                                  Keep
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                className="text-red-600"
                                onClick={() => setCancelConfirmId(c.id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
