-- BACKFILL_CHUNK_JOURNAL_V1 durable migration-stage OBSERVATIONS ONLY.
-- Root installs this source atomically in an explicitly owned nevora_tenancy
-- schema, verifies all catalog/source identities and grants only named nonowner
-- migration operators: SELECT/INSERT on both tables, UPDATE(plan_digest) on plans solely for FOR UPDATE (immutable trigger rejects changes),
-- UPDATE(state) on chunks,
-- schema USAGE and exact function EXECUTE. No PUBLIC/app/worker grants are made.
-- Hashes never grant DB/operator/tenant authority. No source/target effect,
-- chunk execution, COMPLETE/COMMITTED promotion or reconciliation is provided.
-- Original plan/key evidence must be retained outside this observation store.
-- Exact safe integer metadata, strings and booleans are supported; fractional,
-- exponent/unsafe-number keys require a later exact adapter and block here.
-- No retention/purge, counters, background coordinator or new operation IDs.

CREATE FUNCTION nevora_tenancy._journal_canonical_json(v pg_catalog.json)
RETURNS pg_catalog.text LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER
SET search_path = pg_catalog AS $canonical$
DECLARE k pg_catalog.text; result pg_catalog.text; item record; n pg_catalog.text;
BEGIN
 IF v IS NULL THEN RAISE EXCEPTION 'JOURNAL_INVALID_JSON'; END IF;
 k := pg_catalog.json_typeof(v);
 IF k = 'null' THEN RETURN 'null'; END IF;
 IF k = 'boolean' THEN RETURN (v::pg_catalog.jsonb)::pg_catalog.text; END IF;
 IF k = 'string' THEN RETURN pg_catalog.to_json(v #>> '{}')::pg_catalog.text; END IF;
 IF k = 'number' THEN
  n := v::pg_catalog.text;
  IF n !~ '^-?(0|[1-9][0-9]*)$' OR n = '-0' OR
     n::pg_catalog.numeric < -9007199254740991 OR n::pg_catalog.numeric > 9007199254740991
  THEN RAISE EXCEPTION 'UNSUPPORTED_JOURNAL_NUMBER'; END IF;
  RETURN n;
 END IF;
 IF k = 'array' THEN
  result := '';
  FOR item IN SELECT a.value FROM pg_catalog.json_array_elements(v) WITH ORDINALITY AS a(value, ordinal) ORDER BY a.ordinal LOOP
   result := result || CASE WHEN result = '' THEN '' ELSE ',' END || nevora_tenancy._journal_canonical_json(item.value);
  END LOOP;
  RETURN '[' || result || ']';
 END IF;
 IF k = 'object' THEN
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.json_each(v)) <>
     (SELECT pg_catalog.count(DISTINCT e.key COLLATE pg_catalog."C") FROM pg_catalog.json_each(v) AS e)
  THEN RAISE EXCEPTION 'JOURNAL_DUPLICATE_JSON_FIELD'; END IF;
  result := '';
  FOR item IN SELECT e.key,e.value FROM pg_catalog.json_each(v) AS e ORDER BY e.key COLLATE pg_catalog."C" LOOP
   result := result || CASE WHEN result = '' THEN '' ELSE ',' END || pg_catalog.to_json(item.key)::pg_catalog.text || ':' || nevora_tenancy._journal_canonical_json(item.value);
  END LOOP;
  RETURN '{' || result || '}';
 END IF;
 RAISE EXCEPTION 'JOURNAL_INVALID_JSON';
END $canonical$;

CREATE FUNCTION nevora_tenancy._journal_fields(v pg_catalog.jsonb, names pg_catalog.text[])
RETURNS pg_catalog.bool LANGUAGE sql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog
AS $fields$ SELECT pg_catalog.jsonb_typeof(v) = 'object' AND v ?& names AND
 (SELECT pg_catalog.count(*) FROM pg_catalog.jsonb_object_keys(v)) = pg_catalog.cardinality(names) $fields$;

