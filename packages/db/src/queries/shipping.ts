/**
 * Shipping query functions — zones and methods CRUD. No business logic. RORO.
 * Uses OrderOperationError for 0-row outcomes so API global handler returns correct response.
 */

import { eq, and, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db } from '../client'
import { shippingZones, shippingMethods } from '../schema/shipping.schema'
import type { InferSelectModel } from 'drizzle-orm'
import { OrderOperationError } from '../errors'

export type ShippingZone = InferSelectModel<typeof shippingZones>
export type ShippingMethod = InferSelectModel<typeof shippingMethods>

// —— Zone read queries ——

export async function getAllZones(): Promise<ShippingZone[]> {
  const rows = await db
    .select()
    .from(shippingZones)
    .orderBy(asc(shippingZones.name))
  return rows
}

export async function getZoneById({
  id,
}: {
  id: string
}): Promise<ShippingZone | null> {
  const rows = await db
    .select()
    .from(shippingZones)
    .where(eq(shippingZones.id, id))
  return rows[0] ?? null
}

export async function getZoneByCountryCode({
  countryCode,
}: {
  countryCode: string
}): Promise<ShippingZone | null> {
  const countryArray = JSON.stringify([countryCode])
  const rows = await db.execute(sql`
    SELECT id, name, countries_json, created_at
    FROM shipping.shipping_zones
    WHERE countries_json @> ${countryArray}::jsonb
    LIMIT 1
  `)
  return (rows.rows[0] as ShippingZone | undefined) ?? null
}

// —— Zone write queries ——

export async function createZone({
  name,
  countriesJson,
}: {
  name: string
  countriesJson: string[] | string
}): Promise<ShippingZone> {
  const countries = Array.isArray(countriesJson)
    ? countriesJson
    : (JSON.parse(countriesJson) as string[])
  const [row] = await db
    .insert(shippingZones)
    .values({
      name,
      countries_json: countries,
    })
    .returning()
  if (!row) throw new Error('createZone: no row returned')
  return row
}

export async function updateZoneName({
  id,
  name,
}: {
  id: string
  name: string
}): Promise<ShippingZone> {
  const result = await db
    .update(shippingZones)
    .set({ name })
    .where(eq(shippingZones.id, id))
    .returning()
  const row = result[0]
  if (!row) throw new OrderOperationError('SHIPPING_ZONE_NOT_FOUND', 404)
  return row
}

export async function addCountryToZone({
  zoneId,
  countryCode,
}: {
  zoneId: string
  countryCode: string
}): Promise<void> {
  const existing = await getZoneByCountryCode({ countryCode })
  if (existing && existing.id !== zoneId) {
    throw new OrderOperationError(
      'COUNTRY_ALREADY_IN_ZONE',
      409,
      `Country ${countryCode} already in zone ${existing.id}`,
    )
  }
  const countryArray = JSON.stringify([countryCode])
  const result = await db.execute(sql`
    UPDATE shipping.shipping_zones
    SET    countries_json = countries_json || ${countryArray}::jsonb
    WHERE  id             = ${zoneId}
      AND  NOT (countries_json @> ${countryArray}::jsonb)
    RETURNING id
  `)
  if (result.rows.length === 0) {
    throw new OrderOperationError('COUNTRY_ALREADY_IN_ZONE', 409)
  }
}

export async function removeCountryFromZone({
  zoneId,
  countryCode,
}: {
  zoneId: string
  countryCode: string
}): Promise<void> {
  const countryArray = JSON.stringify([countryCode])
  const result = await db.execute(sql`
    UPDATE shipping.shipping_zones
    SET    countries_json = (
             SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
             FROM jsonb_array_elements_text(countries_json) AS elem
             WHERE elem <> ${countryCode}
           )
    WHERE  id = ${zoneId}
      AND  countries_json @> ${countryArray}::jsonb
    RETURNING id
  `)
  if (result.rows.length === 0) {
    throw new OrderOperationError('COUNTRY_NOT_IN_ZONE', 409)
  }
}

