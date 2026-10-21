BEGIN;
-- Single-company access only. No held tenancy/capability chain is adopted.
LOCK TABLE workspaces IN SHARE ROW EXCLUSIVE MODE;
SELECT id FROM workspaces ORDER BY id FOR NO KEY UPDATE;
DO $$ BEGIN
 IF (SELECT count(*) FROM workspaces)<>1 OR NOT EXISTS(SELECT 1 FROM workspaces WHERE singleton=true AND active=true)
 THEN RAISE EXCEPTION 'company_access_workspace_unavailable'; END IF;
END $$;
LOCK TABLE employees IN SHARE ROW EXCLUSIVE MODE;

CREATE FUNCTION company_access_next_revision(prior integer) RETURNS integer
LANGUAGE plpgsql IMMUTABLE STRICT AS $$
BEGIN
 IF prior<0 OR prior>=2147483647 THEN RAISE EXCEPTION 'company_access_revision_exhausted'; END IF;
 RETURN (prior::bigint+1)::integer;
END $$;

CREATE TABLE operational_subject_versions (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 employee_id text NOT NULL REFERENCES employees(id),
 generation bigint NOT NULL CHECK(generation>0),
 PRIMARY KEY(workspace_id,employee_id), UNIQUE(employee_id)
);
INSERT INTO operational_subject_versions(workspace_id,employee_id,generation)
 SELECT l.workspace_id,e.id,1 FROM employees e JOIN locations l ON l.id=e.primary_location_id ORDER BY e.id;

CREATE FUNCTION company_access_employee_generation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  INSERT INTO operational_subject_versions(workspace_id,employee_id,generation)
   SELECT workspace_id,NEW.id,1 FROM locations WHERE id=NEW.primary_location_id;
 ELSIF NEW.role IS DISTINCT FROM OLD.role OR NEW.active IS DISTINCT FROM OLD.active THEN
  UPDATE operational_subject_versions SET generation=generation+1 WHERE employee_id=NEW.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'company_access_generation_missing'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER company_access_employee_generation AFTER INSERT OR UPDATE OF role,active ON employees
 FOR EACH ROW EXECUTE FUNCTION company_access_employee_generation();
CREATE FUNCTION company_access_generation_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF pg_trigger_depth()<2 THEN RAISE EXCEPTION 'company_access_generation_private'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER company_access_generation_private BEFORE INSERT OR UPDATE ON operational_subject_versions
 FOR EACH ROW EXECUTE FUNCTION company_access_generation_guard();
CREATE TRIGGER company_access_generation_no_delete BEFORE DELETE ON operational_subject_versions
 FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER company_access_generation_no_truncate BEFORE TRUNCATE ON operational_subject_versions
 FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();

CREATE TABLE company_access_adoption (
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 protocol_version integer NOT NULL CHECK(protocol_version=1),
 state text NOT NULL CHECK(state='ENFORCED'),
 owner_policy_receipt_id text NOT NULL CHECK(owner_policy_receipt_id='01a13cda-e556-7652-8469-a18a77094364'),
 legacy_manager_census jsonb NOT NULL CHECK(jsonb_typeof(legacy_manager_census)='array'),
 census_digest text NOT NULL CHECK(census_digest ~ '^[a-f0-9]{64}$'),
 adopted_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE operational_scope_revisions (
 workspace_id text NOT NULL REFERENCES workspaces(id), employee_id text NOT NULL REFERENCES employees(id),
 revision integer NOT NULL CHECK(revision>0), role_generation bigint NOT NULL CHECK(role_generation>0),
 action text NOT NULL CHECK(action IN('ASSIGN','REVOKE')),
 mode text CHECK(mode IN('COMPANY','LOCATIONS')), location_ids text[] NOT NULL,
 source text NOT NULL CHECK(source IN('LEGACY_ADOPTION','OWNER_ASSIGNMENT')),
 actor_employee_id text REFERENCES employees(id), operation_id uuid,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,employee_id,revision),
 UNIQUE(workspace_id,actor_employee_id,operation_id),
 FOREIGN KEY(workspace_id,employee_id) REFERENCES operational_subject_versions(workspace_id,employee_id),
 CHECK((action='REVOKE' AND mode IS NULL AND cardinality(location_ids)=0)
  OR(action='ASSIGN' AND mode IS NOT NULL AND mode='COMPANY' AND cardinality(location_ids)=0)
  OR(action='ASSIGN' AND mode IS NOT NULL AND mode='LOCATIONS' AND cardinality(location_ids) BETWEEN 1 AND 100)),
 CHECK((source='LEGACY_ADOPTION' AND actor_employee_id IS NULL AND operation_id IS NULL)
  OR(source='OWNER_ASSIGNMENT' AND actor_employee_id IS NOT NULL AND operation_id IS NOT NULL))
);
CREATE VIEW operational_scopes_current AS
 SELECT DISTINCT ON(workspace_id,employee_id) * FROM operational_scope_revisions
 ORDER BY workspace_id,employee_id,revision DESC;
