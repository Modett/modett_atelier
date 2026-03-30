import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="font-body font-light text-[11px] uppercase tracking-[0.25em] text-muted-foreground mb-4">
          404
        </p>
        <h1 className="font-display font-bold text-[32px] md:text-[40px] text-umber leading-tight mb-4">
          Page not found
        </h1>
        <p className="font-body font-light text-[14px] text-muted-foreground mb-10 leading-relaxed">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/collections"
          className="inline-block h-12 px-12 bg-umber text-background font-body font-light uppercase tracking-[0.25em] text-[12px] hover:bg-ink transition-colors duration-200"
        >
          Shop the Collection
        </Link>
      </div>
    </div>
  )
}
