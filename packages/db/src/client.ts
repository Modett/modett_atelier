/**
 * Drizzle PostgreSQL client.
 * All DB access in the app goes through this client.
 * Requires DATABASE_URL in environment.
 */

import { drizzle } from 'drizzle-orm/node-postgres'
import * as pg from 'pg'
import * as schema from './schema/index'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required')
}

const pool = new pg.Pool({ connectionString })

export const db = drizzle(pool, { schema })

export type Database = typeof db

/** Type of the client passed to db.transaction(callback) — use for query functions that accept tx. */
export type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0]