CREATE FUNCTION company_access_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prior integer; canonical text[];
BEGIN
 PERFORM id FROM workspaces WHERE id=NEW.workspace_id FOR NO KEY UPDATE;
 PERFORM id FROM employees WHERE id=NEW.employee_id FOR UPDATE;
 SELECT max(revision) INTO prior FROM operational_scope_revisions WHERE workspace_id=NEW.workspace_id AND employee_id=NEW.employee_id;
 IF NEW.revision<>company_access_next_revision(COALESCE(prior,0)) THEN RAISE EXCEPTION 'company_access_scope_revision'; END IF;
 IF NOT EXISTS(SELECT 1 FROM operational_subject_versions v JOIN employees e ON e.id=v.employee_id
   JOIN locations l ON l.id=e.primary_location_id WHERE v.workspace_id=NEW.workspace_id AND v.employee_id=NEW.employee_id
   AND v.generation=NEW.role_generation AND e.active AND e.role='MANAGER' AND l.workspace_id=NEW.workspace_id)
 THEN RAISE EXCEPTION 'company_access_subject_changed'; END IF;
 IF NEW.mode='LOCATIONS' THEN
  SELECT array_agg(DISTINCT id ORDER BY id) INTO canonical FROM locations
   WHERE workspace_id=NEW.workspace_id AND active AND id=ANY(NEW.location_ids);
  IF canonical IS DISTINCT FROM NEW.location_ids THEN RAISE EXCEPTION 'company_access_scope_locations'; END IF;
 END IF;
 IF NEW.source='LEGACY_ADOPTION' AND (NEW.revision<>1 OR NEW.mode IS DISTINCT FROM 'COMPANY'
   OR EXISTS(SELECT 1 FROM company_access_adoption WHERE workspace_id=NEW.workspace_id))
 THEN RAISE EXCEPTION 'company_access_legacy_adoption_closed'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER company_access_scope_guard BEFORE INSERT ON operational_scope_revisions
 FOR EACH ROW EXECUTE FUNCTION company_access_scope_guard();

CREATE TABLE company_invitations (
 workspace_id text NOT NULL REFERENCES workspaces(id), id uuid NOT NULL,
 employee_id text NOT NULL REFERENCES employees(id), revision integer NOT NULL CHECK(revision>0),
 target_version text NOT NULL, email_fingerprint text NOT NULL CHECK(email_fingerprint ~ '^[a-f0-9]{64}$'),
 issuer_employee_id text NOT NULL REFERENCES employees(id), issuer_generation bigint NOT NULL CHECK(issuer_generation>0),
 proof_digest text CHECK(proof_digest ~ '^[a-f0-9]{64}$'),
 issued_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
 consumed_at timestamptz, retired_at timestamptz, retired_reason text CHECK(retired_reason IN('REISSUED','REVOKED','INVALIDATED','EXPIRED')),
 PRIMARY KEY(workspace_id,id), UNIQUE(workspace_id,employee_id,revision), UNIQUE(proof_digest),
 FOREIGN KEY(workspace_id,employee_id) REFERENCES operational_subject_versions(workspace_id,employee_id),
 FOREIGN KEY(workspace_id,issuer_employee_id) REFERENCES operational_subject_versions(workspace_id,employee_id),
 CHECK(employee_id<>issuer_employee_id), CHECK(expires_at>issued_at AND expires_at<=issued_at+interval '15 minutes'),
 CHECK(consumed_at IS NULL OR retired_at IS NULL),
 CHECK((retired_at IS NULL)=(retired_reason IS NULL))
);
CREATE UNIQUE INDEX company_invitation_one_live ON company_invitations(workspace_id,employee_id)
 WHERE consumed_at IS NULL AND retired_at IS NULL;
