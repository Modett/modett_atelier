/**
 * Multer config — in-memory storage for images and videos (uploaded to R2 by handlers).
 */

import multer from 'multer'

const storage = multer.memoryStorage()

/** Admin catalog product images — keep in sync with apps/web dropzone (20MB). */
const ADMIN_PRODUCT_IMAGE_MAX_BYTES = 20 * 1024 * 1024

export const imageUpload = multer({
  storage,
  limits: {
    fileSize: ADMIN_PRODUCT_IMAGE_MAX_BYTES,
    files: 6,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/pjpeg',
      'image/png',
      'image/webp',
      'image/tiff',
      'image/heic',
      'image/heif',
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, TIFF, HEIC`,
        ),
      )
    }
  },
})

export const videoUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max for videos
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = ['video/mp4', 'video/quicktime', 'video/webm']
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: MP4, MOV, WebM`,
        ),
      )
    }
  },
})

/** Campaign builder: hero image (direct upload) or video metadata (presigned flow). */
export const campaignAssetUpload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime',
    ]
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, MP4, MOV`,
        ),
      )
    }
  },
})

/** Review photos: max 3 images, 5MB each. */
export const reviewPhotoUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 3,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/pjpeg',
      'image/png',
      'image/webp',
      'image/tiff',
      'image/heic',
      'image/heif',
    ]
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(
        new Error(
          `Invalid file type: ${file.mimetype}. Allowed: JPEG, PNG, WebP, TIFF, HEIC`,
        ),
      )
    }
  },
})