CREATE FUNCTION nevora_tenancy._journal_validate_description(canonical pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog AS $description$
DECLARE d pg_catalog.jsonb; b pg_catalog.jsonb; c pg_catalog.jsonb; value pg_catalog.jsonb;
 field pg_catalog.text; ordinal pg_catalog.int4 := 0; tables pg_catalog.jsonb;
BEGIN
 IF canonical IS NULL OR nevora_tenancy._journal_canonical_json(canonical::pg_catalog.json) COLLATE pg_catalog."C" <> canonical COLLATE pg_catalog."C"
 THEN RAISE EXCEPTION 'JOURNAL_NONCANONICAL_DESCRIPTION'; END IF;
 d := canonical::pg_catalog.jsonb;
 IF nevora_tenancy._journal_fields(d,ARRAY['status','boundary','chunks','verification']) IS NOT TRUE OR
    d->>'status' IS DISTINCT FROM 'DESCRIBED' OR d->>'verification' IS DISTINCT FROM 'PURE_JOURNAL_CONTRACT_NOT_DATABASE_VERIFICATION' OR
    pg_catalog.jsonb_typeof(d->'chunks') <> 'array'
 THEN RAISE EXCEPTION 'JOURNAL_INVALID_DESCRIPTION'; END IF;
 b := d->'boundary';
 IF nevora_tenancy._journal_fields(b,ARRAY['kind','sourceDigest','schemaDigest','registryDigest','snapshotId','planDigest','mappingDigest','writeFenceDigest']) IS NOT TRUE OR
    b->>'kind' IS DISTINCT FROM 'BACKFILL_CHUNK_JOURNAL_V1' OR pg_catalog.jsonb_typeof(b->'snapshotId') <> 'string' OR
    pg_catalog.length(b->>'snapshotId') = 0
 THEN RAISE EXCEPTION 'JOURNAL_INVALID_BOUNDARY'; END IF;
 FOREACH field IN ARRAY ARRAY['sourceDigest','schemaDigest','registryDigest','planDigest','mappingDigest','writeFenceDigest'] LOOP
  IF pg_catalog.jsonb_typeof(b->field) <> 'string' OR b->>field !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'JOURNAL_INVALID_BOUNDARY'; END IF;
 END LOOP;
 IF b->>'registryDigest' <> '5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681'
 THEN RAISE EXCEPTION 'JOURNAL_SOURCE_REGISTRY_DRIFT'; END IF;
 -- Closed original source primary-key arities, not deployed SQL approval.
 tables := $journal_tables${"availability_exceptions":1,"availability_windows":1,"break_entries":1,"calendar_clock":1,"calendar_operations":3,"calendar_removals":4,"calendar_subscriptions":1,"clocker_break_type_events":1,"clocker_break_types":1,"clocker_command_ledger":2,"clocker_device_credentials":1,"clocker_device_events":1,"clocker_devices":1,"clocker_employee_clock_state":1,"clocker_pin_configuration":1,"clocker_pin_events":1,"clocker_pin_limits":2,"clocker_pin_sessions":1,"communication_lifecycle":1,"communication_operations":3,"communication_receipts":1,"communication_recipients":4,"communication_revisions":1,"communications":1,"coverage_window_position_requirements":2,"employee_attention_operations":3,"employee_attention_receipts":1,"employee_clocker_pins":1,"employee_credentials":1,"employee_location_eligibility":2,"employee_positions":2,"employee_scheduling_settings":1,"employee_sessions":1,"employees":1,"location_coverage_windows":1,"location_staffing_settings":1,"locations":1,"notifications":1,"password_recovery_limits":2,"password_recovery_proofs":1,"payroll_export_profile_revisions":3,"payroll_export_receipts":3,"positions":1,"push_deliveries":1,"push_subscriptions":1,"schedule_acknowledgements":2,"schedule_generation_exclusions":1,"schedule_publication_revision_shifts":1,"schedule_publication_revisions":1,"schedule_template_shifts":1,"schedule_templates":1,"schedule_week_settings":1,"schedules":1,"shift_callouts":1,"shift_change_events":1,"shift_change_operations":3,"shift_change_participation":1,"shift_exchanges":1,"shifts":1,"time_correction_adjustments":1,"time_correction_events":1,"time_correction_requests":1,"time_entries":1,"time_off_requests":1,"timecard_revisions":1,"weekly_availability_submissions":2,"weekly_availability_windows":1,"workspaces":1}$journal_tables$::pg_catalog.jsonb;
 FOR c IN SELECT a.value FROM pg_catalog.jsonb_array_elements(d->'chunks') AS a LOOP
  IF nevora_tenancy._journal_fields(c,ARRAY['id','table','ordinal','count','firstKey','lastKey','keysDigest','sourceChecksum','targetChecksum','ownershipChecksum']) IS NOT TRUE OR
     pg_catalog.jsonb_typeof(c->'table') <> 'string' OR NOT (tables ? (c->>'table')) OR
     pg_catalog.jsonb_typeof(c->'ordinal') <> 'number' OR (c->>'ordinal')::pg_catalog.int8 <> ordinal OR
     pg_catalog.jsonb_typeof(c->'count') <> 'number' OR (c->>'count')::pg_catalog.int8 < 1 OR
     pg_catalog.jsonb_typeof(c->'firstKey') <> 'array' OR pg_catalog.jsonb_typeof(c->'lastKey') <> 'array'
  THEN RAISE EXCEPTION 'JOURNAL_INVALID_CHUNK'; END IF;
  IF pg_catalog.jsonb_array_length(c->'firstKey') <> (tables->>(c->>'table'))::pg_catalog.int4 OR
     pg_catalog.jsonb_array_length(c->'lastKey') <> (tables->>(c->>'table'))::pg_catalog.int4
  THEN RAISE EXCEPTION 'JOURNAL_INVALID_KEY'; END IF;
  FOR value IN SELECT a.value FROM pg_catalog.jsonb_array_elements(c->'firstKey') AS a UNION ALL
               SELECT a.value FROM pg_catalog.jsonb_array_elements(c->'lastKey') AS a LOOP
   IF pg_catalog.jsonb_typeof(value) NOT IN ('string','number','boolean') THEN RAISE EXCEPTION 'JOURNAL_INVALID_KEY'; END IF;
  END LOOP;
  FOREACH field IN ARRAY ARRAY['id','keysDigest','sourceChecksum','targetChecksum','ownershipChecksum'] LOOP
   IF pg_catalog.jsonb_typeof(c->field) <> 'string' OR c->>field !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'JOURNAL_INVALID_CHUNK'; END IF;
  END LOOP;
  ordinal := ordinal + 1;
 END LOOP;
 IF (SELECT pg_catalog.count(DISTINCT a.value->>'id') FROM pg_catalog.jsonb_array_elements(d->'chunks') AS a) <> ordinal
 THEN RAISE EXCEPTION 'JOURNAL_DUPLICATE_CHUNK'; END IF;
 RETURN d;
END $description$;

CREATE FUNCTION nevora_tenancy._journal_retry_key(plan pg_catalog.text, chunk pg_catalog.text)
RETURNS pg_catalog.text LANGUAGE plpgsql IMMUTABLE SECURITY INVOKER SET search_path = pg_catalog AS $retry$
BEGIN
 IF plan IS NULL OR chunk IS NULL OR plan !~ '^[a-f0-9]{64}$' OR chunk !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'JOURNAL_INVALID_RETRY'; END IF;
 RETURN pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('["BACKFILL_ORIGINAL_PLAN_RETRY","' || plan || '","' || chunk || '"]','UTF8')),'hex');
