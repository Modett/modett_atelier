/**
 * Unit tests for storage service — URL construction, key patterns, StorageError.
 * R2 client is not called (no real S3); we test service logic only.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StorageError } from '../storage.types'

describe('StorageError', () => {
  it('has code and message', () => {
    const err = new StorageError('Upload failed', 'UPLOAD_FAILED')
    expect(err.message).toBe('Upload failed')
    expect(err.code).toBe('UPLOAD_FAILED')
    expect(err.name).toBe('StorageError')
  })

  it('defaults code to STORAGE_ERROR', () => {
    const err = new StorageError('Something went wrong')
    expect(err.code).toBe('STORAGE_ERROR')
  })
})

describe('getPublicUrl', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      R2_ACCOUNT_ID: 'test-account',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET_NAME: 'test-bucket',
      R2_PUBLIC_URL: 'https://pub-xxx.r2.dev',
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('constructs URL without leading slash in key', async () => {
    const { getStorageService } = await import('../storage.service')
    const storage = getStorageService()
    const url = storage.getPublicUrl('products/slug/00-full.webp')
    expect(url).toBe('https://pub-xxx.r2.dev/products/slug/00-full.webp')
  })

  it('strips leading slash from key', async () => {
    const { getStorageService } = await import('../storage.service')
    const storage = getStorageService()
    const url = storage.getPublicUrl('/products/slug/00-full.webp')
    expect(url).toBe('https://pub-xxx.r2.dev/products/slug/00-full.webp')
  })
})

describe('image processor', () => {
  it('processProductImage returns map with full, card, thumb', async () => {
    const { processProductImage } = await import('../image.processor')
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const result = await processProductImage(minimalPng)
    expect(result.has('full')).toBe(true)
    expect(result.has('card')).toBe(true)
    expect(result.has('thumb')).toBe(true)
    const full = result.get('full')!
    expect(full.buffer).toBeInstanceOf(Buffer)
    expect(full.width).toBeGreaterThan(0)
    expect(full.height).toBeGreaterThan(0)
    expect(full.size).toBeGreaterThan(0)
  })

  it('processSingleImageToWebP returns single variant', async () => {
    const { processSingleImageToWebP } = await import('../image.processor')
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const result = await processSingleImageToWebP(minimalPng, 1200, 85)
    expect(result.buffer).toBeInstanceOf(Buffer)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)
    expect(result.size).toBeGreaterThan(0)
  })
})
