/*
 * MODETT COLOUR TOKENS
 * ─────────────────────────────────────────────────────────
 * Two layers:
 *   primitive  — raw hex values. Never used directly in components.
 *   semantic   — role-mapped tokens. Always use these in components.
 *
 * Rules:
 *   1. primitive.* is for the design system palette page only.
 *   2. All components use semantic tokens exclusively.
 *   3. deep     (#3E5460) → footer and dark sections only.
 *   4. highlight (#C1AB85) → sale, loyalty, premium only.
 *   5. editorial (#C78869) → campaign banners only.
 */

export const colors = {

  primitive: {
    warmWhite:      '#F8F5F2',
    alabaster:      '#E5E0D6',
    silverSage:     '#C1D2CC',
    warmTaupe:      '#BBA496',
    brushedGold:    '#C1AB85',
    terracottaClay: '#C78869',
    richUmber:      '#765C4D',
    slateBlue:      '#3E5460',
    graphite:       '#232D35',
  },

  semantic: {
    // Surface tokens
    background:      '#E5E0D6',   // alabaster  — page background
    foreground:      '#232D35',   // graphite   — text / ink color
    surface:         '#F8F5F2',   // warm-white — card surfaces, modals, drawers
    surfaceRaised:   '#E5E0D6',   // alabaster  — elevated cards

    // Text tokens
    text:            '#232D35',   // graphite   — primary text
    ink:             '#232D35',   // graphite   — alias of text
    mutedForeground: '#BBA496',   // warm-taupe — secondary text, placeholders

    // Border and divider tokens
    border:          '#232D35',   // graphite   — input outlines, dividers
    muted:           '#E5E0D6',   // alabaster  — subtle borders, separators

    // Interactive tokens
    accent:          '#232D35',   // graphite   — primary CTAs, active states

    // Brand moment tokens (use sparingly — see rules above)
    highlight:       '#C1AB85',   // brushed-gold  — sale, loyalty, premium
    editorial:       '#C78869',   // terracotta-clay — campaign banners
    deep:            '#3E5460',   // slate-blue  — footer, dark sections
    sage:            '#C1D2CC',   // silver-sage — nature/fabric tags
    umber:           '#765C4D',   // rich-umber  — earthy accents, logo on light bg

    // Aliases used in button/header components
    graphite:        '#232D35',   // for bg-graphite/60 overlay usage

    // Hero overlay specific
    heroOverlay:     'rgba(0, 0, 0, 0.15)',        // subtle bottom gradient
    heroText:        '#F8F5F2',                     // warm-white
    heroBorder:      'rgba(248, 245, 242, 0.25)',   // subtle divider on hero
  },

} as const

export type PrimitiveColor = keyof typeof colors.primitive
export type SemanticColor  = keyof typeof colors.semantic
