'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCheckoutStore } from '@/store/checkout.store'
import { useSession } from '@/hooks/useSession'
import { CheckoutStepper } from '@/components/checkout/CheckoutStepper'
import { CheckoutSection } from '@/components/checkout/CheckoutSection'
import { ReservationTimer } from '@/components/checkout/ReservationTimer'
import { EmailStep, EmailSummary } from '@/components/checkout/steps/EmailStep'
import { ShippingStep, ShippingSummary } from '@/components/checkout/steps/ShippingStep'
import { InformationStep, InformationSummary } from '@/components/checkout/steps/InformationStep'
import { PaymentStep } from '@/components/checkout/steps/PaymentStep'

export default function CheckoutPage() {
  const step = useCheckoutStore((s) => s.step)
  const reservationId = useCheckoutStore((s) => s.reservationId)
  const setStep = useCheckoutStore((s) => s.setStep)
  const setEmail = useCheckoutStore((s) => s.setEmail)
  const { isLoggedIn, user, isLoading } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (step !== 'email' && !reservationId) {
      router.push('/cart')
    }
  }, [step, reservationId, router])

  useEffect(() => {
    if (!isLoading && isLoggedIn && user && step === 'email') {
      setEmail(user.email, false)
    }
  }, [isLoading, isLoggedIn, user, step, setEmail])

  const isEmailComplete = step !== 'email'
  const isShippingComplete = step === 'information' || step === 'payment'
  const isInfoComplete = step === 'payment'

  return (
    <div>
      <CheckoutStepper />
      <ReservationTimer />

      <div className="space-y-0 mt-6">
        <CheckoutSection
          stepKey="email"
          stepNumber={1}
          title="E-mail address"
          isActive={step === 'email'}
          isCompleted={isEmailComplete}
          isLocked={false}
          onEdit={() => setStep('email')}
          summary={<EmailSummary />}
        >
          <EmailStep />
        </CheckoutSection>

        <CheckoutSection
          stepKey="shipping"
          stepNumber={2}
          title="Shipping"
          isActive={step === 'shipping'}
          isCompleted={isShippingComplete}
          isLocked={step === 'email'}
          onEdit={() => setStep('shipping')}
          summary={<ShippingSummary />}
        >
          <ShippingStep />
        </CheckoutSection>

        <CheckoutSection
          stepKey="information"
          stepNumber={3}
          title="Information"
          isActive={step === 'information'}
          isCompleted={isInfoComplete}
          isLocked={step === 'email' || step === 'shipping'}
          onEdit={() => setStep('information')}
          summary={<InformationSummary />}
        >
          <InformationStep />
        </CheckoutSection>

        <CheckoutSection
          stepKey="payment"
          stepNumber={4}
          title="Payment"
          isActive={step === 'payment'}
          isCompleted={false}
          isLocked={step !== 'payment'}
          onEdit={() => {}}
        >
          <PaymentStep />
        </CheckoutSection>
      </div>
    </div>
  )
}
