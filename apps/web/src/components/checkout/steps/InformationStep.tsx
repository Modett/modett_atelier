'use client'

import { useState, useEffect } from 'react'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCheckoutStore, type TitleOption, type ShippingAddress } from '@/store/checkout.store'
import { useSession } from '@/hooks/useSession'
import { useCountry, getCountryFromCookie } from '@/hooks/useCountry'
import type { ApiError } from '@/types'

const TITLE_OPTIONS: TitleOption[] = ['Mr', 'Ms', 'Miss', 'Mrs']

const COUNTRIES = [
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SG', name: 'Singapore' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'IN', name: 'India' },
]

const ADDRESS_LINE_MAX = 120
const ADDRESS_LINE2_MAX = 100

interface PhoneRule {
  pattern: RegExp
  hint: string
  example: string
  maxLength: number
  filter: (value: string) => string
}

interface PostcodeRule {
  pattern: RegExp
  hint: string
  example: string
  maxLength: number
  filter: (value: string) => string
}

function filterPhoneInput(value: string): string {
  return value.replace(/[^0-9+\s\-()]/g, '')
}

const PHONE_RULES: Record<string, PhoneRule> = {
  LK: { pattern: /^(\+94|0)[0-9]{9}$/, hint: '0XXXXXXXXX or +94XXXXXXXXX', example: '0712345678', maxLength: 12, filter: filterPhoneInput },
  SG: { pattern: /^(\+65)?[689][0-9]{7}$/, hint: '8-digit number (6/8/9 XXXXXXX) or +65XXXXXXXX', example: '91234567', maxLength: 11, filter: filterPhoneInput },
  US: { pattern: /^(\+1)?[2-9][0-9]{9}$/, hint: '10-digit number or +1XXXXXXXXXX', example: '2125551234', maxLength: 12, filter: filterPhoneInput },
  GB: { pattern: /^(\+44|0)[0-9]{9,10}$/, hint: '0XXXXXXXXXX or +44XXXXXXXXXX', example: '07911123456', maxLength: 13, filter: filterPhoneInput },
  AU: { pattern: /^(\+61|0)[0-9]{9}$/, hint: '0XXXXXXXXX or +61XXXXXXXXX', example: '0412345678', maxLength: 12, filter: filterPhoneInput },
  CA: { pattern: /^(\+1)?[2-9][0-9]{9}$/, hint: '10-digit number or +1XXXXXXXXXX', example: '4165551234', maxLength: 12, filter: filterPhoneInput },
  DE: { pattern: /^(\+49|0)[0-9]{7,11}$/, hint: '0XXXXXXXXX or +49XXXXXXXXX', example: '030123456', maxLength: 14, filter: filterPhoneInput },
  FR: { pattern: /^(\+33|0)[1-9][0-9]{8}$/, hint: '0XXXXXXXXX or +33XXXXXXXXX', example: '0612345678', maxLength: 12, filter: filterPhoneInput },
  JP: { pattern: /^(\+81|0)[0-9]{9,10}$/, hint: '0XXXXXXXXXX or +81XXXXXXXXXX', example: '09012345678', maxLength: 13, filter: filterPhoneInput },
  AE: { pattern: /^(\+971|0)[0-9]{9}$/, hint: '0XXXXXXXXX or +971XXXXXXXXX', example: '0501234567', maxLength: 13, filter: filterPhoneInput },
  IN: { pattern: /^(\+91)?[6-9][0-9]{9}$/, hint: '10-digit number or +91XXXXXXXXXX', example: '9876543210', maxLength: 13, filter: filterPhoneInput },
}

const FALLBACK_PHONE_RULE: PhoneRule = {
  pattern: /^\+?[\d\s\-()+]{7,20}$/,
  hint: 'Include country code if dialling internationally',
  example: '+1234567890',
  maxLength: 20,
  filter: filterPhoneInput,
}

