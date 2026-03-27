'use client'

import { CartIcon } from '@modett/ui'
import { cn } from '@/lib/utils'
import { useCartCount } from '@/hooks/useCartCount'
import { useUIStore } from '@/store/ui.store'

interface CartButtonProps {
  className?: string
  iconSize?: string
}

export function CartButton({
  className,
  iconSize = 'w-5 h-5',
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
      <CartIcon size={20} className={iconSize} />
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
