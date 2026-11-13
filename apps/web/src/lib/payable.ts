/**
 * PAYable checkout wrapper.
 *
 *   Sandbox (`isTestMode=true`):
 *     `payable-ipg-js` npm package → https://sandboxipgpayment.payable.lk/ipg/sandbox
 *
 *   Live (`isTestMode=false`):
 *     https://ipgsdk.payable.lk/sdk/v4/payable-checkout.js
 *     Hosted checkout: https://ipgpayment.payable.lk/ipg/pro
 *
 *   payablePayment(payment, isTestMode):
 *     - POSTs `payment` (camelCase fields) to PAYable.
 *     - On success: full-page redirect to PAYable's hosted checkout.
 *     - On error: returns { success: false, status, error } and does NOT
 *       navigate; we surface the error to the user.
 */

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error — the npm package ships no type declarations.
import { payablePayment as rawPayablePayment } from 'payable-ipg-js'

const LIVE_SDK_SRC = 'https://ipgsdk.payable.lk/sdk/v4/payable-checkout.js'

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

type LivePayablePayment = (
  payment: PayableSDKPayment,
) => Promise<PayablePaymentResult>

declare global {
  interface Window {
    payablePayment?: LivePayablePayment
  }
}

let liveSdkLoad: Promise<LivePayablePayment> | null = null

function loadLivePayablePayment(): Promise<LivePayablePayment> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('PAYable live SDK can only run in the browser'))
  }
  if (window.payablePayment) return Promise.resolve(window.payablePayment)
  if (liveSdkLoad) return liveSdkLoad

  liveSdkLoad = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${LIVE_SDK_SRC}"]`,
    )
    const onReady = () => {
      if (!window.payablePayment) {
        liveSdkLoad = null
        reject(new Error('PAYable live SDK loaded without payablePayment()'))
        return
      }
      resolve(window.payablePayment)
    }

    if (existing) {
      if (window.payablePayment) {
        resolve(window.payablePayment)
        return
      }
      existing.addEventListener('load', onReady, { once: true })
      existing.addEventListener(
        'error',
        () => {
          liveSdkLoad = null
          reject(new Error('Failed to load PAYable live checkout SDK'))
        },
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = LIVE_SDK_SRC
    script.async = true
    script.onload = onReady
    script.onerror = () => {
      liveSdkLoad = null
      reject(new Error('Failed to load PAYable live checkout SDK'))
    }
    document.head.appendChild(script)
  })

  return liveSdkLoad
}

export async function payablePayment(
  payment: PayableSDKPayment,
  isTestMode: boolean,
): Promise<PayablePaymentResult> {
  if (isTestMode) {
    return (await rawPayablePayment(payment, true)) as PayablePaymentResult
  }

  const livePayablePayment = await loadLivePayablePayment()
  return livePayablePayment(payment)
}
