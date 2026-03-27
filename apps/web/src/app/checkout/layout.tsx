'use client'

import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { useState } from 'react'
import { ShoppingBag, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CheckoutOrderSummary } from '@/components/checkout/CheckoutOrderSummary'
import { useCheckoutStore } from '@/store/checkout.store'
import { useCountry } from '@/hooks/useCountry'

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { shippingAddress, shippingMethodId } = useCheckoutStore()
  const detectedCountry = useCountry()
  const [mobileOrderOpen, setMobileOrderOpen] = useState(false)

  const countryCode = shippingAddress?.countryCode ?? detectedCountry

  return (
    <div className="min-h-screen bg-background">
      <Script
        id="payable-sdk"
        src={
          process.env.NODE_ENV === 'production'
            ? 'https://ipgsdk.payable.lk/sdk/v3/payable-checkout.js'
            : 'https://sandboxipgsdk.payable.lk/sdk/v3/payable-checkout.js'
        }
        strategy="afterInteractive"
      />
      <header className="border-b border-muted h-14 flex items-center justify-center px-4">
        <Link href="/" aria-label="Modett — return to homepage">
          <Image
            src="/images/logo.png"
            alt="Modett"
            width={120}
            height={32}
            className="h-9 w-auto object-contain"
            priority
          />
        </Link>
      </header>

      <button
        type="button"
        onClick={() => setMobileOrderOpen(p => !p)}
        className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-surface-raised border-b border-muted"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-umber" />
          <span className="font-body font-light text-[13px] uppercase tracking-[0.15em] text-umber">
            {mobileOrderOpen ? 'Hide' : 'Show'} order summary
          </span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-muted-foreground transition-transform duration-200',
              mobileOrderOpen ? 'rotate-180' : 'rotate-0',
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          'lg:hidden overflow-hidden transition-all duration-300',
          'bg-surface-raised border-b border-muted px-4 py-5',
          mobileOrderOpen ? 'block' : 'hidden',
        )}
      >
        <CheckoutOrderSummary
          countryCode={countryCode}
          selectedMethodId={shippingMethodId}
        />
      </div>

      <div className="max-w-[1024px] mx-auto px-4 md:px-6 lg:px-8 py-8 flex flex-col lg:flex-row lg:gap-16 lg:items-start">
        <div className="flex-1 min-w-0">
          {children}
        </div>

        <div className="hidden lg:block w-80 xl:w-96 flex-shrink-0 sticky top-8 self-start">
          <CheckoutOrderSummary
            countryCode={countryCode}
            selectedMethodId={shippingMethodId}
            className="border-l border-muted pl-8"
          />
        </div>
      </div>
    </div>
  )
}
