BEGIN;

-- Each existing device starts with the privacy-preserving sign-in mode.
ALTER TABLE clocker_devices ADD COLUMN sign_in_mode text NOT NULL DEFAULT 'EMPLOYEE_ID'
  CHECK (sign_in_mode IN ('EMPLOYEE_ID', 'NAME_PICKER'));

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
