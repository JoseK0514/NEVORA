BEGIN;
-- Independent application domain. No scheduler, external delivery or private-note import.
CREATE TABLE staff_task_templates (
 id uuid PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id),
 location_id text NOT NULL, assignee_id text NOT NULL REFERENCES employees(id),
 draft jsonb NOT NULL CHECK(jsonb_typeof(draft)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), archived boolean NOT NULL DEFAULT false,
 next_date date, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(workspace_id,id),
 FOREIGN KEY(workspace_id,location_id) REFERENCES locations(workspace_id,id)
);
CREATE TABLE staff_task_instances (
 id uuid PRIMARY KEY, workspace_id text NOT NULL, template_id uuid NOT NULL,
 business_date date NOT NULL, location_id text NOT NULL, assignee_id text NOT NULL REFERENCES employees(id),
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 checked_item_ids text[] NOT NULL DEFAULT '{}', due_at timestamptz NOT NULL, reminder_at timestamptz,
 reminder_generation integer NOT NULL DEFAULT 1 CHECK(reminder_generation>0),
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 status text NOT NULL DEFAULT 'OPEN' CHECK(status IN('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
 completed_by text REFERENCES employees(id), completed_at timestamptz,
 UNIQUE(workspace_id,id), UNIQUE(workspace_id,template_id,business_date),
 FOREIGN KEY(workspace_id,template_id) REFERENCES staff_task_templates(workspace_id,id),
 FOREIGN KEY(workspace_id,location_id) REFERENCES locations(workspace_id,id),
 CHECK((status='COMPLETED')=(completed_by IS NOT NULL AND completed_at IS NOT NULL)),
 CHECK(status='COMPLETED' OR (completed_by IS NULL AND completed_at IS NULL))
);
CREATE INDEX staff_task_assignee_dates ON staff_task_instances(workspace_id,assignee_id,business_date,id);
CREATE INDEX staff_task_location_dates ON staff_task_instances(workspace_id,location_id,business_date,id);
CREATE TABLE staff_task_events (
 id uuid PRIMARY KEY, workspace_id text NOT NULL, template_id uuid NOT NULL, task_id uuid,
 actor_id text NOT NULL REFERENCES employees(id), kind text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), data jsonb NOT NULL CHECK(jsonb_typeof(data)='object'),
 FOREIGN KEY(workspace_id,template_id) REFERENCES staff_task_templates(workspace_id,id),
 FOREIGN KEY(workspace_id,task_id) REFERENCES staff_task_instances(workspace_id,id)
);
CREATE INDEX staff_task_history ON staff_task_events(workspace_id,task_id,created_at DESC,id);
CREATE TABLE staff_task_operations (
 workspace_id text NOT NULL, actor_id text NOT NULL REFERENCES employees(id), session_hash text NOT NULL CHECK(session_hash ~ '^[a-f0-9]{64}$'),
 operation_id uuid NOT NULL, payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 template_id uuid NOT NULL, task_id uuid, result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,actor_id,session_hash,operation_id),
 FOREIGN KEY(workspace_id,template_id) REFERENCES staff_task_templates(workspace_id,id),
 FOREIGN KEY(workspace_id,task_id) REFERENCES staff_task_instances(workspace_id,id)
);
CREATE TABLE staff_task_reminder_acks (
 workspace_id text NOT NULL, task_id uuid NOT NULL, generation integer NOT NULL CHECK(generation>0),
 employee_id text NOT NULL REFERENCES employees(id), acknowledged_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,task_id,generation,employee_id),
 FOREIGN KEY(workspace_id,task_id) REFERENCES staff_task_instances(workspace_id,id)
);
CREATE FUNCTION staff_task_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'staff_task_immutable'; END $$;
CREATE TRIGGER staff_task_events_immutable BEFORE UPDATE OR DELETE ON staff_task_events FOR EACH ROW EXECUTE FUNCTION staff_task_immutable();
CREATE TRIGGER staff_task_operations_immutable BEFORE UPDATE OR DELETE ON staff_task_operations FOR EACH ROW EXECUTE FUNCTION staff_task_immutable();
CREATE TRIGGER staff_task_reminders_immutable BEFORE UPDATE OR DELETE ON staff_task_reminder_acks FOR EACH ROW EXECUTE FUNCTION staff_task_immutable();
CREATE TRIGGER staff_task_templates_no_delete BEFORE DELETE ON staff_task_templates FOR EACH ROW EXECUTE FUNCTION staff_task_immutable();
CREATE TRIGGER staff_task_instances_no_delete BEFORE DELETE ON staff_task_instances FOR EACH ROW EXECUTE FUNCTION staff_task_immutable();
CREATE FUNCTION staff_task_snapshot_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF (NEW.id,NEW.workspace_id,NEW.template_id,NEW.business_date,NEW.location_id,NEW.snapshot,NEW.due_at,NEW.reminder_at)
 IS DISTINCT FROM (OLD.id,OLD.workspace_id,OLD.template_id,OLD.business_date,OLD.location_id,OLD.snapshot,OLD.due_at,OLD.reminder_at)
 THEN RAISE EXCEPTION 'staff_task_snapshot_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER staff_task_snapshot_immutable BEFORE UPDATE ON staff_task_instances FOR EACH ROW EXECUTE FUNCTION staff_task_snapshot_guard();
