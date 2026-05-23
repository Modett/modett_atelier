/**
 * Typed wrapper around `payable-ipg-js`.
 *
 * The npm package is plain JavaScript with no .d.ts file. We declare the
 * shape inline here and re-export a strictly-typed `payablePayment` so the
 * rest of the app can use it safely.
 *
 *   payablePayment(payment, isTestMode):
 *     - POSTs `payment` (camelCase fields) to PAYable.
 *     - On success: full-page redirect to PAYable's hosted checkout.
 *     - On error: returns { success: false, status, error } and does NOT
 *       navigate; we surface the error to the user.
 *
 * Resolved environment is decided by `isTestMode`:
 *   true  → https://sandboxipgpayment.payable.lk/ipg/sandbox
 *   false → https://ipgpayment.payable.lk/ipg/pro
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — the npm package ships no type declarations.
import { payablePayment as rawPayablePayment } from 'payable-ipg-js'

/** Fields the SDK forwards to the gateway. Server-built, client-passthrough. */
export interface PayableSDKPayment {
  merchantKey:                  string
  checkValue:                   string
  invoiceId:                    string
  amount:                       string
  currencyCode:                 string
  paymentType:                  '1' | '2' | '3'
  orderDescription:             string
  notifyUrl:                    string
  returnUrl:                    string
  logoUrl:                      string
  customerFirstName:            string
  customerLastName:             string
  customerEmail:                string
  customerMobilePhone:          string
  customerPhone?:               string
  billingAddressStreet:         string
  billingAddressStreet2?:       string
  billingCompanyName?:          string
  billingAddressCity:           string
  billingAddressStateProvince?: string
  billingAddressCountry:        string
  billingAddressPostcodeZip?:   string
  custom1?:                     string
  custom2?:                     string
  /** Only when paymentType === '3' */
  isSaveCard?:                  '0' | '1'
  doFirstPayment?:              '0' | '1'
  customerRefNo?:               string
  /** Only when paymentType === '2' (subscription) — not used by Modett today */
  startDate?:                   string
  endDate?:                     string
  recurringAmount?:             string
  interval?:                    'MONTHLY' | 'ANNUALLY'
  isRetry?:                     '0' | '1'
  retryAttempts?:               string
}

export type PayablePaymentResult =
  | { success: true; status: number; message: string }
  | { success: false; status: number; error: string | Record<string, string[]> }

export async function payablePayment(
  payment: PayableSDKPayment,
  isTestMode: boolean,
): Promise<PayablePaymentResult> {
  return (await rawPayablePayment(payment, isTestMode)) as PayablePaymentResult
}