CREATE FUNCTION company_access_invitation_custody_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.workspace_id,NEW.id,NEW.employee_id,NEW.revision,NEW.target_version,NEW.email_fingerprint,
    NEW.issuer_employee_id,NEW.issuer_generation,NEW.issued_at,NEW.expires_at)
   IS DISTINCT FROM ROW(OLD.workspace_id,OLD.id,OLD.employee_id,OLD.revision,OLD.target_version,OLD.email_fingerprint,
    OLD.issuer_employee_id,OLD.issuer_generation,OLD.issued_at,OLD.expires_at)
 THEN RAISE EXCEPTION 'company_access_invitation_immutable'; END IF;
 IF (OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS DISTINCT FROM OLD.consumed_at)
  OR(OLD.retired_at IS NOT NULL AND ROW(NEW.retired_at,NEW.retired_reason) IS DISTINCT FROM ROW(OLD.retired_at,OLD.retired_reason))
 THEN RAISE EXCEPTION 'company_access_invitation_terminal'; END IF;
 IF OLD.consumed_at IS NULL AND NEW.consumed_at IS NOT NULL
  AND(OLD.retired_at IS NOT NULL OR OLD.expires_at<=clock_timestamp())
 THEN RAISE EXCEPTION 'company_access_invitation_expired'; END IF;
 IF NEW.proof_digest IS DISTINCT FROM OLD.proof_digest AND
   (NEW.proof_digest IS NOT NULL OR COALESCE(OLD.consumed_at,OLD.retired_at,OLD.expires_at)>clock_timestamp()-interval '24 hours')
 THEN RAISE EXCEPTION 'company_access_invitation_digest_custody'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER company_access_invitation_custody BEFORE UPDATE ON company_invitations
 FOR EACH ROW EXECUTE FUNCTION company_access_invitation_custody_guard();
CREATE TRIGGER company_access_invitation_no_delete BEFORE DELETE ON company_invitations
 FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER company_access_invitation_no_truncate BEFORE TRUNCATE ON company_invitations
 FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TABLE company_invitation_events (
 workspace_id text NOT NULL, id uuid NOT NULL, invitation_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN('ISSUE','CONSUME','REVOKE','EXPIRE','INVALIDATE')),
 actor_employee_id text REFERENCES employees(id), occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,invitation_id) REFERENCES company_invitations(workspace_id,id)
);
CREATE TABLE company_invitation_delivery_events (
 workspace_id text NOT NULL, id uuid NOT NULL, invitation_id uuid NOT NULL,
 state text NOT NULL CHECK(state IN('PREPARED','PROVIDER_ACCEPTED','UNKNOWN','FAILED')),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,id), FOREIGN KEY(workspace_id,invitation_id) REFERENCES company_invitations(workspace_id,id)
);
CREATE TABLE company_access_operations (
 workspace_id text NOT NULL REFERENCES workspaces(id), actor_employee_id text NOT NULL REFERENCES employees(id),
 operation_id uuid NOT NULL, employee_id text NOT NULL REFERENCES employees(id),
 kind text NOT NULL CHECK(kind IN('INVITATION','SCOPE','EMPLOYEE')),
 command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'), receipt jsonb NOT NULL CHECK(jsonb_typeof(receipt)='object'),
 committed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id),
 CHECK(NOT(receipt ?| ARRAY['proof','password','sessionTokenHash','activationUrl','registeredEmail']))
);
CREATE TABLE company_invitation_issue_counters (
 workspace_id text NOT NULL REFERENCES workspaces(id), bucket_start timestamptz NOT NULL,
 kind text NOT NULL CHECK(kind IN('TARGET','GLOBAL')), subject text NOT NULL,
 attempts integer NOT NULL CHECK(attempts>0),
 PRIMARY KEY(workspace_id,bucket_start,kind,subject),
 CHECK((kind='TARGET' AND subject<>'' AND attempts<=3) OR(kind='GLOBAL' AND subject='' AND attempts<=300)),
 CHECK(bucket_start=date_bin(interval '15 minutes',bucket_start,timestamptz '2000-01-01 00:00:00Z'))
);
CREATE TABLE company_invitation_claim_counters (
 workspace_id text NOT NULL, invitation_id uuid NOT NULL, bucket_start timestamptz NOT NULL,
 attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 10),
 PRIMARY KEY(workspace_id,invitation_id,bucket_start),
 FOREIGN KEY(workspace_id,invitation_id) REFERENCES company_invitations(workspace_id,id),
 CHECK(bucket_start=date_bin(interval '15 minutes',bucket_start,timestamptz '2000-01-01 00:00:00Z'))
);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['operational_scope_revisions','company_access_adoption','company_invitation_events','company_invitation_delivery_events','company_access_operations'] LOOP
  EXECUTE format('CREATE TRIGGER company_access_immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger()',t);
  EXECUTE format('CREATE TRIGGER company_access_no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger()',t);
 END LOOP;
