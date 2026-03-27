const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'REDIS_URL',
  'PAYABLE_MERCHANT_KEY',
  'PAYABLE_MERCHANT_TOKEN',
  'FRONTEND_URL',
  'API_URL',
  'SESSION_SECRET',
]

export function validateEnv() {
  if (process.env.NODE_ENV !== 'production') return

  const missing = REQUIRED_IN_PRODUCTION.filter(
    (key) => !process.env[key],
  )

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach((key) => console.error(`   - ${key}`))
    process.exit(1)
  }

  console.log('✓ All required environment variables present')
}
