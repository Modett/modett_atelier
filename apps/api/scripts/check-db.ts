/**
 * One-off script to verify DATABASE_URL connects and schema is present.
 * Run from repo root: pnpm exec tsx apps/api/scripts/check-db.ts
 * Loads .env from apps/api via dotenv path.
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env from apps/api (when run from root) or current dir
const envPath = resolve(process.cwd(), 'apps/api/.env')
const fallback = resolve(process.cwd(), '.env')
config({ path: envPath })
if (!process.env.DATABASE_URL) config({ path: fallback })

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set (check apps/api/.env)')
    process.exit(1)
  }

  // Mask URL for log (show only host and db name)
  const url = new URL(connectionString.replace(/^postgres:\/\//, 'https://'))
  const host = url.hostname
  const dbName = url.pathname.slice(1) || 'unknown'
  console.log('Checking DB connection to', host, 'database', dbName, '...')

  try {
    const { getUserByEmail } = await import('@modett/db')
    // Simple read query: verifies connection and that iam.users exists
    await getUserByEmail({ email: '__connection_check__@modett.local' })
    console.log('OK: Database connection and schema (iam.users) verified.')
  } catch (err) {
    console.error('Database error:', err instanceof Error ? err.message : err)
    process.exit(1)
  }
  process.exit(0)
}

main()
