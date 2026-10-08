BEGIN;
-- Additive foundation only. Live use awaits D04 retention approval and protected
-- application commands. Roll back presentation/commands; retain all evidence.
ALTER TABLE locations ADD CONSTRAINT communication_location_workspace_key UNIQUE(workspace_id,id);
ALTER TABLE notifications DROP CONSTRAINT notifications_source_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_source_kind_check CHECK
 (source_kind IN ('SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','MANAGER_SUMMARY','SELF_TEST','COMMUNICATION'));

CREATE TABLE communications (
 id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 author_employee_id text NOT NULL REFERENCES employees(id),
 state text NOT NULL DEFAULT 'DRAFT' CHECK(state IN('DRAFT','PUBLISHED','WITHDRAWN')),
 head_revision_id uuid,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(workspace_id,id),
 CHECK((state='DRAFT')=(head_revision_id IS NULL))
);
-- A length-prefixed UTF-8 sequence has an unambiguous representation in SQL/TS.
CREATE FUNCTION communication_content_hash(parts text[]) RETURNS text LANGUAGE sql IMMUTABLE STRICT AS $$
 SELECT encode(sha256(convert_to(string_agg(CASE WHEN part IS NULL THEN '-1:' ELSE octet_length(part)::text||':'||part END,'' ORDER BY ordinal),'UTF8')),'hex')
 FROM unnest(parts) WITH ORDINALITY AS p(part,ordinal)
$$;
CREATE TABLE communication_revisions (
 id uuid PRIMARY KEY,
 workspace_id text NOT NULL,
 communication_id uuid NOT NULL,
 version integer NOT NULL CHECK(version>0),
 created_by text NOT NULL REFERENCES employees(id),
 type text NOT NULL CHECK(type IN('TODAYS_TEAM','LOCATION_ANNOUNCEMENT','SHIFT_NOTE','OPERATIONAL_UPDATE')),
 scope_kind text NOT NULL CHECK(scope_kind IN('TODAYS_TEAM','LOCATION','SHIFT')),
 location_id text NOT NULL,
 business_date date,
 source_shift_id text,
 assignment_episode_id text,
 terms_fingerprint text,
 title text NOT NULL CHECK(char_length(title) BETWEEN 1 AND 120 AND title=btrim(title,E' \n') AND title !~ '[[:cntrl:]]'),
 body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 2000 AND body=btrim(body,E' \n') AND replace(body,E'\n','') !~ '[[:cntrl:]]'),
 acknowledgement text NOT NULL CHECK(acknowledgement IN('NONE','OPTIONAL','REQUIRED')),
 expires_at timestamptz,
 content_hash text NOT NULL CHECK(content_hash ~ '^[a-f0-9]{64}$'),
 audience_fingerprint text NOT NULL CHECK(audience_fingerprint ~ '^[a-f0-9]{64}$'),
 audience_observed_at timestamptz NOT NULL,
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(workspace_id,communication_id,id),
 UNIQUE(workspace_id,communication_id,id,content_hash),
 UNIQUE(workspace_id,communication_id,version),
 FOREIGN KEY(workspace_id,communication_id) REFERENCES communications(workspace_id,id),
 FOREIGN KEY(workspace_id,location_id) REFERENCES locations(workspace_id,id),
 CHECK((scope_kind='TODAYS_TEAM' AND business_date IS NOT NULL AND source_shift_id IS NULL AND assignment_episode_id IS NULL AND terms_fingerprint IS NULL)
 OR (scope_kind='LOCATION' AND business_date IS NULL AND source_shift_id IS NULL AND assignment_episode_id IS NULL AND terms_fingerprint IS NULL)
 OR (scope_kind='SHIFT' AND business_date IS NULL AND length(source_shift_id) BETWEEN 1 AND 200 AND length(assignment_episode_id) BETWEEN 1 AND 200 AND length(terms_fingerprint) BETWEEN 1 AND 200 AND source_shift_id IS NOT NULL AND assignment_episode_id IS NOT NULL AND terms_fingerprint IS NOT NULL)),
 CHECK((type='TODAYS_TEAM' AND scope_kind='TODAYS_TEAM' AND acknowledgement<>'REQUIRED') OR (type='LOCATION_ANNOUNCEMENT' AND scope_kind='LOCATION') OR (type='SHIFT_NOTE' AND scope_kind='SHIFT') OR type='OPERATIONAL_UPDATE'),
 CHECK(published_at IS NULL OR (audience_observed_at<=published_at AND (expires_at IS NULL OR expires_at>published_at)))
);
ALTER TABLE communications ADD CONSTRAINT communication_head_identity FOREIGN KEY(workspace_id,id,head_revision_id)
 REFERENCES communication_revisions(workspace_id,communication_id,id);