END $retry$;

CREATE TABLE nevora_tenancy.backfill_journal_plan (
 plan_digest pg_catalog.text COLLATE pg_catalog."C" PRIMARY KEY CHECK (plan_digest ~ '^[a-f0-9]{64}$'),
 description_canonical pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
 boundary pg_catalog.jsonb NOT NULL,
 chunk_count pg_catalog.int4 NOT NULL CHECK (chunk_count >= 0)
);
CREATE TABLE nevora_tenancy.backfill_journal_chunk (
 plan_digest pg_catalog.text COLLATE pg_catalog."C" NOT NULL REFERENCES nevora_tenancy.backfill_journal_plan(plan_digest),
 chunk_id pg_catalog.text COLLATE pg_catalog."C" NOT NULL CHECK (chunk_id ~ '^[a-f0-9]{64}$'),
 ordinal pg_catalog.int4 NOT NULL CHECK (ordinal >= 0),
 chunk_canonical pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
 retry_key pg_catalog.text COLLATE pg_catalog."C" NOT NULL UNIQUE CHECK (retry_key ~ '^[a-f0-9]{64}$'),
 state pg_catalog.text COLLATE pg_catalog."C" NOT NULL DEFAULT 'NOT_STARTED' CHECK (state IN ('NOT_STARTED','STARTED','UNKNOWN')),
 PRIMARY KEY(plan_digest,chunk_id), UNIQUE(plan_digest,ordinal)
);

