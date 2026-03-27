/**
 * R2 S3 client singleton. Validates env at first use; throws if any R2 env var is missing.
 */

import { S3Client } from '@aws-sdk/client-s3'

const REQUIRED = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
  'R2_PUBLIC_URL',
] as const

function validateR2Env(): void {
  const missing = REQUIRED.filter((k) => !process.env[k]?.trim())
  if (missing.length > 0) {
    throw new Error(
      `Missing required R2 env: ${missing.join(', ')}. Set them in .env or disable storage.`,
    )
  }
}

let client: S3Client | null = null

export function getR2Client(): S3Client {
  if (!client) {
    validateR2Env()
    const accountId = process.env.R2_ACCOUNT_ID!
    client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }
  return client
}

/** For tests or when storage is optional, call this to reset the singleton. */
export function resetR2Client(): void {
  client = null
}
