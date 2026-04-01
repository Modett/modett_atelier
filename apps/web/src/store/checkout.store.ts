import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type StepKey = 'email' | 'shipping' | 'information' | 'payment'
type TitleOption = 'Mr' | 'Ms' | 'Miss' | 'Mrs'
type DeliveryType = 'home' | 'boutique'

interface ShippingAddress {
  title: TitleOption
  firstName: string
  lastName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  countryCode: string
  postcode: string
}

interface CheckoutStore {
  step: StepKey
  email: string | null
  isGuest: boolean
  title: TitleOption | null
  deliveryType: DeliveryType | null
  shippingMethodId: string | null
  boutiqueId: string | null
  giftPackaging: boolean
  giftMessage: string | null
  shippingAddress: ShippingAddress | null
  billingAddress: ShippingAddress | null
  sameAsBilling: boolean
  reservationId: string | null
  orderId: string | null
  orderRef: string | null
  expiresAt: string | null
  paymentSubmitted: boolean
  cartId: string | null
  /** Order total string (from POST /checkout/start summary.total) — used for display only */
  orderTotal: string | null
  promoCode:        string | null
  promoDiscount:    string | null
  promoType:        string | null
  promoValue:       string | null

  setStep: (step: StepKey) => void
  setEmail: (email: string, isGuest: boolean) => void
  setDelivery: (type: DeliveryType, methodId: string | null, boutiqueId?: string | null) => void
  setGiftOptions: (packaging: boolean, message: string | null) => void
  setAddresses: (
    shipping: ShippingAddress,
    billing: ShippingAddress | null,
    sameAsBilling: boolean,
    title: TitleOption,
  ) => void
  setShippingMethodId: (id: string) => void
  setReservation: (reservationId: string, orderId: string, orderRef: string, expiresAt: string) => void
  setPaymentSubmitted: (val: boolean) => void
  setCartId: (id: string) => void
  setOrderTotal: (total: string) => void
  setPromo: (
    code:     string,
    discount: string,
    type:     string,
    value:    string,
    newTotal: string,
  ) => void
  clearPromo: () => void
  clearCheckout: () => void
}

const INITIAL_STATE = {
  step: 'email' as const,
  email: null as string | null,
  isGuest: false,
  title: null as TitleOption | null,
  deliveryType: null as DeliveryType | null,
  shippingMethodId: null as string | null,
  boutiqueId: null as string | null,
  giftPackaging: false,
  giftMessage: null as string | null,
  shippingAddress: null as ShippingAddress | null,
  billingAddress: null as ShippingAddress | null,
  sameAsBilling: true,
  reservationId: null as string | null,
  orderId: null as string | null,
  orderRef: null as string | null,
  expiresAt: null as string | null,
  paymentSubmitted: false,
  cartId: null as string | null,
  orderTotal: null as string | null,
  promoCode:     null as string | null,
  promoDiscount: null as string | null,
  promoType:     null as string | null,
  promoValue:    null as string | null,
}

export const useCheckoutStore = create<CheckoutStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setStep: (step) => set({ step }),

      setEmail: (email, isGuest) => set({ email, isGuest }),

      setDelivery: (type, methodId, boutiqueId) =>
        set({ deliveryType: type, shippingMethodId: methodId, boutiqueId: boutiqueId ?? null }),

      setGiftOptions: (packaging, message) =>
        set({ giftPackaging: packaging, giftMessage: message }),

      setAddresses: (shipping, billing, sameAsBilling, title) =>
        set({ shippingAddress: shipping, billingAddress: billing, sameAsBilling, title }),

      setShippingMethodId: (shippingMethodId) => set({ shippingMethodId }),

      setReservation: (reservationId, orderId, orderRef, expiresAt) =>
        set({ reservationId, orderId, orderRef, expiresAt }),

      setPaymentSubmitted: (paymentSubmitted) => set({ paymentSubmitted }),

      setCartId: (cartId) => set({ cartId }),

      setOrderTotal: (orderTotal) => set({ orderTotal }),

      setPromo: (code, discount, type, value, newTotal) =>
        set({
          promoCode:     code,
          promoDiscount: discount,
          promoType:     type,
          promoValue:    value,
          orderTotal:    newTotal,
        }),

      clearPromo: () =>
        set({
          promoCode:     null,
          promoDiscount: null,
          promoType:     null,
          promoValue:    null,
        }),

      clearCheckout: () => set(INITIAL_STATE),
    }),
    {
      name: 'modett-checkout',
      storage: createJSONStorage(() => {
        if (typeof sessionStorage !== 'undefined') return sessionStorage
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
    },
  ),
)

export type { StepKey, TitleOption, DeliveryType, ShippingAddress }
