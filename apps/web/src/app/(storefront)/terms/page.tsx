export const metadata = {
  title: 'Terms of Sale — Modett',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="bg-deep py-16 md:py-24">
        <div className="max-w-[900px] mx-auto px-5 md:px-10 text-center">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.25em] text-background/60 mb-4">
            Legal
          </p>
          <h1 className="font-display font-bold text-[36px] md:text-[48px] text-background">
            Terms of Sale
          </h1>
        </div>
      </div>
      <div className="max-w-[900px] mx-auto px-5 md:px-10 py-16">
        <p className="font-body font-light text-[14px] text-ink">
          Our Terms of Sale will be published here shortly. For any enquiries, please contact us at{' '}
          <a
            href="mailto:hello@modett.com"
            className="text-umber underline underline-offset-4"
          >
            hello@modett.com
          </a>
        </p>
      </div>
    </div>
  )
}
