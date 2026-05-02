import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

/*
 * MODETT DESIGN SYSTEM — TAILWIND CONFIG
 * ─────────────────────────────────────────────────────────
 * Brand: Elegance, Amplified.
 * Palette: alabaster (E5E0D6) + graphite (232D35)
 *
 * TOKEN RULES:
 *   1. Use semantic tokens in all components (never primitive.*)
 *   2. deep (#3E5460)     → footer, dark sections only
 *   3. highlight (#C1AB85)→ sale price, loyalty, premium only
 *   4. editorial (#C78869)→ campaign banners only
 *   5. No border-radius on buttons — brand uses sharp corners
 */

const config: Config = {
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],

  theme: {
    screens: {
      sm:    '640px',
      md:    '768px',
      lg:    '1024px',
      xl:    '1280px',
      '2xl': '1536px',
    },

    container: {
      center:  true,
      padding: {
        DEFAULT: '1.25rem',
        sm:      '1.25rem',
        md:      '2rem',
        lg:      '2.5rem',
        xl:      '3rem',
        '2xl':   '3rem',
      },
    },

    extend: {
      colors: {
        // ── Primitives (design reference only) ────────────
        primitive: {
          'warm-white':      '#F8F5F2',
          'alabaster':       '#E5E0D6',
          'silver-sage':     '#C1D2CC',
          'warm-taupe':      '#BBA496',
          'brushed-gold':    '#C1AB85',
          'terracotta-clay': '#C78869',
          'rich-umber':      '#765C4D',
          'slate-blue':      '#3E5460',
          'graphite':        '#232D35',
        },
        // ── Semantic tokens (use these in components) ──────
        background:         '#E5E0D6',
        foreground:         '#232D35',
        surface:            '#F8F5F2',
        'surface-raised':   '#E5E0D6',
        text:               '#232D35',
        ink:                '#232D35',
        graphite:           '#232D35',
        'muted-foreground': '#765C4D', // rich-umber — readable on alabaster (was warm-taupe)
        border:             '#232D35',
        muted:              '#E5E0D6',
        accent:             '#232D35',
        highlight:          '#C1AB85',
        editorial:          '#C78869',
        'terracotta-clay':  '#C78869',
        deep:               '#3E5460',
        sage:               '#C1D2CC',
        umber:              '#765C4D',
        'hero-border':      'rgba(248, 245, 242, 0.25)',

        // shadcn/ui (admin) — maps to CSS variables in globals.css :root
        card:                   'var(--card)',
        'card-foreground':      'var(--card-foreground)',
        popover:                'var(--popover)',
        'popover-foreground':     'var(--popover-foreground)',
        primary:                'var(--primary)',
        'primary-foreground':   'var(--primary-foreground)',
        secondary:              'var(--secondary)',
        'secondary-foreground': 'var(--secondary-foreground)',
        destructive:            'var(--destructive)',
        input:                  'var(--input)',
        ring:                   'var(--ring)',
      },

      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body:    ['var(--font-body)', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'display':   ['6rem',    { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        'h1':        ['6rem',    { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        'h2':        ['3rem',    { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h3':        ['2.5rem',  { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h4':        ['2rem',    { lineHeight: '1.3', letterSpacing: '0' }],
        'h5':        ['1.5rem',  { lineHeight: '1.4', letterSpacing: '0' }],
        'h6':        ['1.25rem', { lineHeight: '1.4', letterSpacing: '0' }],
        'h1-mobile': ['2.5rem',   { lineHeight: '1.0', letterSpacing: '-0.02em' }],
        'h2-mobile': ['2.25rem',  { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h3-mobile': ['2rem',     { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'h4-mobile': ['1.5rem',   { lineHeight: '1.4', letterSpacing: '0' }],
        'h5-mobile': ['1.25rem',  { lineHeight: '1.4', letterSpacing: '0' }],
        'h6-mobile': ['1.125rem', { lineHeight: '1.4', letterSpacing: '0' }],
        'tagline':   ['1.125rem', { lineHeight: '1.5', letterSpacing: '0.08em' }],
        'body-lg':   ['1.125rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'body':      ['1rem',     { lineHeight: '1.6', letterSpacing: '0' }],
        'body-sm':   ['0.875rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'body-xs':   ['0.75rem',  { lineHeight: '1.6', letterSpacing: '0' }],
        'ui-lg':     ['1rem',     { lineHeight: '1.4', letterSpacing: '0' }],
        'ui':        ['0.875rem', { lineHeight: '1.4', letterSpacing: '0' }],
        'ui-sm':     ['0.75rem',  { lineHeight: '1.4', letterSpacing: '0' }],
        'label':     ['0.75rem',  { lineHeight: '1.4', letterSpacing: '0.08em' }],
      },

      fontWeight: {
        light:    '300',
        regular:  '400',
        medium:   '500',
        semibold: '600',
        bold:     '700',
        black:    '900',
      },

      lineHeight: {
        tight:   '1.0',
        snug:    '1.3',
        normal:  '1.4',
        relaxed: '1.5',
        loose:   '1.6',
      },

      letterSpacing: {
        tight:   '-0.02em',
        snug:    '-0.01em',
        normal:  '0em',
        wide:    '0.08em',
        wider:   '0.12em',
        widest:  '0.16em',
      },

      spacing: {
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        'safe-6': 'max(1.5rem, env(safe-area-inset-bottom))',
      },

      maxWidth: {
        'xs':      '320px',
        'sm':      '384px',
        'md':      '448px',
        'prose':   '65ch',
        'content': '600px',
        'form':    '480px',
        'modal':   '560px',
        'card':    '400px',
        'page':    '1280px',
        'wide':    '1440px',
      },

      minHeight: {
        'hero':        '90vh',
        'hero-short':  '60vh',
        'section':     '360px',
        'banner':      '260px',
        'card-image':  '320px',
      },

      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-33.333%)' },
        },
      },
      animation: {
        marquee: 'marquee 22s linear infinite',
      },
    },
  },

  plugins: [tailwindcssAnimate],
}

export default config
