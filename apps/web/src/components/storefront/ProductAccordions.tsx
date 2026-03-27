'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductDetail } from '@/types'

const CARE_DEFAULT =
  'Hand wash or dry clean. Store folded in a breathable cotton bag. Iron on low heat with a pressing cloth. Avoid prolonged exposure to direct sunlight.'

const SUSTAINABILITY_TEXT =
  'Modett partners with certified ethical manufacturers. Our materials are sourced using responsible practices. We use biodegradable packaging and offset our shipping carbon footprint.'

const SHIPPING_TEXT =
  'Complimentary standard shipping on all orders over LKR 15,000. Express delivery available at checkout. Returns accepted within 30 days of delivery. Items must be unworn with tags attached.'

const MODETT_PROMISE = 'Designed for longevity, not trends.\nTimeless pieces, made with intention.'

interface AccordionSection {
  title:        string
  content:      React.ReactNode
  defaultOpen?: boolean
}

interface ProductAccordionsProps {
  product:    ProductDetail
  className?: string
}

export function ProductAccordions({
  product,
  className,
}: ProductAccordionsProps) {
  const sections: AccordionSection[] = [
    {
      title: 'Design & Fit',
      content: product.description ?? 'Design and fit information coming soon.',
    },
    {
      title: 'Fabric & Feel',
      content: product.fabricInfo ?? 'Fabric information coming soon.',
    },
    {
      title: 'Craft & Care',
      content: CARE_DEFAULT,
    },
    {
      title: 'Sustainability',
      content: SUSTAINABILITY_TEXT,
    },
    {
      title: 'Shipping & Returns',
      content: SHIPPING_TEXT,
    },
    {
      title: 'The Modett Promise',
      defaultOpen: true,
      content: (
        <p className="font-display font-bold italic text-[15px] text-umber whitespace-pre-line">
          {MODETT_PROMISE}
        </p>
      ),
    },
  ]

  return (
    <div className={cn('border-t border-muted', className)}>
      {sections.map((section) => (
        <ProductAccordion
          key={section.title}
          title={section.title}
          defaultOpen={section.defaultOpen ?? false}
        >
          {typeof section.content === 'string' ? (
            <p className="font-body font-light text-[13px] text-umber/80 leading-relaxed">
              {section.content}
            </p>
          ) : (
            section.content
          )}
        </ProductAccordion>
      ))}
    </div>
  )
}

function ProductAccordion({
  title,
  defaultOpen = false,
  children,
}: {
  title:        string
  defaultOpen?: boolean
  children:     React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-muted">
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="flex items-center justify-between w-full py-4"
        aria-expanded={isOpen}
      >
        <span className="font-body font-light text-[13px] uppercase tracking-[0.2em] text-umber">
          {title}
        </span>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground flex-shrink-0',
            'transition-transform duration-200',
            isOpen ? 'rotate-180' : 'rotate-0',
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-300',
          isOpen ? 'max-h-[500px] pb-6' : 'max-h-0',
        )}
      >
        <div className="pt-1.5">{children}</div>
      </div>
    </div>
  )
}
