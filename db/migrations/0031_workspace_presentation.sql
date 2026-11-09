BEGIN;
-- Company presentation (B1 brand tier). Immutable revisions of the brand
-- settings an Owner chooses, plus the logo images they upload. The server
-- derives every colour; these rows store the seed, the algorithm version and
-- the derived snapshot so an earlier brand renders the same way forever.
CREATE TABLE IF NOT EXISTS nevora_workspace_presentation_assets (
 id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 actor_employee_id text NOT NULL REFERENCES employees(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 media_type text NOT NULL CHECK(media_type IN ('image/png','image/webp')),
 width integer NOT NULL CHECK(width BETWEEN 32 AND 2048),
 height integer NOT NULL CHECK(height BETWEEN 32 AND 2048),
 byte_size integer NOT NULL CHECK(byte_size BETWEEN 1 AND 262144),
 sha256 char(64) NOT NULL CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 bytes bytea NOT NULL CHECK(octet_length(bytes)=byte_size)
);
CREATE TABLE IF NOT EXISTS nevora_workspace_presentation_revisions (
 operation_id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 revision integer NOT NULL CHECK(revision>0),
 actor_employee_id text NOT NULL REFERENCES employees(id),
 changed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 command_hash char(64) NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 previous_settings jsonb NOT NULL CHECK(jsonb_typeof(previous_settings)='object'),
 settings jsonb NOT NULL CHECK(jsonb_typeof(settings)='object' AND settings->>'version'='1'),
 changed_keys jsonb NOT NULL CHECK(jsonb_typeof(changed_keys)='array')
);
CREATE UNIQUE INDEX IF NOT EXISTS nevora_workspace_presentation_revision ON nevora_workspace_presentation_revisions(workspace_id,revision);
CREATE OR REPLACE FUNCTION nevora_workspace_presentation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'workspace_presentation_immutable'; END; $$;
DROP TRIGGER IF EXISTS nevora_workspace_presentation_immutable ON nevora_workspace_presentation_revisions;
CREATE TRIGGER nevora_workspace_presentation_immutable BEFORE UPDATE OR DELETE ON nevora_workspace_presentation_revisions FOR EACH ROW EXECUTE FUNCTION nevora_workspace_presentation_immutable();
DROP TRIGGER IF EXISTS nevora_workspace_presentation_no_truncate ON nevora_workspace_presentation_revisions;
CREATE TRIGGER nevora_workspace_presentation_no_truncate BEFORE TRUNCATE ON nevora_workspace_presentation_revisions FOR EACH STATEMENT EXECUTE FUNCTION nevora_workspace_presentation_immutable();
DROP TRIGGER IF EXISTS nevora_workspace_presentation_asset_immutable ON nevora_workspace_presentation_assets;
CREATE TRIGGER nevora_workspace_presentation_asset_immutable BEFORE UPDATE OR DELETE ON nevora_workspace_presentation_assets FOR EACH ROW EXECUTE FUNCTION nevora_workspace_presentation_immutable();
DROP TRIGGER IF EXISTS nevora_workspace_presentation_asset_no_truncate ON nevora_workspace_presentation_assets;
CREATE TRIGGER nevora_workspace_presentation_asset_no_truncate BEFORE TRUNCATE ON nevora_workspace_presentation_assets FOR EACH STATEMENT EXECUTE FUNCTION nevora_workspace_presentation_immutable();

CREATE OR REPLACE FUNCTION nevora_add_workspace_presentation_asset(p_operation uuid,p_workspace text,p_actor text,p_media text,p_width integer,p_height integer,p_bytes bytea,p_sha text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior nevora_workspace_presentation_assets%ROWTYPE; saved nevora_workspace_presentation_assets%ROWTYPE;
BEGIN
 -- The application surrounds this primitive with current-cookie SQL guards.
 IF NOT EXISTS(SELECT 1 FROM employees WHERE id=p_actor AND active AND role='OWNER') OR NOT EXISTS(SELECT 1 FROM workspaces WHERE id=p_workspace AND active) THEN RAISE EXCEPTION 'workspace_presentation_access_denied'; END IF;
 IF p_operation IS NULL OR p_bytes IS NULL OR p_sha IS NULL OR p_sha !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'workspace_presentation_invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('workspace-presentation:'||p_workspace,0));
 SELECT * INTO prior FROM nevora_workspace_presentation_assets WHERE id=p_operation;
 IF FOUND THEN
  IF prior.workspace_id<>p_workspace OR prior.actor_employee_id<>p_actor OR prior.sha256<>p_sha THEN RAISE EXCEPTION 'workspace_presentation_conflict'; END IF;
 ELSE
  INSERT INTO nevora_workspace_presentation_assets(id,workspace_id,actor_employee_id,media_type,width,height,byte_size,sha256,bytes)
  VALUES(p_operation,p_workspace,p_actor,p_media,p_width,p_height,octet_length(p_bytes),p_sha,p_bytes) RETURNING * INTO prior;
 END IF;
 RETURN jsonb_build_object('state','saved','assetId',prior.id::text,'mediaType',prior.media_type,'width',prior.width,'height',prior.height);
END; $$;
REVOKE ALL ON FUNCTION nevora_add_workspace_presentation_asset(uuid,text,text,text,integer,integer,bytea,text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION nevora_set_workspace_presentation(p_operation uuid,p_workspace text,p_actor text,p_expected integer,p_settings jsonb,p_hash text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior nevora_workspace_presentation_revisions%ROWTYPE; latest nevora_workspace_presentation_revisions%ROWTYPE; saved nevora_workspace_presentation_revisions%ROWTYPE; before_settings jsonb; changes jsonb; logo text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM employees WHERE id=p_actor AND active AND role='OWNER') OR NOT EXISTS(SELECT 1 FROM workspaces WHERE id=p_workspace AND active) THEN RAISE EXCEPTION 'workspace_presentation_access_denied'; END IF;
 IF p_expected IS NULL OR p_expected<0 OR p_expected>2147483646 OR p_operation IS NULL OR p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_settings IS NULL OR jsonb_typeof(p_settings)<>'object' OR p_settings->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(p_settings->'brand') IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'workspace_presentation_invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('workspace-presentation:'||p_workspace,0));
 SELECT * INTO prior FROM nevora_workspace_presentation_revisions WHERE operation_id=p_operation;
 IF FOUND THEN
  IF prior.workspace_id<>p_workspace OR prior.actor_employee_id<>p_actor OR prior.command_hash<>p_hash OR prior.settings<>p_settings THEN RAISE EXCEPTION 'workspace_presentation_conflict'; END IF;
  RETURN jsonb_build_object('state','saved','operationId',prior.operation_id::text,'revision',prior.revision,'changedAt',prior.changed_at::text,'changedKeys',prior.changed_keys);
 END IF;
 -- A logo must be one this workspace uploaded.
 logo=p_settings#>>'{brand,logoAssetId}';
 IF logo IS NOT NULL AND NOT EXISTS(SELECT 1 FROM nevora_workspace_presentation_assets a WHERE a.id::text=logo AND a.workspace_id=p_workspace) THEN RAISE EXCEPTION 'workspace_presentation_access_denied'; END IF;
 SELECT * INTO latest FROM nevora_workspace_presentation_revisions WHERE workspace_id=p_workspace ORDER BY revision DESC LIMIT 1;
 IF COALESCE(latest.revision,0)<>p_expected THEN RAISE EXCEPTION 'workspace_presentation_conflict'; END IF;
 before_settings=COALESCE(latest.settings,'{"version":1,"brand":{}}'::jsonb);
 WITH paths AS(SELECT 'brand.'||field AS path,field FROM (
  SELECT jsonb_object_keys(COALESCE(before_settings->'brand','{}'::jsonb)) AS field UNION SELECT jsonb_object_keys(COALESCE(p_settings->'brand','{}'::jsonb))
 ) fields)
 SELECT COALESCE(jsonb_agg(path ORDER BY path),'[]'::jsonb) INTO changes FROM paths WHERE before_settings#>ARRAY['brand',field] IS DISTINCT FROM p_settings#>ARRAY['brand',field];
 INSERT INTO nevora_workspace_presentation_revisions(operation_id,workspace_id,revision,actor_employee_id,command_hash,previous_settings,settings,changed_keys)
 VALUES(p_operation,p_workspace,p_expected+1,p_actor,p_hash,before_settings,p_settings,changes) RETURNING * INTO saved;
 RETURN jsonb_build_object('state','saved','operationId',saved.operation_id::text,'revision',saved.revision,'changedAt',saved.changed_at::text,'changedKeys',saved.changed_keys);
END; $$;
REVOKE ALL ON FUNCTION nevora_set_workspace_presentation(uuid,text,text,integer,jsonb,text) FROM PUBLIC;
COMMIT;
