/**
 * PAYable IPG config — check_value generation and webhook verification.
 * Credentials from env; never hard-coded.
 */

import crypto from 'node:crypto'

const sha512 = (s: string): string =>
  crypto.createHash('sha512').update(s).digest('hex').toUpperCase()

export const payableConfig = {
  merchantKey: process.env.PAYABLE_MERCHANT_KEY ?? '',
  merchantToken: process.env.PAYABLE_MERCHANT_TOKEN ?? '',
  sandboxMode: process.env.NODE_ENV !== 'production',
}

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
  return sha512(
    `${merchantKey}|${invoiceId}|${amount}|${currencyCode}|${tokenHash}`,
  )
}

export function verifyCallbackCheckValue(
  payload: PayableWebhookPayload,
): boolean {
  const { merchantToken } = payableConfig
  const tokenHash = sha512(merchantToken)
  const expected = sha512(
    `${payload.merchantKey}|` +
      `${payload.payableOrderId}|` +
      `${payload.payableTransactionId}|` +
      `${payload.payableAmount}|` +
      `${payload.payableCurrency}|` +
      `${payload.invoiceNo}|` +
      `${payload.statusCode}|` +
      tokenHash,
  )
  return expected === payload.checkValue
}

export type PayableWebhookPayload = {
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
  custom1?: string
  custom2?: string
  cardHolderName?: string
  cardNumber?: string
  checkValue: string
}
