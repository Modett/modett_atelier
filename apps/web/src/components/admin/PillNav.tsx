'use client'

import { cn } from '@/lib/utils'

export interface PillNavItem {
  value: string
  label: string
  /** Optional numeric badge shown inside the pill when active */
  badge?: number
}

interface PillNavProps {
  items: PillNavItem[]
  active: string
  onChange: (value: string) => void
  className?: string
}

export function PillNav({ items, active, onChange, className }: PillNavProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-2xl border border-gray-100 bg-white p-1.5 shadow-sm',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = item.value === active
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-[#d4f5c4] text-gray-900 shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
            )}
          >
            {item.label}
            {isActive && item.badge != null && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
