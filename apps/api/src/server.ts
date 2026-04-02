import 'dotenv/config'
import { validateEnv } from './lib/env'

validateEnv()

import { app } from './app'
import { processDueCampaigns } from './workers/campaign-delivery.worker'
import { recomputeAllTiers } from './workers/loyalty-tier.worker'
import { expireInactivePoints } from './workers/loyalty-expiry.worker'

const PORT = parseInt(process.env.PORT ?? '3001', 10)

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ API running on port ${PORT}`)
  console.log(`  Environment: ${process.env.NODE_ENV ?? 'development'}`)
})

const CAMPAIGN_WORKER_MS = 60_000
setInterval(() => {
  processDueCampaigns().catch((err: unknown) => {
    console.error('[campaign-worker] processDueCampaigns error:', err)
  })
}, CAMPAIGN_WORKER_MS)

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
setInterval(() => {
  recomputeAllTiers().catch((err: unknown) => {
    console.error('[loyalty-tier-worker]', err)
  })
}, WEEK_MS)

const DAY_MS = 24 * 60 * 60 * 1000
setInterval(() => {
  expireInactivePoints().catch((err: unknown) => {
    console.error('[loyalty-expiry-worker]', err)
  })
}, DAY_MS)

process.on('SIGTERM', () => {
  console.log('SIGTERM received — closing server gracefully')
  server.close(() => {
    console.log('Server closed')
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000)
})