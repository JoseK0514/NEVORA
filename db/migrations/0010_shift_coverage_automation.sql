BEGIN;

-- Preflight is deliberately non-destructive. Contradictions require explicit
-- review; independent source/target indexes in 0001 did not prevent these.
DO $$ BEGIN
 IF EXISTS (
   SELECT slot FROM (
     SELECT source_shift_id AS slot FROM shift_exchanges WHERE status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING')
     UNION ALL SELECT target_shift_id FROM shift_exchanges WHERE target_shift_id IS NOT NULL AND status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING')
     UNION ALL SELECT shift_id FROM shift_callouts WHERE status='PENDING'
   ) active GROUP BY slot HAVING count(*) > 1
 ) THEN RAISE EXCEPTION 'shift_change_legacy_participation_conflict: review active source/target/callout records before upgrade'; END IF;
END $$;
ALTER TABLE workspaces ADD COLUMN shift_change_policy jsonb
 CHECK (shift_change_policy IS NULL OR (jsonb_typeof(shift_change_policy)='object' AND octet_length(shift_change_policy::text)<=16384));
ALTER TABLE employee_scheduling_settings ADD COLUMN operational_rule_profile jsonb
 CHECK (operational_rule_profile IS NULL OR (jsonb_typeof(operational_rule_profile)='object' AND octet_length(operational_rule_profile::text)<=16384));

ALTER TABLE shifts ADD COLUMN assignment_episode_id uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX shifts_assignment_episode_unique ON shifts(assignment_episode_id);
CREATE FUNCTION shift_assignment_episode() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' OR NEW.employee_id IS DISTINCT FROM OLD.employee_id THEN
   NEW.assignment_episode_id := gen_random_uuid();
 ELSE
   -- Callers cannot resurrect a past episode, including on same-owner edits.
   NEW.assignment_episode_id := OLD.assignment_episode_id;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER shift_assignment_episode BEFORE INSERT OR UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION shift_assignment_episode();

-- A monotonically increasing material version prevents edit-away/edit-back from
-- resurrecting old consent or approved release. It is distinct from ownership.
ALTER TABLE shifts ADD COLUMN terms_revision integer NOT NULL DEFAULT 1 CHECK(terms_revision>0);
CREATE FUNCTION shift_material_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_OP='INSERT' THEN NEW.terms_revision:=1;
 ELSIF ROW(NEW.schedule_id,NEW.date,NEW.start_time,NEW.end_time,NEW.position_id,NEW.is_designated_lead)
   IS DISTINCT FROM ROW(OLD.schedule_id,OLD.date,OLD.start_time,OLD.end_time,OLD.position_id,OLD.is_designated_lead)
   OR (pg_trigger_depth()>1 AND NEW.terms_revision IS DISTINCT FROM OLD.terms_revision) THEN
   NEW.terms_revision:=OLD.terms_revision+1;
 ELSE NEW.terms_revision:=OLD.terms_revision; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER shift_material_revision BEFORE INSERT OR UPDATE ON shifts FOR EACH ROW EXECUTE FUNCTION shift_material_revision();
CREATE FUNCTION schedule_material_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF ROW(NEW.location_id,NEW.week_start,NEW.status) IS DISTINCT FROM ROW(OLD.location_id,OLD.week_start,OLD.status) THEN
  UPDATE shifts SET terms_revision=terms_revision+1 WHERE schedule_id=NEW.id;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER schedule_material_revision AFTER UPDATE ON schedules FOR EACH ROW EXECUTE FUNCTION schedule_material_revision();
CREATE FUNCTION workspace_material_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW.time_zone IS DISTINCT FROM OLD.time_zone THEN
  UPDATE shifts sh SET terms_revision=terms_revision+1 FROM schedules s JOIN locations l ON l.id=s.location_id WHERE sh.schedule_id=s.id AND l.workspace_id=NEW.id;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER workspace_material_revision AFTER UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION workspace_material_revision();

ALTER TABLE shift_exchanges
 ADD COLUMN request_revision integer NOT NULL DEFAULT 1 CHECK (request_revision>0),
 ADD COLUMN legacy_manual boolean NOT NULL DEFAULT true,
 ADD COLUMN requester_consent jsonb,
 ADD COLUMN target_consent jsonb,
 ADD COLUMN source_terms jsonb,
 ADD COLUMN target_terms jsonb,
 ADD COLUMN submission_deadline timestamptz,
 ADD COLUMN completion_deadline timestamptz,
 ADD COLUMN policy_revision integer CHECK (policy_revision>0),
 ADD COLUMN recorded_approval_mode text CHECK (recorded_approval_mode IN ('AUTOMATIC_WHEN_VALID','MANAGER_REVIEW')),
 ADD COLUMN outcome_mode text CHECK (outcome_mode IN ('AUTOMATIC','MANAGER','LEGACY')),
 ADD COLUMN outcome_reason text CHECK (length(outcome_reason)<=128),
 ADD COLUMN prior_request_id text,
 ADD COLUMN linked_callout_id text,
 ADD COLUMN escalated_at timestamptz,
 ADD CONSTRAINT shift_exchange_consent_bounds CHECK (
   (requester_consent IS NULL OR octet_length(requester_consent::text)<=16384) AND
   (target_consent IS NULL OR octet_length(target_consent::text)<=16384) AND
   (source_terms IS NULL OR octet_length(source_terms::text)<=16384) AND
   (target_terms IS NULL OR octet_length(target_terms::text)<=16384));
