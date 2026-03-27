'use client'

import { useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/** One row of the size chart table (UK size + measurements in cm) */
export interface SizeChartRow {
  /** UK size label (e.g. "UK 6") */
  ukSize: string
  /** Bust measurement in cm */
  bust: string
  /** Waist measurement in cm */
  waist: string
  /** Hips measurement in cm */
  hips: string
}

/** Single measurement guide instruction */
export interface MeasurementGuide {
  /** Label (e.g. "Bust", "Waist", "Hips") */
  label: string
  /** Instruction text */
  instruction: string
}

/** Right-side drawer with size chart, measurement guide, and model info */
export interface SizeGuideDrawerProps {
  /** Whether the drawer is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Size chart data rows */
  sizeChart?: SizeChartRow[]
  /** Measurement guide instructions */
  measurementGuides?: MeasurementGuide[]
  /** Model info (e.g. "Model wears UK 10") */
  modelInfo?: string
  /** Model height (e.g. "Height: 5'10\" / 178cm") */
  modelHeight?: string
  /** URL for measurement guide illustration image */
  measurementImageUrl?: string
  /** URL for model photo */
  modelImageUrl?: string
  /** Additional notes text (shown at bottom) */
  notes?: string
}

const DEFAULT_SIZE_CHART: SizeChartRow[] = [
  { ukSize: 'UK 6', bust: '80', waist: '62', hips: '86' },
  { ukSize: 'UK 8', bust: '84', waist: '66', hips: '90' },
  { ukSize: 'UK 10', bust: '88', waist: '70', hips: '94' },
  { ukSize: 'UK 12', bust: '92', waist: '74', hips: '98' },
  { ukSize: 'UK 14', bust: '96', waist: '78', hips: '102' },
  { ukSize: 'UK 16', bust: '100', waist: '82', hips: '106' },
]

const DEFAULT_MEASUREMENT_GUIDES: MeasurementGuide[] = [
  {
    label: 'Bust',
    instruction: 'Measure around the fullest part of your bust, keeping the tape level.',
  },
  {
    label: 'Waist',
    instruction: 'Measure at your natural waistline, the narrowest part of your torso.',
  },
  {
    label: 'Hips',
    instruction:
      'Measure around the widest part of your hips, approximately 20cm below your waist.',
  },
]

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

export function SizeGuideDrawer({
  isOpen,
  onClose,
  sizeChart = DEFAULT_SIZE_CHART,
  measurementGuides = DEFAULT_MEASUREMENT_GUIDES,
  modelInfo,
  modelHeight,
  measurementImageUrl,
  modelImageUrl,
  notes = 'All measurements are in centimetres.',
}: SizeGuideDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const focusTrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      closeButtonRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab') {
        const trap = focusTrapRef.current
        if (!trap) return
        const focusables = trap.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const list = Array.from(focusables)
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onClose()
    },
    [onClose]
  )

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 bg-text/50"
            onClick={handleOverlayClick}
            aria-hidden
          />

          {/* Panel */}
          <motion.div
            ref={focusTrapRef}
            role="dialog"
            aria-modal="true"
            aria-label="Size Guide"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className="fixed right-0 top-0 z-50 flex h-screen w-full flex-col overflow-y-auto bg-background md:w-[480px] lg:w-[520px]"
          >
            <div className="relative flex flex-col p-6 pt-14">
              {/* Close button */}
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center text-text transition-colors duration-200 hover:text-muted-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                aria-label="Close size guide"
              >
                <CloseIcon className="h-5 w-5" />
              </button>

              {/* Heading */}
              <h2 className="font-display text-2xl font-normal text-text md:text-3xl">
                Size Guide
              </h2>

              {/* Model section */}
              {(modelInfo != null || modelHeight != null || modelImageUrl != null) && (
                <div className="mt-6 flex flex-row gap-4">
                  {modelImageUrl != null && (
                    <img
                      src={modelImageUrl}
                      alt=""
                      className="h-auto w-28 shrink-0 object-cover"
                    />
                  )}
                  <div className="flex flex-col justify-center gap-0.5">
                    {modelInfo != null && modelInfo !== '' && (
                      <p className="font-body text-sm font-normal text-text">
                        {modelInfo}
                      </p>
                    )}
                    {modelHeight != null && modelHeight !== '' && (
                      <p className="font-body text-sm font-normal text-muted-foreground">
                        {modelHeight}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* How to Measure */}
              {measurementGuides.length > 0 && (
                <section className="mt-8" aria-labelledby="how-to-measure-heading">
                  <h3
                    id="how-to-measure-heading"
                    className="font-body text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
                  >
                    How to Measure
                  </h3>
                  <div className="mt-2 border-b border-surface-raised pb-4" />
                  <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                    {measurementImageUrl != null && (
                      <img
                        src={measurementImageUrl}
                        alt=""
                        className="h-auto w-full max-w-[200px] shrink-0 object-contain sm:max-w-[160px]"
                      />
                    )}
                    <ul className="flex list-none flex-col gap-3 p-0">
                      {measurementGuides.map((guide) => (
                        <li key={guide.label}>
                          <span className="font-body text-sm font-medium text-text">
                            {guide.label}:{' '}
                          </span>
                          <span className="font-body text-sm font-normal text-muted-foreground">
                            {guide.instruction}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </section>
              )}

              {/* Size chart table */}
              <section className="mt-8" aria-labelledby="size-chart-heading">
                <h3
                  id="size-chart-heading"
                  className="font-body text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground"
                >
                  Size Chart (UK)
                </h3>
                <div className="mt-2 border-b border-surface-raised pb-4" />
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[280px] border-collapse">
                    <thead>
                      <tr className="bg-deep">
                        <th
                          scope="col"
                          className="px-4 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-background"
                        >
                          UK
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-background"
                        >
                          Bust
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-background"
                        >
                          Waist
                        </th>
                        <th
                          scope="col"
                          className="px-4 py-3 text-left font-body text-xs font-medium uppercase tracking-wider text-background"
                        >
                          Hips
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sizeChart.map((row, index) => (
                        <tr
                          key={row.ukSize}
                          className={cn(
                            'border-b border-surface-raised',
                            index % 2 === 0 ? 'bg-background' : 'bg-surface-raised/30'
                          )}
                        >
                          <td className="px-4 py-3 font-body text-sm font-normal text-text">
                            {row.ukSize}
                          </td>
                          <td className="px-4 py-3 font-body text-sm font-normal text-text">
                            {row.bust}
                          </td>
                          <td className="px-4 py-3 font-body text-sm font-normal text-text">
                            {row.waist}
                          </td>
                          <td className="px-4 py-3 font-body text-sm font-normal text-text">
                            {row.hips}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Notes */}
              {notes != null && notes !== '' && (
                <p className="mt-4 font-body text-xs font-normal text-muted-foreground">
                  {notes}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