CREATE TABLE communication_recipients (
 workspace_id text NOT NULL,
 communication_id uuid NOT NULL,
 revision_id uuid NOT NULL,
 employee_id text NOT NULL REFERENCES employees(id),
 content_hash text NOT NULL,
 location_id text NOT NULL,
 grant_kind text NOT NULL CHECK(grant_kind IN('LOCATION','ASSIGNMENT')),
 source_shift_id text,
 assignment_episode_id text,
 terms_fingerprint text,
 observed_at timestamptz NOT NULL,
 provenance jsonb NOT NULL CHECK(jsonb_typeof(provenance)='object' AND provenance<>'{}'::jsonb),
 PRIMARY KEY(workspace_id,communication_id,revision_id,employee_id),
 UNIQUE(workspace_id,communication_id,revision_id,employee_id,content_hash),
 FOREIGN KEY(workspace_id,communication_id,revision_id,content_hash) REFERENCES communication_revisions(workspace_id,communication_id,id,content_hash),
 FOREIGN KEY(workspace_id,location_id) REFERENCES locations(workspace_id,id),
 CHECK((grant_kind='LOCATION' AND source_shift_id IS NULL AND assignment_episode_id IS NULL AND terms_fingerprint IS NULL)
 OR (grant_kind='ASSIGNMENT' AND source_shift_id IS NOT NULL AND assignment_episode_id IS NOT NULL AND terms_fingerprint IS NOT NULL AND length(source_shift_id) BETWEEN 1 AND 200 AND length(assignment_episode_id) BETWEEN 1 AND 200 AND length(terms_fingerprint) BETWEEN 1 AND 200))
);
CREATE TABLE communication_receipts (
 id uuid PRIMARY KEY,
 workspace_id text NOT NULL,
 communication_id uuid NOT NULL,
 revision_id uuid NOT NULL,
 employee_id text NOT NULL,
 content_hash text NOT NULL,
 acknowledged_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(workspace_id,communication_id,revision_id,employee_id),
 UNIQUE(workspace_id,communication_id,revision_id,employee_id,id),
 FOREIGN KEY(workspace_id,communication_id,revision_id,employee_id,content_hash) REFERENCES communication_recipients(workspace_id,communication_id,revision_id,employee_id,content_hash)
);
CREATE TABLE communication_operations (
 workspace_id text NOT NULL,
 actor_employee_id text NOT NULL REFERENCES employees(id),
 operation_id uuid NOT NULL,
 session_hash text NOT NULL CHECK(session_hash ~ '^[a-f0-9]{64}$'),
 payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 kind text NOT NULL CHECK(kind IN('PUBLISH','REVISE','WITHDRAW','ACKNOWLEDGE')),
 communication_id uuid NOT NULL,
 revision_id uuid NOT NULL,
 receipt_id uuid,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id),
 FOREIGN KEY(workspace_id,communication_id,revision_id) REFERENCES communication_revisions(workspace_id,communication_id,id),
 FOREIGN KEY(workspace_id,communication_id,revision_id,actor_employee_id,receipt_id) REFERENCES communication_receipts(workspace_id,communication_id,revision_id,employee_id,id),
 CHECK((kind='ACKNOWLEDGE')=(receipt_id IS NOT NULL))
);
CREATE TABLE communication_lifecycle (
 id uuid PRIMARY KEY,
 workspace_id text NOT NULL,
 communication_id uuid NOT NULL,
 revision_id uuid NOT NULL,
 actor_employee_id text NOT NULL REFERENCES employees(id),
 kind text NOT NULL CHECK(kind IN('PUBLISHED','REVISED','WITHDRAWN')),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(workspace_id,communication_id,revision_id) REFERENCES communication_revisions(workspace_id,communication_id,id),
 UNIQUE(workspace_id,communication_id,revision_id,kind)
);
CREATE FUNCTION communication_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'communication_history_immutable'; END $$;
CREATE TRIGGER communication_revisions_immutable BEFORE UPDATE OR DELETE ON communication_revisions FOR EACH ROW EXECUTE FUNCTION communication_append_only();
CREATE TRIGGER communication_recipients_immutable BEFORE UPDATE OR DELETE ON communication_recipients FOR EACH ROW EXECUTE FUNCTION communication_append_only();
CREATE TRIGGER communication_receipts_immutable BEFORE UPDATE OR DELETE ON communication_receipts FOR EACH ROW EXECUTE FUNCTION communication_append_only();
CREATE TRIGGER communication_operations_immutable BEFORE UPDATE OR DELETE ON communication_operations FOR EACH ROW EXECUTE FUNCTION communication_append_only();
CREATE TRIGGER communication_lifecycle_immutable BEFORE UPDATE OR DELETE ON communication_lifecycle FOR EACH ROW EXECUTE FUNCTION communication_append_only();

