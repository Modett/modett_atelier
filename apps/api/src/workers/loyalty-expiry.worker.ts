/**
 * Daily points expiry — uses loyalty_rules.points_expiry_months (not hardcoded).
 */

import { sql } from 'drizzle-orm'
import {
  db,
  getLoyaltyRulesNullable,
  getUsersDueForExpiry,
  withLoyaltyLock,
  insertLedgerEntryInTx,
  updateBalanceInTx,
  getLoyaltyAccount,
  createInboxMessage,
} from '@modett/db'

export async function expireInactivePoints(): Promise<void> {
  const rules = await getLoyaltyRulesNullable()
  if (!rules) return

  const expiryMonths = rules.points_expiry_months
  const due = await getUsersDueForExpiry({ expiryMonths })

  for (const { userId } of due) {
    try {
      await withLoyaltyLock(userId, async () => {
        const account = await getLoyaltyAccount({ userId })
        if (!account || account.balance <= 0) return

        const stillDue = await db.execute(sql`
          SELECT 1 AS ok
          FROM loyalty.loyalty_accounts
          WHERE user_id = ${userId}
            AND balance > 0
            AND last_activity_at < now() - (${String(expiryMonths)} || ' months')::interval
        `)
        if (stillDue.rows.length === 0) return

        const balance = account.balance

        await db.transaction(async (tx) => {
          await insertLedgerEntryInTx({
            tx,
            userId,
            type: 'EXPIRY',
            points: -balance,
            orderId: null,
            metadataJson: {
              reason: `Points expired after ${expiryMonths} months of inactivity`,
              expiryMonths,
            },
          })
          await updateBalanceInTx({ tx, userId, delta: -balance })
        })

        await createInboxMessage({
          userId,
          type: 'LOYALTY_EXPIRY',
          title: 'Your loyalty points have expired',
          body: `Your ${balance} points have expired due to ${expiryMonths} months of inactivity. Start shopping to earn new points and climb the tiers.`,
          metadataJson: { expiredPoints: balance, expiryMonths },
        }).catch(() => {})

        console.log(`[loyalty-expiry-worker] Expired ${balance} points for user ${userId}`)
      })
    } catch (err) {
      console.error(`[loyalty-expiry-worker] Failed for user ${userId}:`, err)
    }
  }
}
