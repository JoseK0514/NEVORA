BEGIN;

CREATE TABLE workforce_permission_revisions (
  workspace_id text NOT NULL REFERENCES workspaces(id),
  employee_id text NOT NULL,
  location_id text NOT NULL,
  permission text NOT NULL CHECK (permission IN ('PUBLISH_SCHEDULE','APPROVE_LEAVE','REVIEW_TIME_EXCEPTION')),
  revision integer NOT NULL CHECK (revision > 0),
  role_generation bigint NOT NULL,
  granted boolean NOT NULL,
  actor_employee_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace_id, employee_id, location_id, permission, revision),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (actor_employee_id) REFERENCES employees(id),
  FOREIGN KEY (workspace_id, location_id) REFERENCES locations(workspace_id, id)
);

CREATE VIEW workforce_permissions_current WITH (security_invoker=true) AS
SELECT DISTINCT ON (workspace_id, employee_id, location_id, permission) *
FROM workforce_permission_revisions
ORDER BY workspace_id, employee_id, location_id, permission, revision DESC;

CREATE TABLE planning_calendar_revisions (
  workspace_id text NOT NULL REFERENCES workspaces(id),
  revision integer NOT NULL CHECK (revision > 0),
  starts_on smallint NOT NULL CHECK (starts_on BETWEEN 0 AND 6),
  actor_employee_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace_id, revision),
  FOREIGN KEY (actor_employee_id) REFERENCES employees(id)
);

CREATE TABLE pto_policy_revisions (
  workspace_id text NOT NULL REFERENCES workspaces(id),
  id uuid NOT NULL,
  code text NOT NULL CHECK (code ~ '^[A-Z][A-Z0-9_]{0,31}$'),
  revision integer NOT NULL CHECK (revision > 0),
  label text NOT NULL CHECK (length(btrim(label)) BETWEEN 1 AND 80),
  enabled boolean NOT NULL,
  full_day_minutes integer NOT NULL CHECK (full_day_minutes BETWEEN 1 AND 1440),
  earned_minutes_per_100_hours integer NOT NULL CHECK (earned_minutes_per_100_hours BETWEEN 0 AND 6000),
  carryover_cap_minutes integer NOT NULL CHECK (carryover_cap_minutes BETWEEN 0 AND 525600),
  actor_employee_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace_id, id),
  UNIQUE (id),
  UNIQUE (workspace_id, code, revision),
  UNIQUE (workspace_id, id, code),
  FOREIGN KEY (actor_employee_id) REFERENCES employees(id)
);

CREATE VIEW pto_policies_current WITH (security_invoker=true) AS
SELECT DISTINCT ON (workspace_id, code) *
FROM pto_policy_revisions
ORDER BY workspace_id, code, revision DESC;

ALTER TABLE time_off_requests
  ADD COLUMN approval_location_ids text[],
  ADD COLUMN pto_policy_id uuid,
  ADD COLUMN pto_minutes integer,
  ADD COLUMN cancelled_by text,
  ADD COLUMN cancelled_at timestamptz,
  ADD CONSTRAINT workforce_pto_request_policy FOREIGN KEY (pto_policy_id) REFERENCES pto_policy_revisions(id),
  ADD CONSTRAINT workforce_leave_cancel_actor FOREIGN KEY (cancelled_by) REFERENCES employees(id),
  ADD CONSTRAINT workforce_leave_cancel_pair CHECK ((cancelled_by IS NULL) = (cancelled_at IS NULL)),
  ADD CONSTRAINT workforce_pto_request_minutes CHECK (
    (pto_policy_id IS NULL AND pto_minutes IS NULL)
    OR (pto_policy_id IS NOT NULL AND pto_minutes IS NOT NULL AND pto_minutes BETWEEN 1 AND 525600)
  );