CREATE FUNCTION nevora_tenancy._journal_plan_identity()
RETURNS pg_catalog.trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $plan_identity$
DECLARE d pg_catalog.jsonb;
BEGIN
 IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD IS DISTINCT FROM NEW) THEN RAISE EXCEPTION 'JOURNAL_IDENTITY_IMMUTABLE'; END IF;
 d := nevora_tenancy._journal_validate_description(NEW.description_canonical);
 IF NEW.plan_digest <> d->'boundary'->>'planDigest' OR NEW.boundary <> d->'boundary' OR NEW.chunk_count <> pg_catalog.jsonb_array_length(d->'chunks')
 THEN RAISE EXCEPTION 'JOURNAL_PLAN_IDENTITY_DRIFT'; END IF;
 RETURN NEW;
END $plan_identity$;

CREATE FUNCTION nevora_tenancy._journal_chunk_identity()
RETURNS pg_catalog.trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $chunk_identity$
DECLARE d pg_catalog.jsonb; expected pg_catalog.jsonb;
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'JOURNAL_IDENTITY_IMMUTABLE'; END IF;
 IF TG_OP = 'UPDATE' THEN
  IF (pg_catalog.to_jsonb(OLD)-'state') IS DISTINCT FROM (pg_catalog.to_jsonb(NEW)-'state') THEN RAISE EXCEPTION 'JOURNAL_IDENTITY_IMMUTABLE'; END IF;
  IF NEW.state NOT IN ('NOT_STARTED','STARTED','UNKNOWN') THEN RAISE EXCEPTION 'JOURNAL_COMPLETION_BLOCKED'; END IF;
  IF NOT (NEW.state = OLD.state OR (OLD.state = 'NOT_STARTED' AND NEW.state IN ('STARTED','UNKNOWN')) OR (OLD.state = 'STARTED' AND NEW.state = 'UNKNOWN'))
  THEN RAISE EXCEPTION 'JOURNAL_UNKNOWN_REQUIRES_RECHECK'; END IF;
 ELSE
  IF NEW.state <> 'NOT_STARTED' THEN RAISE EXCEPTION 'JOURNAL_INITIAL_STATE_REQUIRED'; END IF;
 END IF;
 SELECT p.description_canonical::pg_catalog.jsonb INTO d FROM nevora_tenancy.backfill_journal_plan AS p WHERE p.plan_digest = NEW.plan_digest;
 IF d IS NULL THEN RAISE EXCEPTION 'JOURNAL_ORIGINAL_PLAN_REQUIRED'; END IF;
 SELECT a.value INTO expected FROM pg_catalog.jsonb_array_elements(d->'chunks') AS a WHERE a.value->>'id' = NEW.chunk_id;
 IF expected IS NULL OR NEW.ordinal <> (expected->>'ordinal')::pg_catalog.int4 OR
    NEW.chunk_canonical <> nevora_tenancy._journal_canonical_json(expected::pg_catalog.json) OR
    NEW.retry_key <> nevora_tenancy._journal_retry_key(NEW.plan_digest,NEW.chunk_id)
 THEN RAISE EXCEPTION 'JOURNAL_CHUNK_IDENTITY_DRIFT'; END IF;
 RETURN NEW;
END $chunk_identity$;

CREATE FUNCTION nevora_tenancy._journal_assert_coverage(requested_plan pg_catalog.text)
RETURNS pg_catalog.void LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $coverage$
DECLARE p nevora_tenancy.backfill_journal_plan%ROWTYPE; c record; stored nevora_tenancy.backfill_journal_chunk%ROWTYPE;
BEGIN
 SELECT * INTO p FROM nevora_tenancy.backfill_journal_plan AS j WHERE j.plan_digest = requested_plan FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'JOURNAL_ORIGINAL_PLAN_REQUIRED'; END IF;
 IF (SELECT pg_catalog.count(*) FROM nevora_tenancy.backfill_journal_chunk AS j WHERE j.plan_digest = requested_plan) <> p.chunk_count THEN RAISE EXCEPTION 'JOURNAL_COVERAGE_DRIFT'; END IF;
 FOR c IN SELECT a.value FROM pg_catalog.jsonb_array_elements(p.description_canonical::pg_catalog.jsonb->'chunks') AS a LOOP
  SELECT * INTO stored FROM nevora_tenancy.backfill_journal_chunk AS j WHERE j.plan_digest = requested_plan AND j.chunk_id = c.value->>'id';
  IF NOT FOUND OR stored.ordinal <> (c.value->>'ordinal')::pg_catalog.int4 OR
     stored.chunk_canonical <> nevora_tenancy._journal_canonical_json(c.value::pg_catalog.json) OR
     stored.retry_key <> nevora_tenancy._journal_retry_key(requested_plan,stored.chunk_id) OR stored.state NOT IN ('NOT_STARTED','STARTED','UNKNOWN')
  THEN RAISE EXCEPTION 'JOURNAL_COVERAGE_DRIFT'; END IF;
 END LOOP;
