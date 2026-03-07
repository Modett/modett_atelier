export const typography = {
  fontFamily: {
    display: 'Playfair Display, Georgia, serif',
    body:    'Raleway, system-ui, sans-serif',
  },
  scale: {
    h1:       { size: '6rem',     lineHeight: '1.2', letterSpacing: '-0.02em' },
    h2:       { size: '3rem',     lineHeight: '1.2', letterSpacing: '-0.01em' },
    h3:       { size: '2.5rem',   lineHeight: '1.2', letterSpacing: '-0.01em' },
    h4:       { size: '2rem',     lineHeight: '1.3', letterSpacing: '0' },
    h5:       { size: '1.5rem',   lineHeight: '1.4', letterSpacing: '0' },
    h6:       { size: '1.25rem',  lineHeight: '1.4', letterSpacing: '0' },
    h1Mobile: { size: '2.5rem',   lineHeight: '1.2', letterSpacing: '-0.02em' },
    h2Mobile: { size: '2.25rem',  lineHeight: '1.2', letterSpacing: '-0.01em' },
    h3Mobile: { size: '2rem',     lineHeight: '1.2', letterSpacing: '-0.01em' },
    h4Mobile: { size: '1.5rem',   lineHeight: '1.4', letterSpacing: '0' },
    h5Mobile: { size: '1.25rem',  lineHeight: '1.4', letterSpacing: '0' },
    h6Mobile: { size: '1.125rem', lineHeight: '1.4', letterSpacing: '0' },
    tagline:  { size: '1.125rem', lineHeight: '1.5', letterSpacing: '0.08em' },
    bodyLg:   { size: '1.125rem', lineHeight: '1.6', letterSpacing: '0' },
    body:     { size: '1rem',     lineHeight: '1.6', letterSpacing: '0' },
    bodySm:   { size: '0.875rem', lineHeight: '1.6', letterSpacing: '0' },
    bodyXs:   { size: '0.75rem',  lineHeight: '1.6', letterSpacing: '0' },
    label:    { size: '0.75rem',  lineHeight: '1.4', letterSpacing: '0.08em' },
  },
} as const

export type TypeScale = keyof typeof typography.scale
