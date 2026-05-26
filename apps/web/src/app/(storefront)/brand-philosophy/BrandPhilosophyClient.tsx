'use client'

import Image from 'next/image'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { OutlineButton } from '@modett/ui'

// ─── Scroll-reveal wrapper ────────────────────────────────────────────────────

function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      animate={
        inView || prefersReducedMotion
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: 32 }
      }
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── Section label (eyebrow) ──────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-body font-light text-[11px] uppercase tracking-[0.25em] text-highlight mb-4">
      {children}
    </p>
  )
}

// ─── SECTION 1: Hero ─────────────────────────────────────────────────────────

function HeroSection() {
  const prefersReducedMotion = useReducedMotion()

  return (
    <section className="relative w-full overflow-hidden bg-deep min-h-[70vh] md:min-h-[80vh] flex flex-col">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-image.jpg"
          alt="Modett — Brand Philosophy"
          fill
          priority
          quality={85}
          className="object-cover object-center opacity-30"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-deep/60 via-deep/50 to-deep/90" />
      </div>

      <div className="relative z-10 flex flex-col flex-1 justify-center items-center px-5 md:px-10 py-24 md:py-32 text-center">
        <motion.p
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="font-body font-light text-[11px] uppercase tracking-[0.35em] text-background/50 mb-6 md:mb-8"
        >
          Our Philosophy
        </motion.p>

        <motion.h1
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-bold text-background leading-none
                     text-[2.6rem] md:text-[4rem] lg:text-[5.5rem]
                     max-w-[14ch] mx-auto mb-6 md:mb-8"
        >
          Designed for the Woman Who Knows Her Worth
        </motion.h1>

        <motion.p
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65, ease: 'easeOut' }}
          className="font-body font-light text-background/70 text-[15px] md:text-[17px]
                     tracking-wide leading-relaxed max-w-[38ch] mx-auto mb-10 md:mb-14"
        >
          Quiet luxury, defined by intention.
          <br className="hidden md:block" />
          {' '}Natural. Timeless. Effortless.
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <OutlineButton variant="inverse" size="lg" as="a" href="/collections">
            Shop the Collection
          </OutlineButton>
        </motion.div>
      </div>

      <motion.div
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 1.2 }}
        className="relative z-10 flex justify-center pb-8"
        aria-hidden
      >
        <div className="flex flex-col items-center gap-2">
          <div className="w-px h-8 bg-background/30 animate-pulse" />
          <p className="font-body font-light text-[10px] uppercase tracking-[0.3em] text-background/30">
            Scroll
          </p>
        </div>
      </motion.div>
    </section>
  )
}

// ─── SECTION 2: Signature statement ──────────────────────────────────────────

function SignatureSection() {
  return (
    <section className="bg-background py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[900px] mx-auto text-center">
        <Reveal>
          <p className="font-body font-light text-[11px] uppercase tracking-[0.3em] text-highlight mb-8">
            — Defined by Intention —
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <blockquote
            className="font-display font-bold text-umber leading-tight
                       text-[1.9rem] md:text-[2.75rem] lg:text-[3.25rem]
                       max-w-[22ch] mx-auto"
          >
            In a world of excess,{' '}
            <em className="not-italic text-highlight">we offer restraint.</em>
            {' '}In a world of fast fashion,{' '}
            <em className="not-italic text-highlight">we offer permanence.</em>
          </blockquote>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="mt-10 w-12 h-px bg-highlight mx-auto" />
        </Reveal>
      </div>
    </section>
  )
}

// ─── SECTION 3: Our Purpose ───────────────────────────────────────────────────

