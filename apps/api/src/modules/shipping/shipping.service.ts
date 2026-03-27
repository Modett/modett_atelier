/**
 * Shipping service — rate resolution, storefront methods, admin CRUD. RORO.
 * Uses Decimal.js for money. Throws AppError. Exports used by Checkout module.
 */

import Decimal from 'decimal.js'
import { AppError } from '../../lib/errors'
import {
  getAllZones,
  getZoneById,
  getZoneByCountryCode,
  getMethodsForZone,
  getMethodsForCountry,
  getMethodById,
  getActiveMethodById,
  createZone,
  updateZoneName,
  addCountryToZone,
  removeCountryFromZone,
  deleteZone,
  createMethod,
  updateMethod,
  setMethodActive,
  deleteMethod,
  getShippingSettings,
  updateShippingSettings,
} from '@modett/db'
import type { ShippingZone, ShippingMethod, ShippingSettings } from '@modett/db'

type CurrencyCode = 'LKR' | 'SGD' | 'USD'

// —— Rate resolution (exported for Checkout module) ——

export function resolveShippingCost({
  method,
  currency,
}: {
  method: ShippingMethod
  currency: CurrencyCode
}): { amount: string; currency: CurrencyCode } | null {
  if (method.rate_type === 'FREE') {
    return { amount: '0.00', currency }
  }
  if (method.rate_type === 'CALCULATED') {
    return null
  }
  if (method.rate_type === 'FLAT') {
    const raw =
      currency === 'LKR'
        ? method.flat_rate_lkr
        : currency === 'SGD'
          ? method.flat_rate_sgd
          : method.flat_rate_usd
    if (raw == null) throw new AppError('RATE_NOT_SET_FOR_CURRENCY', 400)
    return { amount: new Decimal(raw).toFixed(2), currency }
  }
  return null
}

// —— Storefront (used by Checkout module) ——

export interface ShippingMethodOption {
  id: string
  name: string
  carrier: string | null
  estimatedDays: string | null
  rateType: 'FLAT' | 'FREE' | 'CALCULATED'
  cost: { amount: string; currency: CurrencyCode } | null
}

export async function getMethodsForCheckout({
  countryCode,
  currency,
  subtotal,
}: {
  countryCode: string
  currency: CurrencyCode
  subtotal?: string | null
}): Promise<ShippingMethodOption[]> {
  if (!subtotal) {
    const methods = await getMethodsForCountry({ countryCode })
    return methods.map((method) => {
      const cost = resolveShippingCost({ method, currency })
      return {
        id: method.id,
        name: method.name,
        carrier: method.carrier ?? null,
        estimatedDays: method.estimated_days ?? null,
        rateType: method.rate_type,
        cost,
      }
    })
  }

  const settings = await getShippingSettings()
  const methods = await getMethodsForCountry({ countryCode })

  return Promise.all(
    methods.map(async (method) => {
      const resolved = await resolveShippingCostWithThreshold({
        method,
        currency,
        subtotal,
        settings,
      })
      return {
        id: method.id,
        name: method.name,
        carrier: method.carrier ?? null,
        estimatedDays: method.estimated_days ?? null,
        rateType: method.rate_type,
        cost: resolved,
      }
    }),
  )
}

export async function getMethodForOrder({
  methodId,
  currency,
}: {
  methodId: string
  currency: CurrencyCode
}): Promise<{ method: ShippingMethod; cost: { amount: string; currency: CurrencyCode } | null }> {
  const method = await getActiveMethodById({ id: methodId })
  if (!method) throw new AppError('SHIPPING_METHOD_NOT_FOUND', 404)
  const cost = resolveShippingCost({ method, currency })
  return { method, cost }
}

// —— Admin zones ——

export interface AdminZoneWithMethods {
  id: string
  name: string
  countries: string[]
  createdAt: Date
  methods: ShippingMethod[]
}

export async function adminGetAllZones(): Promise<AdminZoneWithMethods[]> {
  const zones = await getAllZones()
  const result: AdminZoneWithMethods[] = []
  for (const zone of zones) {
    const methods = await getMethodsForZone({
      zoneId: zone.id,
      includeInactive: true,
    })
    const countries = Array.isArray(zone.countries_json)
      ? (zone.countries_json as string[])
      : []
    result.push({
      id: zone.id,
      name: zone.name,
      countries,
      createdAt: zone.created_at,
      methods,
    })
  }
  return result
}

export async function adminGetZone({
  id,
}: {
  id: string
}): Promise<{
  zone: ShippingZone
  countries: string[]
  methods: ShippingMethod[]
}> {
  const zone = await getZoneById({ id })
  if (!zone) throw new AppError('SHIPPING_ZONE_NOT_FOUND', 404)
  const methods = await getMethodsForZone({
    zoneId: id,
    includeInactive: true,
  })
  const countries = Array.isArray(zone.countries_json)
    ? (zone.countries_json as string[])
    : []
  return { zone, countries, methods }
}

const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/