function getPhoneRule(countryCode: string): PhoneRule {
  return PHONE_RULES[countryCode] ?? FALLBACK_PHONE_RULE
}

const POSTCODE_RULES: Record<string, PostcodeRule> = {
  LK: { pattern: /^\d{5}$/, hint: '5-digit code', example: '10120', maxLength: 5, filter: (v) => v.replace(/[^0-9]/g, '') },
  SG: { pattern: /^\d{6}$/, hint: '6-digit postal code', example: '238859', maxLength: 6, filter: (v) => v.replace(/[^0-9]/g, '') },
  US: { pattern: /^\d{5}(-\d{4})?$/, hint: '5 digits or ZIP+4 (e.g. 10001-1234)', example: '10001', maxLength: 10, filter: (v) => v.replace(/[^0-9\-]/g, '') },
  GB: { pattern: /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i, hint: 'e.g. SW1A 1AA', example: 'SW1A 1AA', maxLength: 8, filter: (v) => v.replace(/[^A-Z0-9\s]/gi, '').toUpperCase() },
  AU: { pattern: /^\d{4}$/, hint: '4-digit postcode', example: '2000', maxLength: 4, filter: (v) => v.replace(/[^0-9]/g, '') },
  CA: { pattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, hint: 'A1A 1A1 format', example: 'M5V 3A8', maxLength: 7, filter: (v) => v.replace(/[^A-Z0-9\s]/gi, '').toUpperCase() },
  DE: { pattern: /^\d{5}$/, hint: '5-digit PLZ', example: '10115', maxLength: 5, filter: (v) => v.replace(/[^0-9]/g, '') },
  FR: { pattern: /^\d{5}$/, hint: '5-digit code postal', example: '75001', maxLength: 5, filter: (v) => v.replace(/[^0-9]/g, '') },
  JP: { pattern: /^\d{3}-?\d{4}$/, hint: '7 digits or XXX-XXXX', example: '100-0001', maxLength: 8, filter: (v) => v.replace(/[^0-9\-]/g, '') },
  AE: { pattern: /^\d{5,6}$/, hint: '5 or 6 digits', example: '00000', maxLength: 6, filter: (v) => v.replace(/[^0-9]/g, '') },
  IN: { pattern: /^\d{6}$/, hint: '6-digit PIN code', example: '400001', maxLength: 6, filter: (v) => v.replace(/[^0-9]/g, '') },
}

const FALLBACK_POSTCODE_RULE: PostcodeRule = {
  pattern: /^[A-Z0-9\s\-]{3,10}$/i,
  hint: '3–10 alphanumeric characters',
  example: '',
  maxLength: 10,
  filter: (v) => v.replace(/[^A-Z0-9\s\-]/gi, '').toUpperCase(),
}

function getPostcodeRule(countryCode: string): PostcodeRule {
  return POSTCODE_RULES[countryCode] ?? FALLBACK_POSTCODE_RULE
}

function getPostcodeLabel(countryCode: string): string {
  switch (countryCode) {
    case 'LK': return 'Zip Code'
    case 'SG': return 'Postal Code'
    default: return 'Zip / Postal Code'
  }
}

function validateFieldRealtime(field: 'phone' | 'postcode', data: AddressFormData): string | undefined {
  if (field === 'phone') {
    if (!data.phone.trim()) return 'Phone is required'
    if (!data.countryCode) return undefined
    const rule = getPhoneRule(data.countryCode)
    if (!rule.pattern.test(data.phone.replace(/\s/g, ''))) {
      return `Expected: ${rule.hint}`
    }
  }
  if (field === 'postcode') {
    if (!data.postcode.trim()) return 'Postcode is required'
    if (!data.countryCode) return undefined
    const rule = getPostcodeRule(data.countryCode)
    if (!rule.pattern.test(data.postcode.trim())) {
      return `Expected: ${rule.hint}`
    }
  }
  return undefined
}

