export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-background animate-pulse">
      {/* Breadcrumb skeleton */}
      <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-5 md:py-6 border-b border-muted">
        <div className="flex items-center gap-1.5">
          <div className="h-3 w-10 bg-surface-raised rounded" />
          <div className="h-3 w-2 bg-surface-raised rounded" />
          <div className="h-3 w-16 bg-surface-raised rounded" />
          <div className="h-3 w-2 bg-surface-raised rounded" />
          <div className="h-3 w-28 bg-surface-raised rounded" />
        </div>
      </div>

      <div className="max-w-page mx-auto px-4 md:px-0 pb-12 md:pb-16">
        <div className="md:grid md:grid-cols-[60%_40%] md:gap-x-8 lg:gap-x-12 md:items-start">
          {/* Gallery skeleton */}
          <div className="pt-4 md:pt-6 pb-8 md:pb-12 md:pl-8 lg:pl-10 xl:pl-12">
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="col-span-2 aspect-[4/3] bg-surface-raised" />
              <div className="aspect-[3/4] bg-surface-raised" />
              <div className="aspect-[3/4] bg-surface-raised" />
            </div>
          </div>

          {/* Info panel skeleton */}
          <div className="md:pr-8 lg:pr-10 xl:pr-12 md:pl-2 py-8 md:py-10 space-y-6">
            <div className="h-8 w-3/4 bg-surface-raised rounded" />
            <div className="h-3 w-16 bg-surface-raised rounded" />
            <div className="h-5 w-24 bg-surface-raised rounded mt-3" />

            {/* Colour swatches */}
            <div className="flex gap-2 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[22px] h-[22px] rounded-full bg-surface-raised"
                />
              ))}
            </div>

            {/* Size buttons */}
            <div className="flex flex-wrap gap-2 mt-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="w-10 h-9 bg-surface-raised rounded"
                />
              ))}
            </div>

            {/* Add to cart button */}
            <div className="h-[52px] w-full bg-surface-raised mt-6" />

            {/* Description */}
            <div className="space-y-2 mt-6">
              <div className="h-3 w-full bg-surface-raised rounded" />
              <div className="h-3 w-5/6 bg-surface-raised rounded" />
              <div className="h-3 w-4/6 bg-surface-raised rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