export async function adminCreateZone({
  name,
  countries,
}: {
  name: string
  countries: string[]
}): Promise<ShippingZone> {
  for (const code of countries) {
    if (!COUNTRY_CODE_REGEX.test(code)) {
      throw new AppError('INVALID_COUNTRY_CODE', 400)
    }
  }
  for (const countryCode of countries) {
    const existing = await getZoneByCountryCode({ countryCode })
    if (existing) {
      throw new AppError(
        'COUNTRY_ALREADY_IN_ZONE',
        409,
        `Country ${countryCode} already in zone ${existing.id}`,
      )
    }
  }
  return createZone({ name, countriesJson: countries })
}

export async function adminUpdateZone({
  id,
  name,
}: {
  id: string
  name: string
}): Promise<ShippingZone> {
  return updateZoneName({ id, name })
}

export async function adminAddCountryToZone({
  zoneId,
  countryCode,
}: {
  zoneId: string
  countryCode: string
}): Promise<void> {
  if (!COUNTRY_CODE_REGEX.test(countryCode)) {
    throw new AppError('INVALID_COUNTRY_CODE', 400)
  }
  await addCountryToZone({ zoneId, countryCode })
}

export async function adminRemoveCountryFromZone({
  zoneId,
  countryCode,
}: {
  zoneId: string
  countryCode: string
}): Promise<void> {
  await removeCountryFromZone({ zoneId, countryCode })
}

export async function adminDeleteZone({ id }: { id: string }): Promise<void> {
  await deleteZone({ id })
}

export async function adminGetMethodsForZone({
  zoneId,
  includeInactive = false,
}: {
  zoneId: string
  includeInactive?: boolean
}): Promise<ShippingMethod[]> {
  return getMethodsForZone({ zoneId, includeInactive })
}

// —— Admin methods ——

export async function adminCreateMethod({
  zoneId,
  name,
  carrier,
  rateType,
  flatRateLkr,
  flatRateSgd,
  flatRateUsd,
  estimatedDays,
}: {
  zoneId: string
  name: string
  carrier?: string | null
  rateType: 'FLAT' | 'FREE' | 'CALCULATED'
  flatRateLkr?: number | null
  flatRateSgd?: number | null
  flatRateUsd?: number | null
  estimatedDays?: string | null
}): Promise<
  ShippingMethod & {
    resolvedRates: {
      LKR: { amount: string; currency: string } | null
      SGD: { amount: string; currency: string } | null
      USD: { amount: string; currency: string } | null
    }
  }
> {
  const zone = await getZoneById({ id: zoneId })
  if (!zone) throw new AppError('SHIPPING_ZONE_NOT_FOUND', 404)

  if (rateType === 'FLAT') {
    if (
      flatRateLkr == null ||
      flatRateSgd == null ||
      flatRateUsd == null ||
      flatRateLkr < 0 ||
      flatRateSgd < 0 ||
      flatRateUsd < 0
    ) {
      throw new AppError('FLAT_RATE_INCOMPLETE', 400)
    }
  }

  const method = await createMethod({
    zoneId,
    name,
    carrier,
    rateType,
    flatRateLkr:
      rateType === 'FLAT' && flatRateLkr != null ? String(flatRateLkr) : null,
    flatRateSgd:
      rateType === 'FLAT' && flatRateSgd != null ? String(flatRateSgd) : null,
    flatRateUsd:
      rateType === 'FLAT' && flatRateUsd != null ? String(flatRateUsd) : null,
    estimatedDays,
  })

  return {
    ...method,
    resolvedRates: {
      LKR: resolveShippingCost({ method, currency: 'LKR' }),
      SGD: resolveShippingCost({ method, currency: 'SGD' }),
      USD: resolveShippingCost({ method, currency: 'USD' }),
    },
  }
}

export async function adminUpdateMethod({
  id,
  name,
  carrier,
  estimatedDays,
  flatRateLkr,
  flatRateSgd,
  flatRateUsd,
}: {
  id: string
  name?: string
  carrier?: string | null
  estimatedDays?: string | null
  flatRateLkr?: number | null
  flatRateSgd?: number | null
  flatRateUsd?: number | null
}): Promise<ShippingMethod> {
  const method = await getMethodById({ id })
  if (!method) throw new AppError('SHIPPING_METHOD_NOT_FOUND', 404)

  if (
    (method.rate_type === 'FREE' || method.rate_type === 'CALCULATED') &&
    (flatRateLkr !== undefined ||
      flatRateSgd !== undefined ||
      flatRateUsd !== undefined)
  ) {
    throw new AppError('RATE_TYPE_MISMATCH', 400)
  }

  return updateMethod({
    id,
    name,
    carrier,
    estimatedDays,
    flatRateLkr:
      flatRateLkr !== undefined
        ? flatRateLkr == null
          ? null
          : String(flatRateLkr)
        : undefined,
    flatRateSgd:
      flatRateSgd !== undefined
        ? flatRateSgd == null
          ? null
          : String(flatRateSgd)
        : undefined,
    flatRateUsd:
      flatRateUsd !== undefined
        ? flatRateUsd == null
          ? null
          : String(flatRateUsd)
        : undefined,
  })
}

