export const spacing = {
  1:  '0.25rem',   // 4px
  2:  '0.5rem',    // 8px
  3:  '0.75rem',   // 12px
  4:  '1rem',      // 16px
  5:  '1.25rem',   // 20px
  6:  '1.5rem',    // 24px
  8:  '2rem',      // 32px
  10: '2.5rem',    // 40px
  12: '3rem',      // 48px
  16: '4rem',      // 64px
  20: '5rem',      // 80px
  24: '6rem',      // 96px
  32: '8rem',      // 128px
} as const

export const layout = {
  containerMax:         '1280px',
  containerMaxWide:     '1440px',
  gutterMobile:         '1.25rem',   // px-5
  gutterTablet:         '2rem',      // px-8
  gutterDesktop:        '3rem',      // px-12
  productGapMobile:     '0.75rem',
  productGapDesktop:    '1.25rem',
  sectionPaddingMobile: '4rem',
  sectionPaddingDesktop:'6rem',
} as const

export type SpacingStep = keyof typeof spacing
