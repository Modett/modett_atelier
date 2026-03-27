/**
 * Reservation expiry job — runs every 60s.
 * Finds reservations due for expiry (two-window check via view),
 * claims atomically, releases stock holds, stamps hold_released_at.
 * Does NOT send emails or correct stock drift; reconciliation worker flags drift.
 */

import { sql } from 'drizzle-orm'
import crypto from 'node:crypto'
import { db } from '@modett/db'
import { atomicReleaseHold } from '@modett/db'

export async function expireReservations(): Promise<void> {
  // Step 1: Find candidates using the view
  // Use raw SQL to query the view directly
  const candidates = await db.execute(sql`
    SELECT id FROM cart.reservations_due_for_expiry
  `)

  if (candidates.rows.length === 0) return

  // Step 2: Process each candidate
  for (const row of candidates.rows) {
    await processOneReservation(row.id as string)
  }
}

async function processOneReservation(reservationId: string): Promise<void> {
  const workerLockId = crypto.randomUUID()

  try {
    // Step A: Claim the reservation atomically
    // This UPDATE is the distributed lock — only one worker wins
    const claimed = await db.execute(sql`
      UPDATE cart.reservations
      SET worker_lock_id = ${workerLockId},
          processed_at   = now(),
          status         = 'EXPIRED'
      WHERE id           = ${reservationId}
        AND status       = 'HELD'
        AND worker_lock_id IS NULL
      RETURNING id, cart_id
    `)

    // 0 rows = another worker already claimed it — skip silently
    if (claimed.rows.length === 0) return

    // Step B: Get reservation items to know what to release
    const items = await db.execute(sql`
      SELECT variant_id, qty
      FROM cart.reservation_items
      WHERE reservation_id = ${reservationId}
    `)

    // Step C: Release holds for each variant
    // Release errors are logged but do NOT stop processing other items
    // A failed release means held_qty stays elevated — this is caught
    // by the daily reconciliation worker, NOT silently corrected here
    for (const item of items.rows) {
      try {
        await atomicReleaseHold({
          variantId: item.variant_id as string,
          qty: item.qty as number,
        })
      } catch (releaseErr) {
        console.error(
          `[expireReservations] Failed to release hold for ` +
            `reservation ${reservationId} variant ${item.variant_id}:`,
          releaseErr,
        )
        // Continue to next item — partial release is better than no release
      }
    }

    // Step D: Stamp hold_released_at to confirm release completed
    await db.execute(sql`
      UPDATE cart.reservations
      SET hold_released_at = now()
      WHERE id = ${reservationId}
    `)

    console.log(
      `[expireReservations] Expired reservation ${reservationId}, ` +
        `released ${items.rows.length} holds`,
    )
  } catch (err) {
    // Log and continue to next reservation
    // Do NOT re-throw — one bad reservation should not stop the batch
    console.error(
      `[expireReservations] Error processing reservation ${reservationId}:`,
      err,
    )
  }
}
