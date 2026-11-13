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
  raw: unknown,
  countryCode: string,
): CanonicalOrderAddress {
  const record =
    raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const firstName = pickString(record.firstName, record.first_name)
  const lastName = pickString(record.lastName, record.last_name)
  const fullName =
    pickString(record.fullName, record.full_name) ||
    `${firstName} ${lastName}`.trim()
  const nameParts = fullName.split(/\s+/).filter(Boolean)
  const line1 = pickString(record.line1, record.addressLine1, record.address_line1)
  const line2 = pickString(
    record.line2,
    record.addressLine2,
    record.address_line2,
    record.unit,
  )
  const city = pickString(record.city)
  const state = pickString(record.state, record.province, record.district)
  const postalCode = pickString(
    record.postalCode,
    record.postal_code,
    record.postcode,
  )
  const country =
    pickString(record.country) ||
    COUNTRY_NAMES[countryCode.toUpperCase()] ||
    countryCode.toUpperCase()
  const phone = pickString(record.phone)
  const title = pickString(record.title)

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
