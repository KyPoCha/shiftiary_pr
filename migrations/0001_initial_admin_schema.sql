PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  legal_name TEXT NOT NULL,
  contract_tier TEXT NOT NULL CHECK (contract_tier IN ('standard', 'enterprise', 'pilot')),
  region TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'trial', 'suspended', 'archived')),
  plan TEXT NOT NULL CHECK (plan IN ('core', 'advanced', 'enterprise')),
  timezone TEXT NOT NULL,
  seats INTEGER NOT NULL CHECK (seats >= 0),
  workers INTEGER NOT NULL CHECK (workers >= 0),
  owner TEXT NOT NULL,
  last_schedule_generated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS account_group_members (
  group_id TEXT NOT NULL REFERENCES account_groups(id) ON DELETE CASCADE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, account_id)
);

CREATE TABLE IF NOT EXISTS feature_toggles (
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  label TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('Scheduling', 'Exports', 'Security', 'Reporting', 'Integrations')),
  state TEXT NOT NULL CHECK (state IN ('enabled', 'disabled', 'inherited')),
  inherited_from TEXT,
  risk TEXT NOT NULL CHECK (risk IN ('low', 'medium', 'high')),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (account_id, id)
);

CREATE TABLE IF NOT EXISTS shadow_login_policies (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  internal_admins_allowed INTEGER NOT NULL CHECK (internal_admins_allowed IN (0, 1)),
  customer_admins_allowed INTEGER NOT NULL CHECK (customer_admins_allowed IN (0, 1)),
  reason_required INTEGER NOT NULL CHECK (reason_required IN (0, 1)),
  max_session_minutes INTEGER NOT NULL CHECK (max_session_minutes > 0),
  active_session_count INTEGER NOT NULL CHECK (active_session_count >= 0),
  last_session_at TEXT
);

CREATE TABLE IF NOT EXISTS generator_rules (
  account_id TEXT PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  max_consecutive_nights INTEGER NOT NULL CHECK (max_consecutive_nights BETWEEN 1 AND 5),
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  created_at TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical'))
);

CREATE TABLE IF NOT EXISTS text_configuration_runs (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  original_text TEXT NOT NULL,
  structured_intent_json TEXT NOT NULL,
  preview_json TEXT NOT NULL,
  applied_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_customer_id ON accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_account_groups_customer_id ON account_groups(customer_id);
CREATE INDEX IF NOT EXISTS idx_group_members_account_id ON account_group_members(account_id);
CREATE INDEX IF NOT EXISTS idx_feature_toggles_account_id ON feature_toggles(account_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_account_created ON audit_events(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_text_configuration_runs_customer_created ON text_configuration_runs(customer_id, created_at DESC);
