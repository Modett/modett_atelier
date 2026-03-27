/**
 * Storage types — R2 upload results, image variants, presigned URLs.
 */

export interface UploadResult {
  /** The R2 object key (e.g. "products/sofia-dress/01-front-full.webp") */
  key: string
  /** The full public URL */
  url: string
  /** File size in bytes */
  size: number
  /** MIME type */
  contentType: string
}

export interface ImageVariants {
  full: UploadResult
  card: UploadResult
  thumb: UploadResult
}

export interface PresignedUploadUrl {
  /** The presigned PUT URL for direct browser upload */
  uploadUrl: string
  /** The R2 object key */
  key: string
  /** URL expiry in seconds */
  expiresIn: number
}

export type StorageFolder =
  | 'products'
  | 'styling-guides'
  | 'reviews'
  | 'campaigns'
  | 'banners'

/** Thrown by storage service when R2 operations fail. */
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'STORAGE_ERROR',
  ) {
    super(message)
    this.name = 'StorageError'
    Object.setPrototypeOf(this, StorageError.prototype)
  }
}
