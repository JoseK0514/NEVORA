BEGIN;
-- SCRUM-187 additive storage. D04 activation remains held by the existing owned-database guard.
CREATE TABLE conversation_streams (
 workspace_id text PRIMARY KEY REFERENCES workspaces(id), last_order bigint NOT NULL DEFAULT 0 CHECK(last_order>=0),
 cursor_key text NOT NULL DEFAULT encode(sha256(convert_to(gen_random_uuid()::text||gen_random_uuid()::text,'UTF8')),'hex') CHECK(cursor_key ~ '^[a-f0-9]{64}$')
);
CREATE TABLE conversations (
 id uuid PRIMARY KEY, workspace_id text NOT NULL REFERENCES workspaces(id), location_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN('DIRECT','GROUP')), title text, direct_key text,
 topic_kind text CHECK(topic_kind IN('SHIFT','STAFF_TASK')), topic_id text,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0), archived boolean NOT NULL DEFAULT false,
 last_sequence bigint NOT NULL DEFAULT 0 CHECK(last_sequence>=0), created_order bigint NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(workspace_id,id), UNIQUE(workspace_id,direct_key), FOREIGN KEY(workspace_id,location_id) REFERENCES locations(workspace_id,id),
 CHECK((kind='DIRECT' AND direct_key IS NOT NULL AND title IS NULL) OR(kind='GROUP' AND direct_key IS NULL AND char_length(title) BETWEEN 1 AND 120)),
 CHECK((topic_kind IS NULL)=(topic_id IS NULL))
);
CREATE TABLE conversation_members (
 epoch uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id text NOT NULL, conversation_id uuid NOT NULL,
 employee_id text NOT NULL REFERENCES employees(id), role_generation bigint NOT NULL,
 joined_after bigint NOT NULL CHECK(joined_after>=0), ended_at timestamptz,
 read_through bigint NOT NULL DEFAULT 0 CHECK(read_through>=0), muted boolean NOT NULL DEFAULT false,
 UNIQUE(workspace_id,conversation_id,epoch), FOREIGN KEY(workspace_id,conversation_id) REFERENCES conversations(workspace_id,id)
);
CREATE UNIQUE INDEX conversation_member_current ON conversation_members(workspace_id,conversation_id,employee_id) WHERE ended_at IS NULL;
CREATE INDEX conversation_member_inbox ON conversation_members(workspace_id,employee_id,conversation_id) WHERE ended_at IS NULL;
CREATE TABLE conversation_messages (
 id uuid PRIMARY KEY, workspace_id text NOT NULL, conversation_id uuid NOT NULL, sequence bigint NOT NULL CHECK(sequence>0),
 stream_order bigint NOT NULL, author_id text NOT NULL REFERENCES employees(id), author_epoch uuid NOT NULL,
 body text NOT NULL CHECK(char_length(body) BETWEEN 1 AND 2000 AND length(btrim(body))>0), persisted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(workspace_id,conversation_id,sequence), FOREIGN KEY(workspace_id,conversation_id,author_epoch) REFERENCES conversation_members(workspace_id,conversation_id,epoch)
);
CREATE INDEX conversation_message_stream ON conversation_messages(workspace_id,conversation_id,stream_order);
CREATE TABLE conversation_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id text NOT NULL, conversation_id uuid NOT NULL,
 actor_id text NOT NULL REFERENCES employees(id), kind text NOT NULL, data jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), FOREIGN KEY(workspace_id,conversation_id) REFERENCES conversations(workspace_id,id)
);
CREATE TABLE conversation_operations (
 workspace_id text NOT NULL, actor_id text NOT NULL REFERENCES employees(id), session_hash text NOT NULL CHECK(session_hash ~ '^[a-f0-9]{64}$'),
 operation_id uuid NOT NULL, payload_hash text NOT NULL CHECK(payload_hash ~ '^[a-f0-9]{64}$'),
 conversation_id uuid NOT NULL, membership_epoch uuid NOT NULL, receipt jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(workspace_id,actor_id,session_hash,operation_id),
 FOREIGN KEY(workspace_id,conversation_id,membership_epoch) REFERENCES conversation_members(workspace_id,conversation_id,epoch)
);
CREATE FUNCTION conversation_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'conversation_immutable'; END $$;
CREATE TRIGGER conversation_messages_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON conversation_messages FOR EACH STATEMENT EXECUTE FUNCTION conversation_immutable();
CREATE TRIGGER conversation_events_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON conversation_events FOR EACH STATEMENT EXECUTE FUNCTION conversation_immutable();
CREATE TRIGGER conversation_operations_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON conversation_operations FOR EACH STATEMENT EXECUTE FUNCTION conversation_immutable();
CREATE TRIGGER conversations_no_delete BEFORE DELETE OR TRUNCATE ON conversations FOR EACH STATEMENT EXECUTE FUNCTION conversation_immutable();
CREATE TRIGGER conversation_members_no_delete BEFORE DELETE OR TRUNCATE ON conversation_members FOR EACH STATEMENT EXECUTE FUNCTION conversation_immutable();
CREATE TRIGGER conversation_streams_no_delete BEFORE DELETE OR TRUNCATE ON conversation_streams FOR EACH STATEMENT EXECUTE FUNCTION conversation_immutable();
CREATE FUNCTION conversation_update_guard() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF TG_TABLE_NAME='conversations' THEN
  IF (to_jsonb(NEW)-ARRAY['revision','archived','last_sequence','title']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['revision','archived','last_sequence','title']) OR NEW.revision<OLD.revision OR NEW.last_sequence<OLD.last_sequence THEN RAISE EXCEPTION 'conversation_immutable'; END IF;
 ELSIF TG_TABLE_NAME='conversation_members' THEN
  IF (to_jsonb(NEW)-ARRAY['ended_at','read_through','muted']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['ended_at','read_through','muted']) OR NEW.read_through<OLD.read_through OR(OLD.ended_at IS NOT NULL AND NEW.ended_at IS DISTINCT FROM OLD.ended_at) THEN RAISE EXCEPTION 'conversation_immutable'; END IF;
 ELSE
  IF NEW.workspace_id<>OLD.workspace_id OR NEW.cursor_key<>OLD.cursor_key OR NEW.last_order<OLD.last_order THEN RAISE EXCEPTION 'conversation_immutable'; END IF;
 END IF; RETURN NEW; END $$;
