BEGIN;
-- Company words and modules (B2) share the presentation revisions from 0031.
-- The save function now also validates the vocabulary preset and module list,
-- records changed keys across every section, and refuses to turn a module off
-- while requests in it are still waiting, so nothing is ever stranded.
CREATE OR REPLACE FUNCTION nevora_set_workspace_presentation(p_operation uuid,p_workspace text,p_actor text,p_expected integer,p_settings jsonb,p_hash text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior nevora_workspace_presentation_revisions%ROWTYPE; latest nevora_workspace_presentation_revisions%ROWTYPE; saved nevora_workspace_presentation_revisions%ROWTYPE;
 before_settings jsonb; changes jsonb; logo text; newly_off text[]; waiting integer;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM employees WHERE id=p_actor AND active AND role='OWNER') OR NOT EXISTS(SELECT 1 FROM workspaces WHERE id=p_workspace AND active) THEN RAISE EXCEPTION 'workspace_presentation_access_denied'; END IF;
 IF p_expected IS NULL OR p_expected<0 OR p_expected>2147483646 OR p_operation IS NULL OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_settings IS NULL OR jsonb_typeof(p_settings)<>'object' OR p_settings->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(p_settings->'brand') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'workspace_presentation_invalid'; END IF;
 IF p_settings ? 'words' AND (jsonb_typeof(p_settings->'words')<>'object' OR (p_settings#>>'{words,preset}') IS NULL OR (p_settings#>>'{words,preset}') NOT IN ('standard','retail','restaurant','field','care')) THEN RAISE EXCEPTION 'workspace_presentation_invalid'; END IF;
 IF p_settings ? 'modules' AND (jsonb_typeof(p_settings->'modules')<>'object' OR jsonb_typeof(p_settings#>'{modules,disabled}') IS DISTINCT FROM 'array'
   OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_settings#>'{modules,disabled}') m WHERE jsonb_typeof(m)<>'string' OR m#>>'{}' NOT IN ('timeOff','marketplace','updates','payStatements','breaks'))) THEN RAISE EXCEPTION 'workspace_presentation_invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('workspace-presentation:'||p_workspace,0));
 SELECT * INTO prior FROM nevora_workspace_presentation_revisions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF prior.workspace_id<>p_workspace OR prior.actor_employee_id<>p_actor OR prior.command_hash<>p_hash OR prior.settings<>p_settings THEN RAISE EXCEPTION 'workspace_presentation_conflict'; END IF;
  RETURN jsonb_build_object('state','saved','operationId',prior.operation_id::text,'revision',prior.revision,'changedAt',prior.changed_at::text,'changedKeys',prior.changed_keys);
 END IF;
 logo=p_settings#>>'{brand,logoAssetId}';
 IF logo IS NOT NULL AND NOT EXISTS(SELECT 1 FROM nevora_workspace_presentation_assets a WHERE a.id::text=logo AND a.workspace_id=p_workspace) THEN RAISE EXCEPTION 'workspace_presentation_access_denied'; END IF;
 SELECT * INTO latest FROM nevora_workspace_presentation_revisions WHERE workspace_id=p_workspace ORDER BY revision DESC LIMIT 1;
 IF COALESCE(latest.revision,0)<>p_expected THEN RAISE EXCEPTION 'workspace_presentation_conflict'; END IF;
 before_settings=COALESCE(latest.settings,'{"version":1,"brand":{}}'::jsonb);
 -- Turning a module off must not strand requests that are still waiting.
 -- Each database holds one workspace (workspaces.singleton), so these request
 -- tables carry no workspace column and every row belongs to p_workspace.
 SELECT COALESCE(array_agg(m),'{}') INTO newly_off FROM jsonb_array_elements_text(COALESCE(p_settings#>'{modules,disabled}','[]'::jsonb)) m
  WHERE NOT COALESCE(before_settings#>'{modules,disabled}','[]'::jsonb) ? m;
 IF 'timeOff'=ANY(newly_off) THEN
  SELECT count(*) INTO waiting FROM time_off_requests WHERE status='PENDING';
  IF waiting>0 THEN RAISE EXCEPTION 'workspace_presentation_module_busy:timeOff:%',waiting; END IF;
 END IF;
 IF 'marketplace'=ANY(newly_off) THEN
  SELECT (SELECT count(*) FROM shift_exchanges WHERE status IN ('OPEN','EMPLOYEE_PENDING','MANAGER_PENDING'))
   +(SELECT count(*) FROM shift_callouts WHERE status='PENDING') INTO waiting;
  IF waiting>0 THEN RAISE EXCEPTION 'workspace_presentation_module_busy:marketplace:%',waiting; END IF;
 END IF;
 WITH paths AS(SELECT section||'.'||field AS path,section,field FROM (SELECT unnest(ARRAY['brand','words','modules']) AS section) sections CROSS JOIN LATERAL (
  SELECT jsonb_object_keys(CASE WHEN jsonb_typeof(before_settings->section)='object' THEN before_settings->section ELSE '{}'::jsonb END) AS field
  UNION SELECT jsonb_object_keys(CASE WHEN jsonb_typeof(p_settings->section)='object' THEN p_settings->section ELSE '{}'::jsonb END)
 ) fields)
 SELECT COALESCE(jsonb_agg(path ORDER BY path),'[]'::jsonb) INTO changes FROM paths WHERE before_settings#>ARRAY[section,field] IS DISTINCT FROM p_settings#>ARRAY[section,field];
 INSERT INTO nevora_workspace_presentation_revisions(operation_id,workspace_id,revision,actor_employee_id,command_hash,previous_settings,settings,changed_keys)
 VALUES(p_operation,p_workspace,p_expected+1,p_actor,p_hash,before_settings,p_settings,changes) RETURNING * INTO saved;
 RETURN jsonb_build_object('state','saved','operationId',saved.operation_id::text,'revision',saved.revision,'changedAt',saved.changed_at::text,'changedKeys',saved.changed_keys);
END; $$;
REVOKE ALL ON FUNCTION nevora_set_workspace_presentation(uuid,text,text,integer,jsonb,text) FROM PUBLIC;
COMMIT;
