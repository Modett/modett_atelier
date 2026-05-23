/**
 * PAYable IPG configuration — checkValue helpers (SHA-512), webhook verification,
 * REST helpers for tokenize-payment endpoints (auth, listCard, deleteCard, pay).
 *
 *   Sandbox URLs : https://sandboxipgpayment.payable.lk
 *                 https://sandboxipgsdk.payable.lk/sdk/v3/payable-checkout.js
 *   Live URLs    : https://ipgpayment.payable.lk
 *                 https://ipgsdk.payable.lk/sdk/v3/payable-checkout.js
 *
 * Payment types (PAYable wire values):
 *   1 = ONE_TIME_PAYMENT
 *   2 = RECURRING_PAYMENT   (subscription with startDate/endDate/interval)
 *   3 = TOKENIZE_PAYMENT    (save card + optional immediate charge)
 *
 * checkValue formulas — all SHA-512 + UPPERCASE:
 *
 *   one-time outbound:
 *     SHA512(merchantKey | invoiceId | amount | currency | SHA512(merchantToken))
 *
 *   tokenize outbound (paymentType=3):
 *     SHA512(merchantKey | invoiceId | amount | currency | customerRefNo | SHA512(merchantToken))
 *
 *   pay-with-token (server-to-server):
 *     SHA512(merchantId | invoiceId | amount | currency | customerId | tokenId | SHA512(merchantToken))
 *
 *   listCard:
 *     SHA512(merchantId | customerId | SHA512(merchantToken))
 *
 *   deleteCard / editCard:
 *     SHA512(merchantId | customerId | tokenId | SHA512(merchantToken))
 *
 *   one-time callback verification:
 *     SHA512(merchantKey | payableOrderId | payableTransactionId | payableAmount |
 *            payableCurrency | invoiceNo | statusCode | SHA512(merchantToken))
 *
 *   tokenize callback verification (paymentType=3):
 *     SHA512(merchantKey | payableOrderId | payableTransactionId | payableAmount |
 *            payableCurrency | invoiceNo | statusCode | customerRefNo |
 *            SHA512(merchantToken))
 *
 * Security:
 *   - merchantToken and businessToken NEVER leave this process.
 *   - All hash inputs use the EXACT field order PAYable specifies (pipe-delimited).
 *   - The OAuth access token (for tokenize/pay etc.) is cached in Redis.
 */

import crypto from 'node:crypto'
import { redis } from '@modett/db'
import { AppError } from '../lib/errors'

const sha512 = (s: string): string =>
  crypto.createHash('sha512').update(s).digest('hex').toUpperCase()

// ——— PAYable wire constants ———

export const PAYMENT_TYPE = {
  ONE_TIME:  '1',
  RECURRING: '2',
  TOKENIZE:  '3',
} as const

export type PayableWireType = (typeof PAYMENT_TYPE)[keyof typeof PAYMENT_TYPE]

const SANDBOX_API = 'https://sandboxipgpayment.payable.lk'
const LIVE_API    = 'https://ipgpayment.payable.lk'

// ——— Config ———

function trimTrailingSlash(v: string): string {
  return v.replace(/\/+$/, '')
}

/**
 * Resolve sandbox/live mode from explicit env, with NODE_ENV as fallback.
 *
 *   PAYABLE_MODE=sandbox         → sandbox (regardless of NODE_ENV)
 *   PAYABLE_MODE=live            → live    (regardless of NODE_ENV)
 *   PAYABLE_MODE unset:
 *     PAYABLE_FORCE_LIVE=1       → live    (legacy override)
 *     NODE_ENV=production        → live
 *     otherwise                  → sandbox
 *
 * This lets us deploy the API to Railway production (NODE_ENV=production) but
 * still hit the PAYable sandbox while UAT-ing — set PAYABLE_MODE=sandbox on
 * Railway and flip to PAYABLE_MODE=live for go-live.
 */
function resolveSandboxMode(): boolean {
  const explicit = (process.env.PAYABLE_MODE ?? '').toLowerCase().trim()
  if (explicit === 'sandbox') return true
  if (explicit === 'live' || explicit === 'production') return false
  if (process.env.PAYABLE_FORCE_LIVE === '1') return false
  return process.env.NODE_ENV !== 'production'
}

