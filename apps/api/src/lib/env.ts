const REQUIRED_IN_PRODUCTION = [
  'DATABASE_URL',
  'REDIS_URL',
  'PAYABLE_MERCHANT_KEY',
  'PAYABLE_MERCHANT_TOKEN',
  'FRONTEND_URL',
  'API_URL',
  'SESSION_SECRET',
]

/**
 * Required for the saved-card / tokenize-pay server-to-server flow. Without
 * these, ONE_TIME and TOKENIZE (popup) still work, but `payWithSavedCard`
 * (POST /payments/saved-cards/:id/pay) will fail when invoked.
 */
const REQUIRED_FOR_SAVED_CARD_PAY = [
  'PAYABLE_BUSINESS_KEY',
  'PAYABLE_BUSINESS_TOKEN',
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

  const missingSavedCard = REQUIRED_FOR_SAVED_CARD_PAY.filter(
    (key) => !process.env[key],
  )
  if (missingSavedCard.length > 0) {
    console.warn(
      '⚠️  Saved-card (tokenize/pay) flow disabled — missing:',
      missingSavedCard.join(', '),
    )
  }

  console.log('✓ All required environment variables present')
}
