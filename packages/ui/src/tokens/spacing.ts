/*
 * MODETT SPACING TOKENS
 * ─────────────────────────────────────────────────────────
 * Base unit: 4px. Every value is a multiple of 4.
 *
 * Three zones:
 *   MICRO     (4–16px)   — inside components
 *   COMPONENT (20–56px)  — between elements within a section
 *   LAYOUT    (64–160px) — between sections and page structure
 *
 * Usage rules:
 *   - Never use LAYOUT tokens inside a single component.
 *   - Never use hardcoded px values in page or component files.
 *   - Use semantic names (productGap, sectionPadding) over numbers.
 */

export const spacing = {

  // ── MICRO (4–16px) ────────────────────────────────────
  px:       '1px',
  hairline: '0.125rem',   //  2px — border offsets
  1:        '0.25rem',    //  4px — star gap, swatch gap
  2:        '0.5rem',     //  8px — name→price, label→value gap
  3:        '0.75rem',    // 12px — card text inner padding
  4:        '1rem',       // 16px — card padding, input padding

  // ── COMPONENT (20–56px) ───────────────────────────────
  5:        '1.25rem',    // 20px — desktop product grid gap
  6:        '1.5rem',     // 24px — heading→body, para→para mobile
  7:        '1.75rem',    // 28px — button horizontal padding (md)
  8:        '2rem',       // 32px — heading→grid gap, shop-all margin
  9:        '2.25rem',    // 36px — desktop nav link gap
  10:       '2.5rem',     // 40px — newsletter mobile padding
  12:       '3rem',       // 48px — hero CTA gap, footer column gap
  14:       '3.5rem',     // 56px — newsletter desktop padding

  // ── LAYOUT (64–160px) ─────────────────────────────────
  16:       '4rem',       //  64px — footer top padding
  20:       '5rem',       //  80px — brand story section
  24:       '6rem',       //  96px — standard section desktop padding
  28:       '7rem',       // 112px
  32:       '8rem',       // 128px — hero vertical padding
  40:       '10rem',      // 160px — hero content offset

} as const

export const layout = {

  // ── Container ─────────────────────────────────────────
  containerMax:         '1280px',
  containerMaxWide:     '1440px',
  gutterMobile:         '1.25rem',   // 20px
  gutterTablet:         '2rem',      // 32px
  gutterDesktop:        '3rem',      // 48px

  // ── Product grid gaps (from homepage analysis) ─────────
  productGapMobile:     '0.75rem',   // 12px
  productGapDesktop:    '1.25rem',   // 20px

  // ── Navigation ────────────────────────────────────────
  navItemGap:           '2.25rem',   // 36px
  navIconGap:           '1.25rem',   // 20px
  headerHeightMobile:   '3.5rem',    // 56px  (h-14)
  headerHeightDesktop:  '4rem',      // 64px  (h-16)

  // ── Section padding by size ───────────────────────────
  // mobile / desktop
  sectionPadding: {
    xs: { mobile: '1.5rem',  desktop: '3rem'  },   //  24 /  48px
    sm: { mobile: '2rem',    desktop: '4rem'  },   //  32 /  64px
    md: { mobile: '3rem',    desktop: '5rem'  },   //  48 /  80px
    lg: { mobile: '4rem',    desktop: '6rem'  },   //  64 /  96px
    xl: { mobile: '6rem',    desktop: '8rem'  },   //  96 / 128px
  },

  // ── Footer ────────────────────────────────────────────
  footerColumnGap:      '3rem',      // 48px desktop
  footerTopPadding:     '4rem',      // 64px desktop

} as const

export type SpacingStep   = keyof typeof spacing
export type LayoutToken   = keyof typeof layout