export const payableConfig = {
  merchantKey:    process.env.PAYABLE_MERCHANT_KEY ?? '',
  merchantToken:  process.env.PAYABLE_MERCHANT_TOKEN ?? '',
  /** Business credentials — required for tokenize/pay, editCard (OAuth client_credentials). */
  businessKey:    process.env.PAYABLE_BUSINESS_KEY ?? '',
  businessToken:  process.env.PAYABLE_BUSINESS_TOKEN ?? '',

  apiUrl:         trimTrailingSlash(process.env.API_URL ?? 'http://localhost:3001'),
  frontendUrl:    trimTrailingSlash(process.env.FRONTEND_URL ?? 'http://localhost:3000'),

  /** Logo shown inside the PAYable checkout popup. Must be HTTPS. */
  logoUrl:        process.env.PAYABLE_LOGO_URL ?? '',
  /** Full webhook URL — overrides API_URL-derived default when set. */
  webhookUrl:     process.env.PAYABLE_WEBHOOK_URL ?? '',
  /** Default return URL pattern. {orderId} placeholder gets replaced per session. */
  returnUrlBase:  process.env.PAYABLE_RETURN_URL_BASE ?? '',
  /** Default cancel URL (sent to PAYable). */
  cancelUrl:      process.env.PAYABLE_CANCEL_URL ?? '',

  get sandboxMode(): boolean {
    return resolveSandboxMode()
  },
} as const

if (!payableConfig.merchantKey || !payableConfig.merchantToken) {
  console.error('⚠️  PAYABLE_MERCHANT_KEY or PAYABLE_MERCHANT_TOKEN not set')
}

/**
 * Pick sandbox vs live REST root. Use this for tokenize/pay, listCard, deleteCard,
 * editCard, and the auth/tokenize OAuth endpoint.
 */
export function getPayableApiBaseUrl(): string {
  return payableConfig.sandboxMode ? SANDBOX_API : LIVE_API
}

/**
 * Webhook URL for PAYable to call back on. Public HTTPS only in production.
 */
export function getWebhookUrl(): string {
  if (payableConfig.webhookUrl) return payableConfig.webhookUrl
  return `${payableConfig.apiUrl}/api/payments/webhook`
}

/**
 * Stable customer reference number used as `customerRefNo` for tokenization.
 * Derived from internal userId so it is:
 *   - stable across sessions (so PAYable can group tokens to the same customer)
 *   - never client-controlled
 *   - alphanumeric only — PAYable's gateway rejects any non-alphanumeric
 *     character (including '-' / '_' / ':') with
 *     `{ status: 404, error: "Invalid format for Customer Ref No" }`.
 *   - <= 20 chars (PAYable doesn't document a hard limit; their own sample
 *     uses 13 chars — we stay tight to be safe)
 *
 *   "CUST" + first 16 hex chars of sha256(userId) → 20 chars, [A-Z0-9] only.
 */
export function getCustomerRefNo(userId: string): string {
  const hex = crypto.createHash('sha256').update(userId).digest('hex')
  return `CUST${hex.slice(0, 16).toUpperCase()}`
}

// ——— checkValue: outbound ———

export function getOneTimeCheckValue({
  invoiceId,
  amount,
  currencyCode,
}: {
  invoiceId: string
  amount: string
  currencyCode: string
}): string {
  const { merchantKey, merchantToken } = payableConfig
  const tokenHash = sha512(merchantToken)
  return sha512(`${merchantKey}|${invoiceId}|${amount}|${currencyCode}|${tokenHash}`)
}

export function getTokenizeCheckValue({
  invoiceId,
  amount,
  currencyCode,
  customerRefNo,
}: {
  invoiceId: string
  amount: string
  currencyCode: string
  customerRefNo: string
}): string {
  const { merchantKey, merchantToken } = payableConfig
  const tokenHash = sha512(merchantToken)
  return sha512(
    `${merchantKey}|${invoiceId}|${amount}|${currencyCode}|${customerRefNo}|${tokenHash}`,
  )
}

export function getPayWithTokenCheckValue({
  invoiceId,
  amount,
  currencyCode,
  customerId,
  tokenId,
}: {
  invoiceId: string
  amount: string
  currencyCode: string
  customerId: string
  tokenId: string
}): string {
  const { merchantKey, merchantToken } = payableConfig
  const tokenHash = sha512(merchantToken)
  return sha512(
    `${merchantKey}|${invoiceId}|${amount}|${currencyCode}|${customerId}|${tokenId}|${tokenHash}`,
  )
}

export function getListCardCheckValue({
  customerId,
}: {
  customerId: string
}): string {
  const { merchantKey, merchantToken } = payableConfig
  const tokenHash = sha512(merchantToken)
  return sha512(`${merchantKey}|${customerId}|${tokenHash}`)
}