const baseAddressSchema = z.object({
  title: z.enum(['Mr', 'Ms', 'Miss', 'Mrs']),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().min(1, 'Phone is required'),
  addressLine1: z.string().min(1, 'Address is required').max(ADDRESS_LINE_MAX, `Address Line 1 must be ${ADDRESS_LINE_MAX} characters or less`),
  addressLine2: z.string().max(ADDRESS_LINE2_MAX, `Address Line 2 must be ${ADDRESS_LINE2_MAX} characters or less`).optional(),
  city: z.string().min(1, 'City is required').max(100),
  countryCode: z.string().length(2, 'Please select a country'),
  postcode: z.string().min(4, 'Postcode must be at least 4 characters').max(10),
})

const addressSchema = baseAddressSchema.superRefine((data, ctx) => {
  const phoneRule = getPhoneRule(data.countryCode)
  if (!phoneRule.pattern.test(data.phone.replace(/\s/g, ''))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['phone'],
      message: `Invalid phone number format. Expected: ${phoneRule.hint}`,
    })
  }

  const postcodeRule = getPostcodeRule(data.countryCode)
  if (!postcodeRule.pattern.test(data.postcode.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['postcode'],
      message: `Invalid postcode format. Expected: ${postcodeRule.hint}`,
    })
  }
})

interface AddressFormData {
  title: TitleOption
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  addressLine2: string
  city: string
  countryCode: string
  postcode: string
}

function makeEmptyAddress(): AddressFormData {
  return {
    title: 'Mr',
    firstName: '',
    lastName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    countryCode: getCountryFromCookie(),
    postcode: '',
  }
}

