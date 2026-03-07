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
    background:      '#F8F5F2',
    surface:         '#F8F5F2',
    surfaceRaised:   '#E5E0D6',
    text:            '#232D35',
    ink:             '#232D35',
    graphite:        '#232D35',
    mutedForeground: '#BBA496',
    muted:           '#E5E0D6',
    border:          '#232D35',
    accent:          '#232D35',
    highlight:       '#C1AB85',
    editorial:       '#C78869',
    deep:            '#3E5460',
    umber:           '#765C4D',
    sage:            '#C1D2CC',
  },
} as const

export type PrimitiveColor = keyof typeof colors.primitive
export type SemanticColor  = keyof typeof colors.semantic
