BEGIN;
-- Additive private Owner intent; no schedule, payroll or notification writes.
ALTER TABLE owner_advisor_requests DROP CONSTRAINT owner_advisor_requests_kind_check;
ALTER TABLE owner_advisor_requests ADD CONSTRAINT owner_advisor_requests_kind_check
 CHECK(kind IN('ask','save_priorities','review_briefing','notebook'));

CREATE TABLE owner_advisor_notebooks (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 owner_id text NOT NULL REFERENCES employees(id),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 goals jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(goals)='array' AND jsonb_array_length(goals)<=8),
 tasks jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(tasks)='array' AND jsonb_array_length(tasks)<=12),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,owner_id),
 CHECK(octet_length(goals::text)+octet_length(tasks::text)<=131072)
);

-- The existing request namespace fences collisions with asks and priority saves.
-- Receipts retain revision only, so deleting a goal/task does not leave its text
-- in a notebook receipt. The service validates bounded item shapes before I/O.
CREATE FUNCTION owner_advisor_save_notebook(w text,o text,r uuid,h text,expected integer,next_goals jsonb,next_tasks jsonb)
 RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior owner_advisor_requests; current_revision integer; answer jsonb;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('owner-advisor:'||w,0));
 SELECT * INTO prior FROM owner_advisor_requests WHERE workspace_id=w AND owner_id=o AND request_id=r;
 IF FOUND THEN
  IF prior.command_hash<>h OR prior.kind<>'notebook' OR prior.state<>'completed' THEN RETURN jsonb_build_object('error','conflict'); END IF;
  RETURN prior.result;
 END IF;
 IF expected IS NULL OR expected<0 OR expected>=2147483647 THEN RETURN jsonb_build_object('error','invalid'); END IF;
 INSERT INTO owner_advisor_notebooks(workspace_id,owner_id) VALUES(w,o) ON CONFLICT DO NOTHING;
 SELECT revision INTO current_revision FROM owner_advisor_notebooks WHERE workspace_id=w AND owner_id=o FOR UPDATE;
 IF current_revision<>expected THEN RETURN jsonb_build_object('error','conflict'); END IF;
 UPDATE owner_advisor_notebooks SET goals=next_goals,tasks=next_tasks,revision=revision+1,updated_at=clock_timestamp()
  WHERE workspace_id=w AND owner_id=o RETURNING jsonb_build_object('revision',revision) INTO answer;
 INSERT INTO owner_advisor_requests(workspace_id,owner_id,request_id,command_hash,kind,state,result)
  VALUES(w,o,r,h,'notebook','completed',answer);
 RETURN answer;
END $$;
COMMIT;