ALTER TABLE shift_callouts
 ADD COLUMN request_revision integer NOT NULL DEFAULT 1 CHECK (request_revision>0),
 ADD COLUMN legacy_manual boolean NOT NULL DEFAULT true,
 ADD COLUMN assignment_episode_id uuid,
 ADD COLUMN reviewed_terms_fingerprint text CHECK (length(reviewed_terms_fingerprint)<=256),
 ADD COLUMN source_terms jsonb CHECK (source_terms IS NULL OR octet_length(source_terms::text)<=16384),
 ADD COLUMN outcome_reason text CHECK (length(outcome_reason)<=128),
 ADD COLUMN linked_coverage_request_id text,
 ADD COLUMN escalated_at timestamptz;
-- Legacy approvals lack episode-bound review. Preserve them as historical/manual
-- records, never attach today's episode and thereby fabricate past consent.
DROP INDEX shift_callouts_active_shift_unique;
CREATE UNIQUE INDEX shift_callouts_active_episode_unique ON shift_callouts(shift_id,assignment_episode_id,reviewed_terms_fingerprint)
 WHERE status IN ('PENDING','APPROVED') AND NOT legacy_manual;
CREATE UNIQUE INDEX shift_exchanges_linked_callout_active_unique ON shift_exchanges(linked_callout_id)
 WHERE linked_callout_id IS NOT NULL AND status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING');

CREATE FUNCTION shift_change_revision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF NEW IS DISTINCT FROM OLD THEN NEW.request_revision := OLD.request_revision+1; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER exchange_revision BEFORE UPDATE ON shift_exchanges FOR EACH ROW EXECUTE FUNCTION shift_change_revision();
CREATE TRIGGER callout_revision BEFORE UPDATE ON shift_callouts FOR EACH ROW EXECUTE FUNCTION shift_change_revision();

CREATE TABLE shift_change_participation (
 shift_id text PRIMARY KEY REFERENCES shifts(id) ON DELETE CASCADE,
 exchange_id text REFERENCES shift_exchanges(id) ON DELETE CASCADE,
 callout_id text REFERENCES shift_callouts(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('SOURCE','TARGET','CALLOUT')),
 CHECK ((exchange_id IS NOT NULL)::integer+(callout_id IS NOT NULL)::integer=1),
 CHECK ((role='CALLOUT')=(callout_id IS NOT NULL))
);
INSERT INTO shift_change_participation(shift_id,exchange_id,role)
 SELECT source_shift_id,id,'SOURCE' FROM shift_exchanges WHERE status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING')
 UNION ALL SELECT target_shift_id,id,'TARGET' FROM shift_exchanges WHERE target_shift_id IS NOT NULL AND status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING');
INSERT INTO shift_change_participation(shift_id,callout_id,role)
 SELECT shift_id,id,'CALLOUT' FROM shift_callouts WHERE status='PENDING';
CREATE FUNCTION shift_change_reserve_exchange() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 DELETE FROM shift_change_participation WHERE exchange_id=NEW.id;
 IF NEW.status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING') THEN
   IF NEW.linked_callout_id IS NOT NULL THEN
     IF NEW.kind <> 'COVERAGE' OR NOT EXISTS (
       SELECT 1 FROM shift_callouts c JOIN shifts s ON s.id=c.shift_id
       WHERE c.id=NEW.linked_callout_id AND c.status='APPROVED' AND NOT c.legacy_manual
         AND c.shift_id=NEW.source_shift_id AND c.employee_id=NEW.requested_by_employee_id
         AND c.employee_id=s.employee_id AND c.assignment_episode_id=s.assignment_episode_id
     ) THEN RAISE EXCEPTION 'shift_change_invalid_callout_link'; END IF;
     DELETE FROM shift_change_participation WHERE callout_id=NEW.linked_callout_id AND shift_id=NEW.source_shift_id;
   END IF;
   INSERT INTO shift_change_participation(shift_id,exchange_id,role) VALUES (NEW.source_shift_id,NEW.id,'SOURCE');
   IF NEW.target_shift_id IS NOT NULL THEN INSERT INTO shift_change_participation(shift_id,exchange_id,role) VALUES (NEW.target_shift_id,NEW.id,'TARGET'); END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER exchange_participation AFTER INSERT OR UPDATE ON shift_exchanges FOR EACH ROW EXECUTE FUNCTION shift_change_reserve_exchange();
