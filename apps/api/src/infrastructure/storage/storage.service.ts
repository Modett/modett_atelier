/**
 * Storage service — upload (product variants, single file), presign, delete.
 * Uses R2 S3 client; constructs public URLs from R2_PUBLIC_URL.
 */

import {
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { S3Client } from '@aws-sdk/client-s3'
import { getR2Client } from './r2.client'
import { processProductImage, processSingleImageToWebP } from './image.processor'
import type {
  UploadResult,
  ImageVariants,
  PresignedUploadUrl,
  StorageFolder,
} from './storage.types'
import { StorageError } from './storage.types'

const CACHE_CONTROL = 'public, max-age=31536000, immutable'

function isImageContentType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export class StorageService {
  private client: S3Client
  private bucket: string
  private publicUrl: string

  constructor() {
    this.client = getR2Client()
    const bucket = process.env.R2_BUCKET_NAME
    const publicUrl = process.env.R2_PUBLIC_URL
    if (!bucket?.trim() || !publicUrl?.trim()) {
      throw new Error('R2_BUCKET_NAME and R2_PUBLIC_URL must be set')
    }
    this.bucket = bucket
    this.publicUrl = publicUrl.replace(/\/$/, '')
  }

  /**
   * Upload a product image with three WebP variants (full, card, thumb).
   * Key pattern: products/{slug}/{sortOrder:02d}-{variant}.webp
   */
  async uploadProductImage(
    productSlug: string,
    fileBuffer: Buffer,
    _fileName: string,
    sortOrder: number,
  ): Promise<ImageVariants> {
    const variants = await processProductImage(fileBuffer)
    const prefix = `products/${productSlug}/${String(sortOrder).padStart(2, '0')}`
    const keys: string[] = []

    try {
      const results: Partial<ImageVariants> = {}
      for (const [name, processed] of variants) {
        const key = `${prefix}-${name}.webp`
        keys.push(key)
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: processed.buffer,
            ContentType: 'image/webp',
            CacheControl: CACHE_CONTROL,
          }),
        )
        results[name as keyof ImageVariants] = {
          key,
          url: this.getPublicUrl(key),
          size: processed.size,
          contentType: 'image/webp',
        }
      }
      return results as ImageVariants
    } catch (err) {
      for (const key of keys) {
        try {
          await this.client.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
          )
        } catch {
          // best-effort cleanup
        }
      }
      throw new StorageError(
        `Product image upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Upload a single file. Images converted to WebP (max 1200px); others stored as-is.
   */
  async uploadFile(
    folder: StorageFolder,
    subPath: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<UploadResult> {
    const key = `${folder}/${subPath}`

    if (isImageContentType(contentType)) {
      const processed = await processSingleImageToWebP(fileBuffer, 1200, 85)
      const finalKey = key.endsWith('.webp') ? key : `${key}.webp`
      try {
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: finalKey,
            Body: processed.buffer,
            ContentType: 'image/webp',
            CacheControl: CACHE_CONTROL,
          }),
        )
        return {
          key: finalKey,
          url: this.getPublicUrl(finalKey),
          size: processed.size,
          contentType: 'image/webp',
        }
      } catch (err) {
        throw new StorageError(
          `File upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
        )
      }
    }

    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: contentType,
          CacheControl: CACHE_CONTROL,
        }),
      )
      return {
        key,
        url: this.getPublicUrl(key),
        size: fileBuffer.length,
        contentType,
      }
    } catch (err) {
      throw new StorageError(
        `File upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Presigned PUT URL for direct browser upload (e.g. videos). Expires in 30 minutes.
   */
  async getPresignedUploadUrl(
    folder: StorageFolder,
    subPath: string,
    contentType: string,
  ): Promise<PresignedUploadUrl> {
    const key = `${folder}/${subPath}`
    const expiresIn = 1800
    try {
      const uploadUrl = await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: contentType,
        }),
        { expiresIn },
      )
      return { uploadUrl, key, expiresIn }
    } catch (err) {
      throw new StorageError(
        `Presigned URL failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }

  async deleteObject(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      )
    } catch (err) {
      throw new StorageError(
        `Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Delete all objects under a key prefix. Returns count deleted.
   */
  async deleteByPrefix(prefix: string): Promise<number> {
    const listPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix
    try {
      const list = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: listPrefix,
        }),
      )
      const objects = list.Contents ?? []
      if (objects.length === 0) return 0

      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: objects.map((o) => ({ Key: o.Key! })),
            Quiet: true,
          },
        }),
      )
      return objects.length
    } catch (err) {
      throw new StorageError(
        `Delete by prefix failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
      )
    }
  }

  /**
   * Check if an object exists (e.g. after client upload).
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return true
    } catch {
      return false
    }
  }

  getPublicUrl(key: string): string {
    const cleanKey = key.startsWith('/') ? key.slice(1) : key
    return `${this.publicUrl}/${cleanKey}`
  }
}

let instance: StorageService | null = null

export function getStorageService(): StorageService {
  if (!instance) {
    instance = new StorageService()
  }
  return instance
}