CREATE TABLE pto_ledger (
  workspace_id text NOT NULL REFERENCES workspaces(id),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  policy_id uuid NOT NULL,
  policy_code text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('OPENING','EARNED','USAGE','REVERSAL','CARRYOVER','ADJUSTMENT')),
  minutes integer NOT NULL CHECK (minutes BETWEEN -525600 AND 525600),
  effective_date date NOT NULL,
  request_id text,
  qualifying_minutes integer CHECK (qualifying_minutes BETWEEN 1 AND 525600),
  source_reference text CHECK (source_reference IS NULL OR length(btrim(source_reference)) BETWEEN 1 AND 200),
  note text CHECK (note IS NULL OR length(btrim(note)) BETWEEN 1 AND 500),
  actor_employee_id text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace_id, id),
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (actor_employee_id) REFERENCES employees(id),
  FOREIGN KEY (workspace_id, policy_id, policy_code) REFERENCES pto_policy_revisions(workspace_id, id, code),
  FOREIGN KEY (request_id) REFERENCES time_off_requests(id),
  CHECK ((kind='EARNED') = (qualifying_minutes IS NOT NULL)),
  CHECK (
    (kind='OPENING' AND minutes>=0 AND request_id IS NULL AND note IS NOT NULL)
    OR (kind='EARNED' AND minutes>=0 AND request_id IS NULL AND source_reference IS NOT NULL AND note IS NOT NULL)
    OR (kind='USAGE' AND minutes<0 AND request_id IS NOT NULL)
    OR (kind='REVERSAL' AND minutes>0 AND request_id IS NOT NULL)
    OR (kind='CARRYOVER' AND minutes<=0 AND request_id IS NULL AND source_reference IS NOT NULL AND note IS NOT NULL)
    OR (kind='ADJUSTMENT' AND minutes<>0 AND request_id IS NULL AND note IS NOT NULL)
  )
);
CREATE INDEX pto_ledger_account ON pto_ledger (workspace_id, employee_id, policy_code, effective_date);
CREATE UNIQUE INDEX pto_ledger_opening ON pto_ledger (workspace_id, employee_id, policy_code) WHERE kind='OPENING';
CREATE UNIQUE INDEX pto_ledger_source ON pto_ledger (workspace_id, employee_id, policy_code, kind, source_reference)
  WHERE kind IN ('EARNED','CARRYOVER');
CREATE UNIQUE INDEX pto_ledger_leave_move ON pto_ledger (workspace_id, request_id, kind) WHERE request_id IS NOT NULL;

CREATE TABLE workforce_setting_operations (
  workspace_id text NOT NULL REFERENCES workspaces(id),
  actor_employee_id text NOT NULL,
  operation_id uuid NOT NULL,
  command_hash text NOT NULL CHECK (command_hash ~ '^[0-9a-f]{64}$'),
  receipt jsonb NOT NULL,
  PRIMARY KEY (workspace_id, actor_employee_id, operation_id),
  FOREIGN KEY (actor_employee_id) REFERENCES employees(id)
);

CREATE FUNCTION workforce_history_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
  RAISE EXCEPTION 'workforce_history_immutable';
END $$;
REVOKE ALL ON FUNCTION workforce_history_immutable() FROM PUBLIC;

CREATE TRIGGER workforce_permission_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON workforce_permission_revisions
  FOR EACH STATEMENT EXECUTE FUNCTION workforce_history_immutable();
CREATE TRIGGER planning_calendar_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON planning_calendar_revisions
  FOR EACH STATEMENT EXECUTE FUNCTION workforce_history_immutable();
CREATE TRIGGER pto_policy_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON pto_policy_revisions
  FOR EACH STATEMENT EXECUTE FUNCTION workforce_history_immutable();
CREATE TRIGGER pto_ledger_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON pto_ledger
  FOR EACH STATEMENT EXECUTE FUNCTION workforce_history_immutable();
CREATE TRIGGER workforce_setting_operations_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON workforce_setting_operations
  FOR EACH STATEMENT EXECUTE FUNCTION workforce_history_immutable();

