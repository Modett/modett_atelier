-- Add referral_code to iam.users (unique, generated once on first request)
ALTER TABLE iam.users
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Track who referred whom and whether the bonus was credited
CREATE TABLE IF NOT EXISTS iam.referrals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id     UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  referred_id     UUID NOT NULL UNIQUE REFERENCES iam.users(id) ON DELETE CASCADE,
  referral_code   TEXT NOT NULL,
  bonus_credited  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON iam.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code     ON iam.referrals(referral_code);
