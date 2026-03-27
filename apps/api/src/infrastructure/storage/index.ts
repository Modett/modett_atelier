/**
 * Storage infrastructure — R2 client, service, image processor, types.
 */

export { getR2Client, resetR2Client } from './r2.client'
export { getStorageService } from './storage.service'
export { processProductImage, processSingleImageToWebP } from './image.processor'
export type { ProcessedVariant, ImageVariantConfig } from './image.processor'
export type {
  UploadResult,
  ImageVariants,
  PresignedUploadUrl,
  StorageFolder,
} from './storage.types'
export { StorageError } from './storage.types'
