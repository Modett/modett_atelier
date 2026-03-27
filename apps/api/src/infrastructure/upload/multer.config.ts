/**
 * Multer config — in-memory storage for images and videos (uploaded to R2 by handlers).
 */

import multer from 'multer'

const storage = multer.memoryStorage()

export const imageUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for images
    files: 6,
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/tiff',
      'image/heic',
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
      'image/png',
      'image/webp',
      'image/tiff',
      'image/heic',
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
