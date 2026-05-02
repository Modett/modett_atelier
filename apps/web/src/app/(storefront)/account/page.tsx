'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { useUpdateProfile } from '@/hooks/useAccount'
import { TITLE_OPTIONS } from '@/components/checkout/steps/InformationStep'
import type { TitleOption } from '@/store/checkout.store'
import { DeleteAccountModal } from '@/components/account/DeleteAccountModal'

const TITLE_LABELS: Record<TitleOption, string> = {
  Mr:   'Mr.',
  Ms:   'Ms.',
  Miss: 'Miss',
  Mrs:  'Mrs.',
}

export default function AccountPersonalDetailsPage() {
  const { user, isLoading }     = useSession()
  const updateProfile           = useUpdateProfile()

  const [titlePreference, setTitlePreference] = useState<TitleOption>('Mr')
  const [firstName, setFirstName]             = useState('')
  const [lastName, setLastName]               = useState('')
  const [dob, setDob]                         = useState('')
  const [newsletter, setNewsletter]           = useState(false)
  const [savedFlash, setSavedFlash]         = useState(false)
  const [deleteOpen, setDeleteOpen]         = useState(false)
  const [deleteConfirm, setDeleteConfirm]   = useState('')

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName)
    setLastName(user.lastName)
    setNewsletter(user.newsletterOptIn)
    if (user.dob) {
      const d = user.dob.includes('T') ? user.dob.slice(0, 10) : user.dob.slice(0, 10)
      setDob(d)
    } else {
      setDob('')
    }
  }, [user])

  const dirty = useMemo(() => {
    if (!user) return false
    const userDob = user.dob
      ? (user.dob.includes('T') ? user.dob.slice(0, 10) : user.dob.slice(0, 10))
      : ''
    const formDob = dob.trim()
    return (
      firstName !== user.firstName
      || lastName !== user.lastName
      || formDob !== userDob
    )
  }, [user, firstName, lastName, dob])

  function handleSaveProfile() {
    if (!user || !dirty) return
    updateProfile.mutate(
      {
        firstName,
        lastName,
        dob:        dob.trim() ? dob.trim() : null,
        dobConsent: !!dob.trim(),
      },
      {
        onSuccess: () => {
          setSavedFlash(true)
          setTimeout(() => setSavedFlash(false), 2000)
        },
      },
    )
  }

  function handleNewsletterToggle() {
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

  if (isLoading || !user) {
    return <div className="h-40 bg-muted animate-pulse rounded-none" />
  }

  return (
    <div className="max-w-xl">
      <h1 className="font-display font-bold text-[26px] text-umber mb-8">
        Personal Details
      </h1>

      <section>
        <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber mb-5">
          Your Details
        </p>
        <div className="mb-5">
          <p className="font-body font-light text-[12px] text-umber mb-2">Title</p>
          <div className="flex flex-wrap gap-2">
            {TITLE_OPTIONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTitlePreference(t)}
                className={cn(
                  'border px-4 py-2 cursor-pointer font-body font-light text-[12px] rounded-none transition-colors',
                  titlePreference === t
                    ? 'bg-umber text-background border-umber'
                    : 'border-muted text-umber hover:border-umber',
                )}
              >
                {TITLE_LABELS[t]}
              </button>
            ))}
          </div>
          {/* TODO: wire when API supports title */}
        </div>

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
          <label
            htmlFor="account-dob"
            className="font-body font-light text-[12px] text-umber block mb-1"
          >
            Date of birth (optional)
          </label>
          <input
            id="account-dob"
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className={cn(
              'w-full h-12 border border-muted px-4 rounded-none',
              'font-body font-light text-[14px] text-graphite',
              'outline-none focus:border-umber',
            )}
          />
          <p className="font-body font-light text-[11px] text-umber mt-2">
            By providing your date of birth you agree to our privacy policy.
          </p>
        </div>

        <button
          type="button"
          disabled={!dirty || updateProfile.isPending}
          onClick={handleSaveProfile}
          className={cn(
            'mt-6 h-11 px-10 bg-deep text-background rounded-none',
            'font-body font-light uppercase tracking-[0.2em] text-[12px]',
            'hover:bg-ink transition-colors disabled:opacity-40',
          )}
        >
          {updateProfile.isPending
            ? 'Saving...'
            : savedFlash
              ? 'Saved ✓'
              : 'Save Details'}
        </button>
      </section>

      <div className="border-t border-muted my-8" />

      <section>
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

      <div className="border-t border-muted my-8" />

      <section>
        <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber mb-2">
          Email address
        </p>
        <p className="font-body font-light text-[14px] text-graphite">{user.email}</p>
        <p className="font-body font-light text-[13px] text-umber mt-2">
          To change your email address, visit{' '}
          <Link href="/account/login" className="text-umber underline underline-offset-2">
            Login Details
          </Link>
        </p>
      </section>

      <div className="pt-8 border-t border-muted mt-8">
        <button
          type="button"
          onClick={() => {
            setDeleteOpen(true)
            setDeleteConfirm('')
          }}
          className="font-body font-light text-[12px] text-umber hover:text-red-500"
        >
          Delete my account
        </button>
      </div>

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
          'font-body font-light text-[14px] text-graphite',
          'outline-none focus:border-umber',
        )}
      />
    </div>
  )
}