END $$;

-- Capture exactly the locked active-Manager census, including Managers whose primary location is inactive.
INSERT INTO operational_scope_revisions(workspace_id,employee_id,revision,role_generation,action,mode,location_ids,source)
 SELECT v.workspace_id,e.id,1,v.generation,'ASSIGN','COMPANY','{}','LEGACY_ADOPTION'
 FROM employees e JOIN operational_subject_versions v ON v.employee_id=e.id
 WHERE e.active AND e.role='MANAGER' ORDER BY e.id;
CREATE FUNCTION company_access_adoption_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual jsonb;
BEGIN
 SELECT COALESCE(jsonb_agg(jsonb_build_object('employeeId',e.id,'roleGeneration',v.generation::text,'employeeVersion',e.updated_at::text) ORDER BY e.id),'[]'::jsonb)
 INTO actual FROM employees e JOIN operational_subject_versions v ON v.employee_id=e.id
 WHERE e.active AND e.role='MANAGER' AND v.workspace_id=NEW.workspace_id;
 IF NEW.legacy_manager_census IS DISTINCT FROM actual
  OR NEW.census_digest IS DISTINCT FROM encode(sha256(convert_to(actual::text,'UTF8')),'hex')
  OR EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id
    LEFT JOIN operational_subject_versions v ON v.employee_id=e.id WHERE l.workspace_id=NEW.workspace_id AND v.employee_id IS NULL)
  OR EXISTS(SELECT 1 FROM employees e JOIN operational_subject_versions v ON v.employee_id=e.id
    WHERE e.active AND e.role='MANAGER' AND v.workspace_id=NEW.workspace_id AND NOT EXISTS(
     SELECT 1 FROM operational_scope_revisions s WHERE s.workspace_id=NEW.workspace_id AND s.employee_id=e.id
     AND s.role_generation=v.generation AND s.revision=1 AND s.mode='COMPANY' AND s.source='LEGACY_ADOPTION'))
 THEN RAISE EXCEPTION 'company_access_adoption_incomplete'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER company_access_adoption_guard BEFORE INSERT ON company_access_adoption
 FOR EACH ROW EXECUTE FUNCTION company_access_adoption_guard();
-- ENFORCED is inserted last; incomplete adoption raises and rolls back every additive object/binding.
INSERT INTO company_access_adoption(workspace_id,protocol_version,state,owner_policy_receipt_id,legacy_manager_census,census_digest)
 SELECT w.id,1,'ENFORCED','01a13cda-e556-7652-8469-a18a77094364',c.census,
  encode(sha256(convert_to(c.census::text,'UTF8')),'hex')
 FROM workspaces w CROSS JOIN LATERAL(
  SELECT COALESCE(jsonb_agg(jsonb_build_object('employeeId',e.id,'roleGeneration',v.generation::text,'employeeVersion',e.updated_at::text) ORDER BY e.id),'[]'::jsonb) AS census
  FROM employees e JOIN operational_subject_versions v ON v.employee_id=e.id
  WHERE e.active AND e.role='MANAGER' AND v.workspace_id=w.id
 ) c;
COMMIT;
