/**
 * Drizzle PostgreSQL client.
 * All DB access in the app goes through this client.
 * Requires DATABASE_URL in environment.
 */
import * as pg from 'pg';
import * as schema from './schema/index';
export declare const db: import("drizzle-orm/node-postgres").NodePgDatabase<typeof schema> & {
    $client: pg.Pool;
};
export type Database = typeof db;
/** Type of the client passed to db.transaction(callback) — use for query functions that accept tx. */
export type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];
//# sourceMappingURL=client.d.ts.map