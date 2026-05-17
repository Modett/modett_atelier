'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Camera, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { FilledButton } from '@modett/ui'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import {
  useReviewTokenStatus,
  useSubmitReview,
} from '@/hooks/useReviews'
import { api } from '@/lib/api'
import type { ApiError } from '@/types'

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const

export function ReviewSubmissionClient() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const orderItemId = searchParams.get('item') ?? ''

  const { user } = useSession()
  const { data: tokenStatus, isLoading: tokenLoading } = useReviewTokenStatus(
    token,
    orderItemId,
  )
  const submit = useSubmitReview()

  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [body, setBody] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)

  const productIdForInvalidate = tokenStatus?.product?.id

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || !user) return
      const next = [...mediaUrls]
      for (let i = 0; i < files.length; i++) {
        if (next.length >= 5) break
        const file = files[i]
        if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
          toast.error('Please use JPEG, PNG, or WebP images only.')
          continue
        }
        setUploading(true)
        try {
          const json = await api.get<{
            data: { uploadUrl: string; publicUrl: string }
          }>('/reviews/upload-url', {
            params: { filename: file.name, contentType: file.type },
          })
          const uploadUrl = json.data.uploadUrl
          const publicUrl = json.data.publicUrl

          const put = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          })
          if (!put.ok) throw new Error('Upload failed')
          next.push(publicUrl)
          setMediaUrls([...next])
        } catch {
          toast.error('Upload failed. Please try again.')
        } finally {
          setUploading(false)
        }
      }
    },
    [mediaUrls, user],
  )

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please log in to submit your review.')
      return
    }
    if (rating < 1) return
    try {
      await submit.mutateAsync({
        token,
        orderItemId,
        rating,
        body: body.trim() || undefined,
        mediaUrls: mediaUrls.length ? mediaUrls : undefined,
        productId: productIdForInvalidate,
      })
      setSuccess(true)
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr.code === 'REVIEW_ALREADY_EXISTS') {
        toast.error("You've already submitted a review for this item.")
        return
      }
      if (apiErr.code === 'REVIEW_TOKEN_INVALID') {
        toast.error(
          'This review link is no longer valid. Please use the link in your email.',
        )
        return
      }
      toast.error('Something went wrong. Please try again.')
    }
  }

  if (!token || !orderItemId) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 md:pt-24 pb-20">
        <InvalidLinkCard />
      </div>
    )
  }

  if (tokenLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 pt-16 md:pt-24">
        <Loader2 className="h-8 w-8 animate-spin text-umber" aria-hidden />
        <p className="font-body font-light text-sm text-umber">
          Verifying your review link…
        </p>
      </div>
    )
  }

  if (tokenStatus?.hasExistingReview) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 md:pt-24 pb-20">
        <div className="border border-muted p-8 text-center">
          <p className="font-body font-light text-[15px] text-umber mb-6">
            You&apos;ve already submitted a review for this item.
          </p>
          <Link
            href="/account/reviews"
            className="font-body font-light text-[12px] uppercase tracking-[0.2em] text-umber underline underline-offset-2"
          >
            View your reviews →
          </Link>
        </div>
      </div>
    )
  }

  if (tokenStatus && !tokenStatus.valid) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 md:pt-24 pb-20">
        <InvalidLinkCard />
      </div>
    )
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 md:pt-24 pb-20">
        <div className="border border-muted p-8 text-center">
          <p className="font-display font-bold text-[22px] text-umber mb-3">
            Thank you for your review!
          </p>
          <p className="font-body font-light text-[14px] text-umber mb-8">
            Your review will be visible on the product page shortly.
          </p>
          <Link
            href="/collections"
            className="inline-flex h-11 px-10 items-center justify-center bg-deep text-background font-body font-light uppercase tracking-[0.25em] text-[12px] rounded-none hover:bg-ink transition-colors duration-200"
          >
            Continue shopping →
          </Link>
        </div>
      </div>
    )
  }

  if (!tokenStatus?.product) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-16 md:pt-24 pb-20">
        <InvalidLinkCard />
      </div>
    )
  }

  const p = tokenStatus.product
  const displayImg = p.keyImageUrl

  return (
    <div className="max-w-lg mx-auto px-4 pt-16 md:pt-24 pb-20">
      <div className="flex gap-4 mb-8">
        <div className="w-20 h-20 shrink-0 bg-muted overflow-hidden">
          {displayImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={displayImg} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
        </div>
        <div>
          <h1 className="font-display font-bold text-[20px] text-umber leading-tight">
            {p.displayName}
          </h1>
          <p className="font-body font-light text-[13px] text-umber mt-1">
            {[p.color, p.size].filter(Boolean).join(' · ') || '—'}
          </p>
          <p className="font-body font-light text-[14px] text-umber mt-4">
            Share your thoughts
          </p>
          <p className="font-body font-light text-[12px] text-umber mt-1">
            Your review helps other customers make informed decisions.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        <div>
          <p className="font-body font-light text-[13px] text-umber mb-3">
            Rating <span className="text-editorial">*</span>
          </p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-3xl transition-colors duration-100 p-0 border-0 bg-transparent cursor-pointer"
              >
                <span
                  className={
                    (hoverRating || rating) >= star
                      ? 'text-amber-400'
                      : 'text-gray-300'
                  }
                >
                  {(hoverRating || rating) >= star ? '★' : '☆'}
                </span>
              </button>
            ))}
          </div>
          <p className="text-sm text-umber font-body font-light mt-2">
            {rating > 0 ? RATING_LABELS[rating] : ' '}
          </p>
        </div>

        <div>
          <label
            htmlFor="review-body"
            className="font-body font-light text-[13px] text-umber block mb-2"
          >
            Your review (optional)
          </label>
          <textarea
            id="review-body"
            rows={5}
            maxLength={2000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Tell us about the fit, fabric, and how it makes you feel…"
            className={cn(
              'w-full border border-muted bg-background px-3 py-3',
              'font-body font-light text-[14px] text-umber',
              'rounded-none resize-y min-h-[120px]',
              'focus:outline-none focus:ring-1 focus:ring-umber/30',
            )}
          />
          <p className="text-xs text-umber font-body font-light mt-1">
            {body.length} / 2000
          </p>
        </div>

        <div className="space-y-3">
          <p className="font-body font-normal text-[13px] text-umber">
            Photos{' '}
            <span className="font-light text-muted-foreground text-[12px]">
              (optional · up to 5 · max 20MB each)
            </span>
          </p>

          {/* Photo preview grid */}
          {mediaUrls.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {mediaUrls.map((url) => (
                <div
                  key={url}
                  className="relative w-20 h-20 bg-muted overflow-hidden group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt="Your uploaded photo"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMediaUrls((u) => u.filter((x) => x !== url))
                    }
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-graphite/70 text-background
                               flex items-center justify-center opacity-0 group-hover:opacity-100
                               transition-opacity duration-150"
                    aria-label="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload button */}
          {mediaUrls.length < 5 && (
            <>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                multiple
                disabled={!user || mediaUrls.length >= 5 || uploading}
                onChange={(e) => void handleFiles(e.target.files)}
                className="sr-only"
                id="review-photos"
              />
              <label
                htmlFor="review-photos"
                className={cn(
                  'inline-flex items-center gap-2 h-10 px-5 border border-muted',
                  'font-body font-light text-[12px] uppercase tracking-[0.2em] text-umber',
                  'cursor-pointer hover:border-umber transition-colors duration-200',
                  (!user || uploading) &&
                    'opacity-50 cursor-not-allowed pointer-events-none',
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    {mediaUrls.length === 0 ? 'Add Photos' : 'Add More'}
                  </>
                )}
              </label>
            </>
          )}

          <p className="font-body font-light text-[12px] text-muted-foreground leading-relaxed">
            Share how you wear it. Photos help other customers see the piece in
            real life.
          </p>
        </div>

        {!user && (
          <p className="font-body font-light text-[13px] text-umber">
            <Link href="/account/login" className="text-umber underline">
              Log in
            </Link>{' '}
            to submit your review.
          </p>
        )}

        <FilledButton
          type="submit"
          disabled={rating < 1 || submit.isPending || !user}
          className="w-full rounded-none"
        >
          {submit.isPending ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </span>
          ) : (
            'Submit Review'
          )}
        </FilledButton>
      </form>
    </div>
  )
}

function InvalidLinkCard() {
  return (
    <div className="border border-muted p-8">
      <p className="font-display font-bold text-[18px] text-umber mb-4">
        This review link is no longer valid.
      </p>
      <p className="font-body font-light text-[13px] text-umber mb-4">
        This can happen if:
      </p>
      <ul className="font-body font-light text-[13px] text-umber list-disc pl-5 space-y-2 mb-6">
        <li>The link has already been used</li>
        <li>The link has expired (30-day limit)</li>
        <li>The link is incorrect</li>
      </ul>
      <p className="font-body font-light text-[13px] text-umber">
        If you believe this is an error, please contact us at{' '}
        <a href="mailto:hello@modett.com" className="text-umber underline">
          hello@modett.com
        </a>
      </p>
    </div>
  )
}
