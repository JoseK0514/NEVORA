BEGIN;
CREATE TABLE IF NOT EXISTS nevora_company_policy_revisions (
 operation_id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 location_id text REFERENCES locations(id),
 revision integer NOT NULL CHECK(revision>0),
 actor_employee_id text NOT NULL REFERENCES employees(id),
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 command_hash char(64) NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 previous_settings jsonb NOT NULL CHECK(jsonb_typeof(previous_settings)='object'),
 settings jsonb NOT NULL CHECK(jsonb_typeof(settings)='object' AND settings->>'version'='1'),
 changed_keys jsonb NOT NULL CHECK(jsonb_typeof(changed_keys)='array')
);
CREATE UNIQUE INDEX IF NOT EXISTS nevora_company_policy_scope_revision ON nevora_company_policy_revisions(workspace_id,COALESCE(location_id,''),revision);
CREATE OR REPLACE FUNCTION nevora_company_policy_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'company_policy_immutable'; END; $$;
DROP TRIGGER IF EXISTS nevora_company_policy_immutable ON nevora_company_policy_revisions;
CREATE TRIGGER nevora_company_policy_immutable BEFORE UPDATE OR DELETE ON nevora_company_policy_revisions FOR EACH ROW EXECUTE FUNCTION nevora_company_policy_immutable();
DROP TRIGGER IF EXISTS nevora_company_policy_no_truncate ON nevora_company_policy_revisions;
CREATE TRIGGER nevora_company_policy_no_truncate BEFORE TRUNCATE ON nevora_company_policy_revisions FOR EACH STATEMENT EXECUTE FUNCTION nevora_company_policy_immutable();
CREATE OR REPLACE FUNCTION nevora_set_company_policy(p_operation uuid,p_workspace text,p_location text,p_actor text,p_expected integer,p_settings jsonb,p_hash text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior nevora_company_policy_revisions%ROWTYPE; latest nevora_company_policy_revisions%ROWTYPE; saved nevora_company_policy_revisions%ROWTYPE; before_settings jsonb; changes jsonb;
BEGIN
 -- The application surrounds this primitive with canonical current-cookie SQL
 -- guards, ordered locks and final expiry checks. It is never authentication.
 IF NOT EXISTS(SELECT 1 FROM employees WHERE id=p_actor AND active AND role='OWNER') OR NOT EXISTS(SELECT 1 FROM workspaces WHERE id=p_workspace AND active) THEN RAISE EXCEPTION 'company_policy_access_denied'; END IF;
 IF p_location IS NOT NULL AND NOT EXISTS(SELECT 1 FROM locations WHERE id=p_location AND workspace_id=p_workspace AND active) THEN RAISE EXCEPTION 'company_policy_access_denied'; END IF;
 IF p_expected IS NULL OR p_expected<0 OR p_expected>2147483646 OR p_operation IS NULL OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_settings IS NULL OR jsonb_typeof(p_settings)<>'object' OR p_settings->>'version' IS DISTINCT FROM '1' THEN RAISE EXCEPTION 'company_policy_invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('company-policy:'||p_workspace||':'||COALESCE(p_location,''),0));
 SELECT * INTO prior FROM nevora_company_policy_revisions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF prior.workspace_id<>p_workspace OR prior.location_id IS DISTINCT FROM p_location OR prior.actor_employee_id<>p_actor OR prior.command_hash<>p_hash OR prior.settings<>p_settings THEN RAISE EXCEPTION 'company_policy_conflict'; END IF;
  RETURN jsonb_build_object('state','saved','operationId',prior.operation_id::text,'revision',prior.revision,'locationId',prior.location_id,'changedAt',prior.changed_at::text,'changedKeys',prior.changed_keys);
 END IF;
 -- Scope every customer labor input independently, including company scopes.
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(NULLIF(p_settings#>'{labor,rates}','null'::jsonb),'[]'::jsonb)) r
  WHERE NOT EXISTS(SELECT 1 FROM employees e WHERE e.id=r->>'employeeId')
   OR (r->>'locationId' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM locations l WHERE l.id=r->>'locationId' AND l.workspace_id=p_workspace AND l.active))
   OR (p_location IS NOT NULL AND (r->>'locationId') IS DISTINCT FROM p_location)) THEN RAISE EXCEPTION 'company_policy_access_denied'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(COALESCE(NULLIF(p_settings#>'{labor,budgets}','null'::jsonb),'[]'::jsonb)) b
  WHERE (b->>'locationId' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM locations l WHERE l.id=b->>'locationId' AND l.workspace_id=p_workspace AND l.active))
   OR (p_location IS NOT NULL AND (b->>'locationId') IS DISTINCT FROM p_location)) THEN RAISE EXCEPTION 'company_policy_access_denied'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(COALESCE(p_settings#>'{labor,compensation,excludedBreakTypeIds}','[]'::jsonb)) AS excluded(break_id)
  WHERE NOT EXISTS(SELECT 1 FROM clocker_break_types b WHERE b.id=excluded.break_id AND b.workspace_id=p_workspace)) THEN RAISE EXCEPTION 'company_policy_access_denied'; END IF;
 SELECT * INTO latest FROM nevora_company_policy_revisions WHERE workspace_id=p_workspace AND location_id IS NOT DISTINCT FROM p_location ORDER BY revision DESC LIMIT 1;
 IF COALESCE(latest.revision,0)<>p_expected THEN RAISE EXCEPTION 'company_policy_conflict'; END IF;
 before_settings=COALESCE(latest.settings,'{"version":1}'::jsonb);
 WITH paths AS(SELECT section||'.'||field AS path,section,field FROM(SELECT 'attendance' AS section UNION SELECT 'labor') sections CROSS JOIN LATERAL (
  SELECT jsonb_object_keys(COALESCE(before_settings->section,'{}'::jsonb)) AS field UNION SELECT jsonb_object_keys(COALESCE(p_settings->section,'{}'::jsonb))
 ) fields)
 SELECT COALESCE(jsonb_agg(path ORDER BY path),'[]'::jsonb) INTO changes FROM paths WHERE before_settings#>ARRAY[section,field] IS DISTINCT FROM p_settings#>ARRAY[section,field];
 INSERT INTO nevora_company_policy_revisions(operation_id,workspace_id,location_id,revision,actor_employee_id,command_hash,previous_settings,settings,changed_keys)
 VALUES(p_operation,p_workspace,p_location,p_expected+1,p_actor,p_hash,before_settings,p_settings,changes) RETURNING * INTO saved;
 RETURN jsonb_build_object('state','saved','operationId',saved.operation_id::text,'revision',saved.revision,'locationId',saved.location_id,'changedAt',saved.changed_at::text,'changedKeys',saved.changed_keys);
END; $$;
REVOKE ALL ON FUNCTION nevora_set_company_policy(uuid,text,text,text,integer,jsonb,text) FROM PUBLIC;
COMMIT;