CREATE TRIGGER conversation_root_update BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION conversation_update_guard();
CREATE TRIGGER conversation_member_update BEFORE UPDATE ON conversation_members FOR EACH ROW EXECUTE FUNCTION conversation_update_guard();
CREATE TRIGGER conversation_stream_update BEFORE UPDATE ON conversation_streams FOR EACH ROW EXECUTE FUNCTION conversation_update_guard();
-- Current Company Access and employee lifecycle apply to explicit members, including Owners.
CREATE FUNCTION conversation_person_allowed(w text,p text,l text) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM employees e JOIN locations home ON home.id=e.primary_location_id
 JOIN operational_subject_versions v ON v.workspace_id=w AND v.employee_id=e.id
 LEFT JOIN operational_scopes_current g ON g.workspace_id=w AND g.employee_id=e.id
 JOIN locations loc ON loc.id=l AND loc.workspace_id=w AND loc.active
 WHERE e.id=p AND e.active AND home.workspace_id=w AND e.role IN('OWNER','MANAGER','EMPLOYEE','LEAD')
 AND EXISTS(SELECT 1 FROM company_access_adoption a WHERE a.workspace_id=w AND a.state='ENFORCED' AND a.protocol_version=1 AND a.owner_policy_receipt_id='01a13cda-e556-7652-8469-a18a77094364')
 AND CASE
 WHEN e.role='OWNER' THEN true
 WHEN e.role='MANAGER' THEN g.role_generation=v.generation AND g.action='ASSIGN' AND (
  (g.mode='COMPANY' AND cardinality(g.location_ids)=0) OR
  (g.mode='LOCATIONS' AND cardinality(g.location_ids) BETWEEN 1 AND 100 AND l=ANY(g.location_ids) AND g.location_ids=ARRAY(SELECT id FROM locations WHERE workspace_id=w AND active AND id=ANY(g.location_ids) ORDER BY id)))
 ELSE e.role IN('EMPLOYEE','LEAD') AND(e.primary_location_id=l OR EXISTS(SELECT 1 FROM employee_location_eligibility el WHERE el.employee_id=p AND el.location_id=l))
 END)

