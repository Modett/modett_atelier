/**
 * Weekly tier recompute — dual-axis score; notifies inbox on downgrade.
 */

import { sql } from 'drizzle-orm'
import { db, getLoyaltyAccount, createInboxMessage } from '@modett/db'
import { computeAndUpdateTier } from '../modules/loyalty/loyalty.service'

function tierRank(t: string): number {
  const u = t.toUpperCase()
  if (u === 'GOLD') return 3
  if (u === 'SILVER') return 2
  return 1
}

export async function recomputeAllTiers(): Promise<void> {
  const result = await db.execute(sql`
    SELECT user_id FROM loyalty.loyalty_accounts
    WHERE tier_evaluated_at < now() - INTERVAL '7 days'
    ORDER BY tier_evaluated_at ASC
    LIMIT 200
  `)

  for (const row of result.rows as Array<{ user_id: string }>) {
    const userId = row.user_id
    try {
      const before = await getLoyaltyAccount({ userId })
      const previousTier = before?.tier ?? 'BRONZE'
      const { newTier, compositeScore } = await computeAndUpdateTier({ userId })
      if (tierRank(String(newTier)) < tierRank(String(previousTier))) {
        await createInboxMessage({
          userId,
          type: 'LOYALTY_TIER',
          title: 'Your loyalty tier has changed',
          body: `Your Modett tier is now ${newTier}. Shop with us to climb back up and enjoy the full benefits.`,
          metadataJson: { previousTier, newTier },
        }).catch(() => {})
      }
      console.log(
        `[loyalty-tier-worker] User ${userId}: tier=${newTier}, score=${compositeScore}`,
      )
    } catch (err) {
      console.error(`[loyalty-tier-worker] Failed for user ${userId}:`, err)
    }
  }
}
