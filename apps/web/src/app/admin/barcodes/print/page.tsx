'use client'

import { Suspense, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Printer } from 'lucide-react'
import { BarcodeLabel } from '@/components/admin/BarcodePrintSheet'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useVariantBarcodes } from '@/hooks/useAdminInventory'
import { Skeleton } from '@/components/ui/skeleton'

const printRootId = 'admin-barcode-print-root'

function ensurePrintStyles() {
  if (typeof document === 'undefined') return
  const id = 'admin-barcode-print-styles'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = `
@media print {
  .no-print { display: none !important; }
  body * { visibility: hidden !important; }
  #${printRootId}, #${printRootId} * { visibility: visible !important; }
  #${printRootId} {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    background: white !important;
  }
  @page { size: A4 portrait; margin: 10mm; }
}
`
  document.head.appendChild(style)
}

function PrintInner() {
  const searchParams = useSearchParams()
  const variantId = searchParams.get('variantId') ?? ''
  const statusFilter =
    searchParams.get('status') === 'ALL' ? 'ALL' : 'IN_STOCK'
  const unitIdsRaw = searchParams.get('unitIds') ?? ''
  const unitIds =
    unitIdsRaw.trim() !== ''
      ? unitIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined

  const { data, isLoading, error } = useVariantBarcodes({
    variantId,
    status: statusFilter,
    unitIds,
  })

  useEffect(() => {
    ensurePrintStyles()
  }, [])

  if (!variantId) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-600">Missing variantId in URL.</p>
        <Link href="/admin/inventory" className="mt-2 text-sm text-blue-600 underline">
          Back to inventory
        </Link>
      </div>
    )
  }

  const titleParts =
    data != null
      ? `${data.variant.color} / ${data.variant.size} — ${data.product.displayName} — ${data.product.productCode}`
      : 'Barcode sheet'

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="no-print mx-auto mb-4 flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/inventory"
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Link>
          <Button type="button" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1 h-4 w-4" />
            Print
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          <h1 className="text-lg font-semibold text-gray-900">Barcode Sheet</h1>
          <p>{titleParts}</p>
          {data != null && <p className="text-gray-500">{data.units.length} labels</p>}
        </div>
      </div>

      {isLoading && (
        <div className="no-print mx-auto max-w-4xl space-y-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      )}
      {error && (
        <p className="no-print text-sm text-red-600">Could not load barcodes.</p>
      )}
      {data && data.units.length === 0 && (
        <p className="no-print text-sm text-gray-500">No units match this filter.</p>
      )}

      <div id={printRootId} className="mx-auto max-w-[190mm] bg-white p-4">
        {data && data.units.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 print:grid-cols-2 print:sm:grid-cols-2">
            {data.units.map((unit) => (
              <BarcodeLabel
                key={unit.id}
                unit={unit}
                productName={data.product.displayName}
                color={data.variant.color}
                size={data.variant.size}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminBarcodePrintPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-8 w-48" />
        </div>
      }
    >
      <PrintInner />
    </Suspense>
  )
}
