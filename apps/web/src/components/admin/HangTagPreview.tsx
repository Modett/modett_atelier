'use client'

function formatLkr(amount: string): string {
  const n = Number.parseFloat(amount)
  if (!Number.isFinite(n)) return '— —'
  return new Intl.NumberFormat('en-LK', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(n)
}

function formatDecimal(amount: string): string {
  const n = Number.parseFloat(amount)
  if (!Number.isFinite(n)) return '— —'
  return n.toFixed(2)
}

export interface HangTagPreviewProps {
  displayName: string
  productCode: string
  lkrAmount: string
  sgdAmount: string
  usdAmount: string
}

export function HangTagPreview({
  displayName,
  productCode,
  lkrAmount,
  sgdAmount,
  usdAmount,
}: HangTagPreviewProps) {
  const name = displayName.trim() || 'Product Name'
  const code = productCode.trim() || '— — —'

  return (
    <div className="relative mx-auto max-w-[200px] rounded border border-[#d6cfc6] bg-white px-3 py-4 pt-6 shadow-sm">
      <div
        className="absolute top-1 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-[#d6cfc6] bg-white"
        aria-hidden
      />
      <p className="text-center text-[10px] tracking-[0.3em] text-gray-400 uppercase">
        M O D E T T
      </p>
      <div className="mx-auto my-2 h-px w-full bg-[#d6cfc6]" />
      <p className="text-center text-sm font-medium text-gray-800">{name}</p>
      <div className="mt-3 space-y-1 font-mono text-sm">
        <div className="flex justify-between gap-2">
          <span className="w-8 text-xs text-gray-400">LKR</span>
          <span className="text-right text-gray-800">{formatLkr(lkrAmount)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="w-8 text-xs text-gray-400">SGD</span>
          <span className="text-right text-gray-800">{formatDecimal(sgdAmount)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="w-8 text-xs text-gray-400">USD</span>
          <span className="text-right text-gray-800">{formatDecimal(usdAmount)}</span>
        </div>
      </div>
      <div className="mx-auto my-2 h-px w-full bg-[#d6cfc6]" />
      <p className="text-center font-mono text-[10px] text-gray-400">{code}</p>
    </div>
  )
}
