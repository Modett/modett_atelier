import type { ReactNode } from 'react'

const LAST_UPDATED = 'March 2026'

export const metadata = {
  title: 'Privacy Policy — Modett',
  description: 'How Modett collects, uses and protects your personal data.',
}

function PolicySection({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="mb-12 pb-12 border-b border-muted last:border-0 last:mb-0 last:pb-0">
      <div className="flex items-baseline gap-4 mb-5">
        <span className="font-body font-light text-[11px] uppercase tracking-[0.25em] text-highlight flex-shrink-0">
          {number}
        </span>
        <h2 className="font-display font-bold text-[22px] text-umber">{title}</h2>
      </div>
      <div className="space-y-4 font-body font-light text-[14px] text-ink leading-relaxed">
        {children}
      </div>
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-none space-y-2 pl-4">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2">
          <span className="text-highlight mt-1 flex-shrink-0">—</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-deep py-16 md:py-24">
        <div className="max-w-[900px] mx-auto px-5 md:px-10 text-center">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.25em] text-background/60 mb-4">
            Legal
          </p>
          <h1 className="font-display font-bold text-[36px] md:text-[48px] text-background leading-tight">
            Privacy Policy
          </h1>
          <p className="font-body font-light text-[14px] text-background/70 mt-4">
            Last updated: {LAST_UPDATED}
          </p>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-5 md:px-10 py-16 md:py-24">
        <PolicySection number="01" title="Introduction">
          <p>
            Modett is a premium fashion brand owned and operated by [Company Name], incorporated in
            Sri Lanka. Registered address: [Address], Colombo, Sri Lanka. Contact email:{' '}
            <a
              href="mailto:privacy@modett.com"
              className="text-umber underline underline-offset-4 hover:text-umber/80"
            >
              privacy@modett.com
            </a>
          </p>
          <p>
            This Privacy Policy explains how we collect, use, store and protect your personal data when
            you use modett.com (&quot;the Website&quot;). It applies to all visitors, customers and
            account holders, including those in Sri Lanka and Singapore.
          </p>
          <p>
            By using our Website, you agree to the practices described in this policy. If you do not
            agree, please do not use the Website.
          </p>
          <p>We comply with:</p>
          <BulletList
            items={[
              'Sri Lanka Personal Data Protection Act No. 9 of 2022 (PDPA LK)',
              'Singapore Personal Data Protection Act 2012 (PDPA SG)',
            ]}
          />
        </PolicySection>

        <PolicySection number="02" title="Information We Collect">
          <p>We collect the following categories of personal information:</p>
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber pt-2">
            Account information (when you register)
          </p>
          <BulletList
            items={[
              'Full name',
              'Email address',
              'Password (stored as a one-way encrypted hash — we cannot read it)',
              'Newsletter subscription preference',
            ]}
          />
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber pt-2">
            Order information (when you place an order)
          </p>
          <BulletList
            items={[
              'Billing and shipping address',
              'Phone number',
              'Order history and items purchased',
              'Payment status (we do not store card numbers — see Section 5)',
            ]}
          />
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber pt-2">
            Automatically collected (when you use the Website)
          </p>
          <BulletList
            items={[
              'Country and currency detected from your IP address (via Cloudflare geo-detection — we do not store raw IP addresses)',
              'Session cookies to keep you logged in and maintain your cart',
              'Cart contents (temporarily stored until checkout or expiry)',
              'Browser type and device type (for technical optimisation only)',
            ]}
          />
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber pt-2">
            Optional (when you choose to provide)
          </p>
          <BulletList
            items={[
              'Product reviews and ratings',
              'Wishlist items',
              'Gift messages on orders',
            ]}
          />
        </PolicySection>

        <PolicySection number="03" title="How We Use Your Information">
          <p>We use your personal data only for legitimate purposes:</p>
          <BulletList
            items={[
              'Processing and fulfilling your orders',
              'Sending order confirmation and shipping updates by email',
              'Managing your loyalty points balance and tier status',
              'Sending newsletters and promotions (only if you opted in, and you can unsubscribe at any time)',
              'Improving our Website and product catalogue',
              'Detecting and preventing fraud and unauthorised access',
              'Complying with legal obligations in Sri Lanka and Singapore',
              'Responding to customer service enquiries',
            ]}
          />
          <p>
            We do not use your data for automated decision-making or profiling that produces legal
            effects.
          </p>
        </PolicySection>

        <PolicySection number="04" title="Cookies and Tracking">
          <p>
            We use the following cookies. We do not use advertising or third-party tracking cookies.
          </p>
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber pt-2">
            Essential cookies (cannot be disabled — required for the site to work)
          </p>
          <BulletList
            items={[
              'sid: your login session (expires after 24 hours or 30 days if you selected "Remember me")',
              'cid: your shopping cart session (expires after 21 days)',
              'country: your detected country for currency selection (expires after 30 days)',
              'currency: your preferred currency (expires after 30 days)',
            ]}
          />
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber pt-2">
            Analytics
          </p>
          <BulletList
            items={[
              'We use Cloudflare Web Analytics which is privacy-first, cookie-free, and does not track individual users.',
              'We use Vercel Analytics for technical performance monitoring.',
            ]}
          />
          <p>
            We do not use Google Analytics, Meta Pixel, or any advertising network cookies.
          </p>
        </PolicySection>

        <PolicySection number="05" title="Payment Processing">
          <div className="bg-surface-raised border-l-2 border-umber p-5 my-6">
            <p className="font-body font-light text-[13px] text-umber">
              Your card details are never stored on Modett&apos;s servers. All payment processing is
              handled by PAYable, a licensed payment gateway regulated by the Central Bank of Sri
              Lanka.
            </p>
          </div>
          <p>When you pay by card, you are redirected to PAYable&apos;s secure payment page. Modett receives only:</p>
          <BulletList
            items={[
              'Whether the payment succeeded or failed',
              'The transaction reference number',
              'The masked card number (e.g. **** **** **** 1234) for your receipt',
            ]}
          />
          <p>
            PAYable&apos;s privacy policy applies to the data you enter on their payment page:{' '}
            <a
              href="https://payable.lk/privacy"
              className="text-umber underline underline-offset-4 hover:text-umber/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://payable.lk/privacy
            </a>
          </p>
          <p>
            We accept Visa and Mastercard credit and debit cards. Payments are processed in Sri Lankan
            Rupees (LKR).
          </p>
        </PolicySection>

        <PolicySection number="06" title="Data Storage and Security">
          <p>Your data is stored on secure servers provided by:</p>
          <BulletList
            items={[
              'Railway (database and API servers — United States)',
              'Cloudflare R2 (product images — global CDN)',
              'Vercel (website hosting — global edge network)',
            ]}
          />
          <p>We protect your data with:</p>
          <BulletList
            items={[
              'HTTPS encryption on all connections',
              'Passwords stored as bcrypt hashes (irreversible encryption)',
              'Session tokens stored in Redis with automatic expiry',
              'Database access restricted to authorised application only',
              'Cloudflare Web Application Firewall (WAF) and DDoS protection',
            ]}
          />
          <p>
            We retain your personal data for as long as your account is active. If you delete your
            account, your personal data is permanently deleted within 30 days, except for:
          </p>
          <BulletList
            items={[
              'Order records (retained for 7 years for tax/legal compliance)',
              'Anonymised analytics data',
            ]}
          />
        </PolicySection>

        <PolicySection number="07" title="Sharing Your Information">
          <p>We do not sell, rent or trade your personal data.</p>
          <p>
            We share data only with the service providers necessary to operate our business:
          </p>
          <BulletList
            items={[
              'PAYable (payment processing)',
              'Railway (database hosting)',
              'Vercel (website hosting)',
              'Cloudflare (CDN, security, image storage)',
              'Courier/delivery partners (your name, phone and address for order delivery — shared only when your order ships)',
            ]}
          />
          <p>
            All service providers are bound by data processing agreements. We do not share data with
            advertisers or data brokers.
          </p>
          <p>
            We may disclose your data if required by law, court order, or to protect the rights and
            safety of Modett and its customers.
          </p>
        </PolicySection>

        <PolicySection number="08" title="Your Rights">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber">
            Under the Sri Lanka PDPA (No. 9 of 2022)
          </p>
          <p>You have the right to:</p>
          <BulletList
            items={[
              'Access the personal data we hold about you',
              'Correct inaccurate personal data',
              'Request deletion of your personal data ("right to erasure")',
              'Withdraw consent for marketing communications at any time',
              'Lodge a complaint with the Data Protection Authority of Sri Lanka',
            ]}
          />
          <p className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber pt-4">
            Under the Singapore PDPA 2012
          </p>
          <p>You have the right to:</p>
          <BulletList
            items={[
              'Request access to your personal data',
              'Request correction of your personal data',
              'Withdraw consent for collection, use or disclosure of your personal data (note: withdrawal may affect our ability to provide services to you)',
              'Lodge a complaint with the Personal Data Protection Commission (PDPC) at www.pdpc.gov.sg',
            ]}
          />
          <p>
            To exercise any of these rights, contact us at{' '}
            <a
              href="mailto:privacy@modett.com"
              className="text-umber underline underline-offset-4 hover:text-umber/80"
            >
              privacy@modett.com
            </a>
            . We will respond within 30 days.
          </p>
        </PolicySection>

        <PolicySection number="09" title="Children's Privacy">
          <p>
            Our Website is not intended for children under 18 years of age. We do not knowingly
            collect personal data from children. If you believe we have inadvertently collected data
            from a child, please contact us at{' '}
            <a
              href="mailto:privacy@modett.com"
              className="text-umber underline underline-offset-4 hover:text-umber/80"
            >
              privacy@modett.com
            </a>{' '}
            and we will delete it immediately.
          </p>
        </PolicySection>

        <PolicySection number="10" title="Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. When we make significant changes, we
            will notify registered customers by email and update the &quot;Last updated&quot; date at
            the top of this page. We encourage you to review this policy periodically.
          </p>
          <p>
            Continued use of the Website after changes are posted constitutes acceptance of the updated
            policy.
          </p>
        </PolicySection>

        <PolicySection number="11" title="Contact Us">
          <p>
            If you have questions about this Privacy Policy or how we handle your personal data,
            please contact:
          </p>
          <div className="bg-surface-raised border-l-2 border-umber p-5 my-6">
            <p className="font-body font-light text-[13px] text-umber space-y-1">
              <span className="block font-medium">Modett Privacy Team</span>
              <span className="block">
                Email:{' '}
                <a
                  href="mailto:privacy@modett.com"
                  className="underline underline-offset-4 hover:text-umber/80"
                >
                  privacy@modett.com
                </a>
              </span>
              <span className="block">Address: [Company Address], Colombo, Sri Lanka</span>
              <span className="block">Response time: Within 30 days</span>
            </p>
          </div>
          <p>
            For Singapore customers, you may also contact the Personal Data Protection Commission:{' '}
            <a
              href="https://www.pdpc.gov.sg"
              className="text-umber underline underline-offset-4 hover:text-umber/80"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.pdpc.gov.sg
            </a>{' '}
            | Tel: 1800-CALL-PDPC
          </p>
        </PolicySection>
      </div>
    </div>
  )
}