export function InformationStep() {
  const store = useCheckoutStore()
  const { user, isLoggedIn } = useSession()

  const [shipping, setShipping] = useState<AddressFormData>(() => {
    if (store.shippingAddress) {
      return {
        title: store.shippingAddress.title,
        firstName: store.shippingAddress.firstName,
        lastName: store.shippingAddress.lastName,
        phone: store.shippingAddress.phone,
        addressLine1: store.shippingAddress.addressLine1,
        addressLine2: store.shippingAddress.addressLine2 ?? '',
        city: store.shippingAddress.city,
        countryCode: store.shippingAddress.countryCode,
        postcode: store.shippingAddress.postcode,
      }
    }
    const empty = makeEmptyAddress()
    return {
      ...empty,
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    }
  })

  const [billing, setBilling] = useState<AddressFormData>(() => {
    if (store.billingAddress) {
      return {
        title: store.billingAddress.title,
        firstName: store.billingAddress.firstName,
        lastName: store.billingAddress.lastName,
        phone: store.billingAddress.phone,
        addressLine1: store.billingAddress.addressLine1,
        addressLine2: store.billingAddress.addressLine2 ?? '',
        city: store.billingAddress.city,
        countryCode: store.billingAddress.countryCode,
        postcode: store.billingAddress.postcode,
      }
    }
    return makeEmptyAddress()
  })

  const [sameAsBilling, setSameAsBilling] = useState(store.sameAsBilling)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [billingErrors, setBillingErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (isLoggedIn && user && !store.shippingAddress) {
      setShipping((prev) => ({
        ...prev,
        firstName: prev.firstName || user.firstName,
        lastName: prev.lastName || user.lastName,
      }))
    }
  }, [isLoggedIn, user, store.shippingAddress])

  function updateShipping(field: keyof AddressFormData, value: string) {
    setShipping((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  function updateBilling(field: keyof AddressFormData, value: string) {
    setBilling((prev) => ({ ...prev, [field]: value }))
    setBillingErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }

  async function handleContinue() {
    setFormError(null)
    setErrors({})
    setBillingErrors({})

    const shippingResult = addressSchema.safeParse(shipping)
    if (!shippingResult.success) {
      const fieldErrors: Record<string, string> = {}
      shippingResult.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    if (!sameAsBilling) {
      const billingResult = addressSchema.safeParse(billing)
      if (!billingResult.success) {
        const fieldErrors: Record<string, string> = {}
        billingResult.error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
        })
        setBillingErrors(fieldErrors)
        return
      }
    }

    setIsPending(true)
    try {
      const shippingAddr: ShippingAddress = {
        title: shipping.title,
        firstName: shipping.firstName,
        lastName: shipping.lastName,
        phone: shipping.phone,
        addressLine1: shipping.addressLine1,
        addressLine2: shipping.addressLine2 || undefined,
        city: shipping.city,
        countryCode: shipping.countryCode,
        postcode: shipping.postcode,
      }

      const billingAddr: ShippingAddress = sameAsBilling
        ? shippingAddr
        : {
            title: billing.title,
            firstName: billing.firstName,
            lastName: billing.lastName,
            phone: billing.phone,
            addressLine1: billing.addressLine1,
            addressLine2: billing.addressLine2 || undefined,
            city: billing.city,
            countryCode: billing.countryCode,
            postcode: billing.postcode,
          }

      await api.post(`/checkout/${store.orderId}/address`, {
        kind: 'SHIPPING',
        addressJson: shippingAddr,
        countryCode: shipping.countryCode,
      })

      store.setAddresses(shippingAddr, sameAsBilling ? null : billingAddr, sameAsBilling, shipping.title)
      store.setStep('payment')
    } catch (err) {
      const apiErr = err as ApiError
      setFormError(apiErr?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-body font-light text-[14px] text-umber mb-2">
        Where do you want your order to be shipped?
      </p>

      {formError && (
        <p className="font-body text-[12px] text-red-500">{formError}</p>
      )}

      {/* Title radio */}
      <div>
        <label className="font-body font-light text-[12px] text-umber mb-2 block">
          Title <span className="text-red-400">*</span>
        </label>
        <div className="flex items-center gap-6">
          {TITLE_OPTIONS.map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer">
              <span className={cn(
                'relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                shipping.title === t ? 'border-umber' : 'border-muted-foreground',
              )}>
                {shipping.title === t && <span className="w-2 h-2 rounded-full bg-umber" />}
              </span>
              <input
                type="radio"
                name="title"
                value={t}
                checked={shipping.title === t}
                onChange={() => updateShipping('title', t)}
                className="sr-only"
              />
              <span className="font-body font-light text-[13px] text-umber">{t}.</span>
            </label>
          ))}
        </div>
      </div>

      <AddressForm
        data={shipping}
        errors={errors}
        onChange={updateShipping}
        prefix="shipping"
      />

      {/* Same as billing checkbox */}
      <label className="flex items-center gap-2 cursor-pointer mt-4">
        <div
          className={cn(
            'w-4 h-4 border flex items-center justify-center shrink-0',
            'transition-colors duration-200',
            sameAsBilling ? 'bg-umber border-umber' : 'bg-transparent border-muted-foreground',
          )}
        >
          {sameAsBilling && (
            <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-background" aria-hidden="true">
              <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          className="sr-only"
          checked={sameAsBilling}
          onChange={(e) => setSameAsBilling(e.target.checked)}
        />
        <span className="font-body font-light text-[13px] text-umber">
          The delivery address is the same as the invoice address
        </span>
      </label>

      {/* Billing address form */}
      {!sameAsBilling && (
        <div className={cn(
          'overflow-hidden transition-all duration-300',
          'border-t border-muted pt-6 mt-4',
        )}>
          <h3 className="font-body font-medium text-[16px] text-umber mb-4">
            Billing address
          </h3>

          <div className="mb-4">
            <label className="font-body font-light text-[12px] text-umber mb-2 block">
              Title <span className="text-red-400">*</span>
            </label>
            <div className="flex items-center gap-6">
              {TITLE_OPTIONS.map((t) => (
                <label key={t} className="flex items-center gap-2 cursor-pointer">
                  <span className={cn(
                    'relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                    billing.title === t ? 'border-umber' : 'border-muted-foreground',
                  )}>
                    {billing.title === t && <span className="w-2 h-2 rounded-full bg-umber" />}
                  </span>
                  <input
                    type="radio"
                    name="billing-title"
                    value={t}
                    checked={billing.title === t}
                    onChange={() => updateBilling('title', t)}
                    className="sr-only"
                  />
                  <span className="font-body font-light text-[13px] text-umber">{t}.</span>
                </label>
              ))}
            </div>
          </div>

          <AddressForm
            data={billing}
            errors={billingErrors}
            onChange={updateBilling}
            prefix="billing"
          />
        </div>
      )}

      {/* Continue */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={isPending}
        className={cn(
          'w-full h-13',
          'bg-deep text-background',
          'font-body font-light uppercase tracking-[0.25em] text-[13px]',
          'rounded-none hover:bg-ink transition-colors duration-200',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        )}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </span>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  )
}

function AddressForm({
  data,
  errors,
  onChange,
  prefix,
}: {
  data: AddressFormData
  errors: Record<string, string>
  onChange: (field: keyof AddressFormData, value: string) => void
  prefix: string
}) {
  const [touched, setTouched] = useState<Set<string>>(new Set())

  const postcodeLabel = getPostcodeLabel(data.countryCode)
  const phoneRule = getPhoneRule(data.countryCode)
  const postcodeRule = getPostcodeRule(data.countryCode)

  // When a submit error arrives for phone/postcode, mark that field as touched
  // so real-time feedback continues as the user types to fix it
  useEffect(() => {
    if (errors.phone || errors.postcode) {
      setTouched((prev) => {
        const next = new Set(prev)
        if (errors.phone) next.add('phone')
        if (errors.postcode) next.add('postcode')
        return next
      })
    }
  }, [errors.phone, errors.postcode])

  const realtimePhoneError = touched.has('phone') ? validateFieldRealtime('phone', data) : undefined
  const realtimePostcodeError = touched.has('postcode') ? validateFieldRealtime('postcode', data) : undefined

  // Parent errors (from handleContinue) take precedence over real-time errors
  const mergedErrors: Record<string, string | undefined> = {
    ...errors,
    phone: errors.phone ?? realtimePhoneError,
    postcode: errors.postcode ?? realtimePostcodeError,
  }

  function handlePhoneChange(v: string) {
    onChange('phone', phoneRule.filter(v))
  }

  function handlePostcodeChange(v: string) {
    onChange('postcode', postcodeRule.filter(v))
  }

  function markTouched(field: string) {
    setTouched((prev) => new Set(prev).add(field))
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
      <FormField
        id={`${prefix}-firstName`}
        label="First Name"
        required
        value={data.firstName}
        onChange={(v) => onChange('firstName', v)}
        error={errors.firstName}
        autoComplete="given-name"
      />
      <FormField
        id={`${prefix}-lastName`}
        label="Last Name"
        required
        value={data.lastName}
        onChange={(v) => onChange('lastName', v)}
        error={errors.lastName}
        autoComplete="family-name"
      />
      <FormField
        id={`${prefix}-phone`}
        label="Phone"
        required
        type="tel"
        value={data.phone}
        onChange={handlePhoneChange}
        onBlur={() => markTouched('phone')}
        error={mergedErrors.phone}
        autoComplete="tel"
        placeholder={phoneRule.example}
        hint={phoneRule.hint}
        maxLength={phoneRule.maxLength}
      />
      <div className="hidden md:block" />
      <FormField
        id={`${prefix}-address1`}
        label="Address Line 1"
        required
        value={data.addressLine1}
        onChange={(v) => onChange('addressLine1', v)}
        error={errors.addressLine1}
        autoComplete="address-line1"
        placeholder="Street address, building, apartment"
        className="md:col-span-2"
        maxLength={ADDRESS_LINE_MAX}
        showCounter
      />
      <FormField
        id={`${prefix}-address2`}
        label="Address Line 2"
        value={data.addressLine2}
        onChange={(v) => onChange('addressLine2', v)}
        error={errors.addressLine2}
        autoComplete="address-line2"
        placeholder="Apartment, suite, unit, floor (optional)"
        className="md:col-span-2"
        maxLength={ADDRESS_LINE2_MAX}
        showCounter
      />
      <div className="flex flex-col gap-1">
        <label
          htmlFor={`${prefix}-country`}
          className="font-body font-light text-[12px] text-umber"
        >
          Country <span className="text-red-400">*</span>
        </label>
        <select
          id={`${prefix}-country`}
          value={data.countryCode}
          onChange={(e) => onChange('countryCode', e.target.value)}
          autoComplete="country"
          className={cn(
            'w-full h-12 px-4 bg-background appearance-none',
            'border rounded-none',
            'font-body font-light text-[16px] md:text-[14px] text-umber',
            'outline-none focus:border-umber',
            'transition-colors duration-200',
            errors.countryCode ? 'border-red-400' : 'border-muted',
          )}
        >
          <option value="">Select country</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name}</option>
          ))}
        </select>
        {errors.countryCode && (
          <p className="font-body text-[11px] text-red-500 mt-0.5">{errors.countryCode}</p>
        )}
      </div>
      <FormField
        id={`${prefix}-city`}
        label="City"
        required
        value={data.city}
        onChange={(v) => onChange('city', v)}
        error={errors.city}
        autoComplete="address-level2"
      />
      <FormField
        id={`${prefix}-postcode`}
        label={postcodeLabel}
        required
        value={data.postcode}
        onChange={handlePostcodeChange}
        onBlur={() => markTouched('postcode')}
        error={mergedErrors.postcode}
        autoComplete="postal-code"
        placeholder={postcodeRule.example}
        hint={postcodeRule.hint}
        maxLength={postcodeRule.maxLength}
      />
    </div>
  )
}