export async function deleteZone({ id }: { id: string }): Promise<void> {
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM shipping.shipping_methods
    WHERE zone_id = ${id}
      AND active = true
  `)
  const count = (countResult.rows[0] as { count: number } | undefined)?.count ?? 0
  if (count > 0) {
    throw new OrderOperationError('ZONE_HAS_ACTIVE_METHODS', 409)
  }
  const result = await db
    .delete(shippingZones)
    .where(eq(shippingZones.id, id))
    .returning({ id: shippingZones.id })
  if (result.length === 0) {
    throw new OrderOperationError('SHIPPING_ZONE_NOT_FOUND', 404)
  }
}

// —— Method read queries ——

export async function getMethodsForZone({
  zoneId,
  includeInactive = false,
}: {
  zoneId: string
  includeInactive?: boolean
}): Promise<ShippingMethod[]> {
  const condition = includeInactive
    ? eq(shippingMethods.zone_id, zoneId)
    : and(
        eq(shippingMethods.zone_id, zoneId),
        eq(shippingMethods.active, true),
      )
  const rows = await db
    .select()
    .from(shippingMethods)
    .where(condition)
    .orderBy(asc(shippingMethods.rate_type), asc(shippingMethods.name))
  return rows
}

export async function getMethodsForCountry({
  countryCode,
}: {
  countryCode: string
  currency?: string
}): Promise<ShippingMethod[]> {
  const countryArray = JSON.stringify([countryCode])
  const result = await db.execute(sql`
    SELECT sm.id, sm.zone_id, sm.name, sm.carrier, sm.rate_type,
           sm.flat_rate_lkr, sm.flat_rate_sgd, sm.flat_rate_usd,
           sm.estimated_days, sm.active, sm.created_at, sm.updated_at
    FROM shipping.shipping_methods sm
    JOIN shipping.shipping_zones sz ON sz.id = sm.zone_id
    WHERE sz.countries_json @> ${countryArray}::jsonb
      AND sm.active = true
    ORDER BY sm.rate_type ASC, sm.name ASC
  `)
  return (result.rows as ShippingMethod[]) ?? []
}

export async function getMethodById({
  id,
}: {
  id: string
}): Promise<ShippingMethod | null> {
  const rows = await db
    .select()
    .from(shippingMethods)
    .where(eq(shippingMethods.id, id))
  return rows[0] ?? null
}

export async function getActiveMethodById({
  id,
}: {
  id: string
}): Promise<ShippingMethod | null> {
  const rows = await db
    .select()
    .from(shippingMethods)
    .where(
      and(
        eq(shippingMethods.id, id),
        eq(shippingMethods.active, true),
      ),
    )
  return rows[0] ?? null
}

// —— Method write queries ——

export async function createMethod({
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
  flatRateLkr?: string | null
  flatRateSgd?: string | null
  flatRateUsd?: string | null
  estimatedDays?: string | null
}): Promise<ShippingMethod> {
  if (rateType === 'FLAT') {
    const hasAll =
      flatRateLkr != null &&
      flatRateSgd != null &&
      flatRateUsd != null &&
      Number(flatRateLkr) >= 0 &&
      Number(flatRateSgd) >= 0 &&
      Number(flatRateUsd) >= 0
    if (!hasAll) {
      throw new OrderOperationError('FLAT_RATE_INCOMPLETE', 400)
    }
  }
  const [row] = await db
    .insert(shippingMethods)
    .values({
      zone_id: zoneId,
      name,
      carrier: carrier ?? null,
      rate_type: rateType,
      flat_rate_lkr: rateType === 'FLAT' ? String(flatRateLkr) : null,
      flat_rate_sgd: rateType === 'FLAT' ? String(flatRateSgd) : null,
      flat_rate_usd: rateType === 'FLAT' ? String(flatRateUsd) : null,
      estimated_days: estimatedDays ?? null,
      active: true,
    })
    .returning()
  if (!row) throw new Error('createMethod: no row returned')
  return row
}

export async function updateMethod({
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
  flatRateLkr?: string | null
  flatRateSgd?: string | null
  flatRateUsd?: string | null
}): Promise<ShippingMethod> {
  const updates: Record<string, unknown> = {
    updated_at: new Date(),
  }
  if (name !== undefined) updates.name = name
  if (carrier !== undefined) updates.carrier = carrier
  if (estimatedDays !== undefined) updates.estimated_days = estimatedDays
  if (flatRateLkr !== undefined) updates.flat_rate_lkr = flatRateLkr
  if (flatRateSgd !== undefined) updates.flat_rate_sgd = flatRateSgd
  if (flatRateUsd !== undefined) updates.flat_rate_usd = flatRateUsd

  const result = await db
    .update(shippingMethods)
    .set(updates as Record<string, string | null | Date>)
    .where(eq(shippingMethods.id, id))
    .returning()
  const row = result[0]
  if (!row) throw new OrderOperationError('SHIPPING_METHOD_NOT_FOUND', 404)
  return row
}

export async function setMethodActive({
  id,
  active,
}: {
  id: string
  active: boolean
}): Promise<void> {
  const result = await db.execute(sql`
    UPDATE shipping.shipping_methods
    SET    active     = ${active},
           updated_at = now()
    WHERE  id     = ${id}
      AND  active != ${active}
    RETURNING id
  `)
  if (result.rows.length === 0) {
    if (active) {
      throw new OrderOperationError('METHOD_ALREADY_ACTIVE', 409)
    }
    throw new OrderOperationError('METHOD_ALREADY_INACTIVE', 409)
  }
}

export async function deleteMethod({ id }: { id: string }): Promise<void> {
  await setMethodActive({ id, active: false })
}
