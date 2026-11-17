BEGIN;
-- Private proposal/operation custody only. This migration does not create,
-- replace, publish or notify a single scheduling assignment.
CREATE TABLE owner_advisor_weekly_operations (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 owner_id text NOT NULL REFERENCES employees(id),
 request_id uuid NOT NULL,
 command_kind text NOT NULL CHECK(command_kind IN('compare_week','read_week_plan','apply_week_plan','decline_week_plan','check_week_plan')),
 command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 authority text NOT NULL,
 session_hash text NOT NULL CHECK(session_hash ~ '^[a-f0-9]{64}$'),
 context jsonb NOT NULL CHECK(jsonb_typeof(context)='object' AND octet_length(context::text)<=8192),
 context_digest text NOT NULL CHECK(context_digest ~ '^[a-f0-9]{64}$'),
 source_version text CHECK(source_version IS NULL OR (state='completed' AND source_version ~ '^[a-f0-9]{64}$')),
 state text NOT NULL DEFAULT 'running' CHECK(state IN('running','completed','failed')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_until timestamptz NOT NULL DEFAULT clock_timestamp()+interval '25 seconds',
 completed_at timestamptz,
 -- Compact JSON preserves the exact UTF-8 wire bound, rather than JSONB's
 -- different whitespace serialization. Results here contain references only.
 result text CHECK(result IS NULL OR (octet_length(result)<=16384 AND jsonb_typeof(result::jsonb)='object')),
 PRIMARY KEY(workspace_id,owner_id,request_id),
 CHECK(state<>'completed' OR (completed_at IS NOT NULL AND result IS NOT NULL))
);
CREATE INDEX owner_advisor_weekly_operations_age ON owner_advisor_weekly_operations(workspace_id,owner_id,created_at);

CREATE TABLE owner_advisor_weekly_reviews (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 owner_id text NOT NULL REFERENCES employees(id),
 review_id uuid NOT NULL,
 comparison_id uuid NOT NULL,
 authority text NOT NULL,
 session_hash text NOT NULL CHECK(session_hash ~ '^[a-f0-9]{64}$'),
 context jsonb NOT NULL CHECK(jsonb_typeof(context)='object' AND octet_length(context::text)<=8192),
 context_digest text NOT NULL CHECK(context_digest ~ '^[a-f0-9]{64}$'),
 source_version text NOT NULL CHECK(source_version ~ '^[a-f0-9]{64}$'),
 terms_digest text NOT NULL CHECK(terms_digest ~ '^[a-f0-9]{64}$'),
 payload text NOT NULL CHECK(octet_length(payload)<=131072 AND jsonb_typeof(payload::jsonb)='object'),
 prepared_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL CHECK(expires_at>prepared_at),
 read_receipt_id uuid,
 applied_operation uuid,
 apply_hash text,
 receipt jsonb,
 created_assignments jsonb,
 removed_assignments jsonb,
 declined_operation uuid,
 decline_hash text,
 PRIMARY KEY(workspace_id,owner_id,review_id),
 FOREIGN KEY(workspace_id,owner_id,comparison_id) REFERENCES owner_advisor_weekly_operations(workspace_id,owner_id,request_id),
 UNIQUE(workspace_id,owner_id,applied_operation),
 UNIQUE(workspace_id,owner_id,declined_operation),
 CHECK(applied_operation IS NULL OR declined_operation IS NULL),
 CHECK((declined_operation IS NULL AND decline_hash IS NULL) OR
   (declined_operation IS NOT NULL AND decline_hash IS NOT NULL AND decline_hash ~ '^[a-f0-9]{64}$')),
 CHECK((applied_operation IS NULL AND apply_hash IS NULL AND receipt IS NULL AND created_assignments IS NULL AND removed_assignments IS NULL) OR
   (applied_operation IS NOT NULL AND apply_hash IS NOT NULL AND apply_hash ~ '^[a-f0-9]{64}$'
    AND receipt IS NOT NULL AND jsonb_typeof(receipt)='object' AND octet_length(receipt::text)<=16384
    AND created_assignments IS NOT NULL AND jsonb_typeof(created_assignments)='array' AND jsonb_array_length(created_assignments) BETWEEN 1 AND 84
    AND removed_assignments IS NOT NULL AND jsonb_typeof(removed_assignments)='array' AND jsonb_array_length(removed_assignments)<=84))
);
CREATE INDEX owner_advisor_weekly_reviews_expiry ON owner_advisor_weekly_reviews(workspace_id,owner_id,expires_at);

CREATE FUNCTION owner_advisor_weekly_review_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF OLD.applied_operation IS NOT NULL THEN RAISE EXCEPTION 'advisor_weekly_saved_custody'; END IF;
  RETURN OLD;
 END IF;
 IF ROW(NEW.workspace_id,NEW.owner_id,NEW.review_id,NEW.comparison_id,NEW.authority,NEW.session_hash,NEW.context,NEW.context_digest,
        NEW.source_version,NEW.terms_digest,NEW.payload,NEW.prepared_at,NEW.expires_at)
    IS DISTINCT FROM
    ROW(OLD.workspace_id,OLD.owner_id,OLD.review_id,OLD.comparison_id,OLD.authority,OLD.session_hash,OLD.context,OLD.context_digest,
        OLD.source_version,OLD.terms_digest,OLD.payload,OLD.prepared_at,OLD.expires_at)
 THEN RAISE EXCEPTION 'advisor_weekly_immutable'; END IF;
 IF OLD.read_receipt_id IS NOT NULL AND NEW.read_receipt_id IS DISTINCT FROM OLD.read_receipt_id THEN RAISE EXCEPTION 'advisor_weekly_immutable'; END IF;
 IF OLD.applied_operation IS NOT NULL AND ROW(NEW.applied_operation,NEW.apply_hash,NEW.receipt,NEW.created_assignments,NEW.removed_assignments)
    IS DISTINCT FROM ROW(OLD.applied_operation,OLD.apply_hash,OLD.receipt,OLD.created_assignments,OLD.removed_assignments)
 THEN RAISE EXCEPTION 'advisor_weekly_saved_custody'; END IF;
 IF OLD.declined_operation IS NOT NULL AND ROW(NEW.declined_operation,NEW.decline_hash) IS DISTINCT FROM ROW(OLD.declined_operation,OLD.decline_hash)
 THEN RAISE EXCEPTION 'advisor_weekly_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER owner_advisor_weekly_review_immutable BEFORE UPDATE OR DELETE ON owner_advisor_weekly_reviews
 FOR EACH ROW EXECUTE FUNCTION owner_advisor_weekly_review_immutable();

CREATE FUNCTION owner_advisor_weekly_operation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF ROW(NEW.workspace_id,NEW.owner_id,NEW.request_id,NEW.command_kind,NEW.command_hash,NEW.authority,NEW.session_hash,NEW.context,NEW.context_digest,NEW.created_at,NEW.lease_until)
    IS DISTINCT FROM ROW(OLD.workspace_id,OLD.owner_id,OLD.request_id,OLD.command_kind,OLD.command_hash,OLD.authority,OLD.session_hash,OLD.context,OLD.context_digest,OLD.created_at,OLD.lease_until)
    OR (OLD.state<>'running' AND NEW IS DISTINCT FROM OLD)
 THEN RAISE EXCEPTION 'advisor_weekly_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER owner_advisor_weekly_operation_immutable BEFORE UPDATE ON owner_advisor_weekly_operations
 FOR EACH ROW EXECUTE FUNCTION owner_advisor_weekly_operation_immutable();
COMMIT;
