-- PAYable IPG — tokenize-payment support.
--   * payments.saved_cards stores tokenized cards returned by PAYable for paymentType=3 callbacks.
--   * payment_intents gains payment_type ('ONE_TIME' | 'TOKENIZE' | 'RECURRING' | 'SAVED_CARD_PAY')
--     and saved_card_id for traceability.
-- All tables are soft-delete; one default card per user is enforced via a partial unique index.

CREATE TABLE IF NOT EXISTS payments.saved_cards (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
  customer_ref_no     TEXT NOT NULL,
  payable_customer_id TEXT,
  token_id            TEXT NOT NULL,
  masked_card_no      TEXT NOT NULL,
  card_scheme         TEXT,
  card_holder_name    TEXT,
  card_exp            TEXT,
  nickname            TEXT,
  is_default          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ,
  CONSTRAINT uq_saved_cards_user_token UNIQUE (user_id, token_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_cards_user
  ON payments.saved_cards (user_id)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_cards_default_per_user
  ON payments.saved_cards (user_id)
  WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_saved_cards_customer_ref
  ON payments.saved_cards (customer_ref_no)
  WHERE deleted_at IS NULL;

ALTER TABLE payments.payment_intents
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'ONE_TIME',
  ADD COLUMN IF NOT EXISTS saved_card_id UUID REFERENCES payments.saved_cards(id);

ALTER TABLE payments.payment_intents
  DROP CONSTRAINT IF EXISTS chk_payment_intents_payment_type;
ALTER TABLE payments.payment_intents
  ADD CONSTRAINT chk_payment_intents_payment_type
  CHECK (payment_type IN ('ONE_TIME', 'TOKENIZE', 'RECURRING', 'SAVED_CARD_PAY'));

ALTER TABLE payments.payment_transactions
  ADD COLUMN IF NOT EXISTS payment_type TEXT NOT NULL DEFAULT 'ONE_TIME';
ALTER TABLE payments.payment_transactions
  DROP CONSTRAINT IF EXISTS chk_payment_tx_payment_type;
ALTER TABLE payments.payment_transactions
  ADD CONSTRAINT chk_payment_tx_payment_type
  CHECK (payment_type IN ('ONE_TIME', 'TOKENIZE', 'RECURRING', 'SAVED_CARD_PAY'));
