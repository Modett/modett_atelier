'use client'

import { cn } from '@/lib/utils'
import { useCartCount } from '@/hooks/useCartCount'
import { useUIStore } from '@/store/ui.store'
import { NavbarCartIcon } from '@/components/shared/NavbarTrayIcons'

interface CartButtonProps {
  className?: string
  /** Optional extra classes on the icon (e.g. Tailwind size overrides). */
  iconClassName?: string
}

export function CartButton({
  className,
  iconClassName,
}: CartButtonProps) {
  const count   = useCartCount()
  const openBag = useUIStore(s => s.openBag)

  return (
    <button
      type="button"
      onClick={openBag}
      aria-label={`Shopping bag${count > 0 ? ` — ${count} item${count > 1 ? 's' : ''}` : ''}`}
      className={cn('relative transition-colors duration-200', className)}
    >
      <NavbarCartIcon className={iconClassName} />
      {count > 0 && (
        <span
          className={cn(
            'absolute -right-1.5 -top-1.5',
            'flex h-4 min-w-[16px] items-center justify-center',
            'rounded-full bg-umber px-1',
            'font-body text-[10px] font-bold text-background',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
