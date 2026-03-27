'use client'

import React, { useState, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'

export interface AccordionProps {
  /** The title displayed in the header bar */
  title: string
  /** Content shown when expanded — can be a string or React nodes */
  children: React.ReactNode
  /** Whether the accordion starts open */
  defaultOpen?: boolean
  /** Controlled open state (overrides internal state) */
  isOpen?: boolean
  /** Change handler for controlled mode */
  onToggle?: (isOpen: boolean) => void
  /** Whether to show the bottom divider border */
  showDivider?: boolean
  /** Additional className for the outer wrapper */
  className?: string
}

export const Accordion = ({
  title,
  children,
  defaultOpen = false,
  isOpen: controlledOpen,
  onToggle,
  showDivider = true,
  className,
}: AccordionProps) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const headerId = useId()
  const regionId = useId()

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen

  const handleToggle = () => {
    const newState = !isOpen
    if (controlledOpen === undefined) {
      setInternalOpen(newState)
    }
    onToggle?.(newState)
  }

  const renderContent = () => {
    if (typeof children === 'string') {
      const paragraphs = children.split('\n\n').filter(Boolean)
      return (
        <div className="font-body text-sm font-normal text-muted-foreground leading-relaxed space-y-3">
          {paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
      )
    }
    return children
  }

  return (
    <div
      className={cn(
        showDivider && 'border-b border-surface-raised',
        className
      )}
    >
      <button
        type="button"
        id={headerId}
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between',
          'py-4 md:py-5',
          'cursor-pointer group',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-highlight'
        )}
        aria-expanded={isOpen}
        aria-controls={regionId}
      >
        <span className="font-body text-sm font-normal uppercase tracking-[0.2em] text-foreground">
          {title}
        </span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="text-foreground shrink-0 ml-4"
          aria-hidden="true"
        >
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={regionId}
            role="region"
            aria-labelledby={headerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="pb-5">{renderContent()}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

Accordion.displayName = 'Accordion'