-- Capture the likely staffing footprint at submission. A manager never chooses
-- the footprint. Legacy rows with no capture require Owner review.
CREATE FUNCTION workforce_leave_capture() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE owner_workspace text;
DECLARE pto_policy pto_policy_revisions%ROWTYPE;
DECLARE requested_minutes bigint;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.approval_location_ids, NEW.pto_policy_id, NEW.pto_minutes)
      IS DISTINCT FROM ROW(OLD.approval_location_ids, OLD.pto_policy_id, OLD.pto_minutes)
    THEN RAISE EXCEPTION 'workforce_leave_capture_immutable'; END IF;
    IF OLD.pto_policy_id IS NOT NULL AND (
      ROW(NEW.employee_id,NEW.start_date,NEW.end_date,NEW.start_time,NEW.end_time)
        IS DISTINCT FROM ROW(OLD.employee_id,OLD.start_date,OLD.end_date,OLD.start_time,OLD.end_time)
      OR (OLD.status<>'PENDING' AND ROW(NEW.reviewed_by,NEW.reviewed_at) IS DISTINCT FROM ROW(OLD.reviewed_by,OLD.reviewed_at))
    ) THEN RAISE EXCEPTION 'pto_request_history_immutable'; END IF;
    IF OLD.cancelled_at IS NOT NULL AND ROW(NEW.cancelled_by, NEW.cancelled_at)
      IS DISTINCT FROM ROW(OLD.cancelled_by, OLD.cancelled_at)
    THEN RAISE EXCEPTION 'workforce_leave_cancellation_immutable'; END IF;
    RETURN NEW;
  END IF;

  SELECT l.workspace_id INTO STRICT owner_workspace
    FROM employees e JOIN locations l ON l.id=e.primary_location_id
    WHERE e.id=NEW.employee_id;
  NEW.approval_location_ids := ARRAY(
    SELECT l.id FROM locations l WHERE l.workspace_id=owner_workspace AND (
      l.id=(SELECT e.primary_location_id FROM employees e WHERE e.id=NEW.employee_id)
      OR EXISTS (SELECT 1 FROM employee_location_eligibility e WHERE e.employee_id=NEW.employee_id AND e.location_id=l.id)
      OR EXISTS (SELECT 1 FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id
        WHERE sh.employee_id=NEW.employee_id AND s.location_id=l.id AND (sh.date BETWEEN NEW.start_date AND NEW.end_date OR (sh.date=NEW.start_date-1 AND sh.end_time<sh.start_time)))
    ) ORDER BY l.id
  );
  IF NEW.pto_policy_id IS NOT NULL THEN
    SELECT * INTO pto_policy FROM pto_policies_current
      WHERE workspace_id=owner_workspace AND id=NEW.pto_policy_id AND enabled;
    IF NOT FOUND OR NEW.status<>'PENDING' THEN
      RAISE EXCEPTION 'pto_policy_changed';
    END IF;
    requested_minutes := CASE WHEN NEW.start_time IS NULL THEN
      (NEW.end_date-NEW.start_date+1)::bigint*pto_policy.full_day_minutes
      ELSE floor(extract(epoch FROM (NEW.end_time-NEW.start_time))/60)::integer END;
    IF requested_minutes NOT BETWEEN 1 AND 525600
      OR (NEW.start_time IS NOT NULL AND NEW.start_date<>NEW.end_date)
    THEN RAISE EXCEPTION 'pto_request_minutes_changed'; END IF;
    NEW.pto_minutes := requested_minutes;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION workforce_leave_capture() FROM PUBLIC;
CREATE TRIGGER workforce_leave_capture BEFORE INSERT OR UPDATE OF approval_location_ids, pto_policy_id, pto_minutes,
  employee_id,start_date,end_date,start_time,end_time,reviewed_by,reviewed_at,cancelled_by,cancelled_at
  ON time_off_requests FOR EACH ROW EXECUTE FUNCTION workforce_leave_capture();

