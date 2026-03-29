'use client'

import { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { useUpdateProfile, useChangePassword } from '@/hooks/useAccount'
import { useLogout } from '@/hooks/useLogout'
import type { ApiError } from '@/types'

export default function AccountProfilePage() {
  const { user, isLoading }     = useSession()
  const updateProfile           = useUpdateProfile()
  const changePassword          = useChangePassword()
  const logout                  = useLogout()

  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const [pwOpen, setPwOpen]         = useState(false)
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [pwMsg, setPwMsg]           = useState<string | null>(null)
  const [pwErr, setPwErr]           = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName)
    setLastName(user.lastName)
    setNewsletter(user.newsletterOptIn)
  }, [user])

  const dirty = useMemo(() => {
    if (!user) return false
    return (
      firstName !== user.firstName
      || lastName !== user.lastName
    )
  }, [user, firstName, lastName])

  async function handleSaveProfile() {
    if (!user || !dirty) return
    updateProfile.mutate(
      { firstName, lastName },
      {
        onSuccess: () => {
          setSavedFlash(true)
          setTimeout(() => setSavedFlash(false), 2000)
        },
      },
    )
  }

  async function handleNewsletterToggle() {
    if (!user) return
    const next = !newsletter
    setNewsletter(next)
    updateProfile.mutate(
      { newsletterOptIn: next },
      {
        onError: () => {
          setNewsletter(!next)
        },
      },
    )
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPwErr(null)
    setPwMsg(null)
    try {
      await changePassword.mutateAsync({
        currentPassword: currentPw,
        newPassword:     newPw,
      })
      setPwMsg('Password updated. Please log in again.')
      setCurrentPw('')
      setNewPw('')
      setTimeout(() => {
        logout.mutate()
      }, 1200)
    } catch (err) {
      const apiErr = err as unknown as ApiError
      setPwErr(apiErr.message ?? 'Could not update password.')
    }
  }

  if (isLoading || !user) {
    return <div className="h-40 bg-muted animate-pulse rounded-none" />
  }

  return (
    <div className="max-w-xl space-y-10">
      <h1 className="font-display font-bold text-[24px] text-umber">
        Profile
      </h1>

      <section>
        <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Personal details
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Field
            label="First name"
            value={firstName}
            onChange={setFirstName}
            autoComplete="given-name"
          />
          <Field
            label="Last name"
            value={lastName}
            onChange={setLastName}
            autoComplete="family-name"
          />
        </div>
        <div className="mb-2">
          <p className="font-body font-light text-[12px] text-umber mb-1">Email</p>
          <p className="font-body font-light text-[14px] text-muted-foreground">{user.email}</p>
          <p className="font-body font-light text-[12px] text-muted-foreground mt-2">
            To change your email, please contact customer support.
          </p>
        </div>
        <button
          type="button"
          disabled={!dirty || updateProfile.isPending}
          onClick={handleSaveProfile}
          className={cn(
            'mt-6 h-11 px-8 bg-deep text-background rounded-none',
            'font-body font-light uppercase tracking-[0.2em] text-[12px]',
            'hover:bg-ink transition-colors disabled:opacity-40',
          )}
        >
          {savedFlash ? 'Saved ✓' : 'Save Changes'}
        </button>
      </section>

      <section>
        <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
          Newsletter
        </h2>
        <div className="flex items-center justify-between gap-4">
          <p className="font-body font-light text-[13px] text-umber flex-1">
            Receive news and exclusive offers by email
          </p>
          <button
            type="button"
            role="switch"
            aria-checked={newsletter}
            onClick={handleNewsletterToggle}
            className={cn(
              'relative w-11 h-6 shrink-0 transition-colors duration-200 rounded-full p-0.5',
              newsletter ? 'bg-umber' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'block w-5 h-5 bg-background rounded-full shadow-sm transition-transform duration-200',
                newsletter ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        </div>
      </section>

      <section>
        <button
          type="button"
          onClick={() => setPwOpen((o) => !o)}
          className="font-body font-light text-[13px] text-umber underline"
        >
          Change password
        </button>
        {pwOpen && (
          <form onSubmit={handlePassword} className="mt-4 space-y-4 border border-muted p-4">
            <Field
              label="Current password"
              type="password"
              value={currentPw}
              onChange={setCurrentPw}
              autoComplete="current-password"
            />
            <Field
              label="New password"
              type="password"
              value={newPw}
              onChange={setNewPw}
              autoComplete="new-password"
            />
            {pwErr && <p className="text-red-500 text-[12px] font-body">{pwErr}</p>}
            {pwMsg && <p className="text-[#4A7C59] text-[12px] font-body">{pwMsg}</p>}
            <button
              type="submit"
              disabled={changePassword.isPending}
              className={cn(
                'h-10 px-6 bg-deep text-background rounded-none',
                'font-body font-light text-[12px] uppercase tracking-[0.15em]',
                'disabled:opacity-40',
              )}
            >
              Update password
            </button>
          </form>
        )}
      </section>

      <section className="pt-8 border-t border-muted">
        <button
          type="button"
          onClick={() => {
            setDeleteOpen(true)
            setDeleteConfirm('')
          }}
          className="font-body font-light text-[12px] text-muted-foreground hover:text-red-500"
        >
          Delete my account
        </button>
      </section>

      {deleteOpen && (
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
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
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
                disabled={deleteConfirm !== 'DELETE'}
                onClick={() => setDeleteOpen(false)}
                className={cn(
                  'flex-1 h-10 bg-red-500 text-background font-body text-[12px] uppercase tracking-[0.1em] rounded-none',
                  'disabled:opacity-30',
                )}
              >
                Delete Account
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
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
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
}) {
  return (
    <div>
      <label className="font-body font-light text-[12px] text-umber block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-12 border border-muted px-4 rounded-none',
          'font-body font-light text-[14px] text-umber',
          'outline-none focus:border-umber',
        )}
      />
    </div>
  )
}
