/*
 * MODETT TYPOGRAPHY TOKENS
 * ─────────────────────────────────────────────────────────
 * Two typefaces:
 *   display (Playfair Display) — headings, hero, editorial
 *   body    (Raleway)          — body copy, UI, buttons, nav
 *
 * Responsive scale:
 *   Desktop values: used at md: (768px) and above
 *   Mobile values:  used below md: (base, no prefix)
 *
 * Button typography rule:
 *   All buttons use font-body font-light tracking-[0.25em] uppercase
 *   This is wider than Tailwind's built-in tracking-widest (0.1em)
 *   Always use the arbitrary value tracking-[0.25em] for buttons
 */

export const typography = {

  fontFamily: {
    display: 'Playfair Display, Georgia, serif',
    body:    'Raleway, system-ui, sans-serif',
  },

  // Desktop heading scale (md: and above)
  scale: {
    display:   { size: '6rem',    lineHeight: '1.0', letterSpacing: '-0.02em' },
    h1:        { size: '6rem',    lineHeight: '1.0', letterSpacing: '-0.02em' },
    h2:        { size: '3rem',    lineHeight: '1.2', letterSpacing: '-0.01em' },
    h3:        { size: '2.5rem',  lineHeight: '1.2', letterSpacing: '-0.01em' },
    h4:        { size: '2rem',    lineHeight: '1.3', letterSpacing: '0' },
    h5:        { size: '1.5rem', lineHeight: '1.4', letterSpacing: '0' },
    h6:        { size: '1.25rem', lineHeight: '1.4', letterSpacing: '0' },

    // Mobile heading scale (base, below md:)
    h1Mobile:  { size: '2.5rem',   lineHeight: '1.0', letterSpacing: '-0.02em' },
    h2Mobile:  { size: '2.25rem',  lineHeight: '1.2', letterSpacing: '-0.01em' },
    h3Mobile:  { size: '2rem',     lineHeight: '1.2', letterSpacing: '-0.01em' },
    h4Mobile:  { size: '1.5rem',   lineHeight: '1.4', letterSpacing: '0' },
    h5Mobile:  { size: '1.25rem',  lineHeight: '1.4', letterSpacing: '0' },
    h6Mobile:  { size: '1.125rem', lineHeight: '1.4', letterSpacing: '0' },

    // Tagline — Raleway, not Playfair
    tagline:   { size: '1.125rem', lineHeight: '1.5', letterSpacing: '0.08em' },

    // Body scale — all Raleway 400
    bodyLg:    { size: '1.125rem', lineHeight: '1.6', letterSpacing: '0' },
    body:      { size: '1rem',     lineHeight: '1.6', letterSpacing: '0' },
    bodySm:    { size: '0.875rem', lineHeight: '1.6', letterSpacing: '0' },
    bodyXs:    { size: '0.75rem',  lineHeight: '1.6', letterSpacing: '0' },

    // UI scale — Raleway 500–600
    uiLg:      { size: '1rem',     lineHeight: '1.4', letterSpacing: '0' },
    ui:        { size: '0.875rem', lineHeight: '1.4', letterSpacing: '0' },
    uiSm:      { size: '0.75rem',  lineHeight: '1.4', letterSpacing: '0' },
    label:     { size: '0.75rem',  lineHeight: '1.4', letterSpacing: '0.08em' },
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
    tight:   '1.0',   // display / h1
    snug:    '1.3',   // h4
    normal:  '1.4',   // h5–h6, UI
    relaxed: '1.5',   // tagline
    loose:   '1.6',   // body copy
  },

  letterSpacing: {
    tight:   '-0.02em',  // display / h1
    snug:    '-0.01em',  // h2, h3
    normal:  '0em',      // h4 and below
    wide:    '0.08em',   // tagline, labels
    wider:   '0.12em',   // ALL CAPS variants
    widest:  '0.16em',   // micro labels, legal
    button:  '0.25em',   // ALL buttons — wider than widest
  },

  /*
   * STYLE MODIFIERS (applied via className, NOT baked into tokens)
   *
   * H2 uppercase: add className="uppercase" when design requires
   * H3 italic:    add className="italic" when design requires
   * These are contextual style overrides, not base token values.
   * The base h2 token is always 3rem regardless of case treatment.
   */

} as const

export type TypeScale     = keyof typeof typography.scale
export type FontWeight    = keyof typeof typography.fontWeight
export type LetterSpacing = keyof typeof typography.letterSpacing