$$;
CREATE FUNCTION conversation_member_allowed(w text,p text,c uuid,ep uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM conversation_members m JOIN conversations r ON r.workspace_id=m.workspace_id AND r.id=m.conversation_id
 JOIN operational_subject_versions v ON v.workspace_id=m.workspace_id AND v.employee_id=m.employee_id
 WHERE m.workspace_id=w AND m.conversation_id=c AND m.employee_id=p AND m.ended_at IS NULL AND m.role_generation=v.generation AND(ep IS NULL OR m.epoch=ep) AND conversation_person_allowed(w,p,r.location_id))
$$;
CREATE FUNCTION conversation_topic_allowed(w text,p text,l text,k text,t text) RETURNS boolean LANGUAGE plpgsql STABLE AS $$
DECLARE ok boolean;
BEGIN
 IF k IS NULL THEN RETURN true; END IF;
 IF NOT conversation_person_allowed(w,p,l) THEN RETURN false; END IF;
 IF k='SHIFT' THEN
  SELECT EXISTS(SELECT 1 FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN employees e ON e.id=p
   WHERE sh.id=t AND s.location_id=l AND(e.role IN('OWNER','MANAGER') OR(sh.employee_id=p AND s.status='PUBLISHED' AND EXISTS(SELECT 1 FROM schedule_publication_revisions r WHERE r.week_start=s.week_start)
    AND NOT EXISTS(SELECT 1 FROM shift_callouts sc WHERE sc.status='APPROVED' AND sc.shift_id=sh.id AND sc.employee_id=sh.employee_id AND sc.assignment_episode_id=sh.assignment_episode_id AND sc.reviewed_terms_fingerprint='v1:'||encode(sha256(convert_to(concat('{','"shiftId":',COALESCE(to_jsonb(sh.id)::text,'null'),',','"scheduleId":',COALESCE(to_jsonb(s.id)::text,'null'),',','"workspaceId":',COALESCE(to_jsonb((SELECT workspace_id FROM locations WHERE id=s.location_id))::text,'null'),',','"timeZone":',COALESCE(to_jsonb((SELECT time_zone FROM workspaces WHERE singleton))::text,'null'),',','"weekStart":',COALESCE(to_jsonb(s.week_start::text)::text,'null'),',','"date":',COALESCE(to_jsonb(sh.date::text)::text,'null'),',','"startTime":',COALESCE(to_jsonb(left(sh.start_time::text,5))::text,'null'),',','"endTime":',COALESCE(to_jsonb(left(sh.end_time::text,5))::text,'null'),',','"locationId":',COALESCE(to_jsonb(s.location_id)::text,'null'),',','"employeeId":',COALESCE(to_jsonb(sh.employee_id)::text,'null'),',','"assignmentEpisodeId":',COALESCE(to_jsonb(sh.assignment_episode_id::text)::text,'null'),',','"termsRevision":',COALESCE(to_jsonb(sh.terms_revision)::text,'null'),',','"positionId":',COALESCE(to_jsonb(sh.position_id)::text,'null'),',','"isDesignatedLead":',COALESCE(to_jsonb(sh.is_designated_lead)::text,'null'),',','"scheduledBreaks":','{"status":"UNKNOWN"}','}'),'UTF8')),'hex') AND sc.source_terms=jsonb_build_object('shiftId',sh.id,'scheduleId',s.id,'workspaceId',(SELECT workspace_id FROM locations WHERE id=s.location_id),'timeZone',(SELECT time_zone FROM workspaces WHERE singleton),'weekStart',s.week_start::text,'date',sh.date::text,'startTime',left(sh.start_time::text,5),'endTime',left(sh.end_time::text,5),'locationId',s.location_id,'employeeId',sh.employee_id,'assignmentEpisodeId',sh.assignment_episode_id::text,'termsRevision',sh.terms_revision,'positionId',sh.position_id,'isDesignatedLead',sh.is_designated_lead,'scheduledBreaks','{"status":"UNKNOWN"}'::jsonb))))) INTO ok;
 ELSIF k='STAFF_TASK' AND to_regclass('public.staff_task_instances') IS NOT NULL THEN
  EXECUTE 'SELECT EXISTS(SELECT 1 FROM public.staff_task_instances i JOIN public.employees e ON e.id=$2 WHERE i.workspace_id=$1 AND i.id::text=$4 AND i.location_id=$3 AND(e.role IN(''OWNER'',''MANAGER'') OR i.assignee_id=$2))' INTO ok USING w,p,l,t;
 ELSE RETURN false;
 END IF;
 RETURN ok;
