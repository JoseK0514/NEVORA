-- DRAFT: owned Phase C databases only; apply after devices and PIN drafts.
-- No numbered migration is reserved until Phase B hardening reconciliation.
BEGIN;
ALTER TABLE time_entries ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
ALTER TABLE break_entries ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK(version>0);
CREATE TABLE clocker_employee_state (
 employee_id text PRIMARY KEY REFERENCES employees(id),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0)
);
CREATE TABLE clocker_command_ledger (
 device_id text NOT NULL REFERENCES clocker_devices(id),
 command_id uuid NOT NULL,
 employee_id text NOT NULL REFERENCES employees(id),
 credential_version integer NOT NULL CHECK(credential_version>0),
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 action text NOT NULL CHECK(action IN ('CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT')),
 revision integer NOT NULL CHECK(revision>0),
 time_entry_id text NOT NULL REFERENCES time_entries(id),
 recorded_at timestamptz NOT NULL,
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 PRIMARY KEY(device_id,command_id),
 UNIQUE(employee_id,revision)
);
CREATE INDEX clocker_command_employee_history ON clocker_command_ledger(employee_id,recorded_at,command_id);
CREATE TRIGGER clocker_command_append_only
 BEFORE UPDATE OR DELETE ON clocker_command_ledger
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
-- No devices, identities, shifts, entries, breaks, or receipts are seeded.
COMMIT;
