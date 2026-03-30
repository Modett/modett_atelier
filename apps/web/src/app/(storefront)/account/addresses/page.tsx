'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import {
  useSavedAddresses,
  useAddAddress,
  useUpdateAddress,
  useDeleteAddress,
  type SavedAddressRow,
} from '@/hooks/useAccount'
import {
  addressSchema,
  makeEmptyAddressFormData,
  TITLE_OPTIONS,
  ADDRESS_COUNTRIES,
  type AddressFormData,
} from '@/components/checkout/steps/InformationStep'
import type { TitleOption } from '@/store/checkout.store'

const DIAL_OPTIONS: { prefix: string; label: string; countries: string[] }[] = [
  { prefix: '+94',  label: '+94 LK', countries: ['LK'] },
  { prefix: '+65',  label: '+65 SG', countries: ['SG'] },
  { prefix: '+1',   label: '+1 US', countries: ['US'] },
  { prefix: '+44',  label: '+44 GB', countries: ['GB'] },
  { prefix: '+61',  label: '+61 AU', countries: ['AU'] },
  { prefix: '+81',  label: '+81 JP', countries: ['JP'] },
  { prefix: '+971', label: '+971 AE', countries: ['AE'] },
  { prefix: '+91',  label: '+91 IN', countries: ['IN'] },
  { prefix: '+33',  label: '+33 FR', countries: ['FR'] },
  { prefix: '+49',  label: '+49 DE', countries: ['DE'] },
]

function defaultDialPrefix(countryCode: string): string {
  const hit = DIAL_OPTIONS.find((o) => o.countries.includes(countryCode))
  return hit?.prefix ?? '+94'
}

function splitPhoneForEdit(phone: string, countryCode: string): { prefix: string; national: string } {
  const p = phone.replace(/\s/g, '')
  if (!p) return { prefix: defaultDialPrefix(countryCode), national: '' }
  const sorted = [...DIAL_OPTIONS].sort((a, b) => b.prefix.length - a.prefix.length)
  for (const opt of sorted) {
    if (p.startsWith(opt.prefix)) {
      return { prefix: opt.prefix, national: p.slice(opt.prefix.length) }
    }
  }
  if (p.startsWith('0')) {
    return { prefix: defaultDialPrefix(countryCode), national: p }
  }
  return { prefix: defaultDialPrefix(countryCode), national: p }
}

function combinePhoneNumber(prefix: string, national: string): string {
  const n = national.trim().replace(/\s/g, '')
  if (n.startsWith('+')) return n
  if (n.startsWith('0')) return n
  const digits = n.replace(/\D/g, '')
  return `${prefix}${digits}`
}

function countryName(code: string): string {
  return ADDRESS_COUNTRIES.find((c) => c.code === code)?.name ?? code
}

const TITLE_LABELS: Record<TitleOption, string> = {
  Mr:   'Mr.',
  Ms:   'Ms.',
  Miss: 'Miss',
  Mrs:  'Mrs.',
}

