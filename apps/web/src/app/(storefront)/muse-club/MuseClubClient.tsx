'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { OutlineButton } from '@modett/ui'
import { useSession } from '@/hooks/useSession'

// ── Scroll-reveal wrapper ─────────────────────────────────────────────────────

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
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.72, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Eyebrow({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={`font-body font-light text-[11px] uppercase tracking-[0.3em] mb-4 ${
        light ? 'text-background/50' : 'text-highlight'
      }`}
    >
      {children}
    </p>
  )
}

// ── SECTION 1: Hero ───────────────────────────────────────────────────────────

function HeroSection() {
  const prefersReducedMotion = useReducedMotion()
  const { isLoggedIn } = useSession()

  return (
    <section className="relative w-full min-h-[80vh] bg-deep overflow-hidden flex items-center">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/hero-image.jpg"
          alt=""
          fill
          priority
          quality={80}
          className="object-cover object-top opacity-20"
          sizes="100vw"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep/90 to-umber/40" />
      </div>

      {/* Decorative large text */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-start pl-[5vw] pointer-events-none select-none overflow-hidden"
      >
        <p className="font-display font-bold text-[20vw] text-background/[0.03] leading-none whitespace-nowrap">
          MUSE
        </p>
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto px-5 md:px-10 py-24 md:py-32">
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2, ease: 'easeOut' }}
        >
          <Eyebrow light>Modett Muse Club</Eyebrow>
        </motion.div>

        <motion.h1
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="font-display font-bold text-background leading-none
                     text-[2.8rem] md:text-[4.5rem] lg:text-[5.5rem]
                     max-w-[16ch] mb-6 md:mb-8"
        >
          Every Choice
          <br />
          <em className="not-italic text-highlight">Rewarded.</em>
        </motion.h1>

        <motion.p
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6, ease: 'easeOut' }}
          className="font-body font-light text-background/70 text-[15px] md:text-[17px]
                     leading-loose max-w-[42ch] mb-10 md:mb-14"
        >
          Earn Muse Points on every purchase. Rise through three tiers.
          Unlock benefits that match your loyalty — quietly, intentionally.
        </motion.p>

        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.85 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          {isLoggedIn ? (
            <OutlineButton variant="inverse" size="lg" as={Link} href="/account/loyalty">
              View My Points
            </OutlineButton>
          ) : (
            <>
              <OutlineButton variant="inverse" size="lg" as={Link} href="/account/login?mode=register">
                Join Muse Club — Free
              </OutlineButton>
              <OutlineButton variant="inverse" size="lg" as={Link} href="/account/login">
                Sign In
              </OutlineButton>
            </>
          )}
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          className="mt-16 md:mt-20 flex flex-wrap gap-8 md:gap-16"
        >
          {[
            ['100 pts', 'Welcome bonus on join'],
            ['1 pt', 'Per LKR 310 spent'],
            ['3 tiers', 'Bronze · Silver · Gold'],
            ['Free', 'Always free to join'],
          ].map(([val, label]) => (
            <div key={label}>
              <p className="font-display font-bold text-background text-[1.75rem] md:text-[2.25rem] leading-none">
                {val}
              </p>
              <p className="font-body font-light text-background/50 text-[12px] uppercase tracking-[0.2em] mt-1">
                {label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

// ── SECTION 2: How to earn ────────────────────────────────────────────────────

const EARN_ACTIVITIES = [
  {
    number: '01',
    title: 'Create Your Account',
    points: '+100 pts',
    body: 'Join Modett Muse Club for free. Your welcome bonus is credited the moment you create your account — no purchase needed.',
    highlight: true,
  },
  {
    number: '02',
    title: 'Shop the Collection',
    points: '+1 pt / LKR 310',
    body: 'Earn points on every confirmed, paid order. The more you invest in your wardrobe, the more your tier grows.',
    highlight: false,
  },
  {
    number: '03',
    title: 'Invite a Friend',
    points: '+200 pts',
    body: "Share your unique Muse Code. When a friend creates a Modett account using your code, you earn 200 points — and so does she (150 pts).",
    highlight: true,
  },
  {
    number: '04',
    title: "Join with a Friend's Code",
    points: '+150 pts',
    body: "Joining with a friend's Muse Code? You'll receive a 150-point welcome gift on top of your standard 100-point signup bonus.",
    highlight: false,
  },
]

function EarnSection() {
  return (
    <section className="bg-background py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-16 md:mb-20">
          <Reveal>
            <Eyebrow>How to Earn</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-bold text-umber leading-tight
                           text-[2rem] md:text-[3rem] max-w-[20ch]">
              Points That Reflect Your Loyalty
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="font-body font-light text-[15px] text-ink leading-loose mt-4 max-w-[48ch]">
              Muse Points are earned through purchases, loyalty, and sharing.
              Every point brings you closer to unlocking the next tier.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {EARN_ACTIVITIES.map((act, i) => (
            <Reveal key={act.number} delay={i * 0.07}>
              <div
                className={[
                  'p-8 md:p-10 border-t border-muted group relative overflow-hidden',
                  i % 2 === 0 ? 'md:border-r md:border-muted' : '',
                  i >= 2 ? 'border-b' : '',
                  act.highlight ? 'bg-surface' : 'bg-background',
                ].join(' ')}
              >
                {/* Accent bar on hover */}
                <div className="absolute top-0 left-0 h-[2px] w-0 bg-highlight transition-all duration-500 group-hover:w-full" />

                <div className="flex items-start justify-between mb-6">
                  <p className="font-body font-light text-[11px] uppercase tracking-[0.3em] text-highlight">
                    {act.number}
                  </p>
                  <span className="font-body font-medium text-[13px] text-umber border border-muted px-3 py-1 bg-background">
                    {act.points}
                  </span>
                </div>

                <h3 className="font-display font-bold text-umber text-[1.3rem] md:text-[1.45rem] mb-3 leading-snug">
                  {act.title}
                </h3>
                <p className="font-body font-light text-[14px] text-ink leading-loose">
                  {act.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── SECTION 3: Tier breakdown ─────────────────────────────────────────────────

const TIERS = [
  {
    name: 'BRONZE',
    label: 'The Beginning',
    scoreRange: 'Score 0 – 4.9',
    accentClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    bgClass: 'bg-amber-50/30',
    dotClass: 'bg-amber-400',
    benefits: [
      'Earn 1 pt per LKR 310 spent',
      '100-point welcome bonus',
      'Free standard shipping on orders over LKR 15,000',
      'Access to Muse Club member events',
      'Points valid for 12 months of activity',
    ],
    how: 'Automatically awarded when you join. No minimum spend required.',
  },
  {
    name: 'SILVER',
    label: 'The Considered One',
    scoreRange: 'Score 5.0 – 14.9',
    accentClass: 'text-slate-600',
    borderClass: 'border-slate-300',
    bgClass: 'bg-slate-50/40',
    dotClass: 'bg-slate-400',
    benefits: [
      '1.5× points multiplier on every purchase',
      'Priority customer care response',
      'Early access to new arrivals — 24 hrs before public',
      'Exclusive member-only sale access',
      'Free shipping on all orders (no threshold)',
    ],
    how: 'Reach a composite score of 5.0 — a blend of how often and how much you shop over 12 months.',
  },
  {
    name: 'GOLD',
    label: 'The Muse',
    scoreRange: 'Score 15.0+',
    accentClass: 'text-highlight',
    borderClass: 'border-highlight/40',
    bgClass: 'bg-highlight/5',
    dotClass: 'bg-highlight',
    benefits: [
      '2× points multiplier — maximum earning rate',
      'Complimentary gift packaging on every order',
      'Personal styling session (one per season)',
      'First-to-know: new collections, limited editions',
      'Dedicated Gold concierge line',
    ],
    how: 'Reach a composite score of 15.0. Reserved for our most loyal Muses — earned, never bought.',
  },
]

function TiersSection() {
  return (
    <section className="bg-deep py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-16 md:mb-20">
          <Reveal>
            <Eyebrow light>Three Tiers</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-bold text-background leading-tight text-[2rem] md:text-[3rem] max-w-[22ch]">
              Your Loyalty, Recognised at Every Level
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="font-body font-light text-background/60 text-[15px] leading-loose mt-4 max-w-[48ch]">
              Your tier is calculated from both how often you shop and how much you spend
              over a rolling 12-month window. No tricks. No resets without notice.
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3">
          {TIERS.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.1}>
              <div
                className={[
                  `p-8 md:p-10 border ${tier.borderClass} ${tier.bgClass} flex flex-col h-full`,
                  i < 2 ? 'lg:border-r-0' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-2.5 h-2.5 rounded-full ${tier.dotClass}`} />
                  <p className="font-body font-light text-[10px] uppercase tracking-[0.3em] text-background/50">
                    {tier.scoreRange}
                  </p>
                </div>

                <h3 className={`font-display font-bold text-[2rem] ${tier.accentClass} leading-none mb-1`}>
                  {tier.name}
                </h3>
                <p className="font-body font-light text-[13px] text-background/50 mb-8 italic">
                  {tier.label}
                </p>

                <ul className="space-y-3 flex-1 mb-8">
                  {tier.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span className={`mt-1.5 w-1 h-1 rounded-full ${tier.dotClass} shrink-0`} />
                      <span className="font-body font-light text-[13px] text-background/80 leading-relaxed">
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className={`border-t ${tier.borderClass} pt-6`}>
                  <p className="font-body font-light text-[10px] uppercase tracking-[0.2em] text-background/40 mb-2">
                    How to reach this tier
                  </p>
                  <p className="font-body font-light text-[13px] text-background/60 leading-relaxed">
                    {tier.how}
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

// ── SECTION 4: Score calculator explainer ────────────────────────────────────

function ScoreSection() {
  return (
    <section className="bg-surface py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
        <div>
          <Reveal>
            <Eyebrow>Your Muse Score</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-bold text-umber leading-tight text-[2rem] md:text-[2.75rem] max-w-[20ch] mb-6">
              A Score That Sees the Whole Picture
            </h2>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="font-body font-light text-[15px] text-ink leading-loose mb-5">
              Your Muse Score is not just about what you spend — it is about
              how consistently you choose Modett. We weigh both frequency
              and spend, because loyalty looks different for everyone.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="font-body font-light text-[15px] text-ink leading-loose">
              The formula is simple and transparent. It runs on a 12-month
              rolling window, so your tier always reflects your recent loyalty —
              not what you did three years ago.
            </p>
          </Reveal>
        </div>

        <div className="space-y-0">
          <Reveal delay={0.12}>
            <div className="border border-muted bg-background p-8 md:p-10">
              <p className="font-body font-light text-[11px] uppercase tracking-[0.25em] text-highlight mb-6">
                The Formula
              </p>
              <div className="font-body font-light text-[14px] text-ink leading-loose space-y-2">
                <p>
                  <span className="font-medium text-umber">Muse Score</span> =
                </p>
                <p className="pl-4 border-l-2 border-highlight">
                  (Orders in last 12 months × <span className="font-medium">60%</span>)
                  <br />+ (Points earned ÷ 500 × <span className="font-medium">40%</span>)
                </p>
              </div>
              <div className="mt-6 pt-6 border-t border-muted space-y-2">
                <div className="flex justify-between text-[13px]">
                  <span className="font-body font-light text-muted-foreground">BRONZE threshold</span>
                  <span className="font-body font-medium text-umber">Score 0+</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="font-body font-light text-muted-foreground">SILVER threshold</span>
                  <span className="font-body font-medium text-umber">Score 5.0</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="font-body font-light text-muted-foreground">GOLD threshold</span>
                  <span className="font-body font-medium text-umber">Score 15.0</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="border border-muted border-t-0 bg-surface p-8 md:p-10">
              <p className="font-body font-light text-[11px] uppercase tracking-[0.25em] text-highlight mb-4">
                Example
              </p>
              <p className="font-body font-light text-[13px] text-ink leading-loose">
                4 orders this year, 2,000 points earned:
                <br />
                <span className="font-medium text-umber">
                  (4 × 0.60) + (2,000 ÷ 500 × 0.40) = 2.4 + 1.6 = 4.0
                </span>
                <br />
                <span className="text-muted-foreground">→ BRONZE tier, approaching SILVER</span>
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ── SECTION 5: Referral highlight ────────────────────────────────────────────

function ReferralSection() {
  const { isLoggedIn } = useSession()

  return (
    <section className="bg-umber py-20 md:py-28 px-5 md:px-10 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-end pr-[5vw] pointer-events-none select-none overflow-hidden"
      >
        <p className="font-display font-bold text-[18vw] text-background/[0.04] leading-none">
          MUSE
        </p>
      </div>

      <div className="relative max-w-[900px] mx-auto text-center">
        <Reveal>
          <Eyebrow light>Muse Referrals</Eyebrow>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display font-bold text-background leading-tight text-[2rem] md:text-[3rem] max-w-[22ch] mx-auto mb-6">
            Sharing is the Most Intentional Luxury of All
          </h2>
        </Reveal>
        <Reveal delay={0.18}>
          <p className="font-body font-light text-background/70 text-[15px] leading-loose max-w-[44ch] mx-auto mb-10">
            When you invite a friend to Modett with your unique Muse Code, you
            both earn — because good taste is better shared.
          </p>
        </Reveal>

        <Reveal delay={0.25}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-background/20 mb-12">
            {[
              ['Your Muse Code', 'Find your unique code in My Account → Loyalty'],
              ['Friend Joins', 'She creates a Modett account using your code'],
              ['You Both Earn', 'You get 200 pts · She gets 150 pts on top of her welcome bonus'],
            ].map(([title, body], i) => (
              <div
                key={title}
                className={`p-7 text-left ${i < 2 ? 'md:border-r border-background/20' : ''}`}
              >
                <p className="font-body font-light text-[10px] uppercase tracking-[0.3em] text-highlight mb-4">
                  Step {i + 1}
                </p>
                <p className="font-display font-bold text-background text-[1.1rem] mb-2 leading-snug">
                  {title}
                </p>
                <p className="font-body font-light text-[13px] text-background/60 leading-loose">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.32}>
          {isLoggedIn ? (
            <OutlineButton variant="inverse" size="lg" as={Link} href="/account/loyalty">
              Get My Muse Code
            </OutlineButton>
          ) : (
            <OutlineButton variant="inverse" size="lg" as={Link} href="/account/login?mode=register">
              Join &amp; Get Your Code
            </OutlineButton>
          )}
        </Reveal>
      </div>
    </section>
  )
}

// ── SECTION 6: Redeem ─────────────────────────────────────────────────────────

function RedeemSection() {
  return (
    <section className="bg-background py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <Reveal>
          <div className="relative w-full aspect-square bg-muted overflow-hidden">
            <Image
              src="/images/tag.png"
              alt="Modett hang tag — quality and intention"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <Eyebrow>Redeem Points</Eyebrow>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display font-bold text-umber leading-tight text-[2rem] md:text-[2.75rem] mb-6 max-w-[20ch]">
              Points Become Discounts at Checkout
            </h2>
          </Reveal>
          <Reveal delay={0.18}>
            <div className="space-y-4 font-body font-light text-[15px] text-ink leading-loose">
              <p>
                Redeem your Muse Points at checkout. Every{' '}
                <span className="font-medium text-umber">100 points</span> gives
                you{' '}
                <span className="font-medium text-umber">LKR 310 off</span> your
                order — no minimums, no expiry pressure.
              </p>
              <p>
                Points are credited after your order is confirmed and paid.
                They expire after 12 months of account inactivity.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="mt-10 grid grid-cols-2 gap-0 border border-muted">
              {[
                ['100 pts', 'LKR 310 off'],
                ['500 pts', 'LKR 1,550 off'],
                ['1,000 pts', 'LKR 3,100 off'],
                ['Gold 2×', 'Double earning rate'],
              ].map(([pts, value], i) => (
                <div
                  key={pts}
                  className={[
                    'p-5',
                    i % 2 === 0 ? 'border-r border-muted' : '',
                    i < 2 ? 'border-b border-muted' : '',
                  ].join(' ')}
                >
                  <p className="font-display font-bold text-umber text-[1.3rem] leading-none mb-1">
                    {pts}
                  </p>
                  <p className="font-body font-light text-[12px] text-muted-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ── SECTION 7: FAQ ────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Is joining Modett Muse Club free?',
    a: 'Yes — always. Creating an account is free and immediately earns you 100 welcome Muse Points.',
  },
  {
    q: 'How is my tier determined?',
    a: 'Your Muse Score combines order frequency (60%) and points earned (40%) over a rolling 12-month window. It updates automatically after each purchase.',
  },
  {
    q: 'Can my tier go down?',
    a: 'Yes — if your activity drops over the 12-month window, your score may decrease. This keeps the tiers meaningful for members who are actively choosing Modett.',
  },
  {
    q: 'When can I use my referral code?',
    a: "Your Muse Code is available in My Account → Loyalty once you've joined. Share it anytime. Bonuses are credited automatically when your friend creates a verified account.",
  },
  {
    q: 'How long do points last?',
    a: 'Points expire after 12 months of account inactivity. As long as you make at least one purchase or earn points within 12 months, your balance remains active.',
  },
  {
    q: 'Can I redeem points on sale items?',
    a: 'Yes — Muse Points can be applied to any order at checkout, including sale items. No restrictions on which products qualify.',
  },
]

function FaqSection() {
  return (
    <section className="bg-surface py-20 md:py-28 px-5 md:px-10">
      <div className="max-w-[900px] mx-auto">
        <Reveal>
          <Eyebrow>Questions</Eyebrow>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display font-bold text-umber text-[2rem] md:text-[2.5rem] mb-12">
            Common Questions
          </h2>
        </Reveal>

        <div className="space-y-0">
          {FAQ.map((item, i) => (
            <Reveal key={item.q} delay={i * 0.06}>
              <div className="border-t border-muted py-7 last:border-b grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-4 md:gap-12">
                <p className="font-body font-medium text-[14px] text-umber leading-snug">
                  {item.q}
                </p>
                <p className="font-body font-light text-[14px] text-ink leading-loose">
                  {item.a}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── SECTION 8: CTA ────────────────────────────────────────────────────────────

function ClosingSection() {
  const { isLoggedIn } = useSession()

  return (
    <section className="bg-deep py-20 md:py-28 px-5 md:px-10 text-center relative overflow-hidden border-b border-background/15">
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/studio.png"
          alt=""
          fill
          className="object-cover opacity-10"
          sizes="100vw"
          aria-hidden
        />
        <div className="absolute inset-0 bg-deep/80" />
      </div>

      <div className="relative z-10 max-w-[700px] mx-auto">
        <Reveal>
          <Image
            src="/images/V-logo-alabaster .png"
            alt="Modett"
            width={120}
            height={46}
            className="mx-auto mb-10 opacity-60"
          />
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="font-display font-bold text-background text-[2.2rem] md:text-[3rem] leading-tight mb-4">
            Begin Earning Today.
          </h2>
        </Reveal>
        <Reveal delay={0.18}>
          <p className="font-body font-light text-background/60 text-[15px] leading-loose mb-10">
            Join free. Earn immediately. Unlock benefits that match your loyalty.
          </p>
        </Reveal>
        <Reveal delay={0.26}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {isLoggedIn ? (
              <OutlineButton variant="inverse" size="lg" as={Link} href="/account/loyalty">
                My Muse Account →
              </OutlineButton>
            ) : (
              <OutlineButton variant="inverse" size="lg" as={Link} href="/account/login?mode=register">
                Join Modett Muse Club — Free
              </OutlineButton>
            )}
            <OutlineButton variant="inverse" size="lg" as={Link} href="/collections">
              Shop the Collection
            </OutlineButton>
          </div>
        </Reveal>
        <Reveal delay={0.34}>
          <p className="mt-10 font-body font-light text-[11px] uppercase tracking-[0.3em] text-background/25">
            Quietly earned. Never bought.
          </p>
        </Reveal>
      </div>
    </section>
  )
}

// ── Page composition ──────────────────────────────────────────────────────────

export function MuseClubClient() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <EarnSection />
      <TiersSection />
      <ScoreSection />
      <ReferralSection />
      <RedeemSection />
      <FaqSection />
      <ClosingSection />
    </div>
  )
}
