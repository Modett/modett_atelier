-- Dual-axis tier scoring, configurable evaluation window & points expiry

ALTER TABLE loyalty.loyalty_accounts
  ADD COLUMN IF NOT EXISTS composite_score NUMERIC(10,4) NOT NULL DEFAULT 0;

ALTER TABLE loyalty.loyalty_rules
  ADD COLUMN IF NOT EXISTS frequency_weight NUMERIC(4,3) NOT NULL DEFAULT 0.6,
  ADD COLUMN IF NOT EXISTS spend_weight NUMERIC(4,3) NOT NULL DEFAULT 0.4,
  ADD COLUMN IF NOT EXISTS spend_normalisation_factor INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS evaluation_window_months INTEGER NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS points_expiry_months INTEGER NOT NULL DEFAULT 12;

-- Composite tier thresholds (score units), aligned with dual-axis model
UPDATE loyalty.loyalty_rules SET
  tier_thresholds_json = '{"BRONZE": 0, "SILVER": 6, "GOLD": 12}'::jsonb,
  frequency_weight = 0.6,
  spend_weight = 0.4,
  spend_normalisation_factor = 100,
  evaluation_window_months = 12,
  points_expiry_months = 12
WHERE true;
