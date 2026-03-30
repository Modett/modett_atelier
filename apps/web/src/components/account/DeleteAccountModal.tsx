'use client'

import { cn } from '@/lib/utils'

interface DeleteAccountModalProps {
  open: boolean
  confirmText: string
  onConfirmChange: (value: string) => void
  onClose: () => void
}

export function DeleteAccountModal({
  open,
  confirmText,
  onConfirmChange,
  onClose,
}: DeleteAccountModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-graphite/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="del-acct-title"
    >
      <div className="bg-background border border-muted p-6 max-w-md w-full space-y-4">
        <h2 id="del-acct-title" className="font-display font-bold text-[20px] text-umber">
          Delete your account
        </h2>
        <p className="font-body font-light text-[13px] text-muted-foreground">
          This action cannot be undone. All your orders, wishlist, and loyalty points will be
          permanently deleted.
        </p>
        <input
          value={confirmText}
          onChange={(e) => onConfirmChange(e.target.value)}
          placeholder='Type "DELETE" to confirm'
          className={cn(
            'w-full h-12 px-4 border border-muted rounded-none',
            'font-body font-light text-[14px] text-umber',
            'outline-none focus:border-umber',
          )}
        />
        <div className="flex gap-3">
          <button
            type="button"
            disabled={confirmText !== 'DELETE'}
            onClick={onClose}
            className={cn(
              'flex-1 h-10 bg-red-500 text-background font-body text-[12px] uppercase tracking-[0.1em] rounded-none',
              'disabled:opacity-30',
            )}
          >
            Delete Account
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-10 border border-muted font-body text-[12px] text-umber rounded-none"
          >
            Cancel
          </button>
        </div>
        <p className="font-body font-light text-[11px] text-muted-foreground">
          Account deletion via the app is not available yet. This dialog will be connected when
          the API is ready.
        </p>
      </div>
    </div>
  )
}
