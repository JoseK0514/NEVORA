BEGIN;

-- A transactional row, shared by all calendar source writers. Holding its row
-- lock through COMMIT prevents disjoint-week commits from reversing serial order.
CREATE TABLE calendar_clock(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),serial integer NOT NULL CHECK(serial>=0),modified_at timestamptz NOT NULL);
INSERT INTO calendar_clock VALUES(true,0,'epoch');
ALTER TABLE schedule_publication_revisions ADD COLUMN calendar_serial integer;
ALTER TABLE schedule_publication_revisions ADD COLUMN calendar_modified_at timestamptz;
ALTER TABLE locations ADD COLUMN calendar_serial integer;
ALTER TABLE locations ADD COLUMN calendar_modified_at timestamptz;
WITH sources AS (
 SELECT 'publication' AS kind,id,created_at AS at FROM schedule_publication_revisions
 UNION ALL SELECT 'location',id,updated_at FROM locations
), ranked AS (SELECT *,row_number() OVER(ORDER BY at,kind COLLATE "C",id COLLATE "C")::integer AS n FROM sources)
UPDATE schedule_publication_revisions r SET calendar_serial=n,calendar_modified_at=at FROM ranked WHERE kind='publication' AND ranked.id=r.id;
WITH sources AS (
 SELECT 'publication' AS kind,id,created_at AS at FROM schedule_publication_revisions
 UNION ALL SELECT 'location',id,updated_at FROM locations
), ranked AS (SELECT *,row_number() OVER(ORDER BY at,kind COLLATE "C",id COLLATE "C")::integer AS n FROM sources)
UPDATE locations l SET calendar_serial=n,calendar_modified_at=at FROM ranked WHERE kind='location' AND ranked.id=l.id;
UPDATE calendar_clock SET serial=(SELECT COALESCE(max(n),0) FROM (SELECT calendar_serial n FROM locations UNION ALL SELECT calendar_serial FROM schedule_publication_revisions) s),modified_at=(SELECT COALESCE(max(at),'epoch') FROM (SELECT calendar_modified_at at FROM locations UNION ALL SELECT calendar_modified_at FROM schedule_publication_revisions) s);
ALTER TABLE schedule_publication_revisions ALTER COLUMN calendar_serial SET NOT NULL,ALTER COLUMN calendar_modified_at SET NOT NULL;
ALTER TABLE locations ALTER COLUMN calendar_serial SET NOT NULL,ALTER COLUMN calendar_modified_at SET NOT NULL;
CREATE FUNCTION nevora_calendar_source_stamp() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='locations' THEN
  IF TG_OP='UPDATE' THEN
   IF NEW.short_name IS NOT DISTINCT FROM OLD.short_name THEN NEW.calendar_serial:=OLD.calendar_serial;NEW.calendar_modified_at:=OLD.calendar_modified_at;RETURN NEW;END IF;
  END IF;
 END IF;
 UPDATE calendar_clock SET serial=serial+1,modified_at=GREATEST(clock_timestamp(),modified_at+interval '1 microsecond') WHERE singleton
 RETURNING serial,modified_at INTO NEW.calendar_serial,NEW.calendar_modified_at;
 RETURN NEW;
END $$;
CREATE TRIGGER calendar_publication_stamp BEFORE INSERT ON schedule_publication_revisions FOR EACH ROW EXECUTE FUNCTION nevora_calendar_source_stamp();
CREATE TRIGGER calendar_location_stamp BEFORE INSERT OR UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION nevora_calendar_source_stamp();

CREATE TABLE calendar_subscriptions(
 id uuid PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id),employee_id text NOT NULL REFERENCES employees(id),
 digest text NOT NULL UNIQUE CHECK(digest~'^[a-f0-9]{64}$'),generation uuid NOT NULL UNIQUE,
 allowed_location_ids text[] NOT NULL CHECK(cardinality(allowed_location_ids)>0),
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),revoked_at timestamptz,revocation_reason text,
 CHECK((revoked_at IS NULL)=(revocation_reason IS NULL))
);
CREATE UNIQUE INDEX calendar_one_active ON calendar_subscriptions(workspace_id,employee_id) WHERE revoked_at IS NULL;
CREATE INDEX calendar_employee_history ON calendar_subscriptions(workspace_id,employee_id,issued_at DESC,id DESC);
CREATE TABLE calendar_operations(
 workspace_id text NOT NULL REFERENCES workspaces(id),actor_employee_id text NOT NULL REFERENCES employees(id),operation_id uuid NOT NULL,
 authority text NOT NULL CHECK(authority~'^[a-f0-9]{64}$'),payload_hash text NOT NULL CHECK(payload_hash~'^[a-f0-9]{64}$'),
 result jsonb NOT NULL CHECK(NOT result ? 'url'),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id)
);
CREATE FUNCTION nevora_calendar_credential_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'calendar_credential_history';END IF;
 IF NEW.digest IS DISTINCT FROM OLD.digest OR NEW.generation IS DISTINCT FROM OLD.generation OR NEW.employee_id IS DISTINCT FROM OLD.employee_id OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.allowed_location_ids IS DISTINCT FROM OLD.allowed_location_ids OR NEW.issued_at IS DISTINCT FROM OLD.issued_at OR NEW.id IS DISTINCT FROM OLD.id OR (OLD.revoked_at IS NOT NULL AND (NEW.revoked_at IS DISTINCT FROM OLD.revoked_at OR NEW.revocation_reason IS DISTINCT FROM OLD.revocation_reason)) THEN RAISE EXCEPTION 'calendar_credential_immutable';END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER calendar_credential_guard BEFORE UPDATE OR DELETE ON calendar_subscriptions FOR EACH ROW EXECUTE FUNCTION nevora_calendar_credential_guard();
