'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { consumePostAuthPath } from '@/lib/postAuthRedirect'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

export function AuthPanel({ open, onClose }: AuthPanelProps) {
  const router = useRouter()
  const { view, setView } = useAuthPanel()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
      requestAnimationFrame(() => closeButtonRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleClose = useCallback(() => {
    onClose()
    requestAnimationFrame(() => {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    })
  }, [onClose])

  const handleAuthSuccess = useCallback(() => {
    const next = consumePostAuthPath()
    handleClose()
    if (next) {
      router.push(next)
    }
  }, [handleClose, router])

  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, handleClose])

  // Focus trap
  useEffect(() => {
    if (!open) return

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]!
      const last = focusable[focusable.length - 1]!

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleTab)
    return () => document.removeEventListener('keydown', handleTab)
  }, [open])

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        onClick={handleClose}
        className={cn(
          'fixed inset-0 z-40',
          'bg-graphite/40',
          'transition-opacity duration-200',
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={view === 'login' ? 'Sign in' : 'Create account'}
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50',
          'w-full max-w-[480px]',
          'bg-surface-raised',
          'overflow-y-auto',
          'shadow-[-8px_0_32px_rgba(35,45,53,0.12)]',
          'transition-transform duration-[350ms] ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
          'pb-8 sm:pb-0',
        )}
      >
        {/* Close button */}
        <button
          ref={closeButtonRef}
          onClick={handleClose}
          aria-label="Close"
          className={cn(
            'absolute top-5 right-5 z-10',
            'text-umber hover:text-graphite',
            'transition-colors duration-200',
            'focus:outline-none',
          )}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="px-8 py-10 md:px-10 md:py-12">
          {view === 'login' ? (
            <LoginForm
              onSuccess={handleAuthSuccess}
              onSwitchToRegister={() => setView('register')}
            />
          ) : (
            <RegisterForm
              onSuccess={handleAuthSuccess}
              onSwitchToLogin={() => setView('login')}
            />
          )}
        </div>
      </div>
    </>
  )
}

interface AuthPanelProps {
  open: boolean
  onClose: () => void
}
