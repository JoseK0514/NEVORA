BEGIN;
-- Private, immutable review custody. Business save and receipt settle together.
CREATE TABLE owner_advisor_coverage_reviews (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 owner_id text NOT NULL REFERENCES employees(id),
 review_id uuid NOT NULL,
 prepare_hash text NOT NULL CHECK(prepare_hash ~ '^[a-f0-9]{64}$'),
 authority text NOT NULL,
 session_hash text NOT NULL CHECK(session_hash ~ '^[a-f0-9]{64}$'),
 source_version text NOT NULL CHECK(source_version ~ '^[a-f0-9]{64}$'),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=40000),
 prepared_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL CHECK(expires_at>prepared_at),
 applied_operation uuid,
 apply_hash text,
 receipt jsonb,
 created_assignments jsonb,
 PRIMARY KEY(workspace_id,owner_id,review_id),
 UNIQUE(workspace_id,owner_id,applied_operation),
 CHECK((applied_operation IS NULL AND apply_hash IS NULL AND receipt IS NULL AND created_assignments IS NULL)
   OR (applied_operation IS NOT NULL AND apply_hash ~ '^[a-f0-9]{64}$' AND receipt IS NOT NULL
     AND jsonb_typeof(receipt)='object' AND octet_length(receipt::text)<=2000
     AND jsonb_typeof(created_assignments)='array' AND jsonb_array_length(created_assignments) BETWEEN 1 AND 12))
);
COMMIT;
