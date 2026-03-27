export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-surface-raised" />
      <div className="mt-3 space-y-2">
        <div className="h-3 w-3/4 bg-surface-raised" />
        <div className="h-3 w-1/2 bg-surface-raised" />
        <div className="flex gap-1.5 mt-2">
          <div className="w-2 h-2 rounded-full bg-surface-raised" />
          <div className="w-2 h-2 rounded-full bg-surface-raised" />
          <div className="w-2 h-2 rounded-full bg-surface-raised" />
        </div>
      </div>
    </div>
  )
}
