BEGIN;

-- Shape/bounds at rest; contextual civil periods and recomputable semantic keys
-- are validated by the server before every generated write or exclusion event.
CREATE FUNCTION schedule_generation_claims_valid(payload jsonb) RETURNS boolean
LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
  SELECT CASE WHEN jsonb_typeof(payload) = 'object'
    AND payload->'version' = '1'::jsonb AND jsonb_typeof(payload->'claims') = 'array'
    THEN octet_length(payload::text) <= 65536
      AND jsonb_array_length(payload->'claims') BETWEEN 1 AND 256
      AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(payload->'claims') c WHERE
        NOT COALESCE(jsonb_typeof(c) = 'object'
          AND c->>'kind' IN ('POSITION','STAFFING','LEAD')
          AND c->'quantity' = '1'::jsonb
          AND jsonb_typeof(c->'configuredCapacity') = 'number'
          AND c->>'configuredCapacity' ~ '^[1-9][0-9]*$'
          AND c->>'needKey' ~ '^v1:[0-9a-f]{64}$'
          AND c->>'needStart' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'
          AND c->>'needEnd' ~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$'
          AND c->>'coveredStart' >= c->>'needStart'
          AND c->>'coveredEnd' <= c->>'needEnd'
          AND c->>'coveredStart' < c->>'coveredEnd'
          AND (CASE WHEN c->>'kind' = 'POSITION' THEN jsonb_typeof(c->'positionId') = 'string' AND length(c->>'positionId') BETWEEN 1 AND 256
            ELSE NOT c ? 'positionId' END)
          AND (CASE WHEN c->>'kind' = 'STAFFING' THEN jsonb_typeof(c->'staffingBasis') = 'object' ELSE NOT c ? 'staffingBasis' END),false))
    ELSE false END;
$$;
ALTER TABLE shifts ADD COLUMN assignment_origin text NOT NULL DEFAULT 'MANAGER'
  CHECK (assignment_origin IN ('MANAGER','GENERATED'));
ALTER TABLE shifts ADD COLUMN generated_claims jsonb;
ALTER TABLE shifts ADD CONSTRAINT shifts_generation_claims CHECK (
  (assignment_origin='MANAGER' AND generated_claims IS NULL)
  OR (assignment_origin='GENERATED' AND generated_claims IS NOT NULL AND schedule_generation_claims_valid(generated_claims))
);

CREATE TABLE schedule_generation_exclusions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  week_start date NOT NULL CHECK (extract(isodow FROM week_start)=1),
  location_id text NOT NULL REFERENCES locations(id),
  assignment_start timestamp NOT NULL,
  assignment_end timestamp NOT NULL CHECK (assignment_end > assignment_start),
  position_id text REFERENCES positions(id),
  claims jsonb NOT NULL CHECK (schedule_generation_claims_valid(claims)),
  -- Audit only: regeneration may reuse an assignment ID after clearing or a
  -- material need change. Event identity is independent; guarded row deletion
  -- provides idempotency. Deliberately neither UNIQUE nor an FK to the erased row.
  deleted_source_shift_id text,
  created_by text NOT NULL REFERENCES employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  cleared_by text REFERENCES employees(id),
  cleared_at timestamptz,
  CHECK ((cleared_by IS NULL) = (cleared_at IS NULL))
);
CREATE INDEX schedule_generation_exclusions_scope ON schedule_generation_exclusions(workspace_id,week_start,location_id) WHERE cleared_at IS NULL;
COMMIT;
