BEGIN;
CREATE TABLE owner_advisor_profiles (
 workspace_id text NOT NULL REFERENCES workspaces(id), owner_id text NOT NULL REFERENCES employees(id),
 priorities text NOT NULL DEFAULT '' CHECK(char_length(priorities)<=2000), revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 history jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(history)='array' AND jsonb_array_length(history)<=12 AND octet_length(history::text)<=180000),
 PRIMARY KEY(workspace_id,owner_id)
);
CREATE TABLE owner_advisor_requests (
 workspace_id text NOT NULL REFERENCES workspaces(id),owner_id text NOT NULL REFERENCES employees(id),request_id uuid NOT NULL,
 command_hash text NOT NULL,kind text NOT NULL CHECK(kind IN('ask','save_priorities')),
 state text NOT NULL CHECK(state IN('running','completed','failed')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),lease_until timestamptz NOT NULL DEFAULT clock_timestamp()+interval '65 seconds',
 result jsonb CHECK(result IS NULL OR octet_length(result::text)<=100000),
 PRIMARY KEY(workspace_id,owner_id,request_id)
);
CREATE INDEX owner_advisor_daily ON owner_advisor_requests(workspace_id,created_at) WHERE kind='ask';
-- Workspace-wide transaction lock serializes daily budget and concurrency across processes.
-- Expired operations remain terminal; their IDs can never incur a second provider charge.
CREATE FUNCTION owner_advisor_reserve(w text,o text,r uuid,h text,cap integer) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior owner_advisor_requests; used integer;
BEGIN
 IF cap NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid cap'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('owner-advisor:'||w,0));
 UPDATE owner_advisor_requests SET state='failed' WHERE workspace_id=w AND state='running' AND lease_until<=clock_timestamp();
 SELECT * INTO prior FROM owner_advisor_requests WHERE workspace_id=w AND owner_id=o AND request_id=r;
 IF FOUND THEN
  IF prior.command_hash<>h OR prior.kind<>'ask' THEN RETURN jsonb_build_object('error','conflict'); END IF;
  IF prior.state='completed' AND prior.result IS NOT NULL THEN RETURN jsonb_build_object('replay',prior.result); END IF;
  RETURN jsonb_build_object('error',CASE WHEN prior.state='running' THEN 'busy' ELSE 'prior_attempt_failed' END);
 END IF;
 SELECT count(*) INTO used FROM owner_advisor_requests WHERE workspace_id=w AND kind='ask' AND created_at>=date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
 IF used>=cap THEN RETURN jsonb_build_object('error','daily_limit'); END IF;
 IF EXISTS(SELECT 1 FROM owner_advisor_requests WHERE workspace_id=w AND kind='ask' AND state='running') THEN RETURN jsonb_build_object('error','busy'); END IF;
 INSERT INTO owner_advisor_requests(workspace_id,owner_id,request_id,command_hash,kind,state) VALUES(w,o,r,h,'ask','running');
 RETURN jsonb_build_object('admitted',true);
END $$;
CREATE FUNCTION owner_advisor_save(w text,o text,r uuid,h text,expected integer,value text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior owner_advisor_requests; result jsonb; current_revision integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('owner-advisor:'||w,0));
 SELECT * INTO prior FROM owner_advisor_requests WHERE workspace_id=w AND owner_id=o AND request_id=r;
 IF FOUND THEN
  IF prior.command_hash<>h OR prior.kind<>'save_priorities' THEN RETURN jsonb_build_object('error','conflict'); END IF;
  RETURN prior.result;
 END IF;
 INSERT INTO owner_advisor_profiles(workspace_id,owner_id) VALUES(w,o) ON CONFLICT DO NOTHING;
 SELECT revision INTO current_revision FROM owner_advisor_profiles WHERE workspace_id=w AND owner_id=o FOR UPDATE;
 IF current_revision<>expected THEN RETURN jsonb_build_object('error','conflict'); END IF;
 UPDATE owner_advisor_profiles SET priorities=value,revision=revision+1 WHERE workspace_id=w AND owner_id=o RETURNING jsonb_build_object('priorities',priorities,'revision',revision) INTO result;
 INSERT INTO owner_advisor_requests(workspace_id,owner_id,request_id,command_hash,kind,state,result) VALUES(w,o,r,h,'save_priorities','completed',result);
 RETURN result;
END $$;
COMMIT;
