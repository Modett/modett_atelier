/**
 * One-off script to insert a single user into iam.users for verification.
 * Run from apps/api: pnpm exec tsx scripts/seed-one-user.ts
 * Requires DATABASE_URL in .env (same as the API).
 */

import 'dotenv/config'
import * as bcrypt from 'bcryptjs'
import { createUser, getUserByEmail } from '@modett/db'

const BCRYPT_ROUNDS = 12
const SEED_EMAIL = 'seed-test@modett.local'
const SEED_PASSWORD = 'SeedPassword1'

async function main() {
  const existing = await getUserByEmail({ email: SEED_EMAIL })
  if (existing) {
    console.log('User already exists:', existing.id)
    console.log('Check with: SELECT * FROM iam.users WHERE email =', `'${SEED_EMAIL}'`)
    process.exit(0)
    return
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS)
  const user = await createUser({
    firstName: 'Seed',
    lastName: 'User',
    email: SEED_EMAIL,
    passwordHash,
    newsletterOptIn: false,
  })

  console.log('Created user in iam.users:')
  console.log('  id:', user.id)
  console.log('  email:', user.email)
  console.log('Verify with: SELECT * FROM iam.users WHERE id =', `'${user.id}'`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