-- Status and money commit together, including for CTE-based legacy callers.
-- The canonical app locks the workspace and request first. This account lock
-- also serializes different approvals drawing against the same balance.
CREATE FUNCTION workforce_pto_leave_transition() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE policy pto_policy_revisions%ROWTYPE;
DECLARE prior pto_ledger%ROWTYPE;
DECLARE available bigint;
DECLARE local_day date;
BEGIN
  IF NEW.pto_policy_id IS NULL OR OLD.status=NEW.status THEN RETURN NEW; END IF;
  SELECT * INTO STRICT policy FROM pto_policy_revisions WHERE id=NEW.pto_policy_id;
  SELECT (clock_timestamp() AT TIME ZONE time_zone)::date INTO STRICT local_day FROM workspaces WHERE id=policy.workspace_id;
  PERFORM pg_advisory_xact_lock(hashtextextended(jsonb_build_array('pto', policy.workspace_id, NEW.employee_id, policy.code)::text, 0));

  IF NEW.status='APPROVED' THEN
    IF OLD.status<>'PENDING' OR NEW.reviewed_by IS NULL OR NEW.reviewed_by=NEW.employee_id THEN
      RAISE EXCEPTION 'pto_invalid_approval';
    END IF;
    SELECT COALESCE(sum(minutes),0) INTO available FROM pto_ledger
      WHERE workspace_id=policy.workspace_id AND employee_id=NEW.employee_id AND policy_code=policy.code;
    IF available < NEW.pto_minutes THEN RAISE EXCEPTION 'pto_insufficient_balance'; END IF;
    INSERT INTO pto_ledger(workspace_id,employee_id,policy_id,policy_code,kind,minutes,effective_date,request_id,actor_employee_id)
      VALUES(policy.workspace_id,NEW.employee_id,policy.id,policy.code,'USAGE',-NEW.pto_minutes,local_day,NEW.id,NEW.reviewed_by);
  ELSIF OLD.status='APPROVED' THEN
    IF NEW.status<>'CANCELLED' OR NEW.cancelled_by IS NULL OR NEW.cancelled_at IS NULL OR NEW.cancelled_by=NEW.employee_id THEN
      RAISE EXCEPTION 'pto_invalid_cancellation';
    END IF;
    SELECT * INTO STRICT prior FROM pto_ledger WHERE workspace_id=policy.workspace_id AND request_id=NEW.id AND kind='USAGE';
    INSERT INTO pto_ledger(workspace_id,employee_id,policy_id,policy_code,kind,minutes,effective_date,request_id,actor_employee_id)
      VALUES(policy.workspace_id,NEW.employee_id,prior.policy_id,prior.policy_code,'REVERSAL',-prior.minutes,local_day,NEW.id,NEW.cancelled_by);
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION workforce_pto_leave_transition() FROM PUBLIC;
CREATE TRIGGER workforce_pto_leave_transition AFTER UPDATE OF status ON time_off_requests
  FOR EACH ROW EXECUTE FUNCTION workforce_pto_leave_transition();

-- Existing isolated companies already have a bound APP role. Fresh installs
-- grant the same capabilities through the application role installer.
DO $grant$
DECLARE app_role text;
BEGIN
  SELECT login_role::text INTO app_role FROM onboarding_runtime_roles WHERE kind='APP';
  IF app_role IS NOT NULL THEN
    IF app_role !~ '^nv_app_[a-f0-9]{24}$' OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=app_role)
    THEN RAISE EXCEPTION 'workforce_app_role_invalid'; END IF;
    EXECUTE format('GRANT SELECT,INSERT ON workforce_permission_revisions,planning_calendar_revisions,pto_policy_revisions,pto_ledger,workforce_setting_operations TO %I', app_role);
    EXECUTE format('GRANT SELECT ON workforce_permissions_current,pto_policies_current TO %I', app_role);
  END IF;
END $grant$;

COMMIT;
