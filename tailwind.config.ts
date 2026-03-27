/*
 * MODETT COLOUR SYSTEM
 * ─────────────────────────────────────────────────────
 * Brand voice: Elegance, Amplified.
 * Base palette: warm neutral (F8F7F4) on graphite (232D35)
 *
 * RULES:
 *   1. Never use primitive.* in application components.
 *      Primitives are for the design system palette page only.
 *   2. All pages and components use semantic tokens only.
 *   3. The base scheme is intentionally dark-ink on warm-white.
 *      Do NOT add arbitrary colour to UI chrome — colour lands
 *      in product photography, editorial banners, and loyalty moments.
 *   4. Deep (#3E5460) is reserved for footer and dark hero sections.
 *   5. Highlight (#C1AB85) is reserved for sale prices, loyalty
 *      tier badges, and premium indicators — never decorative.
 *   6. Editorial (#C78869) is reserved for campaign banners and
 *      pull-quotes — never for interactive elements.
 *
 * DARK MODE:
 *   Not implemented in Phase 2. When added, swap:
 *     background  → graphite
 *     surface     → slate-blue  (deep variant)
 *     text        → warm-white
 *   These mappings live in this file, nowhere else.
 *
 * SOURCE OF TRUTH: Semantic colors and fonts use CSS variables from
 * apps/web/src/styles/tokens.css. Add or change tokens there; Tailwind
 * follows. Primitives stay here for design-system palette only.
 */

import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./apps/web/src/**/*.{ts,tsx}'],
  theme: {
    // ── BREAKPOINTS ──────────────────────────────────────────────
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    // ── CONTAINER ────────────────────────────────────────────────
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '1.25rem',
        md: '2rem',
        lg: '2.5rem',
        xl: '3rem',
        '2xl': '3rem',
      },
    },
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // ── HEADING SCALE (desktop) — values mirror tokens.css ──
        display: ['var(--text-display)', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        h1: ['var(--text-h1)', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        h2: ['var(--text-h2)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        h3: ['var(--text-h3)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        h4: ['var(--text-h4)', { lineHeight: '1.3', letterSpacing: '0' }],
        h5: ['var(--text-h5)', { lineHeight: '1.4', letterSpacing: '0' }],
        h6: ['var(--text-h6)', { lineHeight: '1.4', letterSpacing: '0' }],
        // ── HEADING SCALE (mobile) ──
        'h1-mobile': ['var(--text-h1-mobile)', { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        'h2-mobile': ['var(--text-h2-mobile)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h3-mobile': ['var(--text-h3-mobile)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h4-mobile': ['var(--text-h4-mobile)', { lineHeight: '1.4', letterSpacing: '0' }],
        'h5-mobile': ['var(--text-h5-mobile)', { lineHeight: '1.4', letterSpacing: '0' }],
        'h6-mobile': ['var(--text-h6-mobile)', { lineHeight: '1.4', letterSpacing: '0' }],
        // ── TAGLINE & BODY ──
        tagline: ['var(--text-tagline)', { lineHeight: '1.5', letterSpacing: '0.08em' }],
        'body-lg': ['var(--text-body-lg)', { lineHeight: '1.6', letterSpacing: '0' }],
        body: ['var(--text-body)', { lineHeight: '1.6', letterSpacing: '0' }],
        'body-sm': ['var(--text-body-sm)', { lineHeight: '1.6', letterSpacing: '0' }],
        'body-xs': ['var(--text-body-xs)', { lineHeight: '1.6', letterSpacing: '0' }],
        // ── UI SCALE (nav labels, badges) — from tokens.css ──
        'ui-lg': ['1rem', { lineHeight: '1.4', letterSpacing: '0' }],
        ui: ['0.875rem', { lineHeight: '1.4', letterSpacing: '0' }],
        'ui-sm': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0' }],
        label: ['var(--text-label)', { lineHeight: '1.4', letterSpacing: '0.08em' }],
      },
      lineHeight: {
        tight: '1.0',
        snug: '1.3',
        normal: '1.4',
        relaxed: '1.5',
        loose: '1.6',
      },
      letterSpacing: {
        tight: '-0.02em',
        snug: '-0.01em',
        normal: '0em',
        wide: '0.08em',
        wider: '0.12em',
        widest: '0.16em',
      },
      fontWeight: {
        light: '300',
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
        black: '900',
      },
      colors: {
        // Layer 1 — Primitives (design system palette page only; do not use in app UI)
        primitive: {
          'warm-white': '#F8F7F4',
          alabaster: '#EFECE5',
          'silver-sage': '#C1D2CC',
          'warm-taupe': '#BBA496',
          'brushed-gold': '#C1AB85',
          'terracotta-clay': '#C78869',
          'rich-umber': '#765C4D',
          'slate-blue': '#3E5460',
          graphite: '#232D35',
        },
        // Layer 2 — Semantic tokens from tokens.css (single source of truth)
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        surface: 'var(--color-surface)',
        'surface-raised': 'var(--color-surface-raised)',
        text: 'var(--color-text)',
        ink: 'var(--color-ink)',
        'muted-foreground': 'var(--color-muted-foreground)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        accent: 'var(--color-accent)',
        highlight: 'var(--color-highlight)',
        editorial: 'var(--color-editorial)',
        deep: 'var(--color-deep)',
        sage: 'var(--color-sage)',
        umber: 'var(--color-umber)',
        graphite: 'var(--color-graphite)',
      },
      // ── SPACING ──────────────────────────────────────────────────
      spacing: {
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        'space-px': '1px',
        'space-hairline': '0.125rem',
        'space-1': '0.25rem',
        'space-2': '0.5rem',
        'space-3': '0.75rem',
        'space-4': '1rem',
        'space-5': '1.25rem',
        'space-6': '1.5rem',
        'space-7': '1.75rem',
        'space-8': '2rem',
        'space-9': '2.25rem',
        'space-10': '2.5rem',
        'space-12': '3rem',
        'space-14': '3.5rem',
        'space-16': '4rem',
        'space-20': '5rem',
        'space-24': '6rem',
        'space-28': '7rem',
        'space-32': '8rem',
        'space-40': '10rem',
      },
      // ── MAX-WIDTH ─────────────────────────────────────────────────
      maxWidth: {
        xs: '320px',
        sm: '384px',
        md: '448px',
        prose: '65ch',
        content: '600px',
        form: '480px',
        modal: '560px',
        card: '400px',
        page: '1280px',
        wide: '1440px',
        full: '100%',
      },
      // ── MIN-HEIGHT ────────────────────────────────────────────────
      minHeight: {
        hero: '90vh',
        'hero-short': '60vh',
        section: '360px',
        banner: '260px',
        'card-image': '320px',
      },
      // ── GAP ALIASES ───────────────────────────────────────────────
      gap: {
        'product-mobile': '0.75rem',
        product: '1.25rem',
        'card-internal': '0.625rem',
        'footer-col': '3rem',
        nav: '2.25rem',
      },
    },
  },
  plugins: [],
}

export default config