CREATE FUNCTION nevora_calendar_operation_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'calendar_operation_immutable'; END $$;
CREATE TRIGGER calendar_operation_guard BEFORE UPDATE OR DELETE ON calendar_operations FOR EACH ROW EXECUTE FUNCTION nevora_calendar_operation_guard();

CREATE FUNCTION nevora_calendar_authority_loss() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='employees' THEN
  IF NOT NEW.active OR NEW.role NOT IN('EMPLOYEE','LEAD') THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason='account_loss' WHERE employee_id=NEW.id AND revoked_at IS NULL;
  ELSE UPDATE calendar_subscriptions c SET revoked_at=clock_timestamp(),revocation_reason='location_loss' WHERE c.employee_id=NEW.id AND c.revoked_at IS NULL AND EXISTS(SELECT 1 FROM unnest(c.allowed_location_ids) allowed(id) WHERE allowed.id<>NEW.primary_location_id AND NOT EXISTS(SELECT 1 FROM employee_location_eligibility e WHERE e.employee_id=NEW.id AND e.location_id=allowed.id));END IF;
 ELSIF TG_TABLE_NAME='employee_credentials' THEN
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash OR NEW.password_updated_at IS DISTINCT FROM OLD.password_updated_at THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason='credential_reset' WHERE employee_id=NEW.employee_id AND revoked_at IS NULL;END IF;
 ELSIF TG_TABLE_NAME='employee_location_eligibility' THEN
  IF NOT EXISTS(SELECT 1 FROM employees e WHERE e.id=OLD.employee_id AND e.primary_location_id=OLD.location_id) THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason='location_loss' WHERE employee_id=OLD.employee_id AND OLD.location_id=ANY(allowed_location_ids) AND revoked_at IS NULL;END IF;
 ELSIF TG_TABLE_NAME='locations' THEN
  IF NOT NEW.active THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason='location_loss' WHERE NEW.id=ANY(allowed_location_ids) AND revoked_at IS NULL;END IF;
 ELSIF TG_TABLE_NAME='workspaces' THEN
  IF NOT NEW.active THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason='workspace_loss' WHERE workspace_id=NEW.id AND revoked_at IS NULL;END IF;
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER calendar_employee_loss AFTER UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION nevora_calendar_authority_loss();
CREATE TRIGGER calendar_recovery_loss AFTER UPDATE ON employee_credentials FOR EACH ROW EXECUTE FUNCTION nevora_calendar_authority_loss();
CREATE TRIGGER calendar_eligibility_loss AFTER DELETE OR UPDATE ON employee_location_eligibility FOR EACH ROW EXECUTE FUNCTION nevora_calendar_authority_loss();
CREATE TRIGGER calendar_location_loss AFTER UPDATE ON locations FOR EACH ROW EXECUTE FUNCTION nevora_calendar_authority_loss();
CREATE TRIGGER calendar_workspace_loss AFTER UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION nevora_calendar_authority_loss();

CREATE TABLE calendar_removals(
 workspace_id text NOT NULL REFERENCES workspaces(id),employee_id text NOT NULL REFERENCES employees(id),source_shift_id text NOT NULL,
 previous_publication_shift_id text NOT NULL REFERENCES schedule_publication_revision_shifts(id) ON DELETE RESTRICT,
 removal_revision_id text NOT NULL REFERENCES schedule_publication_revisions(id) ON DELETE RESTRICT,
 calendar_serial integer NOT NULL CHECK(calendar_serial>0),removed_at timestamptz NOT NULL,
 PRIMARY KEY(workspace_id,employee_id,source_shift_id,removal_revision_id)
);
CREATE INDEX calendar_removal_window ON calendar_removals(workspace_id,employee_id,removed_at DESC);
CREATE FUNCTION calendar_capture_removals(new_revision text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO calendar_removals(workspace_id,employee_id,source_shift_id,previous_publication_shift_id,removal_revision_id,calendar_serial,removed_at)
 SELECT l.workspace_id,old.employee_id,old.source_shift_id,old.id,next.id,next.calendar_serial,next.calendar_modified_at
 FROM schedule_publication_revisions next JOIN schedule_publication_revisions prior ON prior.id=(SELECT id FROM schedule_publication_revisions WHERE week_start=next.week_start AND revision_number<next.revision_number ORDER BY revision_number DESC LIMIT 1)
 JOIN schedule_publication_revision_shifts old ON old.revision_id=prior.id JOIN locations l ON l.id=old.location_id
 WHERE next.id=new_revision AND old.source_shift_id IS NOT NULL AND NOT old.is_callout_approved
 AND NOT EXISTS(SELECT 1 FROM schedule_publication_revision_shifts current WHERE current.revision_id=next.id AND current.employee_id=old.employee_id AND current.source_shift_id=old.source_shift_id AND NOT current.is_callout_approved)
 ON CONFLICT DO NOTHING;
END $$;
COMMIT;
