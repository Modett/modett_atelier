-- Migration: Add shipping_settings table for free shipping thresholds
-- Single-row config table (same pattern as loyalty_rules)

CREATE TABLE IF NOT EXISTS shipping.shipping_settings (
  id                          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  free_threshold_lkr          NUMERIC(12,2)  CHECK (free_threshold_lkr >= 0),
  free_threshold_sgd          NUMERIC(12,2)  CHECK (free_threshold_sgd >= 0),
  free_threshold_usd          NUMERIC(12,2)  CHECK (free_threshold_usd >= 0),
  free_shipping_label         TEXT           NOT NULL   DEFAULT 'Free Shipping',
  updated_at                  TIMESTAMPTZ    NOT NULL   DEFAULT now(),
  updated_by_admin_id         UUID           REFERENCES iam.admins(id)
);

INSERT INTO shipping.shipping_settings (
  free_threshold_lkr,
  free_threshold_sgd,
  free_threshold_usd,
  free_shipping_label
) VALUES (
  NULL,
  NULL,
  NULL,
  'Free Shipping'
)
ON CONFLICT DO NOTHING;
