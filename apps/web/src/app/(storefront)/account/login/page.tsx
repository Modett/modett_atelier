'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { useChangePassword } from '@/hooks/useAccount'
import { useLogout } from '@/hooks/useLogout'
import type { ApiError } from '@/types'
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal'

export default function AccountLoginDetailsPage() {
  const { user, isLoading } = useSession()
  const changePassword      = useChangePassword()
  const logout              = useLogout()

  const [showCur, setShowCur]   = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [confirmErr, setConfirmErr] = useState<string | null>(null)
  const [pwErr, setPwErr]           = useState<string | null>(null)
  const [pwOk, setPwOk]             = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  function validateNewPassword(pw: string): string | null {
    if (pw.length < 8) return 'Password must be at least 8 characters.'
    if (!/[A-Z]/.test(pw)) return 'Password must contain at least one capital letter.'
    if (!/[a-z]/.test(pw)) return 'Password must contain at least one lowercase letter.'
    return null
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwErr(null)
    setConfirmErr(null)
    setPwOk(false)

    if (!currentPw.trim() || !newPw.trim() || !confirmPw.trim()) {
      setPwErr('All fields are required.')
      return
    }
    const v = validateNewPassword(newPw)
    if (v) {
      setPwErr(v)
      return
    }
    if (newPw !== confirmPw) {
      setConfirmErr('Passwords do not match.')
      return
    }

    try {
      await changePassword.mutateAsync({
        currentPassword: currentPw,
        newPassword:     newPw,
      })
      setPwOk(true)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      setTimeout(() => {
        logout.mutate()
      }, 1500)
    } catch (err) {
      const apiErr = err as unknown as ApiError
      setPwErr(apiErr.message ?? 'Could not update password.')
    }
  }

  if (isLoading || !user) {
    return <div className="h-40 bg-muted animate-pulse rounded-none" />
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display font-bold text-[26px] text-umber mb-8">
        Login Details
      </h1>

      <section>
        <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Change Email:
        </p>
        <p className="font-body font-light text-[13px] text-muted-foreground mb-4">
          Email changes are not yet available online.
        </p>

        <LockedField label="Current Email:" value={user.email} />

        <LockedField label="New Email:" value="" placeholder="" />
        <LockedField label="Confirm new Email:" value="" placeholder="" />
        <LockedField label="Current password:" value="" placeholder="" type="password" />

        <button
          type="button"
          disabled
          className={cn(
            'mt-4 h-11 px-10 bg-deep text-background rounded-none opacity-40 cursor-not-allowed',
            'font-body font-light text-[12px]',
          )}
        >
          Update e-mail
        </button>

        <p className="font-body font-light text-[12px] text-muted-foreground mt-4">
          To change your email address, please contact our customer support team.{' '}
          <Link href="/contact" className="text-umber underline underline-offset-2">
            Contact us
          </Link>
        </p>
      </section>

      <div className="border-t border-muted my-8" />

      <section>
        <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Change password:
        </p>
        <p className="font-body font-light text-[13px] text-muted-foreground mb-4">
          Enter your current password and a new one below.
        </p>

        <form onSubmit={handlePassword} className="space-y-4">
          <PasswordField
            id="login-cur-pw"
            label="Current password:"
            value={currentPw}
            onChange={setCurrentPw}
            visible={showCur}
            onToggleVisible={() => setShowCur((s) => !s)}
            autoComplete="current-password"
          />
          <div>
            <PasswordField
              id="login-new-pw"
              label="New Password:"
              value={newPw}
              onChange={setNewPw}
              visible={showNew}
              onToggleVisible={() => setShowNew((s) => !s)}
              autoComplete="new-password"
            />
            <ul className="font-body font-light text-[11px] text-muted-foreground space-y-0.5 mt-2">
              <li>The password should contain:</li>
              <li>• Minimum 8 characters</li>
              <li>• At least 1 capital letter</li>
              <li>• At least 1 lower letter</li>
            </ul>
          </div>
          <PasswordField
            id="login-conf-pw"
            label="Confirm New Password:"
            value={confirmPw}
            onChange={setConfirmPw}
            visible={showConf}
            onToggleVisible={() => setShowConf((s) => !s)}
            autoComplete="new-password"
          />
          {confirmErr && (
            <p className="font-body font-light text-[12px] text-red-500">{confirmErr}</p>
          )}
          {pwErr && <p className="font-body font-light text-[12px] text-red-500">{pwErr}</p>}
          {pwOk && (
            <p className="font-body font-light text-[13px] text-[#4A7C59]">
              Password updated successfully.
            </p>
          )}

          <button
            type="submit"
            disabled={changePassword.isPending}
            className={cn(
              'h-11 px-10 bg-deep text-background rounded-none',
              'font-body font-light uppercase tracking-[0.2em] text-[12px]',
              'hover:bg-ink transition-colors disabled:opacity-40',
            )}
          >
            {changePassword.isPending ? 'Updating…' : 'update password'}
          </button>
        </form>
      </section>

      <div className="border-t border-muted my-8" />

      <button
        type="button"
        onClick={() => {
          setDeleteOpen(true)
          setDeleteConfirm('')
        }}
        className="font-body font-light text-[12px] text-muted-foreground hover:text-red-500 transition-colors duration-200"
      >
        Delete account
      </button>

      <DeleteAccountModal
        open={deleteOpen}
        confirmText={deleteConfirm}
        onConfirmChange={setDeleteConfirm}
        onClose={() => {
          setDeleteOpen(false)
          setDeleteConfirm('')
        }}
      />
    </div>
  )
}

function LockedField({
  label,
  value,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  placeholder?: string
  type?: string
}) {
  return (
    <div className="mb-4">
      <label className="font-body font-light text-[12px] text-umber block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly
        disabled
        className={cn(
          'bg-surface-raised border border-muted/50 text-muted-foreground',
          'h-12 px-4 w-full font-body font-light text-[14px]',
          'cursor-not-allowed rounded-none',
        )}
      />
    </div>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggleVisible,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  visible: boolean
  onToggleVisible: () => void
  autoComplete?: string
}) {
  return (
    <div>
      <label htmlFor={id} className="font-body font-light text-[12px] text-umber block mb-1">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-full h-12 border border-muted px-4 pr-12 rounded-none',
            'font-body font-light text-[14px] text-umber',
            'outline-none focus:border-umber',
          )}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-umber"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
