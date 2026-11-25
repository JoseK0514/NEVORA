BEGIN;

-- Each existing device starts with the privacy-preserving sign-in mode.
ALTER TABLE clocker_devices ADD COLUMN sign_in_mode text NOT NULL DEFAULT 'EMPLOYEE_ID'
  CHECK (sign_in_mode IN ('EMPLOYEE_ID', 'NAME_PICKER'));

-- A replacement or revoked credential cannot carry over a roster opt-in.
-- Keeping this with the new column preserves device lifecycle on older schemas.
CREATE FUNCTION clocker_reset_picker_on_credential_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.sign_in_mode := 'EMPLOYEE_ID';
  RETURN NEW;
END;
$$;
CREATE TRIGGER clocker_reset_picker_on_credential_change
  BEFORE UPDATE OF credential_hash ON clocker_devices
  FOR EACH ROW WHEN (OLD.credential_hash IS DISTINCT FROM NEW.credential_hash)
  EXECUTE FUNCTION clocker_reset_picker_on_credential_change();

ALTER TABLE clocker_device_events DROP CONSTRAINT clocker_device_events_kind_check;
ALTER TABLE clocker_device_events ADD CONSTRAINT clocker_device_events_kind_check
  CHECK (kind IN ('REGISTERED','ENROLLED','RENAMED','ROTATION_REQUESTED','REVOKED','SIGN_IN_MODE_CHANGED'));

-- Keep existing workforce location assignments as the default. Explicit Clocker
-- overrides do not change scheduling or delegated workforce authority.
ALTER TABLE employees
  ADD COLUMN clocker_location_mode text NOT NULL DEFAULT 'ASSIGNED',
  ADD COLUMN clocker_location_ids text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT employees_clocker_location_scope_check CHECK (
    (clocker_location_mode IN ('ASSIGNED','ALL') AND cardinality(clocker_location_ids) = 0)
    OR (clocker_location_mode = 'SELECTED' AND cardinality(clocker_location_ids) > 0
      AND array_position(clocker_location_ids, NULL::text) IS NULL)
  );

COMMIT;
