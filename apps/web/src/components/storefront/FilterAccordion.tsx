'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterAccordionProps {
  title:        string
  defaultOpen?: boolean
  children:     React.ReactNode
}

export function FilterAccordion({
  title,
  defaultOpen = false,
  children,
}: FilterAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-muted py-3">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="flex items-center justify-between w-full"
        aria-expanded={isOpen}
      >
        <span className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber">
          {title}
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-umber',
            'transition-transform duration-200',
            isOpen ? 'rotate-180' : 'rotate-0',
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96' : 'max-h-0',
        )}
      >
        {children}
      </div>
    </div>
  )
}
