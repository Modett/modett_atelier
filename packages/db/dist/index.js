/**
 * @modett/db — database client, schema, and inferred types
 *
 * Usage:
 *   import { db, users } from '@modett/db'
 *   import type { User, Order } from '@modett/db'
 *   const [user] = await db.select().from(users).where(eq(users.email, '...'))
 */
export { db } from './client';
export { redis, withInventoryLock } from './redis';
export { LockNotAcquiredError } from './errors';
export * from './schema/index';
export * from './queries/iam';
export * from './queries/catalog';
export * from './queries/inventory';
