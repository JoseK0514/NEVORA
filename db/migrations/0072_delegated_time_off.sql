BEGIN;

ALTER TABLE time_off_requests
  ADD COLUMN requested_by_employee_id text REFERENCES employees(id),
  ADD COLUMN owner_review_required boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT workforce_leave_owner_review CHECK (
    owner_review_required = (requested_by_employee_id IS NOT NULL AND requested_by_employee_id=employee_id)
  );

CREATE FUNCTION workforce_leave_submission_locations(p_workspace text, p_employee text, p_start date, p_end date)
RETURNS text[] LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
  SELECT ARRAY(
    SELECT l.id FROM locations l WHERE l.workspace_id=p_workspace AND (
      l.id=(SELECT e.primary_location_id FROM employees e WHERE e.id=p_employee)
      OR EXISTS (SELECT 1 FROM employee_location_eligibility e WHERE e.employee_id=p_employee AND e.location_id=l.id)
      OR EXISTS (SELECT 1 FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id
        WHERE sh.employee_id=p_employee AND s.location_id=l.id AND (sh.date BETWEEN p_start AND p_end OR (sh.date=p_start-1 AND sh.end_time<sh.start_time)))
    ) ORDER BY l.id
  );
$$;

CREATE OR REPLACE FUNCTION workforce_leave_capture() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE owner_workspace text;
DECLARE pto_policy pto_policy_revisions%ROWTYPE;
DECLARE requested_minutes bigint;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF ROW(NEW.approval_location_ids, NEW.pto_policy_id, NEW.pto_minutes, NEW.requested_by_employee_id, NEW.owner_review_required)
      IS DISTINCT FROM ROW(OLD.approval_location_ids, OLD.pto_policy_id, OLD.pto_minutes, OLD.requested_by_employee_id, OLD.owner_review_required)
    THEN RAISE EXCEPTION 'workforce_leave_capture_immutable'; END IF;
    IF OLD.requested_by_employee_id IS NOT NULL AND
      ROW(NEW.employee_id,NEW.start_date,NEW.end_date,NEW.start_time,NEW.end_time,NEW.reason,NEW.created_at)
      IS DISTINCT FROM ROW(OLD.employee_id,OLD.start_date,OLD.end_date,OLD.start_time,OLD.end_time,OLD.reason,OLD.created_at)
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
  NEW.approval_location_ids := workforce_leave_submission_locations(owner_workspace, NEW.employee_id, NEW.start_date, NEW.end_date);
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
DROP TRIGGER workforce_leave_capture ON time_off_requests;
CREATE TRIGGER workforce_leave_capture BEFORE INSERT OR UPDATE OF approval_location_ids, pto_policy_id, pto_minutes,
  employee_id,start_date,end_date,start_time,end_time,reason,created_at,reviewed_by,reviewed_at,cancelled_by,cancelled_at,
  requested_by_employee_id,owner_review_required
  ON time_off_requests FOR EACH ROW EXECUTE FUNCTION workforce_leave_capture();

-- The guarded application path checks reviewer authority before any transition.
-- Protect the new participants and Owner-only review on other status writers too.
CREATE FUNCTION workforce_leave_review_participants() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE reviewer text;
BEGIN
  IF NEW.status = OLD.status OR OLD.requested_by_employee_id IS NULL THEN RETURN NEW; END IF;
  IF OLD.status='PENDING' AND NEW.status IN ('APPROVED','DENIED') THEN
    reviewer := NEW.reviewed_by;
  ELSIF OLD.status='APPROVED' AND NEW.status='CANCELLED' THEN
    reviewer := NEW.cancelled_by;
  ELSE
    RETURN NEW;
  END IF;
  IF reviewer IS NULL OR reviewer IN (OLD.employee_id, OLD.requested_by_employee_id)
    OR (OLD.owner_review_required AND NOT EXISTS (SELECT FROM employees WHERE id=reviewer AND active AND role='OWNER'))
  THEN RAISE EXCEPTION 'workforce_leave_independent_review_required'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION workforce_leave_review_participants() FROM PUBLIC;
CREATE TRIGGER workforce_leave_review_participants BEFORE UPDATE OF status ON time_off_requests
  FOR EACH ROW EXECUTE FUNCTION workforce_leave_review_participants();

COMMIT;
