import React from 'react'
import { cn } from '../../lib/utils'
import { Accordion } from './Accordion'

const DEFAULT_CARE_TEXT = `We recommend dry cleaning for this garment to preserve its quality and finish. If hand washing is preferred, use cold water with a gentle detergent and lay flat to dry. Avoid wringing or tumble drying. Iron on a low setting with a pressing cloth if needed. Store on a padded hanger to maintain the garment's shape.`

const DEFAULT_RETURN_TEXT = `We accept returns within 14 days of delivery for items in their original condition with all tags attached. Items must be unworn, unwashed, and free from alterations. To initiate a return, visit your account or contact our team. Refunds are processed to the original payment method within 5–7 business days of receiving the returned item. Sale items are final sale and cannot be returned.`

const DEFAULT_SHIPPING_TEXT = `Sri Lanka: Standard delivery (3–5 business days) and Express delivery (1–2 business days) available. Free shipping on orders over LKR 25,000.\n\nSingapore: Standard delivery (5–7 business days) and Express delivery (2–3 business days). Free shipping on orders over SGD 150.\n\nInternational: Standard delivery (10–14 business days) and Express delivery (5–7 business days). Shipping rates calculated at checkout. International orders may be subject to local customs duties and taxes.`

export interface ProductAccordionsSection {
  title: string
  content: React.ReactNode
}

export interface ProductAccordionsProps {
  /** Product fabric information from catalog.products.fabric_info */
  fabricInfo?: string
  /** Custom care and maintenance text (overrides default) */
  careText?: string
  /** Custom return and exchange text (overrides default) */
  returnText?: string
  /** Custom shipping information text (overrides default) */
  shippingText?: string
  /** Additional sections to append after the four defaults */
  additionalSections?: ProductAccordionsSection[]
  /** Additional className */
  className?: string
}

export const ProductAccordions = ({
  fabricInfo,
  careText,
  returnText,
  shippingText,
  additionalSections = [],
  className,
}: ProductAccordionsProps) => {
  const sections: ProductAccordionsSection[] = [
    ...(fabricInfo ? [{ title: 'Fabric', content: fabricInfo }] : []),
    {
      title: 'Care & Maintenance',
      content: careText ?? DEFAULT_CARE_TEXT,
    },
    {
      title: 'Return & Exchange',
      content: returnText ?? DEFAULT_RETURN_TEXT,
    },
    {
      title: 'Shipping Information',
      content: shippingText ?? DEFAULT_SHIPPING_TEXT,
    },
    ...additionalSections,
  ]

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="border-t border-surface-raised" />
      {sections.map((section, index) => (
        <Accordion
          key={`${section.title}-${index}`}
          title={section.title}
          showDivider={true}
        >
          {section.content}
        </Accordion>
      ))}
    </div>
  )
}

ProductAccordions.displayName = 'ProductAccordions'
