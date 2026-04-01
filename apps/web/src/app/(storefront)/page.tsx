import { HomepageHero } from '@/components/storefront/HomepageHero'
import { HomepageNewsletter } from '@/components/storefront/HomepageNewsletter'
import { HomepageBestsellers } from '@/components/storefront/HomepageBestsellers'
import { EditorialCarousel } from '@modett/ui'
import { HOMEPAGE_CAROUSEL_SLIDES } from '@/lib/placeholder-data'

export default function HomePage() {
  return (
    <>
      <HomepageHero imageUrl="/images/hero-placeholder.png" />

      <HomepageBestsellers />

      <EditorialCarousel
        slides={HOMEPAGE_CAROUSEL_SLIDES}
        imageSuffix=""
        bodyText="A philosophy of buying fewer, better pieces. We craft investment-quality garments from the finest natural fabrics, designed to endure for years, not seasons."
        ctaText="Learn More"
        ctaHref="/brand-philosophy"
      />

      <HomepageNewsletter />
    </>
  )
}
