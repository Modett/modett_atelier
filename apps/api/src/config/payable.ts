/**
 * PAYable IPG config — checkValue generation and webhook verification.
 *
 * Payment flow (CDN SDK v3):
 *   1. Backend generates checkValue using merchantToken (stays server-side)
 *   2. Backend returns snake_case payment params to frontend
 *   3. Frontend loads PAYable SDK via CDN <Script> tag
 *   4. Frontend calls window.payable.startPayment(params)
 *   5. PAYable sends webhook to our notify_url after payment
 *
 * checkValue formula (outbound):
 *   UPPERCASE(SHA512[merchantKey | invoiceId | amount | currencyCode | UPPERCASE(SHA512[merchantToken])])
 *
 * checkValue formula (callback):
 *   UPPERCASE(SHA512[merchantKey | payableOrderId | payableTransactionId | payableAmount | payableCurrency | invoiceNo | statusCode | UPPERCASE(SHA512[merchantToken])])
 */

import crypto from 'node:crypto'

const sha512 = (s: string): string =>
  crypto.createHash('sha512').update(s).digest('hex').toUpperCase()

export const payableConfig = {
  merchantKey: process.env.PAYABLE_MERCHANT_KEY ?? '',
  merchantToken: process.env.PAYABLE_MERCHANT_TOKEN ?? '',
  apiUrl: process.env.API_URL ?? 'http://localhost:3001',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  logoUrl:
    process.env.PAYABLE_LOGO_URL ?? '',
  get sandboxMode() {
    return process.env.NODE_ENV !== 'production'
  },
}

if (!payableConfig.merchantKey || !payableConfig.merchantToken) {
  console.error(
    '⚠️  PAYABLE_MERCHANT_KEY or PAYABLE_MERCHANT_TOKEN not set in .env',
  )
}

/**
 * Generate outbound checkValue for payment session creation.
 * The merchantToken never leaves the server — only the resulting hash is sent.
 */
export function generateCheckValue({
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

/**
 * Verify PAYable callback checkValue.
 * Must be the FIRST thing checked in the webhook handler — before reading any other field.
 */
export function verifyCallbackCheckValue(payload: PayableWebhookPayload): boolean {
  const { merchantToken } = payableConfig
  const tokenHash = sha512(merchantToken)
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
  return expected === payload.checkValue
}

const ALPHA2_TO_ALPHA3: Record<string, string> = {
  LK: 'LKA', SG: 'SGP', US: 'USA', GB: 'GBR',
  AU: 'AUS', CA: 'CAN', DE: 'DEU', FR: 'FRA',
  JP: 'JPN', AE: 'ARE', IN: 'IND',
}

export function toAlpha3(alpha2: string): string {
  return ALPHA2_TO_ALPHA3[alpha2.toUpperCase()] ?? 'LKA'
}

// ——— Types ———

export interface PayableWebhookPayload {
  merchantKey: string
  payableOrderId: string
  payableTransactionId: string
  payableAmount: string
  payableCurrency: string
  invoiceNo: string
  statusCode: number
  statusMessage: string
  paymentType: number
  paymentMethod: number
  paymentScheme: string
  txType: string
  custom1?: string
  custom2?: string
  cardHolderName?: string
  cardNumber?: string
  checkValue: string
}
