-- Admin audit trail for mutating actions (snapshots at write time)
CREATE TABLE IF NOT EXISTS iam.admin_audit_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
  admin_email     TEXT        NOT NULL,
  admin_role      TEXT        NOT NULL,
  action          TEXT        NOT NULL,
  entity_type     TEXT        NOT NULL,
  entity_id       TEXT,
  entity_label    TEXT,
  before_json     JSONB,
  after_json      JSONB,
  ip_address      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin   ON iam.admin_audit_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity  ON iam.admin_audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action  ON iam.admin_audit_log (action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON iam.admin_audit_log (created_at DESC);