END $coverage$;

CREATE FUNCTION nevora_tenancy._journal_coverage_trigger()
RETURNS pg_catalog.trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $coverage_trigger$
BEGIN
 PERFORM nevora_tenancy._journal_assert_coverage(CASE WHEN TG_OP = 'DELETE' THEN OLD.plan_digest ELSE NEW.plan_digest END);
 RETURN NULL;
END $coverage_trigger$;
CREATE FUNCTION nevora_tenancy._journal_no_truncate()
RETURNS pg_catalog.trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $no_truncate$
BEGIN RAISE EXCEPTION 'JOURNAL_IDENTITY_IMMUTABLE'; END $no_truncate$;
CREATE TRIGGER journal_plan_identity BEFORE INSERT OR UPDATE OR DELETE ON nevora_tenancy.backfill_journal_plan FOR EACH ROW EXECUTE FUNCTION nevora_tenancy._journal_plan_identity();
CREATE TRIGGER journal_chunk_identity BEFORE INSERT OR UPDATE OR DELETE ON nevora_tenancy.backfill_journal_chunk FOR EACH ROW EXECUTE FUNCTION nevora_tenancy._journal_chunk_identity();
CREATE CONSTRAINT TRIGGER journal_plan_coverage AFTER INSERT OR UPDATE OR DELETE ON nevora_tenancy.backfill_journal_plan DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nevora_tenancy._journal_coverage_trigger();
CREATE CONSTRAINT TRIGGER journal_chunk_coverage AFTER INSERT OR UPDATE OR DELETE ON nevora_tenancy.backfill_journal_chunk DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nevora_tenancy._journal_coverage_trigger();
CREATE TRIGGER journal_plan_no_truncate BEFORE TRUNCATE ON nevora_tenancy.backfill_journal_plan FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy._journal_no_truncate();
CREATE TRIGGER journal_chunk_no_truncate BEFORE TRUNCATE ON nevora_tenancy.backfill_journal_chunk FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy._journal_no_truncate();

CREATE FUNCTION nevora_tenancy.read_backfill_journal(requested_description pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $read$
DECLARE d pg_catalog.jsonb; p nevora_tenancy.backfill_journal_plan%ROWTYPE; rows pg_catalog.jsonb;
BEGIN
 d := nevora_tenancy._journal_validate_description(requested_description);
 SELECT * INTO p FROM nevora_tenancy.backfill_journal_plan AS j WHERE j.plan_digest = d->'boundary'->>'planDigest' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'JOURNAL_ORIGINAL_PLAN_REQUIRED'; END IF;
 IF p.description_canonical <> requested_description COLLATE pg_catalog."C" THEN RAISE EXCEPTION 'JOURNAL_CHANGED_ORIGINAL_RETRY'; END IF;
 PERFORM nevora_tenancy._journal_assert_coverage(p.plan_digest);
 SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('chunk',j.chunk_canonical::pg_catalog.jsonb,'state',j.state,'retryKey',j.retry_key) ORDER BY j.ordinal) INTO rows
 FROM nevora_tenancy.backfill_journal_chunk AS j WHERE j.plan_digest = p.plan_digest;
 RETURN pg_catalog.jsonb_build_object('boundary',p.boundary,'rows',COALESCE(rows,'[]'::pg_catalog.jsonb),'reconciliation',NULL);
END $read$;