CREATE FUNCTION shift_change_reserve_callout() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 DELETE FROM shift_change_participation WHERE callout_id=NEW.id;
 IF NEW.status='PENDING' OR (NEW.status='APPROVED' AND NOT NEW.legacy_manual AND NOT EXISTS (
   SELECT 1 FROM shift_exchanges WHERE linked_callout_id=NEW.id
 )) THEN
   INSERT INTO shift_change_participation(shift_id,callout_id,role) VALUES (NEW.shift_id,NEW.id,'CALLOUT');
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER callout_participation AFTER INSERT OR UPDATE ON shift_callouts FOR EACH ROW EXECUTE FUNCTION shift_change_reserve_callout();

-- No live-source FKs: deleting/recreating a live shift cannot erase or relabel history.
CREATE TABLE shift_change_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id text NOT NULL,
 request_kind text NOT NULL CHECK (request_kind IN ('EXCHANGE','CALLOUT')),
 request_id text NOT NULL,
 request_revision integer NOT NULL CHECK (request_revision>0),
 event_kind text NOT NULL CHECK (event_kind IN ('LEGACY_IMPORTED','CREATED','CONSENT','COMPLETED','DECLINED','CANCELLED','EXPIRED','ESCALATED','STALE')),
 actor_employee_id text,
 source_terms jsonb,
 target_terms jsonb,
 participants jsonb NOT NULL,
 -- Private absence detail: requester/management only, never candidate projections.
 callout_reason_code text,
 callout_reason_note text,
 outcome_reason text,
 outcome_mode text,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(request_kind,request_id,request_revision,event_kind),
 CHECK (octet_length(participants::text)<=16384),
 CHECK (source_terms IS NULL OR octet_length(source_terms::text)<=16384),
 CHECK (target_terms IS NULL OR octet_length(target_terms::text)<=16384)
);
INSERT INTO shift_change_events(workspace_id,request_kind,request_id,request_revision,event_kind,source_terms,target_terms,participants,outcome_reason,outcome_mode)
 SELECT l.workspace_id,'EXCHANGE',e.id,1,'LEGACY_IMPORTED',
   to_jsonb(sh)||jsonb_build_object('locationId',s.location_id,'weekStart',s.week_start,'consentStatus','UNKNOWN'),
   (SELECT to_jsonb(t)||jsonb_build_object('locationId',ts.location_id,'weekStart',ts.week_start,'consentStatus','UNKNOWN')
     FROM shifts t JOIN schedules ts ON ts.id=t.schedule_id WHERE t.id=e.target_shift_id),
   jsonb_build_object('requesterEmployeeId',e.requested_by_employee_id,'targetEmployeeId',e.target_employee_id),e.status,'LEGACY'
 FROM shift_exchanges e JOIN shifts sh ON sh.id=e.source_shift_id JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id;
INSERT INTO shift_change_events(workspace_id,request_kind,request_id,request_revision,event_kind,source_terms,participants,callout_reason_code,callout_reason_note,outcome_reason,outcome_mode)
 SELECT l.workspace_id,'CALLOUT',c.id,1,'LEGACY_IMPORTED',
   to_jsonb(sh)||jsonb_build_object('locationId',s.location_id,'weekStart',s.week_start,'consentStatus','UNKNOWN'),
   jsonb_build_object('employeeId',c.employee_id),c.reason_code,c.reason_note,c.status,'LEGACY'
 FROM shift_callouts c JOIN shifts sh ON sh.id=c.shift_id JOIN schedules s ON s.id=sh.schedule_id JOIN locations l ON l.id=s.location_id;
CREATE FUNCTION shift_change_immutable_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 RAISE EXCEPTION 'shift_change_history_is_append_only';
END $$;
CREATE TRIGGER shift_change_event_immutable BEFORE UPDATE OR DELETE ON shift_change_events FOR EACH ROW EXECUTE FUNCTION shift_change_immutable_event();
CREATE TABLE shift_change_operations (
 workspace_id text NOT NULL,
 actor_employee_id text NOT NULL,
 operation_id uuid NOT NULL,
 command_fingerprint text NOT NULL CHECK (length(command_fingerprint) BETWEEN 1 AND 256),
 request_id text,
 result jsonb NOT NULL CHECK (jsonb_typeof(result)='object' AND octet_length(result::text)<=16384),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id)
);
COMMIT;