function FormField({
  id,
  label,
  required,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  autoComplete,
  placeholder,
  className,
  maxLength,
  showCounter,
  hint,
}: {
  id: string
  label: string
  required?: boolean
  type?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  autoComplete?: string
  placeholder?: string
  className?: string
  maxLength?: number
  showCounter?: boolean
  hint?: string
}) {
  const charCount = value.length
  const nearLimit = maxLength && charCount >= maxLength * 0.85
  const atLimit = maxLength && charCount >= maxLength

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="font-body font-light text-[12px] text-umber">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        {showCounter && maxLength && (
          <span className={cn(
            'font-body text-[11px] tabular-nums',
            atLimit ? 'text-red-500' : nearLimit ? 'text-amber-600' : 'text-muted-foreground/50',
          )}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        autoComplete={autoComplete}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          'w-full h-12 px-4 bg-background',
          'border rounded-none',
          'font-body font-light text-[16px] md:text-[14px] text-umber',
          'placeholder:text-muted-foreground/60',
          'outline-none focus:border-umber',
          'transition-colors duration-200',
          error ? 'border-red-400' : 'border-muted',
        )}
      />
      {hint && !error && (
        <p className="font-body text-[11px] text-muted-foreground/70 mt-0.5">{hint}</p>
      )}
      {error && (
        <p className="font-body text-[11px] text-red-500 mt-0.5">{error}</p>
      )}
    </div>
  )
}

export function InformationSummary() {
  const addr = useCheckoutStore((s) => s.shippingAddress)
  if (!addr) return null

  const countryName = COUNTRIES.find((c) => c.code === addr.countryCode)?.name ?? addr.countryCode

  return (
    <p className="font-body font-light text-[13px] text-muted-foreground">
      {addr.firstName} {addr.lastName}, {addr.city}, {countryName}
    </p>
  )
}
