BEGIN;
ALTER TABLE owner_advisor_requests DROP CONSTRAINT owner_advisor_requests_kind_check;
ALTER TABLE owner_advisor_requests ADD CONSTRAINT owner_advisor_requests_kind_check
 CHECK(kind IN('ask','save_priorities','review_briefing','notebook','memory'));
CREATE TABLE owner_advisor_memories (
 workspace_id text NOT NULL REFERENCES workspaces(id), owner_id text NOT NULL REFERENCES employees(id),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 intents jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(intents)='array' AND jsonb_array_length(intents)<=12),
 decisions jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(decisions)='array' AND jsonb_array_length(decisions)<=20),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(workspace_id,owner_id),
 CHECK(octet_length(intents::text)+octet_length(decisions::text)<=262144)
);
-- Never retain previous intent in recent conversation or replay payloads. Every
-- caller holds the workspace advisory lock before touching a private context row.
-- Running asks are terminally invalidated, including on priority-only changes.
CREATE FUNCTION owner_advisor_forget_context(w text,o text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('owner-advisor:'||w,0));
 UPDATE owner_advisor_profiles SET history='[]' WHERE workspace_id=w AND owner_id=o AND history<>'[]'::jsonb;
 UPDATE owner_advisor_requests SET result=NULL,state=CASE WHEN state='running' THEN 'failed' ELSE state END
 WHERE workspace_id=w AND owner_id=o AND kind='ask' AND (result IS NOT NULL OR state='running');
END $$;
CREATE FUNCTION owner_advisor_context_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 PERFORM owner_advisor_forget_context(NEW.workspace_id,NEW.owner_id);
 RETURN NEW;
END $$;
CREATE TRIGGER owner_advisor_notebook_forgetting AFTER UPDATE OF goals,tasks ON owner_advisor_notebooks
 FOR EACH ROW EXECUTE FUNCTION owner_advisor_context_changed();
CREATE TRIGGER owner_advisor_memory_forgetting AFTER UPDATE OF intents,decisions ON owner_advisor_memories
 FOR EACH ROW EXECUTE FUNCTION owner_advisor_context_changed();
CREATE TRIGGER owner_advisor_priorities_forgetting AFTER UPDATE OF priorities ON owner_advisor_profiles
 FOR EACH ROW EXECUTE FUNCTION owner_advisor_context_changed();

-- Old priority receipts contained deleted text. New receipts contain revision
-- only; a replay returns the CURRENT profile, never a superseded priority value.
UPDATE owner_advisor_requests SET result=jsonb_build_object('revision',result->'revision') WHERE kind='save_priorities' AND result IS NOT NULL;
CREATE OR REPLACE FUNCTION owner_advisor_save(w text,o text,r uuid,h text,expected integer,value text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior owner_advisor_requests; answer jsonb; current_revision integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('owner-advisor:'||w,0));
 SELECT * INTO prior FROM owner_advisor_requests WHERE workspace_id=w AND owner_id=o AND request_id=r;
 IF FOUND THEN
  IF prior.command_hash<>h OR prior.kind<>'save_priorities' OR prior.state<>'completed' THEN RETURN jsonb_build_object('error','conflict'); END IF;
  SELECT jsonb_build_object('priorities',priorities,'revision',revision) INTO answer FROM owner_advisor_profiles WHERE workspace_id=w AND owner_id=o;
  RETURN answer;
 END IF;
 IF expected IS NULL OR expected<0 OR expected>=2147483647 THEN RETURN jsonb_build_object('error','invalid'); END IF;
 INSERT INTO owner_advisor_profiles(workspace_id,owner_id) VALUES(w,o) ON CONFLICT DO NOTHING;
 SELECT revision INTO current_revision FROM owner_advisor_profiles WHERE workspace_id=w AND owner_id=o FOR UPDATE;
 IF current_revision<>expected THEN RETURN jsonb_build_object('error','conflict'); END IF;
 UPDATE owner_advisor_profiles SET priorities=value,revision=revision+1 WHERE workspace_id=w AND owner_id=o RETURNING jsonb_build_object('priorities',priorities,'revision',revision) INTO answer;
 INSERT INTO owner_advisor_requests(workspace_id,owner_id,request_id,command_hash,kind,state,result) VALUES(w,o,r,h,'save_priorities','completed',jsonb_build_object('revision',current_revision+1));
 RETURN answer;
END $$;

-- NULL request is the bounded local expiry purge, not a public command. Both
-- paths use CAS and the same lock as ask settlement and notebook edits.
CREATE FUNCTION owner_advisor_save_memory(w text,o text,r uuid,h text,expected integer,next_intents jsonb,next_decisions jsonb)
 RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior owner_advisor_requests; current_revision integer; answer jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('owner-advisor:'||w,0));
 IF r IS NOT NULL THEN
  SELECT * INTO prior FROM owner_advisor_requests WHERE workspace_id=w AND owner_id=o AND request_id=r;
  IF FOUND THEN
   IF prior.command_hash<>h OR prior.kind<>'memory' OR prior.state<>'completed' THEN RETURN jsonb_build_object('error','conflict'); END IF;
   RETURN prior.result;
  END IF;
 END IF;
 IF expected IS NULL OR expected<0 OR expected>=2147483647 THEN RETURN jsonb_build_object('error','invalid'); END IF;
 INSERT INTO owner_advisor_memories(workspace_id,owner_id) VALUES(w,o) ON CONFLICT DO NOTHING;
 SELECT revision INTO current_revision FROM owner_advisor_memories WHERE workspace_id=w AND owner_id=o FOR UPDATE;
 IF current_revision<>expected THEN RETURN jsonb_build_object('error','conflict'); END IF;
 UPDATE owner_advisor_memories SET intents=next_intents,decisions=next_decisions,revision=revision+1,updated_at=clock_timestamp()
 WHERE workspace_id=w AND owner_id=o RETURNING jsonb_build_object('revision',revision) INTO answer;
 IF r IS NOT NULL THEN
  INSERT INTO owner_advisor_requests(workspace_id,owner_id,request_id,command_hash,kind,state,result) VALUES(w,o,r,h,'memory','completed',answer);
 END IF;
 RETURN answer;
END $$;
COMMIT;
