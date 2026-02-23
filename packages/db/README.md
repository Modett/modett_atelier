# @modett/db

Drizzle ORM client and schema for Modett. All DB access goes through this package.

## Setup

1. **Install dependencies** (from repo root with pnpm workspace, or from this package):

   ```bash
   pnpm install
   ```

2. **Database URL**: Set `DATABASE_URL` (e.g. in `.env` or `packages/db/.env`):

   ```
   DATABASE_URL=postgresql://user:pass@host:5432/dbname
   ```

3. **Initial schema**: Run the existing SQL migration once to create schemas, enums, and tables:

   ```bash
   psql "$DATABASE_URL" -f "packages/db/migrations/ 0001_initial.sql"
   ```

   Or use your migration runner. The Drizzle schema in `src/schema/` mirrors this SQL for type-safe queries.

## Scripts

- `pnpm db:generate` — Generate a new migration from schema changes (drizzle-kit generate)
- `pnpm db:migrate` — Run pending migrations (drizzle-kit migrate)
- `pnpm db:push` — Push schema to DB without migration files (dev only)
- `pnpm db:studio` — Open Drizzle Studio

## Usage

```ts
import { db, users, products } from '@modett/db'
import { eq, and } from 'drizzle-orm'

const [user] = await db.select().from(users).where(eq(users.email, 'a@b.com'))
const activeProducts = await db.select().from(products).where(eq(products.active, true))
```

Use `@modett/types` for shared TypeScript types (Order, CurrencyCode, etc.) in API and web.
