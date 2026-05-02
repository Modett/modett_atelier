'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface CheckoutSectionProps {
  stepKey: 'email' | 'shipping' | 'information' | 'payment'
  stepNumber: number
  title: string
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  onEdit: () => void
  summary?: ReactNode
  children: ReactNode
}

export function CheckoutSection({
  stepNumber,
  title,
  isActive,
  isCompleted,
  isLocked,
  onEdit,
  summary,
  children,
}: CheckoutSectionProps) {
  if (isActive) {
    return (
      <div>
        <div className="bg-deep/90 px-6 py-4">
          <h2 className="font-body font-light text-[15px] text-background uppercase tracking-[0.15em]">
            {stepNumber}. {title}
          </h2>
        </div>
        <div className="bg-background px-6 py-6 border-x border-b border-muted">
          {children}
        </div>
      </div>
    )
  }

  if (isCompleted) {
    return (
      <div>
        <div className="bg-surface-raised px-6 py-4 flex justify-between items-center">
          <span className="font-body font-light text-[14px] text-umber">
            <span className="text-[#4A7C59] mr-1.5" aria-hidden="true">✓</span>
            {stepNumber}. {title}
          </span>
          <button
            type="button"
            onClick={onEdit}
            className={cn(
              'font-body text-[12px] uppercase tracking-[0.15em]',
              'text-umber underline underline-offset-4 hover:text-ink',
              'transition-colors duration-200',
            )}
          >
            Edit
          </button>
        </div>
        {summary && (
          <div className="bg-surface-raised px-6 pb-3">
            {summary}
          </div>
        )}
      </div>
    )
  }

  if (isLocked) {
    return (
      <div>
        <div className="bg-surface-raised/50 px-6 py-4">
          <span className="font-body font-light text-[14px] text-umber/40">
            {stepNumber}. {title}
          </span>
        </div>
      </div>
    )
  }

  return null
}
