-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS iam.newsletter_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  promo_code_id UUID REFERENCES orders.promo_codes(id)
                     ON DELETE SET NULL,
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address    TEXT,
  source        TEXT NOT NULL DEFAULT 'POPUP',
  CONSTRAINT uq_newsletter_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email
  ON iam.newsletter_subscribers (email);