-- SECURITY INVOKER: callable only through the server's protected business batch.
-- The batch acquires workspace -> employee -> eligibility -> subject -> session locks.
-- This function independently checks current target membership, role, ownership,
-- revision, and idempotency before any write. No credentials appear in its result.
CREATE FUNCTION staff_task_apply(w text, actor text, session_hash text, c jsonb, payload_hash text, plan jsonb, basis jsonb, allowed text[])
RETURNS jsonb LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE
 t staff_task_templates%ROWTYPE; i staff_task_instances%ROWTYPE; old jsonb; after_value jsonb;
 created staff_task_instances%ROWTYPE; op staff_task_operations%ROWTYPE; result jsonb; k text:=c->>'kind'; management boolean;
 template uuid; task uuid; loc text; assignee text; n integer:=0; occurrence jsonb;
BEGIN
 IF current_setting('transaction_isolation')<>'read committed' THEN RAISE EXCEPTION 'staff_task_isolation'; END IF;
 SELECT e.role IN('OWNER','MANAGER') INTO management FROM employees e JOIN locations l ON l.id=e.primary_location_id
 JOIN employee_sessions s ON s.employee_id=e.id WHERE e.id=actor AND e.active AND l.workspace_id=w
 AND s.token_hash=staff_task_apply.session_hash AND s.expires_at>clock_timestamp();
 IF management IS NULL THEN RAISE EXCEPTION 'staff_task_denied'; END IF;
 IF c ? 'taskId' THEN
  task:=(c->>'taskId')::uuid; SELECT * INTO i FROM staff_task_instances WHERE workspace_id=w AND id=task;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_task_denied'; END IF;
  template:=i.template_id; loc:=i.location_id; assignee:=i.assignee_id; old:=to_jsonb(i);
 ELSE
  template:=(c->>'templateId')::uuid;
  SELECT * INTO t FROM staff_task_templates WHERE workspace_id=w AND id=template;
  IF k<>'CREATE_TEMPLATE' AND NOT FOUND THEN RAISE EXCEPTION 'staff_task_denied'; END IF;
  loc:=COALESCE(t.location_id,c->'draft'->>'locationId'); assignee:=COALESCE(t.assignee_id,c->'draft'->>'assigneeId'); old:=CASE WHEN t.id IS NULL THEN NULL ELSE to_jsonb(t) END;
 END IF;
 IF NOT(loc=ANY(allowed)) OR (NOT management AND assignee<>actor) THEN RAISE EXCEPTION 'staff_task_denied'; END IF;
 IF (k IN('CREATE_TEMPLATE','REVISE_TEMPLATE','ARCHIVE_TEMPLATE','REOPEN','CANCEL','REASSIGN') AND NOT management)
 OR (k IN('CHECK_ITEM','COMPLETE','ACK_REMINDER') AND assignee<>actor) THEN RAISE EXCEPTION 'staff_task_denied'; END IF;
 -- Original target identity must still match after acquiring every lock. This
 -- prevents reassignment/location changes from invalidating the lock footprint.
 IF basis IS NOT NULL AND (loc IS DISTINCT FROM basis->>'locationId' OR assignee IS DISTINCT FROM basis->>'assigneeId') THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
 SELECT * INTO op FROM staff_task_operations o WHERE o.workspace_id=w AND o.actor_id=actor AND o.session_hash=staff_task_apply.session_hash AND o.operation_id=(c->>'operationId')::uuid;
 IF FOUND THEN
  IF op.payload_hash<>staff_task_apply.payload_hash THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
  RETURN op.result;
 END IF;
 IF k<>'CREATE_TEMPLATE' AND COALESCE(i.revision,t.revision)<>(c->>'expectedRevision')::integer THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
 IF NOT EXISTS(SELECT 1 FROM locations WHERE id=loc AND workspace_id=w AND active) THEN RAISE EXCEPTION 'staff_task_denied'; END IF;
 IF k IN('CREATE_TEMPLATE','REVISE_TEMPLATE') THEN loc:=c->'draft'->>'locationId'; assignee:=c->'draft'->>'assigneeId'; END IF;
 IF k='REASSIGN' THEN assignee:=c->>'assigneeId'; END IF;
 IF k IN('CREATE_TEMPLATE','REVISE_TEMPLATE','SYNC_TEMPLATE','REASSIGN') THEN
  IF NOT(loc=ANY(allowed)) OR NOT EXISTS(SELECT 1 FROM employees e JOIN locations home ON home.id=e.primary_location_id JOIN locations target ON target.id=loc
   WHERE e.id=assignee AND e.active AND home.workspace_id=w AND target.workspace_id=w AND target.active
   AND(e.primary_location_id=loc OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=e.id AND el.location_id=loc))) THEN RAISE EXCEPTION 'staff_task_denied'; END IF;
 END IF;
 IF k='CREATE_TEMPLATE' THEN
  IF t.id IS NOT NULL THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
  INSERT INTO staff_task_templates(id,workspace_id,location_id,assignee_id,draft,next_date) VALUES(template,w,loc,assignee,c->'draft',(c->'draft'->'schedule'->>'startDate')::date) RETURNING * INTO t;
 ELSIF k='REVISE_TEMPLATE' THEN
  IF t.archived THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
  UPDATE staff_task_templates SET draft=c->'draft',location_id=loc,assignee_id=assignee,revision=revision+1,
   next_date=GREATEST(COALESCE(next_date,(SELECT max(business_date)+1 FROM staff_task_instances WHERE workspace_id=w AND template_id=template)),(c->'draft'->'schedule'->>'startDate')::date)
   WHERE id=template AND workspace_id=w RETURNING * INTO t;
 ELSIF k='ARCHIVE_TEMPLATE' THEN
  UPDATE staff_task_templates SET archived=true,revision=revision+1 WHERE id=template AND workspace_id=w RETURNING * INTO t;
 ELSIF k='SYNC_TEMPLATE' THEN
  IF t.archived THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
  IF t.next_date::text IS DISTINCT FROM basis->>'nextDate' OR t.draft IS DISTINCT FROM basis->'draft' THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
  IF jsonb_array_length(plan->'occurrences')>31 THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
  FOR occurrence IN SELECT value FROM jsonb_array_elements(plan->'occurrences') LOOP
   INSERT INTO staff_task_instances(id,workspace_id,template_id,business_date,location_id,assignee_id,snapshot,due_at,reminder_at)
    VALUES(gen_random_uuid(),w,template,(occurrence->>'businessDate')::date,loc,assignee,t.draft,(occurrence->>'dueAt')::timestamptz,(occurrence->>'reminderAt')::timestamptz) ON CONFLICT(workspace_id,template_id,business_date) DO NOTHING RETURNING * INTO created;
   IF FOUND THEN n:=n+1;
    INSERT INTO staff_task_events(id,workspace_id,template_id,task_id,actor_id,kind,data) VALUES(gen_random_uuid(),w,template,created.id,actor,'MATERIALIZE',jsonb_build_object('before',NULL,'after',to_jsonb(created)));
   END IF;
  END LOOP;
  UPDATE staff_task_templates SET next_date=(plan->>'nextDate')::date,revision=revision+1 WHERE id=template AND workspace_id=w RETURNING * INTO t;
 ELSE
  IF k IN('CHECK_ITEM','COMPLETE','REASSIGN') AND i.status IN('COMPLETED','CANCELLED') THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
  IF k='CHECK_ITEM' THEN
   IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(i.snapshot->'checklist') x WHERE x->>'id'=c->>'itemId') THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
   IF (c->>'checked')::boolean THEN i.checked_item_ids:=ARRAY(SELECT DISTINCT x FROM unnest(i.checked_item_ids||ARRAY[c->>'itemId']) x ORDER BY x);
   ELSE i.checked_item_ids:=array_remove(i.checked_item_ids,c->>'itemId'); END IF;
   i.status:=CASE WHEN cardinality(i.checked_item_ids)>0 THEN 'IN_PROGRESS' ELSE 'OPEN' END;
  ELSIF k='COMPLETE' THEN
   IF EXISTS(SELECT 1 FROM jsonb_array_elements(i.snapshot->'checklist') x WHERE NOT(x->>'id'=ANY(i.checked_item_ids))) THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
   i.status:='COMPLETED'; i.completed_by:=actor; i.completed_at:=clock_timestamp();
  ELSIF k='REOPEN' THEN
   IF i.status NOT IN('COMPLETED','CANCELLED') THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
   i.status:='OPEN'; i.checked_item_ids:='{}'; i.completed_by:=NULL; i.completed_at:=NULL; i.reminder_generation:=i.reminder_generation+1;
  ELSIF k='CANCEL' THEN i.status:='CANCELLED'; i.completed_by:=NULL; i.completed_at:=NULL;
  ELSIF k='REASSIGN' THEN i.assignee_id:=assignee; i.status:='OPEN'; i.checked_item_ids:='{}'; i.reminder_generation:=i.reminder_generation+1;
  ELSIF k='ACK_REMINDER' THEN
   IF i.status IN('COMPLETED','CANCELLED') OR i.reminder_at IS NULL OR i.reminder_at>clock_timestamp() THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
   INSERT INTO staff_task_reminder_acks(workspace_id,task_id,generation,employee_id) VALUES(w,task,i.reminder_generation,actor) ON CONFLICT DO NOTHING;
  ELSIF k<>'COMMENT' THEN RAISE EXCEPTION 'staff_task_conflict'; END IF;
  IF k<>'ACK_REMINDER' THEN i.revision:=i.revision+1; END IF;
  UPDATE staff_task_instances SET assignee_id=i.assignee_id,checked_item_ids=i.checked_item_ids,status=i.status,completed_by=i.completed_by,completed_at=i.completed_at,reminder_generation=i.reminder_generation,revision=i.revision WHERE workspace_id=w AND id=task;
 END IF;
 after_value:=CASE WHEN task IS NULL THEN to_jsonb(t) ELSE to_jsonb(i) END;
 INSERT INTO staff_task_events(id,workspace_id,template_id,task_id,actor_id,kind,data) VALUES(gen_random_uuid(),w,template,task,actor,k,jsonb_build_object('before',old,'after',after_value)||CASE WHEN k='COMMENT' THEN jsonb_build_object('body',c->>'body') ELSE '{}'::jsonb END);
 result:=jsonb_build_object('status','committed','operationId',c->>'operationId','templateId',template,'revision',COALESCE(i.revision,t.revision));
 IF task IS NOT NULL THEN result:=result||jsonb_build_object('taskId',task); END IF;
 IF k='SYNC_TEMPLATE' THEN result:=result||jsonb_build_object('createdCount',n,'nextDate',t.next_date,'more',plan->'more'); END IF;
 INSERT INTO staff_task_operations(workspace_id,actor_id,session_hash,operation_id,payload_hash,template_id,task_id,result) VALUES(w,actor,staff_task_apply.session_hash,(c->>'operationId')::uuid,staff_task_apply.payload_hash,template,task,result);
 RETURN result;
END $$;
-- Fresh bootstrap grants its new APP later. Existing isolated companies already
-- have a recorded APP; only that canonical role receives this additive domain.
-- Append-only relations intentionally omit UPDATE, and no role receives DELETE.
DO $staff_task_app_upgrade$
DECLARE app_role text;
BEGIN
 SELECT login_role::text INTO app_role FROM public.onboarding_runtime_roles WHERE kind='APP';
 IF FOUND THEN
  IF app_role !~ '^nv_app_[a-f0-9]{24}$' OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=app_role)
  THEN RAISE EXCEPTION 'staff_task_app_role_invalid'; END IF;
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.staff_task_templates,public.staff_task_instances TO %I',app_role);
  EXECUTE format('GRANT SELECT,INSERT ON public.staff_task_events,public.staff_task_operations,public.staff_task_reminder_acks TO %I',app_role);
 END IF;
END
$staff_task_app_upgrade$;
COMMIT;
