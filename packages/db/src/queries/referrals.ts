import { db } from '../client'
import { sql } from 'drizzle-orm'

export async function getOrCreateReferralCode(userId: string): Promise<string> {
  const existing = await db.execute(sql`
    SELECT referral_code FROM iam.users WHERE id = ${userId} AND referral_code IS NOT NULL
  `)
  if (existing.rows[0]) {
    return (existing.rows[0] as { referral_code: string }).referral_code
  }

  // Generate: MUSE- + 6 uppercase alphanumeric chars (no ambiguous 0/O/1/I)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  const referralCode = `MUSE-${code}`

  await db.execute(sql`
    UPDATE iam.users SET referral_code = ${referralCode} WHERE id = ${userId}
  `)
  return referralCode
}

export async function getUserByReferralCode(
  code: string,
): Promise<{ id: string; firstName: string } | null> {
  const result = await db.execute(sql`
    SELECT id, first_name AS "firstName"
    FROM iam.users
    WHERE referral_code = ${code.toUpperCase()} AND deleted_at IS NULL
    LIMIT 1
  `)
  const row = result.rows[0] as { id: string; firstName: string } | undefined
  return row ?? null
}

export async function createReferralRecord({
  referrerId,
  referredId,
  referralCode,
}: {
  referrerId: string
  referredId: string
  referralCode: string
}): Promise<void> {
  await db.execute(sql`
    INSERT INTO iam.referrals (referrer_id, referred_id, referral_code)
    VALUES (${referrerId}, ${referredId}, ${referralCode})
    ON CONFLICT (referred_id) DO NOTHING
  `)
}

export async function getReferralStats(userId: string): Promise<{
  totalReferrals: number
  creditedReferrals: number
}> {
  const result = await db.execute(sql`
    SELECT
      COUNT(*)::int AS "totalReferrals",
      COUNT(*) FILTER (WHERE bonus_credited = true)::int AS "creditedReferrals"
    FROM iam.referrals
    WHERE referrer_id = ${userId}
  `)
  const row = result.rows[0] as { totalReferrals: number; creditedReferrals: number } | undefined
  return row ?? { totalReferrals: 0, creditedReferrals: 0 }
}

export async function markReferralBonusCredited(referredId: string): Promise<string | null> {
  const result = await db.execute(sql`
    UPDATE iam.referrals
    SET bonus_credited = true
    WHERE referred_id = ${referredId} AND bonus_credited = false
    RETURNING referrer_id AS "referrerId"
  `)
  const row = result.rows[0] as { referrerId: string } | undefined
  return row?.referrerId ?? null
}
