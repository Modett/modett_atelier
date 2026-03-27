// Modett Design System
// Components are exported here as they are implemented.
// Tokens are always available.

// ── Tokens ────────────────────────────────────────────────
export { colors, typography, spacing, layout } from './tokens'
export type {
  PrimitiveColor,
  SemanticColor,
  TypeScale,
  FontWeight,
  LetterSpacing,
  SpacingStep,
  LayoutToken,
} from './tokens'

// ── Components (uncommented as each is implemented) ───────
// export { Container, Section, Grid, Stack } from './components/layout'
export {
  SiteHeader,
  MobileMenu,
  SiteFooter,
  SocialIcon,
  GlobeIcon,
  ContactIcon,
  NewsletterIcon,
  SearchIcon,
  WishlistIcon,
  AccountIcon,
  CartIcon,
} from './components/navigation'
export type {
  SiteHeaderProps,
  MobileMenuProps,
  SiteFooterProps,
  FooterColumn,
  FooterLinkItem,
  SocialLink,
  SocialIconProps,
  SocialPlatform,
  IconProps,
} from './components/navigation'
// export { Heading, Text }                   from './components/typography'
export {
  Accordion,
  AddToCartButton,
  ColourSelector,
  FilledButton,
  ImageLightbox,
  NewsletterSection,
  OutlineButton,
  ProductAccordions,
  ProductImageGallery,
  ProductTitle,
  RadioButton,
  RadioGroup,
  SizeGuideDrawer,
  SizeSelector,
  TextInput,
} from './components/ui'
export type {
  AddToCartButtonProps,
  AccordionProps,
  ColourOption,
  ColourSelectorProps,
  FilledButtonProps,
  ImageLightboxImage,
  ImageLightboxProps,
  MeasurementGuide,
  NewsletterSectionProps,
  OutlineButtonProps,
  ProductAccordionsProps,
  ProductAccordionsSection,
  ProductImage,
  ProductImageGalleryProps,
  ProductTitleProps,
  RadioButtonProps,
  RadioGroupProps,
  SizeChartRow,
  SizeGuideDrawerProps,
  SizeOption,
  SizeSelectorProps,
  TextInputProps,
} from './components/ui'
export {
  ProductCard,
  ProductGrid,
  CollectionFilters,
  HomepageHero,
  FeaturedProductSection,
  EditorialCarousel,
} from './components/storefront'
export type {
  ProductCardProps,
  ProductCardImage,
  ProductCardColour,
  ProductCardSize,
  ProductGridProps,
  CollectionFiltersProps,
  FilterGroup,
  FilterOption,
  ActiveFilter,
  SortOption,
  HomepageHeroProps,
  HeroCTA,
  FeaturedProductSectionProps,
  EditorialCarouselProps,
  CarouselSlide,
} from './components/storefront'
