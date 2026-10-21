BEGIN;
-- Personal account deletion requests (Apple 5.1.1, Google Play account deletion).
-- A person asks from Profile (web or app) after re-entering their password. One
-- request can be active per person; repeated or concurrent confirmations resolve
-- to it. The reference is what the person and support use. Access ends when the
-- request is accepted (sessions removed, calendar feeds revoked); the data is
-- removed by the process in docs/compliance/account-deletion-runbook.md, which
-- marks the request completed. The row holds no copy of profile data.
CREATE TABLE IF NOT EXISTS account_deletion_requests (
 id uuid PRIMARY KEY,
 reference text NOT NULL UNIQUE CHECK (reference ~ '^DEL-[A-HJ-NP-Z2-9]{8}$'),
 -- Nullable so the person's employee row can later be removed or de-identified.
 employee_id text REFERENCES employees(id) ON DELETE SET NULL,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 channel text NOT NULL CHECK (channel IN ('web', 'ios', 'android')),
 policy_version text NOT NULL CHECK (length(policy_version) BETWEEN 1 AND 64),
 status text NOT NULL CHECK (status IN ('received', 'processing', 'completed', 'withdrawn')),
 verified_at timestamptz NOT NULL,
 confirmed_at timestamptz NOT NULL,
 completed_at timestamptz,
 -- What was kept for a recorded obligation, and until when (no personal data).
 retained_note text CHECK (retained_note IS NULL OR length(retained_note) <= 2000),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK ((status = 'completed') = (completed_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS account_deletion_one_active
  ON account_deletion_requests (employee_id) WHERE status IN ('received', 'processing');
CREATE INDEX IF NOT EXISTS account_deletion_open_queue
  ON account_deletion_requests (confirmed_at) WHERE status IN ('received', 'processing');
COMMIT;
