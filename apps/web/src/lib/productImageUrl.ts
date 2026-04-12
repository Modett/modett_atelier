/**
 * Product image URLs: legacy pipeline stores a base with no extension and serves
 * -full.webp / -card.webp / -thumb.webp; presigned and original uploads store a
 * full URL including .jpg, .png, etc.
 */

const FILE_EXT_IN_PATH = /\.(jpe?g|png|gif|webp|avif|tiff?|heic|heif)(\?|#|$)/i

export function productImageUsesWebpVariants(imageUrl: string): boolean {
  return !FILE_EXT_IN_PATH.test(imageUrl)
}

export function productImageVariantUrl(
  baseUrl: string,
  variant: 'full' | 'card' | 'thumb',
): string {
  if (!productImageUsesWebpVariants(baseUrl)) {
    return baseUrl
  }
  const suffix =
    variant === 'full'
      ? '-full.webp'
      : variant === 'card'
        ? '-card.webp'
        : '-thumb.webp'
  return `${baseUrl}${suffix}`
}

/** Ordered fallbacks for small admin thumbnails */
export function productImageAdminThumbCandidates(baseUrl: string): string[] {
  if (!productImageUsesWebpVariants(baseUrl)) {
    return [baseUrl]
  }
  return [
    productImageVariantUrl(baseUrl, 'thumb'),
    productImageVariantUrl(baseUrl, 'card'),
    productImageVariantUrl(baseUrl, 'full'),
  ]
}

/** Ordered fallbacks for admin grid / editor cards */
export function productImageAdminGridCandidates(baseUrl: string): string[] {
  if (!productImageUsesWebpVariants(baseUrl)) {
    return [baseUrl]
  }
  return [
    productImageVariantUrl(baseUrl, 'card'),
    productImageVariantUrl(baseUrl, 'full'),
    productImageVariantUrl(baseUrl, 'thumb'),
  ]
}