END $$;
-- INVOKER only. Caller holds canonical workspace→employees→sources→root→session locks,
-- then fresh session, Company Access and owned-runtime guards before this statement.
CREATE FUNCTION conversation_apply(w text,p text,s text,c jsonb,h text) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE r conversations%ROWTYPE; m conversation_members%ROWTYPE; prior conversation_operations%ROWTYPE;
 op uuid:=(c->>'operationId')::uuid; cid uuid:=(c->>'conversationId')::uuid; kind text:=c->>'kind';
 people text[]; target text; key text; ord bigint; n bigint; receipt jsonb;
BEGIN
 IF NOT COALESCE((inet_server_addr() IN('127.0.0.1'::inet,'::1'::inet)
 AND current_database() ~ '^(nevora_foundation_test_|nevora_exchange_test_|fuel_phase3_test_)[a-z0-9_]+$'
 AND EXISTS(SELECT 1 FROM pg_database WHERE datname=current_database() AND shobj_description(oid,'pg_database') ~ '^fuel-phase3-disposable:[a-f0-9-]{36}$')),false) THEN RAISE EXCEPTION 'conversation_activation_held'; END IF;
 IF NOT EXISTS(SELECT 1 FROM employee_sessions es JOIN employees e ON e.id=es.employee_id WHERE es.token_hash=s AND e.id=p AND e.active AND es.expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'conversation_denied'; END IF;
 SELECT * INTO prior FROM conversation_operations WHERE workspace_id=w AND actor_id=p AND session_hash=s AND operation_id=op;
 IF FOUND THEN
  SELECT * INTO r FROM conversations WHERE workspace_id=w AND id=prior.conversation_id;
  IF NOT conversation_member_allowed(w,p,r.id,prior.membership_epoch) AND NOT(prior.receipt->>'kind'='LEAVE' AND conversation_person_allowed(w,p,r.location_id) AND EXISTS(SELECT 1 FROM conversation_members lm JOIN operational_subject_versions lv ON lv.workspace_id=lm.workspace_id AND lv.employee_id=lm.employee_id WHERE lm.workspace_id=w AND lm.conversation_id=r.id AND lm.epoch=prior.membership_epoch AND lm.employee_id=p AND lm.role_generation=lv.generation)) THEN RAISE EXCEPTION 'conversation_denied'; END IF;
  IF prior.payload_hash<>h THEN RAISE EXCEPTION 'conversation_conflict'; END IF;
  RETURN prior.receipt;
 END IF;
 IF kind IN('CREATE_DIRECT','CREATE_GROUP') THEN
  IF NOT conversation_person_allowed(w,p,c->>'locationId') THEN RAISE EXCEPTION 'conversation_denied'; END IF;
  IF kind='CREATE_GROUP' AND NOT EXISTS(SELECT 1 FROM employees WHERE id=p AND role IN('OWNER','MANAGER')) THEN RAISE EXCEPTION 'conversation_denied'; END IF;
  people:=CASE WHEN kind='CREATE_DIRECT' THEN ARRAY[p,c->>'peerId'] ELSE ARRAY[p]||ARRAY(SELECT jsonb_array_elements_text(c->'memberIds')) END;
  IF cardinality(people)<2 OR cardinality(people)>20 OR cardinality(people)<>(SELECT count(DISTINCT x) FROM unnest(people)x) OR EXISTS(SELECT 1 FROM unnest(people)x WHERE NOT conversation_person_allowed(w,x,c->>'locationId')) OR NOT conversation_topic_allowed(w,p,c->>'locationId',c->'context'->>'kind',c->'context'->>'id') THEN RAISE EXCEPTION 'conversation_denied'; END IF;
  IF kind='CREATE_DIRECT' THEN
   SELECT encode(sha256(convert_to(jsonb_build_array(c->>'locationId',c->'context',(SELECT jsonb_agg(jsonb_build_array(v.employee_id,v.generation) ORDER BY v.employee_id) FROM operational_subject_versions v WHERE v.workspace_id=w AND v.employee_id=ANY(people)))::text,'UTF8')),'hex') INTO key;
   SELECT * INTO r FROM conversations WHERE workspace_id=w AND direct_key=key;
  END IF;
  IF r.id IS NULL THEN
   INSERT INTO conversation_streams(workspace_id) VALUES(w) ON CONFLICT DO NOTHING;
   UPDATE conversation_streams SET last_order=last_order+1 WHERE workspace_id=w RETURNING last_order INTO ord;
   INSERT INTO conversations(id,workspace_id,location_id,kind,title,direct_key,topic_kind,topic_id,created_order)
    VALUES(cid,w,c->>'locationId',CASE kind WHEN 'CREATE_DIRECT' THEN 'DIRECT' ELSE 'GROUP' END,c->>'title',key,c->'context'->>'kind',c->'context'->>'id',ord) RETURNING * INTO r;
   INSERT INTO conversation_members(workspace_id,conversation_id,employee_id,role_generation,joined_after)
    SELECT w,r.id,v.employee_id,v.generation,0 FROM operational_subject_versions v WHERE v.workspace_id=w AND v.employee_id=ANY(people);
  ELSIF NOT conversation_member_allowed(w,p,r.id) THEN RAISE EXCEPTION 'conversation_denied'; END IF;
  SELECT * INTO m FROM conversation_members WHERE workspace_id=w AND conversation_id=r.id AND employee_id=p AND ended_at IS NULL;
 ELSE
  SELECT * INTO r FROM conversations WHERE workspace_id=w AND id=cid;
  IF NOT FOUND OR NOT conversation_member_allowed(w,p,cid,(c->>'membershipEpoch')::uuid) THEN RAISE EXCEPTION 'conversation_denied'; END IF;
  SELECT * INTO m FROM conversation_members WHERE epoch=(c->>'membershipEpoch')::uuid;
  IF r.revision<>(c->>'expectedRevision')::integer THEN RAISE EXCEPTION 'conversation_conflict'; END IF;
  IF kind='SEND' THEN
   IF r.archived OR EXISTS(SELECT 1 FROM conversation_members cm JOIN operational_subject_versions v ON v.workspace_id=cm.workspace_id AND v.employee_id=cm.employee_id WHERE cm.workspace_id=w AND cm.conversation_id=r.id AND cm.ended_at IS NULL AND(cm.role_generation<>v.generation OR NOT conversation_person_allowed(w,cm.employee_id,r.location_id))) THEN RAISE EXCEPTION 'conversation_conflict'; END IF;
   UPDATE conversation_streams SET last_order=last_order+1 WHERE workspace_id=w RETURNING last_order INTO ord;
   UPDATE conversations SET last_sequence=last_sequence+1 WHERE id=r.id RETURNING * INTO r;
   INSERT INTO conversation_messages(id,workspace_id,conversation_id,sequence,stream_order,author_id,author_epoch,body) VALUES((c->>'messageId')::uuid,w,r.id,r.last_sequence,ord,p,m.epoch,c->>'body');
  ELSIF kind='MARK_READ' THEN
   n:=(c->>'throughSequence')::bigint;
   IF n>r.last_sequence OR n<m.joined_after THEN RAISE EXCEPTION 'conversation_conflict'; END IF;
   UPDATE conversation_members SET read_through=greatest(read_through,n) WHERE epoch=m.epoch;
  ELSIF kind='SET_MUTED' THEN UPDATE conversation_members SET muted=(c->>'muted')::boolean WHERE epoch=m.epoch;
  ELSE
   IF r.kind<>'GROUP' THEN RAISE EXCEPTION 'conversation_denied'; END IF;
   IF kind<>'LEAVE' AND NOT EXISTS(SELECT 1 FROM employees WHERE id=p AND role IN('OWNER','MANAGER')) THEN RAISE EXCEPTION 'conversation_denied'; END IF;
   IF kind='ADD_MEMBER' THEN
    target:=c->>'employeeId';
    IF NOT conversation_person_allowed(w,target,r.location_id) THEN RAISE EXCEPTION 'conversation_denied'; END IF;
    IF conversation_member_allowed(w,target,r.id) OR(SELECT count(*) FROM conversation_members WHERE workspace_id=w AND conversation_id=r.id AND ended_at IS NULL)>=20 THEN RAISE EXCEPTION 'conversation_conflict'; END IF;
    UPDATE conversation_members SET ended_at=clock_timestamp() WHERE workspace_id=w AND conversation_id=r.id AND employee_id=target AND ended_at IS NULL;
    INSERT INTO conversation_members(workspace_id,conversation_id,employee_id,role_generation,joined_after,read_through) SELECT w,r.id,target,generation,r.last_sequence,r.last_sequence FROM operational_subject_versions WHERE workspace_id=w AND employee_id=target;
   ELSIF kind IN('REMOVE_MEMBER','LEAVE') THEN
    target:=CASE kind WHEN 'LEAVE' THEN p ELSE c->>'employeeId' END;
    IF kind='REMOVE_MEMBER' AND target=p THEN RAISE EXCEPTION 'conversation_denied'; END IF;
    IF kind='LEAVE' AND EXISTS(SELECT 1 FROM employees WHERE id=p AND role IN('OWNER','MANAGER')) AND NOT EXISTS(SELECT 1 FROM conversation_members cm JOIN employees e ON e.id=cm.employee_id WHERE cm.workspace_id=w AND cm.conversation_id=r.id AND cm.employee_id<>p AND e.role IN('OWNER','MANAGER') AND conversation_member_allowed(w,e.id,r.id,cm.epoch)) THEN RAISE EXCEPTION 'conversation_conflict'; END IF;
    UPDATE conversation_members SET ended_at=clock_timestamp() WHERE workspace_id=w AND conversation_id=r.id AND employee_id=target AND ended_at IS NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'conversation_conflict'; END IF;
   ELSIF kind='RENAME_GROUP' THEN UPDATE conversations SET title=c->>'title' WHERE id=r.id;
   ELSIF kind='SET_ARCHIVED' THEN UPDATE conversations SET archived=(c->>'archived')::boolean WHERE id=r.id;
   ELSE RAISE EXCEPTION 'conversation_invalid'; END IF;
   UPDATE conversations SET revision=revision+1 WHERE id=r.id RETURNING * INTO r;
  END IF;
 END IF;
 receipt:=jsonb_build_object('status','committed','operationId',op,'kind',kind,'conversationId',r.id,'requestedConversationId',cid,'revision',r.revision,'membershipEpoch',m.epoch);
 IF kind='SEND' THEN receipt:=receipt||jsonb_build_object('messageId',c->>'messageId','sequence',r.last_sequence::text); END IF;
 INSERT INTO conversation_events(workspace_id,conversation_id,actor_id,kind,data) VALUES(w,r.id,p,kind,jsonb_build_object('revision',r.revision,'target',c->>'employeeId'));
 INSERT INTO conversation_operations(workspace_id,actor_id,session_hash,operation_id,payload_hash,conversation_id,membership_epoch,receipt) VALUES(w,p,s,op,h,r.id,m.epoch,receipt);
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION conversation_apply(text,text,text,jsonb,text) FROM PUBLIC;
-- Existing provisioned runtimes need additive capabilities; no worker access, DELETE or ownership changes.
DO $$ DECLARE app_role text; BEGIN
 SELECT login_role::text INTO app_role FROM public.onboarding_runtime_roles WHERE kind='APP';
 IF app_role IS NOT NULL THEN
  IF app_role !~ '^nv_app_[a-f0-9]{24}$' OR NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname=app_role AND NOT rolsuper AND NOT rolcreaterole AND NOT rolcreatedb AND NOT rolbypassrls) THEN RAISE EXCEPTION 'conversation_runtime_role_invalid'; END IF;
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON conversation_streams,conversations,conversation_members TO %I',app_role);
  EXECUTE format('GRANT SELECT,INSERT ON conversation_messages,conversation_events,conversation_operations TO %I',app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION conversation_apply(text,text,text,jsonb,text) TO %I',app_role);
 END IF;
END $$;
COMMIT;
