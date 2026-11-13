/**
 * Canonical order address snapshot.
 * Checkout historically stored { addressLine1, postcode, firstName, ... }
 * while admin/account views expected { line1, postalCode, fullName, ... }.
 * Normalize at the API boundary so every stored/returned address has both
 * the street lines and the recipient identity.
 */

const COUNTRY_NAMES: Record<string, string> = {
  LK: 'Sri Lanka',
  SG: 'Singapore',
  US: 'United States',
  GB: 'United Kingdom',
  AU: 'Australia',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  JP: 'Japan',
  AE: 'United Arab Emirates',
  IN: 'India',
}

export interface CanonicalOrderAddress {
  fullName: string
  firstName: string
  lastName: string
  title?: string
  phone?: string
  line1: string
  line2?: string
  city: string
  state?: string
  postalCode: string
  country: string
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return ''
}

export function normalizeOrderAddressJson(
  raw: Record<string, unknown>,
  countryCode: string,
): CanonicalOrderAddress {
  const firstName = pickString(raw.firstName, raw.first_name)
  const lastName = pickString(raw.lastName, raw.last_name)
  const fullName =
    pickString(raw.fullName, raw.full_name) || `${firstName} ${lastName}`.trim()
  const nameParts = fullName.split(/\s+/).filter(Boolean)
  const line1 = pickString(raw.line1, raw.addressLine1, raw.address_line1)
  const line2 = pickString(raw.line2, raw.addressLine2, raw.address_line2, raw.unit)
  const city = pickString(raw.city)
  const state = pickString(raw.state, raw.province, raw.district)
  const postalCode = pickString(raw.postalCode, raw.postal_code, raw.postcode)
  const country =
    pickString(raw.country) ||
    COUNTRY_NAMES[countryCode.toUpperCase()] ||
    countryCode.toUpperCase()
  const phone = pickString(raw.phone)
  const title = pickString(raw.title)

  const canonical: CanonicalOrderAddress = {
    fullName,
    firstName: firstName || nameParts[0] || '',
    lastName: lastName || nameParts.slice(1).join(' '),
    line1,
    city,
    postalCode,
    country,
  }
  if (title) canonical.title = title
  if (phone) canonical.phone = phone
  if (line2) canonical.line2 = line2
  if (state) canonical.state = state
  return canonical
}