export default function AccountAddressesPage() {
  const { data, isLoading }     = useSavedAddresses()
  const addAddress              = useAddAddress()
  const updateAddress           = useUpdateAddress()
  const deleteAddress           = useDeleteAddress()
  const [mode, setMode]         = useState<'idle' | 'add' | 'edit'>('idle')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel]       = useState('')
  const [form, setForm]         = useState<AddressFormData>(() => makeEmptyAddressFormData())
  const [province, setProvince] = useState('')
  const [phonePrefix, setPhonePrefix] = useState('+94')
  const [phoneNational, setPhoneNational] = useState('')
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setForm(makeEmptyAddressFormData())
    setLabel('')
    setProvince('')
    setPhonePrefix('+94')
    setPhoneNational('')
    setErrors({})
    setEditingId(null)
    setMode('idle')
  }, [])

  function openAdd() {
    setMode('add')
    setEditingId(null)
    const empty = makeEmptyAddressFormData()
    setForm(empty)
    setPhonePrefix(defaultDialPrefix(empty.countryCode))
    setPhoneNational('')
    setProvince('')
    setLabel('')
    setErrors({})
  }

  function openEdit(row: SavedAddressRow) {
    setMode('edit')
    setEditingId(row.id)
    setLabel(row.label ?? '')
    const f = savedJsonToForm(row.address_json, row.country_code)
    setForm(f)
    setProvince(String(row.address_json.province ?? row.address_json.state ?? ''))
    const sp = splitPhoneForEdit(String(f.phone ?? ''), row.country_code)
    setPhonePrefix(sp.prefix)
    setPhoneNational(sp.national)
    setErrors({})
  }

  function updateField(field: keyof AddressFormData, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'countryCode') {
        setPhonePrefix(defaultDialPrefix(value))
      }
      return next
    })
    setErrors((prev) => {
      const n = { ...prev }
      delete n[field]
      return n
    })
  }

  async function saveAddress() {
    const phoneFull = combinePhoneNumber(phonePrefix, phoneNational)
    const merged: AddressFormData = { ...form, phone: phoneFull }
    const parsed = addressSchema.safeParse(merged)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      parsed.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    const addressJson: Record<string, unknown> = {
      title:        form.title,
      firstName:    form.firstName,
      lastName:     form.lastName,
      phone:        phoneFull,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2 || undefined,
      city:         form.city,
      postcode:     form.postcode,
    }
    if (province.trim()) {
      addressJson.province = province.trim()
    }

    try {
      if (mode === 'edit' && editingId) {
        await updateAddress.mutateAsync({
          id: editingId,
          label:       label || undefined,
          addressJson,
          countryCode: form.countryCode,
        })
      } else {
        await addAddress.mutateAsync({
          label:       label || undefined,
          addressJson,
          countryCode: form.countryCode,
          isDefault:   false,
        })
      }
      resetForm()
    } catch {
      setErrors({ form: 'Could not save address. Please try again.' })
    }
  }

  async function setAsDefault(id: string) {
    setSettingDefaultId(id)
    try {
      await updateAddress.mutateAsync({ id, isDefault: true })
    } finally {
      setSettingDefaultId(null)
    }
  }

  if (isLoading) {
    return <div className="h-40 bg-muted animate-pulse rounded-none" />
  }

  const list = data ?? []

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-display font-bold text-[24px] text-umber">
          Addresses
        </h1>
        <button
          type="button"
          onClick={openAdd}
          className={cn(
            'h-10 px-6 bg-deep text-background rounded-none shrink-0 w-full sm:w-auto',
            'font-body font-light uppercase tracking-[0.2em] text-[12px] hover:bg-ink transition-colors',
          )}
        >
          Add Address
        </button>
      </div>

      {list.length === 0 && mode === 'idle' ? (
        <p className="font-body font-light text-[14px] text-muted-foreground mb-8">
          No saved addresses yet.
        </p>
      ) : (
        <div className="mb-8">
          {list.map((row) => (
            <article key={row.id} className="border-b border-muted py-5">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    'font-body text-[13px]',
                    row.is_default
                      ? 'font-medium text-umber'
                      : 'font-light text-muted-foreground',
                  )}
                >
                  {row.is_default ? 'Default address' : row.label ?? 'Saved address'}
                </p>
              </div>
              <div className="mt-2">
                <SavedAddressLines json={row.address_json} countryCode={row.country_code} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-5">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className={cn(
                    'font-body font-light text-[11px] uppercase tracking-[0.15em]',
                    'text-umber underline underline-offset-2 hover:text-ink',
                  )}
                >
                  Edit address
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(row.id)}
                  className={cn(
                    'font-body font-light text-[11px] uppercase tracking-[0.15em]',
                    'text-muted-foreground underline underline-offset-2 hover:text-red-500',
                  )}
                >
                  Delete
                </button>
                {!row.is_default && (
                  <button
                    type="button"
                    disabled={settingDefaultId === row.id}
                    onClick={() => setAsDefault(row.id)}
                    className={cn(
                      'font-body font-light text-[11px] uppercase tracking-[0.15em]',
                      'text-muted-foreground underline underline-offset-2 hover:text-umber',
                      'disabled:opacity-50',
                    )}
                  >
                    {settingDefaultId === row.id ? 'Setting…' : 'Set as default'}
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <div className="border-t border-muted pt-8">
          <h2 className="font-body font-medium text-[15px] text-umber mb-5">
            {mode === 'add' ? 'Enter new delivery address' : 'Edit address'}
          </h2>
          <p className="font-body font-light text-[11px] text-muted-foreground mb-4">
            * Required fields
          </p>

          <div className="mb-5">
            <label className="font-body font-light text-[12px] text-umber block mb-2">
              Address label (optional)
            </label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Home, Office…"
              className={cn(
                'w-full h-12 px-4 border border-muted rounded-none',
                'font-body font-light text-[14px] text-umber',
                'outline-none focus:border-umber',
              )}
            />
          </div>

          <div className="mb-5">
            <p className="font-body font-light text-[12px] text-umber mb-2">Title</p>
            <div className="flex flex-wrap gap-2">
              {TITLE_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => updateField('title', t)}
                  className={cn(
                    'border px-4 py-2 cursor-pointer font-body font-light text-[12px] rounded-none transition-colors',
                    form.title === t
                      ? 'bg-umber text-background border-umber'
                      : 'border-muted text-muted-foreground hover:border-umber',
                  )}
                >
                  {TITLE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput
              label="First name"
              required
              value={form.firstName}
              onChange={(v) => updateField('firstName', v)}
              autoComplete="given-name"
              error={errors.firstName}
            />
            <FormInput
              label="Last name"
              required
              value={form.lastName}
              onChange={(v) => updateField('lastName', v)}
              autoComplete="family-name"
              error={errors.lastName}
            />
          </div>

          <div className="mb-4">
            <label className="font-body font-light text-[12px] text-umber block mb-1">
              Phone number <span className="text-red-400">*</span>
            </label>
            <div className="flex gap-2">
              <select
                value={phonePrefix}
                onChange={(e) => setPhonePrefix(e.target.value)}
                className={cn(
                  'w-28 flex-shrink-0 h-12 px-2 border border-muted rounded-none bg-background',
                  'font-body font-light text-[12px] text-umber',
                  'outline-none focus:border-umber',
                )}
              >
                {DIAL_OPTIONS.map((o) => (
                  <option key={o.label} value={o.prefix}>
                    {o.label}
                  </option>
                ))}
              </select>
              <input
                type="tel"
                value={phoneNational}
                onChange={(e) => setPhoneNational(e.target.value)}
                className={cn(
                  'flex-1 h-12 px-4 border border-muted rounded-none',
                  'font-body font-light text-[14px] text-umber',
                  'outline-none focus:border-umber',
                )}
                autoComplete="tel-national"
              />
            </div>
            {errors.phone && (
              <p className="font-body text-[11px] text-red-500 mt-1">{errors.phone}</p>
            )}
          </div>

          <FormInput
            label="Address"
            required
            value={form.addressLine1}
            onChange={(v) => updateField('addressLine1', v)}
            autoComplete="address-line1"
            error={errors.addressLine1}
            className="mb-4"
          />

          <FormInput
            label="Building/Apartment/Villa"
            value={form.addressLine2}
            onChange={(v) => updateField('addressLine2', v)}
            autoComplete="address-line2"
            error={errors.addressLine2}
            className="mb-4"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput
              label="Post code"
              required
              value={form.postcode}
              onChange={(v) => updateField('postcode', v)}
              autoComplete="postal-code"
              error={errors.postcode}
            />
            <FormInput
              label="City"
              required
              value={form.city}
              onChange={(v) => updateField('city', v)}
              autoComplete="address-level2"
              error={errors.city}
            />
          </div>

          <FormInput
            label="Province/State"
            value={province}
            onChange={setProvince}
            autoComplete="address-level1"
            className="mb-4"
          />

          <div className="mb-4">
            <label className="font-body font-light text-[12px] text-umber block mb-1">
              Country/Region <span className="text-red-400">*</span>
            </label>
            <select
              value={form.countryCode}
              onChange={(e) => updateField('countryCode', e.target.value)}
              autoComplete="country"
              className={cn(
                'w-full h-12 px-4 border border-muted rounded-none bg-background',
                'font-body font-light text-[14px] text-umber',
                'outline-none focus:border-umber',
                errors.countryCode ? 'border-red-400' : '',
              )}
            >
              <option value="">Select country</option>
              {ADDRESS_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.countryCode && (
              <p className="font-body text-[11px] text-red-500 mt-1">{errors.countryCode}</p>
            )}
          </div>

          {errors.form && (
            <p className="text-red-500 text-[12px] font-body mb-4">{errors.form}</p>
          )}

          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={saveAddress}
              disabled={addAddress.isPending || updateAddress.isPending}
              className={cn(
                'h-11 px-8 bg-deep text-background rounded-none',
                'font-body font-light uppercase tracking-[0.2em] text-[12px]',
                'hover:bg-ink disabled:opacity-40',
              )}
            >
              Save details
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="font-body font-light text-[12px] text-muted-foreground lowercase hover:text-umber"
            >
              cancel
            </button>
          </div>
        </div>
      )}

      {deleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-graphite/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="del-addr-title"
        >
          <div className="bg-background border border-muted p-6 max-w-sm w-full">
            <h2 id="del-addr-title" className="font-display font-bold text-[18px] text-umber mb-3">
              Remove this address?
            </h2>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={async () => {
                  if (!deleteId) return
                  await deleteAddress.mutateAsync(deleteId)
                  setDeleteId(null)
                }}
                className="flex-1 h-10 bg-umber text-background font-body text-[12px] uppercase tracking-[0.15em] rounded-none"
              >
                Remove
              </button>
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="flex-1 h-10 border border-muted font-body text-[12px] text-umber rounded-none"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormInput({
  label,
  required,
  value,
  onChange,
  autoComplete,
  error,
  className,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  error?: string
  className?: string
}) {
  return (
    <div className={className}>
      <label className="font-body font-light text-[12px] text-umber block mb-1">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <input
        type="text"
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-12 px-4 border border-muted rounded-none',
          'font-body font-light text-[14px] text-umber',
          'outline-none focus:border-umber',
          error ? 'border-red-400' : '',
        )}
      />
      {error && <p className="font-body text-[11px] text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function savedJsonToForm(
  json: Record<string, unknown>,
  countryCode: string,
): AddressFormData {
  const title = (json.title as TitleOption) ?? 'Mr'
  return {
    title,
    firstName:    String(json.firstName ?? ''),
    lastName:     String(json.lastName ?? ''),
    phone:        String(json.phone ?? ''),
    addressLine1: String(json.addressLine1 ?? json.line1 ?? ''),
    addressLine2: String(json.addressLine2 ?? json.line2 ?? json.unit ?? ''),
    city:         String(json.city ?? ''),
    countryCode:  String(json.countryCode ?? countryCode ?? 'LK'),
    postcode:     String(json.postcode ?? json.postal_code ?? ''),
  }
}

function SavedAddressLines({
  json,
  countryCode,
}: {
  json: Record<string, unknown>
  countryCode: string
}) {
  const f = savedJsonToForm(json, countryCode)
  return (
    <div className="font-body font-light text-[13px] text-umber space-y-0.5">
      {(f.firstName || f.lastName) && (
        <p>{`${f.firstName} ${f.lastName}`.trim()}</p>
      )}
      {f.addressLine1 && <p>{f.addressLine1}</p>}
      {f.addressLine2 && <p>{f.addressLine2}</p>}
      {(f.city || f.postcode) && (
        <p>{[f.city, f.postcode].filter(Boolean).join(' ')}</p>
      )}
      {json.province || json.state ? (
        <p>{String(json.province ?? json.state)}</p>
      ) : null}
      <p>{countryName(countryCode)}</p>
    </div>
  )
}
