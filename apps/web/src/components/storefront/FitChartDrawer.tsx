'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

const SIZE_CHART = [
  { uk: 'UK 6',  eu: '34', bust: '80–82',   waist: '62–64', hip: '88–90'   },
  { uk: 'UK 8',  eu: '36', bust: '84–86',   waist: '66–68', hip: '92–94'   },
  { uk: 'UK 10', eu: '38', bust: '88–90',   waist: '70–72', hip: '96–98'   },
  { uk: 'UK 12', eu: '40', bust: '92–94',   waist: '74–76', hip: '100–102' },
  { uk: 'UK 14', eu: '42', bust: '96–98',   waist: '78–80', hip: '104–106' },
  { uk: 'UK 16', eu: '44', bust: '100–102', waist: '82–84', hip: '108–110' },
  { uk: 'UK 20', eu: '48', bust: '104–106', waist: '86–88', hip: '112–114' },
  { uk: 'UK 22', eu: '50', bust: '108–110', waist: '90–92', hip: '116–118' },
  { uk: 'UK 24', eu: '52', bust: '112–114', waist: '94–96', hip: '120–122' },
] as const

const MEASUREMENTS = [
  {
    label: 'Bust',
    text: 'Measure around the fullest part of your chest, keeping the tape parallel to the floor.',
  },
  {
    label: 'Waist',
    text: 'Measure around the narrowest part of your waist, slightly above the navel.',
  },
  {
    label: 'Hips',
    text: 'Measure around the fullest part of your hips, approximately 20cm below your natural waist.',
  },
] as const

interface FitChartDrawerProps {
  open:         boolean
  onClose:      () => void
  selectedSize: string | null
}

export function FitChartDrawer({
  open,
  onClose,
  selectedSize,
}: FitChartDrawerProps) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-graphite/30',
          'transition-opacity duration-200',
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Size guide"
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50',
          'w-full max-w-[420px]',
          'bg-background border-l border-muted',
          'shadow-[-4px_0_24px_rgba(35,45,53,0.10)]',
          'flex flex-col',
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-muted flex-shrink-0">
          <h2 className="font-display font-bold text-[22px] text-umber">
            Size Guide
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close size guide"
            className="text-umber hover:text-graphite transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber">
            UK Sizing
          </p>

          {/* Size table */}
          <div className="overflow-x-auto -mx-1">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-raised">
                  {['UK', 'EU', 'Bust (cm)', 'Waist (cm)', 'Hip (cm)'].map(
                    (h) => (
                      <th
                        key={h}
                        className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber py-2.5 px-3 border-b border-muted whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {SIZE_CHART.map((row, i) => {
                  const isHighlighted = selectedSize === row.uk

                  return (
                    <tr
                      key={row.uk}
                      className={cn(
                        'transition-colors duration-150',
                        isHighlighted
                          ? 'bg-muted border-l-2 border-l-umber'
                          : i % 2 === 0
                            ? 'bg-transparent'
                            : 'bg-surface-raised/40',
                      )}
                    >
                      <td
                        className={cn(
                          'font-body font-light text-[12px] text-umber py-2.5 px-3 border-b border-muted/50',
                          isHighlighted && 'font-medium',
                        )}
                      >
                        {row.uk}
                      </td>
                      <td className="font-body font-light text-[12px] text-umber py-2.5 px-3 border-b border-muted/50">
                        {row.eu}
                      </td>
                      <td className="font-body font-light text-[12px] text-umber py-2.5 px-3 border-b border-muted/50">
                        {row.bust}
                      </td>
                      <td className="font-body font-light text-[12px] text-umber py-2.5 px-3 border-b border-muted/50">
                        {row.waist}
                      </td>
                      <td className="font-body font-light text-[12px] text-umber py-2.5 px-3 border-b border-muted/50">
                        {row.hip}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* How to measure */}
          <div className="space-y-3 pt-2">
            <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber">
              How to Measure
            </p>
            {MEASUREMENTS.map(({ label, text }) => (
              <div key={label}>
                <span className="font-body text-[12px] text-umber font-medium">
                  {label}:{' '}
                </span>
                <span className="font-body font-light text-[12px] text-umber leading-relaxed">
                  {text}
                </span>
              </div>
            ))}
          </div>

          {/* Model info */}
          <p className="font-body font-light text-[11px] text-umber italic pt-2 border-t border-muted">
            Our model is 5&apos;10&quot; (178cm) and wears UK size 10.
          </p>
        </div>
      </div>
    </>
  )
}
