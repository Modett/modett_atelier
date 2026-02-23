/**
 * @modett/db — database client, schema, and inferred types
 *
 * Usage:
 *   import { db, users } from '@modett/db'
 *   import type { User, Order } from '@modett/db'
 *   const [user] = await db.select().from(users).where(eq(users.email, '...'))
 */

export { db, type Database } from './client'
export { redis } from './redis'
export * from './schema/index'
export * from './types'
export * from './queries/iam'