CREATE FUNCTION nevora_tenancy.register_backfill_journal(requested_description pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $register$
DECLARE d pg_catalog.jsonb; p nevora_tenancy.backfill_journal_plan%ROWTYPE; c record; inserted pg_catalog.int4;
BEGIN
 d := nevora_tenancy._journal_validate_description(requested_description);
 INSERT INTO nevora_tenancy.backfill_journal_plan(plan_digest,description_canonical,boundary,chunk_count)
 VALUES(d->'boundary'->>'planDigest',requested_description,d->'boundary',pg_catalog.jsonb_array_length(d->'chunks')) ON CONFLICT(plan_digest) DO NOTHING;
 GET DIAGNOSTICS inserted = ROW_COUNT;
 SELECT * INTO p FROM nevora_tenancy.backfill_journal_plan AS j WHERE j.plan_digest = d->'boundary'->>'planDigest' FOR UPDATE;
 IF p.description_canonical <> requested_description COLLATE pg_catalog."C" THEN RAISE EXCEPTION 'JOURNAL_CHANGED_ORIGINAL_RETRY'; END IF;
 IF inserted = 1 THEN
  FOR c IN SELECT a.value FROM pg_catalog.jsonb_array_elements(d->'chunks') AS a LOOP
   INSERT INTO nevora_tenancy.backfill_journal_chunk(plan_digest,chunk_id,ordinal,chunk_canonical,retry_key,state)
   VALUES(p.plan_digest,c.value->>'id',(c.value->>'ordinal')::pg_catalog.int4,nevora_tenancy._journal_canonical_json(c.value::pg_catalog.json),nevora_tenancy._journal_retry_key(p.plan_digest,c.value->>'id'),'NOT_STARTED');
  END LOOP;
 END IF;
 PERFORM nevora_tenancy._journal_assert_coverage(p.plan_digest);
 RETURN nevora_tenancy.read_backfill_journal(requested_description);
END $register$;

CREATE FUNCTION nevora_tenancy.observe_backfill_journal(requested_description pg_catalog.text, requested_chunk pg_catalog.text, requested_retry pg_catalog.text, requested_state pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog AS $observe$
DECLARE d pg_catalog.jsonb; p nevora_tenancy.backfill_journal_plan%ROWTYPE; c nevora_tenancy.backfill_journal_chunk%ROWTYPE;
BEGIN
 IF requested_state IS NULL OR requested_state NOT IN ('NOT_STARTED','STARTED','UNKNOWN') THEN RAISE EXCEPTION 'JOURNAL_COMPLETION_BLOCKED'; END IF;
 d := nevora_tenancy._journal_validate_description(requested_description);
 SELECT * INTO p FROM nevora_tenancy.backfill_journal_plan AS j WHERE j.plan_digest = d->'boundary'->>'planDigest' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'JOURNAL_ORIGINAL_PLAN_REQUIRED'; END IF;
 IF p.description_canonical <> requested_description COLLATE pg_catalog."C" THEN RAISE EXCEPTION 'JOURNAL_CHANGED_ORIGINAL_RETRY'; END IF;
 PERFORM nevora_tenancy._journal_assert_coverage(p.plan_digest);
 SELECT * INTO c FROM nevora_tenancy.backfill_journal_chunk AS j WHERE j.plan_digest = p.plan_digest AND j.chunk_id = requested_chunk FOR UPDATE;
 IF NOT FOUND OR requested_retry IS NULL OR requested_retry <> c.retry_key THEN RAISE EXCEPTION 'JOURNAL_RETRY_DRIFT'; END IF;
 UPDATE nevora_tenancy.backfill_journal_chunk AS j SET state = requested_state WHERE j.plan_digest = p.plan_digest AND j.chunk_id = c.chunk_id;
 RETURN nevora_tenancy.read_backfill_journal(requested_description);
END $observe$;

REVOKE ALL ON TABLE nevora_tenancy.backfill_journal_plan,nevora_tenancy.backfill_journal_chunk FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy._journal_canonical_json(pg_catalog.json),nevora_tenancy._journal_fields(pg_catalog.jsonb,pg_catalog.text[]),nevora_tenancy._journal_validate_description(pg_catalog.text),nevora_tenancy._journal_retry_key(pg_catalog.text,pg_catalog.text),nevora_tenancy._journal_plan_identity(),nevora_tenancy._journal_chunk_identity(),nevora_tenancy._journal_assert_coverage(pg_catalog.text),nevora_tenancy._journal_coverage_trigger(),nevora_tenancy._journal_no_truncate(),nevora_tenancy.read_backfill_journal(pg_catalog.text),nevora_tenancy.register_backfill_journal(pg_catalog.text),nevora_tenancy.observe_backfill_journal(pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text) FROM PUBLIC;
