import Link from 'next/link'
import type { ProductDetail } from '@/types'

interface ProductBreadcrumbProps {
  product: ProductDetail
}

export function ProductBreadcrumb({ product }: ProductBreadcrumbProps) {
  const categoryHref = '/collections'

  return (
    <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-5 md:py-6 border-b border-muted">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 overflow-hidden">
          <li className="flex-shrink-0">
            <Link
              href="/"
              className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-umber transition-colors duration-200 whitespace-nowrap"
            >
              Home
            </Link>
          </li>
          <li className="flex-shrink-0 font-body text-[11px] text-muted-foreground">
            /
          </li>
          <li className="flex-shrink-0">
            <Link
              href={categoryHref}
              className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-umber transition-colors duration-200 whitespace-nowrap"
            >
              Collection
            </Link>
          </li>
          <li className="flex-shrink-0 font-body text-[11px] text-muted-foreground">
            /
          </li>
          <li className="min-w-0">
            <span className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground block truncate">
              <span className="hidden md:inline">{product.displayName}</span>
              <span className="md:hidden">{product.shortName}</span>
            </span>
          </li>
        </ol>
      </nav>
    </div>
  )
}
