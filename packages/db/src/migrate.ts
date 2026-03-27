import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import pg from 'pg'

const isProduction = process.env.NODE_ENV === 'production'

async function runMigrations() {
  console.log('🔄 Running database migrations...')

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction
      ? { rejectUnauthorized: false }
      : false,
  })

  const client = await pool.connect()

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public._migrations (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)

    const migrationsDir = path.join(__dirname, '../migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    const { rows: applied } = await client.query<{ name: string }>(
      'SELECT name FROM public._migrations ORDER BY name',
    )
    const appliedSet = new Set(applied.map((r) => r.name))

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ⏩ ${file} (already applied)`)
        continue
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
      console.log(`  ▶ Applying ${file}...`)

      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO public._migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
        console.log(`  ✅ ${file}`)
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${file} failed: ${err}`)
      }
    }

    console.log('✅ All migrations complete')
  } catch (err) {
    console.error('❌ Migration failed:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations()
