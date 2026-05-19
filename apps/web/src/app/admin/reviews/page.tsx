'use client'

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Mail, Star } from 'lucide-react'
import { toast } from 'sonner'
import type { AdminReview, ReviewStatus } from '@modett/types'
import { useAdminSession } from '@/hooks/useAdminSession'
import {
  useAdminReviewsList,
  useFeatureReview,
  useFlagReview,
  useHideReview,
  useResolveFlag,
  useSendReviewRequest,
  useShowReview,
} from '@/hooks/useAdminReviews'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const PAGE_LIMIT = 20

const STATUS_OPTIONS: { value: ReviewStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'VISIBLE', label: 'Visible' },
  { value: 'HIDDEN', label: 'Hidden' },
]

function formatListDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm" aria-hidden>
      {'★'.repeat(rating)}
      {'☆'.repeat(5 - rating)}
    </span>
  )
}

function AdminReviewsPageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}

export default function AdminReviewsPage() {
  const router = useRouter()
  const { admin, isLoading: authLoading } = useAdminSession()

  const [statusFilter, setStatusFilter] = useState<ReviewStatus | 'ALL'>('ALL')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [flagOpenForId, setFlagOpenForId] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState('')

  useEffect(() => {
    setPage(1)
  }, [statusFilter, flaggedOnly])

  const { data, isLoading } = useAdminReviewsList({
    page,
    limit: PAGE_LIMIT,
    status: statusFilter === 'ALL' ? undefined : statusFilter,
    flagged: flaggedOnly,
  })

  const hideReview = useHideReview()
  const showReview = useShowReview()
  const flagReview = useFlagReview()
  const resolveFlag = useResolveFlag()
  const featureReview = useFeatureReview()
  const sendReviewRequest = useSendReviewRequest()

  const [sendEmailOpen, setSendEmailOpen] = useState(false)
  const [sendOrderId, setSendOrderId] = useState('')
  const [sendResult, setSendResult] = useState<string | null>(null)

  if (authLoading) {
    return <AdminReviewsPageSkeleton />
  }
  if (!admin) {
    router.push('/admin/login')
    return null
  }

  const reviews = data?.reviews ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

  async function runMutation<T>(
    p: Promise<T>,
    okMsg: string,
    errPrefix: string,
  ) {
    try {
      await p
      toast.success(okMsg)
    } catch {
      toast.error(`${errPrefix} failed.`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Reviews</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as ReviewStatus | 'ALL')}
          >
            <SelectTrigger className="w-[140px]">
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
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={flaggedOnly}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFlaggedOnly(e.target.checked)
              }
              className="h-4 w-4 rounded border-input"
            />
            Flagged only
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSendOrderId('')
              setSendResult(null)
              setSendEmailOpen(true)
            }}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            Send Review Email
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <AdminReviewsPageSkeleton />
        ) : reviews.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground text-center">
            {flaggedOnly ? 'No flagged reviews.' : 'No reviews found.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                        <TableHead>Flag</TableHead>
                        <TableHead>Featured</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review: AdminReview) => {
                const expanded = expandedId === review.id
                const hasUnresolvedFlag = review.flag !== null
                return (
                  <Fragment key={review.id}>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 bg-muted shrink-0 overflow-hidden rounded-sm">
                            {review.productImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={review.productImageUrl}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : null}
                          </div>
                          <span className="text-sm line-clamp-2 max-w-[160px]">
                            {review.productName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{review.reviewerFirstName}</div>
                        <div className="text-xs text-muted-foreground">
                          Verified Buyer
                        </div>
                      </TableCell>
                      <TableCell>
                        <StarDisplay rating={review.rating} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[review.variantColor, review.variantSize]
                          .filter(Boolean)
                          .join(' / ') || '—'}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatListDate(review.createdAt)}
                      </TableCell>
                      <TableCell>
                        {review.status === 'VISIBLE' ? (
                          <Badge className="bg-green-100 text-green-800">
                            Visible
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500">
                            Hidden
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasUnresolvedFlag ? (
                          <Badge className="bg-red-100 text-red-700">
                            {review.autoFlagged ? '⚑ Auto-flagged' : '⚑ Flagged'}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {review.status === 'VISIBLE' ? (
                          <button
                            type="button"
                            title={review.featured ? 'Remove from homepage' : 'Feature on homepage'}
                            disabled={featureReview.isPending}
                            onClick={() => {
                              featureReview.mutate(
                                { reviewId: review.id, featured: !review.featured },
                                {
                                  onSuccess: () =>
                                    toast.success(
                                      review.featured
                                        ? 'Removed from homepage.'
                                        : 'Added to homepage.',
                                    ),
                                  onError: () => toast.error('Could not update featured status.'),
                                },
                              )
                            }}
                            className="p-1 hover:opacity-70 transition-opacity disabled:opacity-30"
                          >
                            <Star
                              className={
                                review.featured
                                  ? 'h-4 w-4 fill-yellow-400 text-yellow-400'
                                  : 'h-4 w-4 text-muted-foreground'
                              }
                            />
                          </button>
                        ) : (
                          <span className="text-muted-foreground/40 text-xs pl-1">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setExpandedId(expanded ? null : review.id)
                            }
                          >
                            {expanded ? '▲ Hide' : '▼ Review text'}
                          </Button>
                          {review.status === 'VISIBLE' ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={hideReview.isPending}
                              onClick={() =>
                                runMutation(
                                  hideReview.mutateAsync({
                                    reviewId: review.id,
                                  }),
                                  'Review hidden.',
                                  'Hide',
                                )
                              }
                            >
                              {hideReview.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Hide'
                              )}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={showReview.isPending}
                              onClick={() =>
                                runMutation(
                                  showReview.mutateAsync({
                                    reviewId: review.id,
                                  }),
                                  'Review visible.',
                                  'Show',
                                )
                              }
                            >
                              {showReview.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Show'
                              )}
                            </Button>
                          )}
                          {!hasUnresolvedFlag ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setExpandedId(review.id)
                                setFlagOpenForId(review.id)
                                setFlagReason('')
                              }}
                            >
                              Flag
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              disabled={resolveFlag.isPending}
                              onClick={() =>
                                runMutation(
                                  resolveFlag.mutateAsync({
                                    reviewId: review.id,
                                  }),
                                  'Flag resolved.',
                                  'Resolve',
                                )
                              }
                            >
                              {resolveFlag.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Resolve Flag'
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {expanded && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30">
                          <div className="py-4 px-2 space-y-4 max-w-3xl">
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">
                                Review body
                              </p>
                              <p className="text-sm whitespace-pre-wrap">
                                {review.body?.trim()
                                  ? review.body
                                  : '— (no text)'}
                              </p>
                            </div>
                            {review.mediaUrls.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {review.mediaUrls.map((url) => (
                                  <button
                                    key={url}
                                    type="button"
                                    onClick={() => window.open(url, '_blank')}
                                    className="w-16 h-16 overflow-hidden border rounded-sm p-0"
                                  >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </button>
                                ))}
                              </div>
                            )}
                            {!hasUnresolvedFlag &&
                              flagOpenForId !== review.id && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setFlagOpenForId(review.id)}
                                >
                                  Flag this review ▾
                                </Button>
                              )}
                            {!hasUnresolvedFlag &&
                              flagOpenForId === review.id && (
                                <div className="border-t pt-4 space-y-2">
                                  <p className="text-sm font-medium">
                                    Flag this review
                                  </p>
                                  <Input
                                    placeholder="e.g. Contains inappropriate language"
                                    value={flagReason}
                                    onChange={(e) =>
                                      setFlagReason(e.target.value)
                                    }
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={
                                        flagReview.isPending ||
                                        flagReason.trim().length === 0
                                      }
                                      onClick={async () => {
                                        try {
                                          await flagReview.mutateAsync({
                                            reviewId: review.id,
                                            reason: flagReason.trim(),
                                          })
                                          toast.success('Review flagged.')
                                          setFlagOpenForId(null)
                                          setFlagReason('')
                                        } catch {
                                          toast.error('Flag failed.')
                                        }
                                      }}
                                    >
                                      {flagReview.isPending ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        'Submit Flag'
                                      )}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setFlagOpenForId(null)
                                        setFlagReason('')
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {total > PAGE_LIMIT && (
        <div className="flex items-center justify-center gap-4 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Previous
          </Button>
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </Button>
        </div>
      )}

      <Dialog open={sendEmailOpen} onOpenChange={setSendEmailOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Review Request Email</DialogTitle>
            <DialogDescription>
              Enter a delivered order ID to send review request emails to the
              customer for each item. Use this to test the email or re-send a
              missed request.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label
                htmlFor="send-order-id"
                className="text-sm font-medium text-foreground"
              >
                Order ID
              </label>
              <Input
                id="send-order-id"
                placeholder="Paste the order UUID here"
                value={sendOrderId}
                onChange={(e) => {
                  setSendOrderId(e.target.value.trim())
                  setSendResult(null)
                }}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Find the order ID in Admin → Orders. The order must be in
                DELIVERED status.
              </p>
            </div>

            {sendResult && (
              <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2.5">
                <p className="text-sm text-green-800">{sendResult}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setSendEmailOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={sendOrderId.length < 30 || sendReviewRequest.isPending}
              onClick={async () => {
                try {
                  const result = await sendReviewRequest.mutateAsync({
                    orderId: sendOrderId,
                  })
                  setSendResult(result.message)
                  toast.success(result.message)
                } catch (err) {
                  const e = err as { message?: string }
                  toast.error(e.message ?? 'Failed to send email.')
                }
              }}
            >
              {sendReviewRequest.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sending…
                </>
              ) : (
                'Send Email'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
