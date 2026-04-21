'use client'

import { cn } from '@/lib/utils'
import { useCheckoutStore, type StepKey } from '@/store/checkout.store'

const STEPS = [
  { key: 'email' as const, label: 'E-mail address', number: 1 },
  { key: 'shipping' as const, label: 'Shipping', number: 2 },
  { key: 'information' as const, label: 'Information', number: 3 },
  { key: 'payment' as const, label: 'Payment', number: 4 },
]

const STEP_ORDER: StepKey[] = ['email', 'shipping', 'information', 'payment']

function getStepIndex(step: StepKey): number {
  return STEP_ORDER.indexOf(step)
}

export function CheckoutStepper() {
  const currentStep = useCheckoutStore((s) => s.step)
  const setStep = useCheckoutStore((s) => s.setStep)
  const currentIndex = getStepIndex(currentStep)

  return (
    <nav aria-label="Checkout progress" className="flex items-center justify-center gap-6 md:gap-10 py-4">
      {STEPS.map((step) => {
        const stepIndex = getStepIndex(step.key)
        const isActive = step.key === currentStep
        const isCompleted = stepIndex < currentIndex
        const isLocked = stepIndex > currentIndex

        return (
          <button
            key={step.key}
            type="button"
            disabled={isLocked || isActive}
            onClick={() => {
              if (isCompleted) setStep(step.key)
            }}
            className={cn(
              'font-body text-[13px] transition-colors duration-200 whitespace-nowrap',
              isActive && 'text-umber font-medium cursor-default',
              isCompleted && 'text-umber font-light cursor-pointer hover:text-graphite',
              isLocked && 'text-umber/40 font-light cursor-default',
            )}
            aria-current={isActive ? 'step' : undefined}
          >
            {isCompleted && (
              <span className="text-[#4A7C59] mr-1" aria-hidden="true">✓</span>
            )}
            {step.number}. {step.label}
          </button>
        )
      })}
    </nav>
  )
}