export async function adminActivateMethod({ id }: { id: string }): Promise<void> {
  await setMethodActive({ id, active: true })
}

export async function adminDeactivateMethod({
  id,
}: {
  id: string
}): Promise<void> {
  await setMethodActive({ id, active: false })
}

export async function adminDeleteMethod({ id }: { id: string }): Promise<void> {
  await deleteMethod({ id })
}

// —— Shipping cost with free threshold ——

interface ResolvedShippingCost {
  amount: string
  currency: CurrencyCode
  isFree: boolean
  originalAmount: string | null
  label: string
}

export async function resolveShippingCostWithThreshold({
  method,
  currency,
  subtotal,
  settings,
}: {
  method: ShippingMethod
  currency: CurrencyCode
  subtotal?: string | null
  settings?: ShippingSettings | null
}): Promise<ResolvedShippingCost> {
  const rawCost = resolveShippingCost({ method, currency })
  const label = settings?.freeShippingLabel ?? 'Free Shipping'

  if (method.rate_type === 'FREE') {
    return {
      amount: '0.00',
      currency,
      isFree: true,
      originalAmount: null,
      label,
    }
  }

  if (!subtotal || !rawCost) {
    return {
      amount: rawCost?.amount ?? '0.00',
      currency,
      isFree: false,
      originalAmount: null,
      label,
    }
  }

  const threshold = settings
    ? (currency === 'LKR'
        ? settings.freeThresholdLkr
        : currency === 'SGD'
          ? settings.freeThresholdSgd
          : settings.freeThresholdUsd)
    : null

  if (threshold !== null && threshold !== undefined) {
    const subtotalDecimal = new Decimal(subtotal)
    const thresholdDecimal = new Decimal(threshold)

    if (subtotalDecimal.greaterThanOrEqualTo(thresholdDecimal)) {
      return {
        amount: '0.00',
        currency,
        isFree: true,
        originalAmount: rawCost.amount,
        label,
      }
    }
  }

  return {
    amount: rawCost.amount,
    currency,
    isFree: false,
    originalAmount: null,
    label,
  }
}

// —— Public: shipping estimate ——

export async function getShippingEstimate({
  countryCode,
  currency,
  subtotal,
}: {
  countryCode: string
  currency: CurrencyCode
  subtotal: string
}) {
  const settings = await getShippingSettings()
  const methods = await getMethodsForCountry({ countryCode })

  if (methods.length === 0) {
    return {
      available: false,
      methods: [],
      thresholdAmount: null,
      thresholdCurrency: currency,
      freeShippingLabel: settings?.freeShippingLabel ?? 'Free Shipping',
      amountUntilFree: null,
    }
  }

  const resolvedMethods = await Promise.all(
    methods.map(async (method) => {
      const resolved = await resolveShippingCostWithThreshold({
        method,
        currency,
        subtotal,
        settings,
      })
      return {
        id: method.id,
        name: method.name,
        carrier: method.carrier ?? null,
        estimatedDays: method.estimated_days ?? null,
        rateType: method.rate_type,
        cost: resolved,
      }
    }),
  )

  const threshold = settings
    ? (currency === 'LKR'
        ? settings.freeThresholdLkr
        : currency === 'SGD'
          ? settings.freeThresholdSgd
          : settings.freeThresholdUsd)
    : null

  const anyFree = resolvedMethods.some((m) => m.cost.isFree)

  return {
    available: true,
    methods: resolvedMethods,
    thresholdAmount: threshold ? String(threshold) : null,
    thresholdCurrency: currency,
    freeShippingLabel: settings?.freeShippingLabel ?? 'Free Shipping',
    amountUntilFree:
      threshold && !anyFree
        ? new Decimal(threshold).minus(subtotal).toFixed(2)
        : null,
  }
}

// —— Admin: shipping settings ——

export async function adminGetShippingSettings() {
  return getShippingSettings()
}

export async function adminUpdateShippingSettings({
  freeThresholdLkr,
  freeThresholdSgd,
  freeThresholdUsd,
  freeShippingLabel,
  adminId,
}: {
  freeThresholdLkr?: number | null
  freeThresholdSgd?: number | null
  freeThresholdUsd?: number | null
  freeShippingLabel?: string
  adminId: string
}) {
  if (freeThresholdLkr !== null && freeThresholdLkr !== undefined && freeThresholdLkr < 0) {
    throw new AppError('INVALID_THRESHOLD', 400)
  }
  if (freeThresholdSgd !== null && freeThresholdSgd !== undefined && freeThresholdSgd < 0) {
    throw new AppError('INVALID_THRESHOLD', 400)
  }
  if (freeThresholdUsd !== null && freeThresholdUsd !== undefined && freeThresholdUsd < 0) {
    throw new AppError('INVALID_THRESHOLD', 400)
  }

  return updateShippingSettings({
    freeThresholdLkr,
    freeThresholdSgd,
    freeThresholdUsd,
    freeShippingLabel,
    adminId,
  })
}
