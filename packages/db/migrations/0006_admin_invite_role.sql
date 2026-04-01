-- Invited role (OWNER vs ADMIN) persisted for accept flow
ALTER TABLE iam.admin_invites
  ADD COLUMN IF NOT EXISTS role iam.admin_role NOT NULL DEFAULT 'ADMIN';