export function getDeleteCardCheckValue({
  customerId,
  tokenId,
}: {
  customerId: string
  tokenId: string
}): string {
  const { merchantKey, merchantToken } = payableConfig
  const tokenHash = sha512(merchantToken)
  return sha512(`${merchantKey}|${customerId}|${tokenId}|${tokenHash}`)
}

// ——— checkValue: inbound (webhook) verification ———

/**
 * Dispatcher — picks the right callback formula based on `paymentType` in the
 * payload. Per PAYable's tokenize-callback sample, the tokenize webhook arrives
 * with `paymentType: 1` (it inherits the card path) but ALSO includes
 * `customerRefNo` and a `token` object. We detect tokenize by the presence of
 * `customerRefNo` (the only reliable discriminator across both samples).
 */
export function verifyCallbackCheckValue(payload: PayableWebhookPayload): boolean {
  const { merchantToken } = payableConfig
  if (!payload.checkValue) return false
  const tokenHash = sha512(merchantToken)

  // Tokenize callback if customerRefNo is present (covers paymentType=3 events).
  if (payload.customerRefNo) {
    const expected = sha512(
      `${payload.merchantKey}|` +
        `${payload.payableOrderId}|` +
        `${payload.payableTransactionId}|` +
        `${payload.payableAmount}|` +
        `${payload.payableCurrency}|` +
        `${payload.invoiceNo}|` +
        `${String(payload.statusCode)}|` +
        `${payload.customerRefNo}|` +
        tokenHash,
    )
    if (timingSafeEqual(expected, payload.checkValue)) return true
    // Some PAYable deployments may not include customerRefNo in the hash for
    // certain edge cases — fall through to the one-time formula as a fallback.
  }

  const expected = sha512(
    `${payload.merchantKey}|` +
      `${payload.payableOrderId}|` +
      `${payload.payableTransactionId}|` +
      `${payload.payableAmount}|` +
      `${payload.payableCurrency}|` +
      `${payload.invoiceNo}|` +
      `${String(payload.statusCode)}|` +
      tokenHash,
  )
  return timingSafeEqual(expected, payload.checkValue)
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  return crypto.timingSafeEqual(aBuf, bBuf)
}

// ——— OAuth (for tokenize/pay, editCard) ———

interface PayableAuthResponse {
  status?: number
  success?: boolean
  accessToken?: string
  /** Some deployments return the token under `access_token`. */
  access_token?: string
  expires_in?: number
}

const ACCESS_TOKEN_REDIS_KEY = 'payable:tokenize:access_token'

/**
 * Fetch (or reuse) a JWT bearer token for the tokenize REST endpoints.
 *
 *   Authorization: base64(businessKey:businessToken)
 *   Body: { grant_type: "client_credentials" }
 *
 * The returned `accessToken` is cached in Redis until `expires_in - 60` seconds.
 */
export async function getPayableAccessToken(): Promise<string> {
  const cached = await redis.get(ACCESS_TOKEN_REDIS_KEY).catch(() => null)
  if (cached) return cached

  const { businessKey, businessToken } = payableConfig
  if (!businessKey || !businessToken) {
    // Missing configuration — never let this round-trip to PAYable with empty
    // basic-auth, since the gateway replies with a confusing
    //   { status: 404, error: "Invalid authentication" }
    // that gets surfaced to the customer as a payment failure. Fail fast with
    // a clear server-side error instead.
    throw new AppError(
      'PAYABLE_BUSINESS_CREDS_MISSING',
      503,
      'Saved-card payments are unavailable: PAYABLE_BUSINESS_KEY / PAYABLE_BUSINESS_TOKEN are not configured.',
    )
  }

  const basic = Buffer.from(`${businessKey}:${businessToken}`).toString('base64')
  const url = `${getPayableApiBaseUrl()}/ipg/v2/auth/tokenize`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      // PAYable's docs show: "Authorization: {basicAuthToken}" without "Basic "
      // prefix for this exchange. We stay on the documented form.
      Authorization:   basic,
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  })

  const json = (await res.json().catch(() => ({}))) as PayableAuthResponse & {
    error?: unknown
  }
  const token = json.accessToken ?? json.access_token

  if (res.ok && token) {
    const ttl = Math.max((json.expires_in ?? 3600) - 60, 60)
    await redis.set(ACCESS_TOKEN_REDIS_KEY, token, 'EX', ttl).catch(() => {})
    return token
  }

  // PAYable returns { status, error } for auth failures (often HTTP 200 with
  // status:404 in the body, sometimes HTTP 401). The most common cause in
  // practice is wrong / typo'd PAYABLE_BUSINESS_KEY/PAYABLE_BUSINESS_TOKEN, or
  // sandbox creds used against the live endpoint (and vice versa).
  const gatewayMessage =
    typeof json.error === 'string'
      ? json.error
      : `HTTP ${res.status}`

  throw new AppError(
    'PAYABLE_BUSINESS_AUTH_FAILED',
    503,
    `PAYable rejected the business credentials (${gatewayMessage}). ` +
      'Verify PAYABLE_BUSINESS_KEY and PAYABLE_BUSINESS_TOKEN in the API ' +
      'environment match the PAYable merchant portal for the current mode ' +
      `(${payableConfig.sandboxMode ? 'sandbox' : 'live'}).`,
  )
}