CREATE FUNCTION communication_same_workspace(employee text,workspace text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=employee AND e.active AND l.workspace_id=workspace)
$$;
CREATE FUNCTION communication_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r communication_revisions%ROWTYPE; c communications%ROWTYPE; h integer; actor text;
BEGIN
 IF TG_TABLE_NAME='communications' THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'communication_history_immutable'; END IF;
  -- Author eligibility is a creation-time fact; later deactivation or relocation
  -- must not invalidate immutable history. New revision/lifecycle actors retain
  -- their current eligibility guards; protected commands own session authority.
  IF TG_OP='INSERT' AND NOT communication_same_workspace(NEW.author_employee_id,NEW.workspace_id) THEN RAISE EXCEPTION 'communication_actor_workspace'; END IF;
  IF TG_OP='INSERT' AND NEW.state<>'DRAFT' THEN RAISE EXCEPTION 'communication_stage_required'; END IF;
  IF TG_OP='UPDATE' THEN
   IF (NEW.id,NEW.workspace_id,NEW.author_employee_id,NEW.created_at) IS DISTINCT FROM (OLD.id,OLD.workspace_id,OLD.author_employee_id,OLD.created_at) OR OLD.state='WITHDRAWN' OR NEW.state='DRAFT' THEN RAISE EXCEPTION 'communication_identity_immutable'; END IF;
   SELECT * INTO r FROM communication_revisions WHERE workspace_id=NEW.workspace_id AND communication_id=NEW.id AND id=NEW.head_revision_id;
   IF r.id IS NULL OR r.published_at IS NULL THEN RAISE EXCEPTION 'communication_published_head_required'; END IF;
   IF NEW.state='WITHDRAWN' AND (OLD.state<>'PUBLISHED' OR NEW.head_revision_id<>OLD.head_revision_id) THEN RAISE EXCEPTION 'communication_withdraw_identity'; END IF;
   IF OLD.head_revision_id IS NOT NULL AND NEW.state='PUBLISHED' THEN
    SELECT version INTO h FROM communication_revisions WHERE id=OLD.head_revision_id;
    IF r.version<=h THEN RAISE EXCEPTION 'communication_head_must_advance'; END IF;
   END IF;
  END IF;
  RETURN NEW;
 END IF;
 SELECT * INTO c FROM communications WHERE workspace_id=NEW.workspace_id AND id=NEW.communication_id FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'communication_parent_identity'; END IF;
 IF TG_TABLE_NAME='communication_revisions' THEN
  actor=NEW.created_by;
  IF c.state='WITHDRAWN' THEN RAISE EXCEPTION 'communication_withdrawn'; END IF;
  IF NOT EXISTS(SELECT 1 FROM employees WHERE id=actor AND active AND (role IN('OWNER','MANAGER') OR (role IN('EMPLOYEE','LEAD') AND NEW.type='TODAYS_TEAM' AND NEW.acknowledgement<>'REQUIRED'))) THEN RAISE EXCEPTION 'communication_author_role'; END IF;
  IF NEW.content_hash<>communication_content_hash(ARRAY[NEW.type,NEW.scope_kind,NEW.location_id,NEW.business_date::text,NEW.source_shift_id,NEW.assignment_episode_id,NEW.terms_fingerprint,NEW.title,NEW.body,NEW.acknowledgement,CASE WHEN NEW.expires_at IS NULL THEN NULL ELSE to_char(NEW.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END]) THEN RAISE EXCEPTION 'communication_content_hash'; END IF;
  IF NEW.title ~ U&'[\200B\200E\200F\2028-\202E\2060-\206F\FEFF]' OR NEW.body ~ U&'[\200B\200E\200F\2028-\202E\2060-\206F\FEFF]' THEN RAISE EXCEPTION 'communication_unsafe_controls'; END IF;
 ELSIF TG_TABLE_NAME='communication_recipients' THEN
  actor=NEW.employee_id;
  IF c.state='WITHDRAWN' OR NOT EXISTS(SELECT 1 FROM employees WHERE id=actor AND active AND role IN('EMPLOYEE','LEAD')) THEN RAISE EXCEPTION 'communication_recipient_role'; END IF;
  SELECT * INTO r FROM communication_revisions WHERE workspace_id=NEW.workspace_id AND communication_id=NEW.communication_id AND id=NEW.revision_id;
  IF r.id IS NULL OR r.location_id<>NEW.location_id OR r.published_at IS NULL OR NEW.observed_at<>r.audience_observed_at OR
   (r.scope_kind='LOCATION' AND NEW.grant_kind<>'LOCATION') OR
   (r.scope_kind<>'LOCATION' AND NEW.grant_kind<>'ASSIGNMENT') OR
   (r.scope_kind='SHIFT' AND (r.source_shift_id,r.assignment_episode_id,r.terms_fingerprint) IS DISTINCT FROM (NEW.source_shift_id,NEW.assignment_episode_id,NEW.terms_fingerprint)) THEN RAISE EXCEPTION 'communication_grant_context'; END IF;
  SELECT hr.version INTO h FROM communications root JOIN communication_revisions hr ON hr.id=root.head_revision_id WHERE root.id=NEW.communication_id;
  IF h IS NOT NULL AND r.version<=h THEN RAISE EXCEPTION 'communication_audience_frozen'; END IF;
 ELSIF TG_TABLE_NAME='communication_receipts' THEN
  actor=NEW.employee_id;
  IF c.state<>'PUBLISHED' OR c.head_revision_id<>NEW.revision_id THEN RAISE EXCEPTION 'communication_receipt_head'; END IF;
 ELSE actor=NEW.actor_employee_id;
 END IF;
 IF NOT communication_same_workspace(actor,NEW.workspace_id) THEN RAISE EXCEPTION 'communication_actor_workspace'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER communication_root_guard BEFORE INSERT OR UPDATE OR DELETE ON communications FOR EACH ROW EXECUTE FUNCTION communication_identity_guard();
CREATE TRIGGER communication_revision_guard BEFORE INSERT ON communication_revisions FOR EACH ROW EXECUTE FUNCTION communication_identity_guard();
CREATE TRIGGER communication_grant_guard BEFORE INSERT ON communication_recipients FOR EACH ROW EXECUTE FUNCTION communication_identity_guard();
CREATE TRIGGER communication_receipt_guard BEFORE INSERT ON communication_receipts FOR EACH ROW EXECUTE FUNCTION communication_identity_guard();
CREATE TRIGGER communication_operation_guard BEFORE INSERT ON communication_operations FOR EACH ROW EXECUTE FUNCTION communication_identity_guard();
CREATE TRIGGER communication_lifecycle_guard BEFORE INSERT ON communication_lifecycle FOR EACH ROW EXECUTE FUNCTION communication_identity_guard();
CREATE INDEX communication_recipient_feed ON communication_recipients(workspace_id,employee_id,revision_id);
-- No cascading deletes, archive interval, delivery worker, or user-facing command.
COMMIT;