function PurposeSection() {
  return (
    <section className="bg-surface py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
        <div className="lg:sticky lg:top-24">
          <Reveal>
            <Eyebrow>Our Purpose</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-bold text-umber leading-tight
                           text-[2rem] md:text-[2.75rem] lg:text-[3rem]
                           max-w-[16ch]">
              Created for Women Who Choose with Intention
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-8 w-10 h-px bg-highlight" />
          </Reveal>
        </div>

        <div className="space-y-6">
          <Reveal delay={0.15}>
            <p className="font-body font-light text-[15px] md:text-[16px] text-ink leading-loose">
              Modett was created for women who understand that true style is not
              defined by trends, but by how something feels, how it lasts, and
              how effortlessly it becomes part of their lives.
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <p className="font-body font-light text-[15px] md:text-[16px] text-ink leading-loose">
              Each piece is designed to move with you — across moments, moods,
              and occasions. Not to be noticed, but to be{' '}
              <span className="font-medium text-umber">felt.</span>
            </p>
          </Reveal>
          <Reveal delay={0.29}>
            <p className="font-body font-light text-[15px] md:text-[16px] text-ink leading-loose">
              We believe the most powerful wardrobe is a considered one. Fewer
              pieces. Better choices. Garments that earn their place by being
              worn, loved, and worn again.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 4: What We Believe (pillars) ────────────────────────────────────

const PILLARS = [
  {
    number: '01',
    title: 'Timeless Over Temporary',
    body: 'Style should outlive seasons. We design for longevity — pieces that grow with you, not ones that date with a trend.',
  },
  {
    number: '02',
    title: 'Effortless Versatility',
    body: 'One piece. Many expressions. A linen set is never just one look — it becomes what you need it to be. Understated by day. Elevated by night.',
  },
  {
    number: '03',
    title: 'Natural is Essential',
    body: 'Only 100% natural fabrics. Linen, silk, cashmere, cotton. No polyester. No compromise. The fabric is always the beginning of the story.',
  },
  {
    number: '04',
    title: 'Quiet Luxury',
    body: 'Refinement is felt, not announced. We are not interested in logos. We are interested in the weight of the fabric, the fall of a hem, the precision of a seam.',
  },
] as const

function BeliefsSection() {
  return (
    <section className="bg-background py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-16 md:mb-20 text-center md:text-left">
          <Reveal>
            <Eyebrow>What We Believe</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-bold text-umber leading-tight
                           text-[2rem] md:text-[2.75rem] max-w-[20ch]
                           mx-auto md:mx-0">
              Four Principles. One Standard.
            </h2>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {PILLARS.map((pillar, i) => (
            <Reveal key={pillar.number} delay={i * 0.08}>
              <div
                className={[
                  'p-8 md:p-10 border-muted group',
                  i % 2 === 0 ? 'md:border-r' : '',
                  i < 2 ? 'border-b' : '',
                ].join(' ')}
              >
                <p className="font-body font-light text-[11px] uppercase tracking-[0.3em] text-highlight mb-5">
                  {pillar.number}
                </p>

                <div className="w-8 h-px bg-umber/30 mb-6 transition-all duration-500 group-hover:w-16 group-hover:bg-highlight" />

                <h3 className="font-display font-bold text-umber text-[1.35rem] md:text-[1.5rem] mb-4 leading-snug">
                  {pillar.title}
                </h3>

                <p className="font-body font-light text-[14px] text-ink leading-loose">
                  {pillar.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 5: Fabric / Materials strip ─────────────────────────────────────

const MATERIALS = ['100% Linen', '100% Silk', 'Grade A Cashmere', '100% Cotton', 'Mulberry Silk'] as const

function MaterialsStrip() {
  const tripled = [...MATERIALS, ...MATERIALS, ...MATERIALS]

  return (
    <section className="bg-deep py-5 overflow-hidden" aria-label="Our materials">
      <div
        className="flex gap-12 items-center whitespace-nowrap animate-marquee"
        style={{ width: 'max-content' }}
      >
        {tripled.map((m, i) => (
          <span key={i} className="flex items-center gap-12">
            <span className="font-body font-light text-[11px] uppercase tracking-[0.3em] text-background/60">
              {m}
            </span>
            <span className="text-highlight text-[10px]" aria-hidden>✦</span>
          </span>
        ))}
      </div>
    </section>
  )
}

// ─── SECTION 6: Design Approach ──────────────────────────────────────────────

function DesignApproachSection() {
  return (
    <section className="bg-surface py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-16 lg:gap-24 items-center">
          <Reveal>
            <div className="relative w-full aspect-[3/4] bg-umber/10 overflow-hidden">
              <Image
                src="/images/studio.png"
                alt="Modett atelier — design process"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
              <div className="absolute bottom-6 left-6 bg-background/95 px-4 py-3">
                <p className="font-body font-light text-[10px] uppercase tracking-[0.3em] text-highlight">
                  Atelier
                </p>
                <p className="font-display font-bold text-umber text-[15px] mt-0.5">
                  Where it begins
                </p>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <Eyebrow>Our Design Approach</Eyebrow>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-display font-bold text-umber leading-tight
                             text-[2rem] md:text-[2.6rem]
                             mb-8 max-w-[18ch]">
                Every Modett Piece Begins with Clarity
              </h2>
            </Reveal>

            <div className="space-y-5">
              <Reveal delay={0.18}>
                <p className="font-body font-light text-[15px] text-ink leading-loose">
                  We design with balance — structure and softness, precision and
                  ease. Silhouettes are tailored yet relaxed. Details are subtle,
                  but entirely intentional.
                </p>
              </Reveal>
              <Reveal delay={0.25}>
                <p className="font-body font-light text-[15px] text-ink leading-loose">
                  A Modett linen set is never just one look. It becomes what you
                  need it to be — understated by day, elevated by night. That
                  adaptability is not an accident. It is the design.
                </p>
              </Reveal>
              <Reveal delay={0.32}>
                <p className="font-body font-light text-[15px] text-ink leading-loose">
                  We obsess over the details most brands ignore — the weight of
                  a seam allowance, the fall of a hem at exactly the right
                  point, the way a fabric drapes after the third wash.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 7: For the Modern Woman ─────────────────────────────────────────

const WOMAN_TRAITS = [
  {
    title: 'Quality over quantity',
    body: 'She would rather own three exceptional pieces than thirty forgettable ones.',
  },
  {
    title: 'Ease over excess',
    body: 'Her wardrobe works for her life — not the other way around.',
  },
  {
    title: 'Confidence over display',
    body: 'She does not need to be noticed. She knows her own worth.',
  },
] as const

function ModernWomanSection() {
  return (
    <section className="bg-umber py-20 md:py-28 px-5 md:px-10 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
      >
        <p className="font-display font-bold text-background/[0.04] text-[12vw] whitespace-nowrap leading-none">
          MODETT
        </p>
      </div>

      <div className="relative max-w-[900px] mx-auto text-center">
        <Reveal>
          <p className="font-body font-light text-[11px] uppercase tracking-[0.3em] text-highlight mb-8">
            She is You
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display font-bold text-background leading-tight
                         text-[2rem] md:text-[3rem] lg:text-[3.5rem]
                         max-w-[20ch] mx-auto mb-10">
            She Does Not Follow Noise. She Chooses What Aligns.
          </h2>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 mt-12 md:mt-16 border-t border-background/20">
          {WOMAN_TRAITS.map((trait, i) => (
            <Reveal key={trait.title} delay={i * 0.1}>
              <div className={[
                'pt-8 pb-8 px-2 md:px-6',
                i < 2 ? 'md:border-r border-background/20' : '',
              ].join(' ')}>
                <p className="font-body font-medium text-[12px] uppercase tracking-[0.2em] text-highlight mb-3">
                  {trait.title}
                </p>
                <p className="font-body font-light text-[14px] text-background/70 leading-loose">
                  {trait.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.35}>
          <p className="mt-14 font-display font-bold text-background/90 text-[1.35rem] md:text-[1.6rem]">
            Modett exists for her.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ─── SECTION 8: Our Commitment ────────────────────────────────────────────────

const COMMITMENTS = [
  {
    label: 'Natural Only',
    detail: '100% natural fabrics — linen, silk, cashmere, cotton. Always.',
  },
  {
    label: 'No Polyester',
    detail: 'Synthetic fibres have no place in a conscious wardrobe. Or ours.',
  },
  {
    label: 'Designed for Longevity',
    detail: 'Each piece is constructed to outlast trends by years, not seasons.',
  },
  {
    label: 'Conscious Production',
    detail: 'Small batches. Intentional quantities. Nothing wasted.',
  },
] as const

function CommitmentsSection() {
  return (
    <section className="bg-background py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-16 text-center md:text-left">
          <Reveal>
            <Eyebrow>Our Commitment</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-bold text-umber leading-tight
                           text-[2rem] md:text-[2.6rem] max-w-[18ch]
                           mx-auto md:mx-0">
              These Are Not Marketing Claims
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="font-body font-light text-[14px] text-ink leading-loose
                          mt-4 max-w-[42ch] mx-auto md:mx-0">
              They are the decisions baked into every sourcing call, every sample,
              and every production run.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
          {COMMITMENTS.map((c, i) => (
            <Reveal key={c.label} delay={i * 0.08}>
              <div className={[
                'flex items-start gap-5 py-7 px-2 border-t border-muted',
                i % 2 === 0 && i < COMMITMENTS.length - 1 ? 'sm:border-r sm:pr-10' : 'sm:pl-10',
                i >= COMMITMENTS.length - 2 ? 'border-b' : '',
              ].join(' ')}>
                <div className="w-5 h-5 shrink-0 mt-0.5 flex items-center justify-center border border-highlight rounded-full">
                  <span className="text-highlight text-[10px]">✓</span>
                </div>
                <div>
                  <p className="font-body font-medium text-[13px] uppercase tracking-[0.15em] text-umber mb-1.5">
                    {c.label}
                  </p>
                  <p className="font-body font-light text-[14px] text-ink leading-loose">
                    {c.detail}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── SECTION 9: Closing statement + CTA ──────────────────────────────────────

function ClosingSection() {
  return (
    <section className="bg-deep py-20 md:py-28 px-5 md:px-10 text-center relative overflow-hidden border-b border-background/15">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/tag.png"
          alt=""
          fill
          className="object-cover object-center opacity-10"
          sizes="100vw"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/80 to-deep/60" />
      </div>

      <div className="relative z-10 max-w-[800px] mx-auto">
        <Reveal>
          <p className="font-body font-light text-[11px] uppercase tracking-[0.35em] text-background/40 mb-10">
            Modett Atelier
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="font-display font-bold text-background leading-tight
                         text-[2.2rem] md:text-[3.25rem] lg:text-[4rem]
                         mb-6">
            Modett is not just what you wear.
          </h2>
        </Reveal>

        <Reveal delay={0.18}>
          <p className="font-display font-bold text-highlight leading-tight
                        text-[1.6rem] md:text-[2.25rem]
                        mb-12">
            It is a way of choosing —<br />
            with intention, with ease,{' '}
            <em className="not-italic">with quiet confidence.</em>
          </p>
        </Reveal>

        <Reveal delay={0.28}>
          <div className="w-12 h-px bg-highlight mx-auto mb-12" />
        </Reveal>

        <Reveal delay={0.35}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <OutlineButton variant="inverse" size="lg" as="a" href="/collections">
              Explore the Collection
            </OutlineButton>
            <OutlineButton variant="inverse" size="lg" as="a" href="/contact">
              Get in Touch
            </OutlineButton>
          </div>
        </Reveal>

        <Reveal delay={0.45}>
          <p className="mt-12 font-body font-light text-[12px] uppercase tracking-[0.25em] text-background/30">
            Style, without excess.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ─── Page composition ─────────────────────────────────────────────────────────

export function BrandPhilosophyClient() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <SignatureSection />
      <PurposeSection />
      <BeliefsSection />
      <MaterialsStrip />
      <DesignApproachSection />
      <ModernWomanSection />
      <CommitmentsSection />
      <ClosingSection />
    </div>
  )
}