// ——— Tokenize REST helpers ———

export interface PayableTokenizePayResponse {
  status?: number
  success?: boolean
  statusCode?: number
  statusMessage?: string
  payableTransactionId?: string
  payableOrderId?: string
  payableAmount?: string
  payableCurrency?: string
  invoiceNo?: string
  paymentScheme?: string
  paymentMethod?: number
  cardHolderName?: string
  cardNumber?: string
  checkValue?: string
  error?: unknown
}

/**
 * Charge a previously-saved card token.
 *
 *   POST {base}/ipg/v2/tokenize/pay
 *   Authorization: Bearer {accessToken}
 *
 * Caller is responsible for confirming the order in the database when this
 * function resolves with statusCode=1. The webhook will follow with the same
 * `payableTransactionId` — the DB unique constraint deduplicates.
 */
export async function payWithSavedCardRequest({
  invoiceId,
  amount,
  currencyCode,
  customerId,
  tokenId,
  custom1,
  custom2,
}: {
  invoiceId: string
  amount: string
  currencyCode: string
  customerId: string
  tokenId: string
  custom1?: string
  custom2?: string
}): Promise<PayableTokenizePayResponse> {
  const accessToken = await getPayableAccessToken()
  const checkValue = getPayWithTokenCheckValue({
    invoiceId,
    amount,
    currencyCode,
    customerId,
    tokenId,
  })

  const body = {
    merchantId:   payableConfig.merchantKey,
    customerId,
    tokenId,
    invoiceId,
    amount,
    currencyCode,
    checkValue,
    webhookUrl:   getWebhookUrl(),
    custom1:      custom1 ?? '',
    custom2:      custom2 ?? '',
  }

  const url = `${getPayableApiBaseUrl()}/ipg/v2/tokenize/pay`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      Authorization:   `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  })

  const json = (await res.json().catch(() => ({}))) as PayableTokenizePayResponse
  return { ...json, status: res.status }
}

export async function deleteSavedCardRequest({
  customerId,
  tokenId,
}: {
  customerId: string
  tokenId: string
}): Promise<{ ok: boolean; status: number; body: unknown }> {
  const checkValue = getDeleteCardCheckValue({ customerId, tokenId })
  const url = `${getPayableApiBaseUrl()}/ipg/v2/tokenize/deleteCard`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantId: payableConfig.merchantKey,
      customerId,
      tokenId,
      checkValue,
    }),
  })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

// ——— Misc ———

const ALPHA2_TO_ALPHA3: Record<string, string> = {
  LK: 'LKA', SG: 'SGP', US: 'USA', GB: 'GBR',
  AU: 'AUS', CA: 'CAN', DE: 'DEU', FR: 'FRA',
  JP: 'JPN', AE: 'ARE', IN: 'IND',
}

export function toAlpha3(alpha2: string): string {
  return ALPHA2_TO_ALPHA3[alpha2.toUpperCase()] ?? 'LKA'
}

// ——— Backwards-compatible aliases ———

/** @deprecated use getOneTimeCheckValue */
export const generateCheckValue = getOneTimeCheckValue

// ——— Types ———

export interface PayableWebhookPayload {
  merchantKey:           string
  payableOrderId:        string
  payableTransactionId:  string
  payableAmount:         string
  payableCurrency:       string
  invoiceNo:             string
  statusCode:            number | string
  statusMessage:         string
  paymentType:           number | string
  paymentMethod:         number | string
  paymentScheme:         string
  txType?:               string
  custom1?:              string
  custom2?:              string
  cardHolderName?:       string
  cardNumber?:           string
  checkValue:            string
  /** Tokenize-only fields */
  customerRefNo?:        string
  paymentId?:            string
  merchantId?:           string
  customerId?:           string
  uid?:                  string
  statusIndicator?:      string
  token?:                {
    tokenId:        string
    maskedCardNo:   string
    exp?:           string
    reference?:     string | null
    nickname?:      string | null
    tokenStatus?:   string
    defaultCard?:   number
  }
}
