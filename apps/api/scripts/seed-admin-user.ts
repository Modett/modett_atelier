/**
 * One-off script to insert a single admin user into iam.users + iam.admins.
 * Run from apps/api: pnpm exec tsx scripts/seed-admin-user.ts
 * Requires DATABASE_URL and REDIS_URL in .env (same as the API).
 */

import 'dotenv/config'
import * as bcrypt from 'bcryptjs'
import {
  createUser,
  getUserByEmail,
  createAdmin,
  updateAdminStatus,
  getAdminByUserId,
} from '@modett/db'

const BCRYPT_ROUNDS = 12
const ADMIN_EMAIL = 'kumudikaj@modett.com'
const ADMIN_PASSWORD = 'Modett@2025'

async function main() {
  let user = await getUserByEmail({ email: ADMIN_EMAIL })
  if (user) {
    const existingAdmin = await getAdminByUserId({ userId: user.id })
    if (existingAdmin) {
      console.log('Admin user already exists.')
      console.log('  Email:', ADMIN_EMAIL)
      console.log('  Password:', ADMIN_PASSWORD)
      console.log('  (Change password after first login if this was seeded before.)')
      process.exit(0)
      return
    }
    // User exists but no admin row — create admin and activate
    const admin = await createAdmin({ userId: user.id, role: 'OWNER' })
    await updateAdminStatus({ id: admin.id, status: 'ACTIVE' })
    console.log('Created admin row for existing user.')
    console.log('  Email:', ADMIN_EMAIL)
    console.log('  Password:', ADMIN_PASSWORD)
    process.exit(0)
    return
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS)
  user = await createUser({
    firstName: 'Admin',
    lastName: 'User',
    email: ADMIN_EMAIL,
    passwordHash,
    newsletterOptIn: false,
  })
  const admin = await createAdmin({ userId: user.id, role: 'OWNER' })
  await updateAdminStatus({ id: admin.id, status: 'ACTIVE' })

  console.log('Admin user created.')
  console.log('  Email (username):', ADMIN_EMAIL)
  console.log('  Password:', ADMIN_PASSWORD)
  console.log('Use these to sign in at /admin/login')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
