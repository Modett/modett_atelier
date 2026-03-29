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
  SharedAddressForm,
  addressSchema,
  makeEmptyAddressFormData,
  TITLE_OPTIONS,
  type AddressFormData,
} from '@/components/checkout/steps/InformationStep'
import type { TitleOption } from '@/store/checkout.store'

export default function AccountAddressesPage() {
  const { data, isLoading }     = useSavedAddresses()
  const addAddress              = useAddAddress()
  const updateAddress           = useUpdateAddress()
  const deleteAddress           = useDeleteAddress()
  const [mode, setMode]         = useState<'idle' | 'add' | 'edit'>('idle')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [label, setLabel]       = useState('')
  const [form, setForm]         = useState<AddressFormData>(() => makeEmptyAddressFormData())
  const [errors, setErrors]     = useState<Record<string, string>>({})
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setForm(makeEmptyAddressFormData())
    setLabel('')
    setErrors({})
    setEditingId(null)
    setMode('idle')
  }, [])

  function openAdd() {
    setMode('add')
    setEditingId(null)
    setForm(makeEmptyAddressFormData())
    setLabel('')
    setErrors({})
  }

  function openEdit(row: SavedAddressRow) {
    setMode('edit')
    setEditingId(row.id)
    setLabel(row.label ?? '')
    setForm(savedJsonToForm(row.address_json, row.country_code))
    setErrors({})
  }

  function updateField(field: keyof AddressFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const n = { ...prev }
      delete n[field]
      return n
    })
  }

  async function saveAddress() {
    const parsed = addressSchema.safeParse(form)
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
      phone:        form.phone,
      addressLine1: form.addressLine1,
      addressLine2: form.addressLine2 || undefined,
      city:         form.city,
      postcode:     form.postcode,
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

  if (isLoading) {
    return <div className="h-40 bg-muted animate-pulse rounded-none" />
  }

  const list = data ?? []

  return (
    <div>
      <h1 className="font-display font-bold text-[24px] text-umber mb-8">
        Addresses
      </h1>

      {list.length === 0 && mode === 'idle' ? (
        <div className="text-center py-12 border border-muted px-6 mb-6">
          <p className="font-body font-light text-[14px] text-muted-foreground mb-6">
            No saved addresses yet.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className={cn(
              'h-11 px-10 bg-deep text-background rounded-none',
              'font-body font-light uppercase tracking-[0.25em] text-[12px]',
              'hover:bg-ink transition-colors',
            )}
          >
            Add your first address
          </button>
        </div>
      ) : (
        <ul className="space-y-4 mb-8">
          {list.map((row) => (
            <li
              key={row.id}
              className="border border-muted p-5 relative"
            >
              {row.is_default && (
                <span
                  className={cn(
                    'absolute top-4 right-4',
                    'bg-surface-raised text-umber text-[11px] uppercase tracking-[0.1em] px-2 py-1',
                  )}
                >
                  Default
                </span>
              )}
              <p className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                {row.label ?? 'Saved address'}
                {row.is_default && (
                  <span className="text-umber ml-2" aria-label="Default address">
                    ★
                  </span>
                )}
              </p>
              <SavedAddressLines json={row.address_json} countryCode={row.country_code} />
              <div className="flex gap-4 mt-4">
                <button
                  type="button"
                  onClick={() => openEdit(row)}
                  className="font-body font-light text-[12px] text-umber underline"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteId(row.id)}
                  className="font-body font-light text-[12px] text-muted-foreground hover:text-red-500"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {mode === 'idle' && list.length > 0 && (
        <button
          type="button"
          onClick={openAdd}
          className={cn(
            'h-11 px-10 border border-umber text-umber rounded-none mb-6',
            'font-body font-light uppercase tracking-[0.25em] text-[12px]',
            'hover:bg-umber hover:text-background transition-all duration-200',
          )}
        >
          Add New Address
        </button>
      )}

      {(mode === 'add' || mode === 'edit') && (
        <div
          className={cn(
            'border border-muted overflow-hidden transition-all duration-300',
            'max-h-[2000px]',
          )}
        >
          <div className="p-6 space-y-6">
            <h2 className="font-body font-medium text-[16px] text-umber">
              {mode === 'add' ? 'New address' : 'Edit address'}
            </h2>
            <div>
              <label className="font-body font-light text-[12px] text-umber block mb-2">
                Label (optional)
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
            <div>
              <p className="font-body font-light text-[12px] text-umber mb-2">
                Title <span className="text-red-400">*</span>
              </p>
              <div className="flex flex-wrap gap-4">
                {TITLE_OPTIONS.map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <span
                      className={cn(
                        'relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                        form.title === t ? 'border-umber' : 'border-muted-foreground',
                      )}
                    >
                      {form.title === t && (
                        <span className="w-2 h-2 rounded-full bg-umber" />
                      )}
                    </span>
                    <input
                      type="radio"
                      name="addr-title"
                      value={t}
                      checked={form.title === t}
                      onChange={() => updateField('title', t)}
                      className="sr-only"
                    />
                    <span className="font-body font-light text-[13px] text-umber">{t}.</span>
                  </label>
                ))}
              </div>
            </div>
            <SharedAddressForm
              data={form}
              errors={errors}
              onChange={updateField}
              prefix="saved"
            />
            {errors.form && (
              <p className="text-red-500 text-[12px] font-body">{errors.form}</p>
            )}
            <div className="flex flex-wrap gap-4 items-center">
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
                Save Address
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="font-body font-light text-[12px] text-muted-foreground hover:text-umber"
              >
                Cancel
              </button>
            </div>
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
  const lines: string[] = []
  if (f.firstName || f.lastName) {
    lines.push(`${f.firstName} ${f.lastName}`.trim())
  }
  if (f.addressLine1) lines.push(f.addressLine1)
  if (f.addressLine2) lines.push(f.addressLine2)
  if (f.city || f.postcode) {
    lines.push([f.city, f.postcode].filter(Boolean).join(', '))
  }
  if (f.phone) lines.push(f.phone)
  lines.push(countryCode)
  return (
    <div className="font-body font-light text-[13px] text-umber space-y-1">
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </div>
  )
}
