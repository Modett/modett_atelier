/**
 * Image resizing with sharp — WebP variants (full, card, thumb).
 * Preserves colour profile; strips EXIF for privacy.
 */

import sharp from 'sharp'

export interface ProcessedVariant {
  buffer: Buffer
  width: number
  height: number
  size: number
}

export interface ImageVariantConfig {
  name: string
  maxWidth: number
  quality: number
}

const VARIANT_CONFIGS: ImageVariantConfig[] = [
  { name: 'full', maxWidth: 1600, quality: 90 },
  { name: 'card', maxWidth: 600, quality: 80 },
  { name: 'thumb', maxWidth: 200, quality: 75 },
]

/**
 * Produce three WebP variants from an image buffer.
 * Converts JPEG/PNG/TIFF/HEIC to WebP; strips EXIF; preserves aspect ratio (fit inside).
 */
export async function processProductImage(
  inputBuffer: Buffer,
): Promise<Map<string, ProcessedVariant>> {
  const result = new Map<string, ProcessedVariant>()

  try {
    await sharp(inputBuffer).metadata()
  } catch (err) {
    throw new Error(
      `Image processing failed: ${err instanceof Error ? err.message : 'Invalid or unsupported image'}`,
    )
  }

  const metadata = await sharp(inputBuffer).metadata()
  const width = metadata.width ?? 0
  const height = metadata.height ?? 0
  if (width < 1 || height < 1) {
    throw new Error('Image processing failed: could not read dimensions')
  }

  for (const config of VARIANT_CONFIGS) {
    try {
      const buffer = await sharp(inputBuffer)
        .rotate()
        .resize(config.maxWidth, undefined, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: config.quality })
        .toBuffer({ resolveWithObject: true })

      const meta = await sharp(buffer.data).metadata()
      result.set(config.name, {
        buffer: buffer.data,
        width: meta.width ?? 0,
        height: meta.height ?? 0,
        size: buffer.info.size,
      })
    } catch (err) {
      throw new Error(
        `Image variant "${config.name}" failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }

  return result
}

/**
 * Single variant for non-product images (reviews, banners): max 1200px, strip EXIF.
 */
export async function processSingleImageToWebP(
  inputBuffer: Buffer,
  maxWidth: number = 1200,
  quality: number = 85,
): Promise<ProcessedVariant> {
  try {
    const { data, info } = await sharp(inputBuffer)
      .rotate()
      .resize(maxWidth, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true })

    const meta = await sharp(data).metadata()
    return {
      buffer: data,
      width: meta.width ?? 0,
      height: meta.height ?? 0,
      size: info.size,
    }
  } catch (err) {
    throw new Error(
      `Image processing failed: ${err instanceof Error ? err.message : 'Invalid or unsupported image'}`,
    )
  }
}
