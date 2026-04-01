'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type {
  AdminReturnDetailPayload,
  AdminReturnLineItem,
  AdminReturnListRow,
  AdminReturnTimelineEvent,
  ReturnStatus,
  ReturnType,
} from '@modett/types'
import type { ApiError } from '@/types'
import { useAdminSession } from '@/hooks/useAdminSession'
import {
  useAdminReturnDetail,
  useAdminReturnsList,
  useApproveReturn,
  useFulfilReturn,
  useOpenReturnForReview,
  useRejectReturn,
} from '@/hooks/useAdminReturns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

const PAGE_LIMIT = 20

const STATUS_OPTIONS: { value: ReturnStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FULFILLED', label: 'Fulfilled' },
]

const TYPE_OPTIONS: { value: ReturnType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All types' },
  { value: 'REFUND', label: 'Refund' },
  { value: 'EXCHANGE', label: 'Exchange' },
]

function formatListDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDetailDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0)
}

function truncateId(id: string): string {
  return `${id.slice(0, 8)}…`
}

function statusBadgeClass(status: ReturnStatus): string {
  switch (status) {
    case 'SUBMITTED':
      return 'bg-yellow-100 text-yellow-800'
    case 'PENDING_REVIEW':
      return 'bg-blue-100 text-blue-800'
    case 'APPROVED':
      return 'bg-green-100 text-green-800'
    case 'REJECTED':
      return 'bg-red-100 text-red-800'
    case 'FULFILLED':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function statusLabel(status: ReturnStatus): string {
  switch (status) {
    case 'SUBMITTED':
      return 'Submitted'
    case 'PENDING_REVIEW':
      return 'In Review'
    case 'APPROVED':
      return 'Approved'
    case 'REJECTED':
      return 'Rejected'
    case 'FULFILLED':
      return 'Fulfilled'
    default:
      return status
  }
}

function eventDisplayLabel(eventType: string): string {
  switch (eventType) {
    case 'RETURN_SUBMITTED':
      return 'Return submitted by customer'
    case 'RETURN_OPENED':
      return 'Opened for review'
    case 'RETURN_APPROVED':
      return 'Return approved'
    case 'RETURN_REJECTED':
      return 'Return rejected'
    case 'RETURN_FULFILLED':
      return 'Return fulfilled'
    default:
      return eventType.replaceAll('_', ' ')
  }
}

function eventDotClass(eventType: string): string {
  if (eventType === 'RETURN_APPROVED' || eventType === 'RETURN_FULFILLED') {
    return 'bg-green-500'
  }
  if (eventType === 'RETURN_REJECTED') {
    return 'bg-red-500'
  }
  return 'bg-gray-400'
}

function getRejectionDescription(events: AdminReturnTimelineEvent[]): string | null {
  const ordered = [...events].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  const ev = [...ordered].reverse().find((e) => e.eventType === 'RETURN_REJECTED')
  if (!ev) return null
  const note = ev.adminNote?.trim()
  if (note) return note
  const fromPayload = ev.payloadJson?.reason
  if (typeof fromPayload === 'string' && fromPayload.trim() !== '') {
    return fromPayload.trim()
  }
  return null
}

function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return (
    <Badge className={statusBadgeClass(status)} variant="outline">
      {statusLabel(status)}
    </Badge>
  )
}

function AdminReturnsPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="flex justify-end gap-2">
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-3 rounded-md border p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="ml-auto h-8 w-20" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ReturnActionPanel({
  detail,
}: {
  detail: AdminReturnDetailPayload
}) {
  const openForReview = useOpenReturnForReview()
  const approveReturn = useApproveReturn()
  const rejectReturn = useRejectReturn()
  const fulfilReturn = useFulfilReturn()

  const [adminNoteReview, setAdminNoteReview] = useState('')
  const [rejectExpanded, setRejectExpanded] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectReasonError, setRejectReasonError] = useState('')
  const [adminNoteFulfil, setAdminNoteFulfil] = useState('')

  const status = detail.request.status
  const id = detail.request.id

  useEffect(() => {
    setAdminNoteReview('')
    setRejectExpanded(false)
    setRejectReason('')
    setRejectReasonError('')
    setAdminNoteFulfil('')
  }, [id])

  const reviewPending = approveReturn.isPending || rejectReturn.isPending

  const onOpenReview = () => {
    openForReview.mutate(
      { returnRequestId: id },
      {
        onSuccess: () => toast.success('Return opened for review.'),
        onError: (e) => {
          const err = e as unknown as ApiError
          toast.error(err?.message ?? 'Failed to update status.')
        },
      },
    )
  }

  const onApprove = () => {
    approveReturn.mutate(
      { returnRequestId: id, adminNote: adminNoteReview.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Return approved.')
          setAdminNoteReview('')
        },
        onError: (e) => {
          const err = e as unknown as ApiError
          toast.error(err?.message ?? 'Failed to approve.')
        },
      },
    )
  }

  const onConfirmReject = () => {
    const r = rejectReason.trim()
    if (!r) {
      setRejectReasonError('A rejection reason is required.')
      return
    }
    setRejectReasonError('')
    rejectReturn.mutate(
      {
        returnRequestId: id,
        reason: r,
        adminNote: adminNoteReview.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Return rejected.')
          setRejectExpanded(false)
          setRejectReason('')
          setAdminNoteReview('')
        },
        onError: (e) => {
          const err = e as unknown as ApiError
          toast.error(err?.message ?? 'Failed to reject.')
        },
      },
    )
  }

  const onFulfil = () => {
    fulfilReturn.mutate(
      { returnRequestId: id, adminNote: adminNoteFulfil.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Return marked as fulfilled.')
          setAdminNoteFulfil('')
        },
        onError: (e) => {
          const err = e as unknown as ApiError
          toast.error(err?.message ?? 'Failed to fulfil return.')
        },
      },
    )
  }

  if (status === 'SUBMITTED') {
    return (
      <div className="space-y-3">
        <Button
          type="button"
          disabled={openForReview.isPending}
          onClick={() => onOpenReview()}
        >
          {openForReview.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Open for Review
        </Button>
      </div>
    )
  }

  if (status === 'PENDING_REVIEW') {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Admin note (optional)
          </label>
          <Textarea
            placeholder="Internal note (not visible to customer)"
            rows={3}
            value={adminNoteReview}
            onChange={(e) => setAdminNoteReview(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={reviewPending} onClick={() => onApprove()}>
            {approveReturn.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Approve
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={reviewPending}
            onClick={() => {
              setRejectExpanded(true)
              setRejectReasonError('')
            }}
          >
            Reject
          </Button>
        </div>
        {rejectExpanded ? (
          <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection reason (required)</label>
              <Input
                placeholder="e.g. Items show signs of wear"
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value)
                  if (rejectReasonError) setRejectReasonError('')
                }}
              />
              {rejectReasonError ? (
                <p className="text-sm text-destructive">{rejectReasonError}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled={rejectReturn.isPending}
                onClick={() => onConfirmReject()}
              >
                {rejectReturn.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirm Rejection
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={rejectReturn.isPending}
                onClick={() => {
                  setRejectExpanded(false)
                  setRejectReason('')
                  setRejectReasonError('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    )
  }

  if (status === 'APPROVED') {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>Approved</AlertTitle>
          <AlertDescription>
            This return has been approved. Once the customer ships the item back and you receive
            it, mark it as fulfilled below.
          </AlertDescription>
        </Alert>
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Admin note (optional)
          </label>
          <Textarea
            placeholder="Internal note for fulfilment"
            rows={2}
            value={adminNoteFulfil}
            onChange={(e) => setAdminNoteFulfil(e.target.value)}
          />
        </div>
        <Button
          type="button"
          disabled={fulfilReturn.isPending}
          onClick={() => onFulfil()}
        >
          {fulfilReturn.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Mark as Fulfilled
        </Button>
        <p className="text-xs text-muted-foreground">
          Marking as fulfilled does not automatically issue a refund or ship an exchange. Handle
          those steps separately in the Payments or Orders module.
        </p>
      </div>
    )
  }

  if (status === 'REJECTED') {
    const desc = getRejectionDescription(detail.events)
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle>This return was rejected.</AlertTitle>
        {desc ? <AlertDescription>{desc}</AlertDescription> : null}
      </Alert>
    )
  }

  if (status === 'FULFILLED') {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4" />
        <AlertTitle>This return has been fulfilled.</AlertTitle>
      </Alert>
    )
  }

  return null
}

function ReturnLineCard({ item }: { item: AdminReturnLineItem }) {
  return (
    <div className="flex gap-3 rounded-md border border-border p-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="font-medium text-foreground">{item.productName}</p>
        <p className="text-muted-foreground">
          Colour: {item.colour || '—'} · Size: {item.size || '—'}
        </p>
        <p>Qty: {item.qty}</p>
        <p className="text-muted-foreground">Reason: {item.customerReason}</p>
        <p className="text-muted-foreground">
          Unit price: {formatMoney(item.unitPrice, item.currency)}
        </p>
      </div>
    </div>
  )
}

function ReturnDetailSheetBody({
  detail,
  onClose,
}: {
  detail: AdminReturnDetailPayload
  onClose: () => void
}) {
  const [customerOpen, setCustomerOpen] = useState(false)
  const eventsAsc = useMemo(
    () =>
      [...detail.events].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [detail.events],
  )

  const typeLabel =
    detail.request.returnType === 'REFUND'
      ? 'Refund to original payment method'
      : 'Exchange for different size/colour'

  return (
    <ScrollArea className="h-[calc(100vh-8rem)] pr-3">
      <div className="space-y-6 pb-8">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Items Requested</h3>
          <div className="space-y-2">
            {detail.items.map((item) => (
              <ReturnLineCard key={item.id} item={item} />
            ))}
          </div>
          <Badge variant="secondary" className="mt-2">
            {typeLabel}
          </Badge>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Timeline</h3>
          <ul className="space-y-4">
            {eventsAsc.map((ev) => (
              <li key={ev.id} className="relative pl-6">
                <span
                  className={`absolute top-1.5 left-0 size-2 rounded-full ${eventDotClass(ev.eventType)}`}
                />
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">{eventDisplayLabel(ev.eventType)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(ev.createdAt)}
                  </span>
                </div>
                {ev.adminNote?.trim() ? (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    Admin note: {ev.adminNote}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Actions</h3>
          <ReturnActionPanel detail={detail} />
        </section>

        <Separator />

        <Collapsible open={customerOpen} onOpenChange={setCustomerOpen}>
          <CollapsibleTrigger
            type="button"
            className="flex w-full items-center justify-between text-left text-sm font-medium text-foreground"
          >
            Customer details
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${customerOpen ? 'rotate-180' : ''}`}
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span>{' '}
              {detail.request.customerName}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span>{' '}
              {detail.request.customerEmail}
            </p>
            <p>
              <span className="text-muted-foreground">Order:</span>{' '}
              <Link
                href={`/admin/orders/${detail.request.orderId}`}
                className="text-primary underline-offset-4 hover:underline"
                onClick={onClose}
              >
                {detail.request.orderRef}
              </Link>
            </p>
            <p>
              <span className="text-muted-foreground">Eligible until:</span>{' '}
              {formatDetailDate(detail.request.eligibleUntil)}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </ScrollArea>
  )
}

export default function AdminReturnsPage() {
  const router = useRouter()
  const { admin, isLoading: authLoading } = useAdminSession()

  const [statusFilter, setStatusFilter] = useState<ReturnStatus | 'ALL'>('ALL')
  const [typeFilter, setTypeFilter] = useState<ReturnType | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setPage(1)
  }, [statusFilter, typeFilter])

  const { data, isLoading, error } = useAdminReturnsList({
    page,
    limit: PAGE_LIMIT,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    type: typeFilter === 'ALL' ? undefined : typeFilter,
  })

  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useAdminReturnDetail(selectedId ?? '')

  if (authLoading) {
    return <AdminReturnsPageSkeleton />
  }
  if (!admin) {
    router.push('/admin/login')
    return null
  }

  const totalPages = data ? Math.ceil(data.total / PAGE_LIMIT) : 0
  const hasActiveFilters = statusFilter !== 'ALL' || typeFilter !== 'ALL'

  const openRow = (row: AdminReturnListRow) => {
    setSelectedId(row.id)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Returns</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ReturnStatus | 'ALL')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as ReturnType | 'ALL')}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        {isLoading ? (
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return ID</TableHead>
                  <TableHead>Order ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full max-w-[120px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : error ? (
          <div className="p-12 text-center text-destructive">
            Failed to load returns. Please refresh.
          </div>
        ) : !data?.returns.length ? (
          <div className="p-12 text-center text-muted-foreground">
            <p>No return requests found.</p>
            {hasActiveFilters ? (
              <p className="mt-2 text-sm">Try adjusting your filters.</p>
            ) : null}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Return ID</TableHead>
                  <TableHead>Order ref</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.returns.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer"
                    onClick={() => openRow(row)}
                  >
                    <TableCell className="font-mono text-xs">{truncateId(row.id)}</TableCell>
                    <TableCell className="font-medium">{row.orderRef}</TableCell>
                    <TableCell>
                      <div className="max-w-[220px]">
                        <div className="truncate text-sm">{row.customerName}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {row.customerEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.itemCount} {row.itemCount === 1 ? 'item' : 'items'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.returnType === 'REFUND' ? 'default' : 'secondary'}>
                        {row.returnType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ReturnStatusBadge status={row.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatListDate(row.submittedAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRow(row)
                        }}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {data.total > PAGE_LIMIT ? (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages || 1}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>

      <Sheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null)
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col sm:max-w-2xl"
          showCloseButton
        >
          {selectedId ? (
            <>
              <SheetHeader className="space-y-2 border-b border-border pb-4 text-left">
                <SheetTitle className="flex items-start justify-between gap-2 pr-8">
                  <span>Return {truncateId(selectedId)}</span>
                </SheetTitle>
                {detail && !detailLoading ? (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>Order {detail.request.orderRef}</span>
                    <span aria-hidden>·</span>
                    <span>{detail.request.customerName}</span>
                    <ReturnStatusBadge status={detail.request.status} />
                  </div>
                ) : null}
              </SheetHeader>
              {detailLoading ? (
                <div className="flex flex-1 items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : detailError || !detail ? (
                <p className="p-4 text-destructive">Failed to load return details.</p>
              ) : (
                <ReturnDetailSheetBody
                  detail={detail}
                  onClose={() => setSelectedId(null)}
                />
              )}
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}
