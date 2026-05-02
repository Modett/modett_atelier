import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { ReviewSubmissionClient } from './review-submission-client'

function ReviewPageFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 pt-16 md:pt-24">
      <Loader2 className="h-8 w-8 animate-spin text-umber" aria-hidden />
      <p className="font-body font-light text-sm text-umber">
        Loading…
      </p>
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewPageFallback />}>
      <ReviewSubmissionClient />
    </Suspense>
  )
}
