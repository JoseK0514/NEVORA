-- Guarded validation follows a completed owned backfill. It grants no runtime
-- authority, releases no write fence, and performs no source-data rewrite.
-- Migration/operator/source custody and complete manifest reconciliation must
-- be verified by the privileged caller; a stored SHA is never authorization.
BEGIN;
SET LOCAL search_path=pg_catalog,public;
SET LOCAL lock_timeout='5000ms';

DO $validate_ownership$
DECLARE
 state nevora_tenancy.expansion_protocol%ROWTYPE;
 rule record; spec record; original record;
 lock_table name; column_names name[]; target_names name[];
 source_list text; target_list text; constraint_name name;
 action_update text; action_delete text; defer_clause text;
 missing boolean;
BEGIN
 IF current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 189999 OR
    current_setting('session_replication_role')<>'origin' THEN
  RAISE EXCEPTION 'f10_validate_database_context' USING ERRCODE='55000';
 END IF;
 -- Source table locks precede the protocol lock, matching the legacy trigger
 -- order and preventing a table/protocol lock cycle with an existing writer.
 FOREACH lock_table IN ARRAY ARRAY['availability_exceptions','availability_windows','break_entries','calendar_clock','calendar_operations','calendar_removals','calendar_subscriptions','clocker_break_type_events','clocker_break_types','clocker_command_ledger','clocker_device_credentials','clocker_device_events','clocker_devices','clocker_employee_clock_state','clocker_pin_configuration','clocker_pin_events','clocker_pin_events_tenant_ownership','clocker_pin_limits','clocker_pin_sessions','communication_lifecycle','communication_operations','communication_receipts','communication_recipients','communication_revisions','communications','coverage_window_position_requirements','employee_attention_operations','employee_attention_receipts','employee_clocker_pins','employee_credentials','employee_location_eligibility','employee_positions','employee_scheduling_settings','employee_sessions','employees','location_coverage_windows','location_staffing_settings','locations','notifications','password_recovery_limits','password_recovery_proofs','payroll_export_profile_revisions','payroll_export_receipts','positions','push_deliveries','push_subscriptions','schedule_acknowledgements','schedule_generation_exclusions','schedule_publication_revision_shifts','schedule_publication_revision_shifts_tenant_ownership','schedule_publication_revisions','schedule_template_shifts','schedule_templates','schedule_week_settings','schedules','shift_callouts','shift_change_events','shift_change_operations','shift_change_participation','shift_exchanges','shifts','time_correction_adjustments','time_correction_events','time_correction_requests','time_entries','time_off_requests','timecard_revisions','weekly_availability_submissions','weekly_availability_windows','workspaces']::name[]
 LOOP
  EXECUTE format('LOCK TABLE public.%I IN ACCESS EXCLUSIVE MODE',lock_table);
 END LOOP;
 LOCK TABLE nevora_tenancy.source_migration_contract, nevora_tenancy.owned_table_contract, nevora_tenancy.composite_fk_specification IN SHARE MODE;
 SELECT * INTO state FROM nevora_tenancy.expansion_protocol WHERE migration_id=26 FOR UPDATE;
 IF NOT FOUND OR state.phase<>'FENCED' OR state.fence_generation<=0 OR state.backfill_actor IS NOT NULL OR
    state.capture_manifest_sha256 IS NULL OR
    state.schema_source_commit<>'7c628e374f03c9025b2c0cfd3568be033f07238d' OR
    state.registry_sha256<>'5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681' OR
    (SELECT count(*) FROM nevora_tenancy.owned_table_contract)<>68 OR
    (SELECT count(*) FROM nevora_tenancy.composite_fk_specification)<>89 THEN
  RAISE EXCEPTION 'f10_validate_complete_fenced_manifest_required' USING ERRCODE='55000';
 END IF;

 -- Exact source-generated expanded catalog/metadata fingerprints below bind
 -- observations only. Privileged caller custody and manifest reconciliation
 -- remain required. Rendering is exactly search_path=pg_catalog,public.
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT * FROM nevora_tenancy.source_migration_contract ORDER BY path) actual) IS DISTINCT FROM '5bd6f94ec5c3996095441646db93b3bc3763d96e9e781a9952dbebf5e2ef004e' THEN
  RAISE EXCEPTION 'f10_validate_source_contract_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT * FROM nevora_tenancy.owned_table_contract ORDER BY table_name) actual) IS DISTINCT FROM 'eadb498cf92925d611a15d8c3c48138ece073c265df96b3adb2450ca008c19e4' THEN
  RAISE EXCEPTION 'f10_validate_source_contract_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT * FROM nevora_tenancy.composite_fk_specification ORDER BY source_table,original_constraint) actual) IS DISTINCT FROM '7b98493d7763d5b198e1eedd9b73faad67b260f30d9e21e1c5f3f1e2c69c365d' THEN
  RAISE EXCEPTION 'f10_validate_reference_scope_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,a.attname name,a.attnum ordinal,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,pg_get_expr(d.adbin,d.adrelid) default_value,a.attidentity identity,a.attgenerated generated,a.attcollation::text collation_oid FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind='r' AND c.relname NOT IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum) actual) IS DISTINCT FROM 'cb6ef175eba66516af16c46e7de6ef7fa1a1c9a14e5828ad175e30a41d60e81c' THEN
  RAISE EXCEPTION 'f10_validate_source_contract_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname name,c.relkind kind,c.relrowsecurity rls,c.relforcerowsecurity force_rls,c.relreplident replica_identity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN('r','p') AND c.relname NOT IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') ORDER BY c.relname) actual) IS DISTINCT FROM 'f250b999884c2ab19c654e118f52a01e673b0cbff1528dbd70c6c5df8cf0d974' THEN
  RAISE EXCEPTION 'f10_validate_source_contract_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,t.tgname name,t.tgenabled enabled,t.tgisinternal internal,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname NOT IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') AND NOT t.tgisinternal ORDER BY c.relname,t.tgname) actual) IS DISTINCT FROM '9e862ca13c25f724c4054d0bc8944976d5d4c4d4d26787d4204e48bb28a096ee' THEN
  RAISE EXCEPTION 'f10_validate_source_guard_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition,p.prosecdef security_definer,p.proconfig::text configuration FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' OR (n.nspname='nevora_tenancy' AND p.proname IN('source_write_fence','source_identity_guard')) ORDER BY n.nspname,p.proname,arguments) actual) IS DISTINCT FROM 'd5445e686630f9a70cd681392c1a5d313d3c03aa23c2bfc337af78e116df4d9a' THEN
  RAISE EXCEPTION 'f10_validate_source_guard_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,x.relname name,pg_get_indexdef(i.indexrelid) definition,i.indisunique unique,i.indisvalid valid,i.indisready ready,i.indislive live,i.indimmediate immediate,i.indnullsnotdistinct nulls_not_distinct,i.indcollation::text collations,i.indclass::text opclasses FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname NOT IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') ORDER BY c.relname,x.relname) actual) IS DISTINCT FROM '1c6b8e94507ece7c804d9f9a867562f35092dd85f199eec2a38dfde293da08ec' THEN
  RAISE EXCEPTION 'f10_validate_source_contract_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,p.conname name,p.contype type,pg_get_constraintdef(p.oid,true) definition,p.convalidated validated,p.condeferrable deferrable,p.condeferred deferred,CASE WHEN current_setting('server_version_num')::int>=180000 THEN (to_jsonb(p)->>'conenforced')::boolean ELSE true END enforced FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname NOT IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') AND p.contype NOT IN('f','n') ORDER BY c.relname,p.conname) actual) IS DISTINCT FROM '63fb7945808ffeadbd4db9fcddd03cf00b0bc59acb9a295007ebf88b7b91cda5' THEN
  RAISE EXCEPTION 'f10_validate_source_contract_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,p.conname name,p.contype type,pg_get_constraintdef(p.oid,true) definition,p.convalidated validated,p.condeferrable deferrable,p.condeferred deferred,CASE WHEN current_setting('server_version_num')::int>=180000 THEN (to_jsonb(p)->>'conenforced')::boolean ELSE true END enforced FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname NOT IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') AND p.contype='f' ORDER BY c.relname,p.conname) actual) IS DISTINCT FROM 'c3d1b19ad81e3a36dffdc0e8ed72a44ace4946ca618e0fb54d1294ec12b428bd' THEN
  RAISE EXCEPTION 'f10_validate_reference_source_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT viewname name,definition FROM pg_views WHERE schemaname='public' ORDER BY viewname) actual) IS DISTINCT FROM 'afd4a522ca8d044511c6c013eb789ee41e1c0f5a34bc63fddf147f13e8a8f637' THEN
  RAISE EXCEPTION 'f10_validate_source_contract_drift' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,a.attname name,a.attnum ordinal,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,pg_get_expr(d.adbin,d.adrelid) default_value FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relname IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum) actual) IS DISTINCT FROM 'c6c5445e18420b158d1c3dc7536206800fbde91f7a65a169104666358e10f007' THEN
  RAISE EXCEPTION 'f10_validate_sidecar_contract' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,t.tgname name,t.tgenabled enabled,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') AND NOT t.tgisinternal ORDER BY c.relname,t.tgname) actual) IS DISTINCT FROM '6bdb7b78fd3d354125ee7195beb4b92ff5324543a0830c0966608bddabbebd23' THEN
  RAISE EXCEPTION 'f10_validate_sidecar_contract' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,p.conname name,p.contype type,pg_get_constraintdef(p.oid,true) definition,p.convalidated validated,p.condeferrable deferrable,p.condeferred deferred,CASE WHEN current_setting('server_version_num')::int>=180000 THEN (to_jsonb(p)->>'conenforced')::boolean ELSE true END enforced FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN('clocker_pin_events_tenant_ownership','schedule_publication_revision_shifts_tenant_ownership') AND p.contype<>'n' ORDER BY c.relname,p.conname) actual) IS DISTINCT FROM '3c36bfa0c533acf65e31aebcd0b0eaa4e0d6a43332f93298ff741c00efaafd91' THEN
  RAISE EXCEPTION 'f10_validate_sidecar_contract' USING ERRCODE='55000';
 END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT p.proname name,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition,p.prosecdef security_definer,p.proconfig::text configuration FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='nevora_tenancy' AND p.proname IN('sidecar_immutable','historical_pair_guard') ORDER BY p.proname,arguments) actual) IS DISTINCT FROM '9db91b7d35637397e979f1a9cf4bf9d5825413b4b185b70e31af8e941e78d945' THEN
  RAISE EXCEPTION 'f10_validate_sidecar_contract' USING ERRCODE='55000';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
    LATERAL aclexplode(COALESCE(p.proacl,acldefault('f',p.proowner))) rights
    WHERE n.nspname='nevora_tenancy' AND rights.grantee=0 AND rights.privilege_type='EXECUTE') THEN
  RAISE EXCEPTION 'f10_validate_source_guard_drift' USING ERRCODE='55000';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_constraint k ON k.conrelid=c.oid AND k.contype='n' AND k.conkey=ARRAY[a.attnum]::smallint[]
    WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull
    AND current_setting('server_version_num')::integer>=180000 AND
    (k.convalidated IS NOT TRUE OR (to_jsonb(k)->>'conenforced')::boolean IS NOT TRUE OR k.condeferrable OR k.condeferred)) THEN
  RAISE EXCEPTION 'f10_validate_source_contract_drift' USING ERRCODE='55000';
 END IF;

 FOR rule IN SELECT * FROM nevora_tenancy.owned_table_contract ORDER BY table_name LOOP
  IF rule.storage='DIRECT_IMMUTABLE' AND rule.anchor->>'kind'<>'ROOT' THEN
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE workspace_id IS NULL)',rule.table_name) INTO missing;
   IF missing THEN RAISE EXCEPTION 'f10_validate_missing_direct_owner' USING ERRCODE='55000'; END IF;
  ELSIF rule.storage='TYPED_HISTORICAL_SIDECAR' THEN
   -- The two typed sidecars use the exact original id. Their original deferred
   -- FK/mirror triggers remain enabled; deleted historical literals are not
   -- turned into references to current employees, locations or shifts.
   IF rule.sidecar_name IS NULL OR rule.primary_key_columns<>ARRAY['id']::name[] THEN
    RAISE EXCEPTION 'f10_validate_sidecar_contract' USING ERRCODE='55000';
   END IF;
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I s LEFT JOIN public.%I o ON o.id=s.id WHERE o.id IS NULL)',rule.table_name,rule.sidecar_name) INTO missing;
   IF missing THEN RAISE EXCEPTION 'f10_validate_missing_historical_owner' USING ERRCODE='55000'; END IF;
   EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I s JOIN public.%I o ON o.id=s.id WHERE o.capture_manifest_sha256 IS DISTINCT FROM $1 OR EXISTS(SELECT 1 FROM unnest($2::name[]) col WHERE to_jsonb(o)->col::text IS DISTINCT FROM to_jsonb(s)->col::text))',rule.table_name,rule.sidecar_name)
    INTO missing USING state.capture_manifest_sha256,rule.mirror_columns;
   IF missing THEN RAISE EXCEPTION 'f10_validate_sidecar_contract' USING ERRCODE='55000'; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=format('public.%I',rule.table_name)::regclass AND
    tgname IN('f10_write_fence','f10_identity_guard') AND tgenabled<>'O') OR
    (SELECT count(*) FROM pg_trigger WHERE tgrelid=format('public.%I',rule.table_name)::regclass AND
      tgname IN('f10_write_fence','f10_identity_guard'))<>2 THEN
   RAISE EXCEPTION 'f10_validate_source_guard_drift' USING ERRCODE='55000';
  END IF;
 END LOOP;

 -- Prove that every specification extends its actual original FK. The old
 -- constraint, key, action and deferral stay in place, including original
 -- namespace/global guards; no unchecked SQL definition is executed.
 FOR spec IN SELECT * FROM nevora_tenancy.composite_fk_specification ORDER BY source_table,original_constraint LOOP
  SELECT c.* INTO original FROM pg_constraint c
    WHERE c.conrelid=format('public.%I',spec.source_table)::regclass AND c.conname=spec.original_constraint;
  IF original.oid IS NULL OR original.contype<>'f' OR original.convalidated IS NOT TRUE OR
     original.confrelid<>format('public.%I',spec.target_table)::regclass OR original.confmatchtype<>'s' OR
     pg_get_constraintdef(original.oid,true)<>spec.original_definition OR
     (current_setting('server_version_num')::integer>=180000 AND (to_jsonb(original)->>'conenforced')::boolean IS NOT TRUE) THEN
   RAISE EXCEPTION 'f10_validate_reference_source_drift' USING ERRCODE='55000';
  END IF;
  SELECT ARRAY['workspace_id']::name[] || COALESCE(array_agg(a.attname ORDER BY k.ordinality)
     FILTER(WHERE a.attname<>'workspace_id'),'{}'::name[]) INTO column_names
   FROM unnest(original.conkey) WITH ORDINALITY k(num,ordinality)
   JOIN pg_attribute a ON a.attrelid=original.conrelid AND a.attnum=k.num;
  SELECT ARRAY['workspace_id']::name[] || COALESCE(array_agg(a.attname ORDER BY k.ordinality)
     FILTER(WHERE a.attname<>'workspace_id'),'{}'::name[]) INTO target_names
   FROM unnest(original.confkey) WITH ORDINALITY k(num,ordinality)
   JOIN pg_attribute a ON a.attrelid=original.confrelid AND a.attnum=k.num;
  IF column_names<>spec.source_columns OR target_names<>spec.target_columns OR
     cardinality(column_names)<>cardinality(target_names) THEN
   RAISE EXCEPTION 'f10_validate_reference_scope_drift' USING ERRCODE='55000';
  END IF;
  SELECT string_agg(format('%I',col),',' ORDER BY ord) INTO source_list FROM unnest(column_names) WITH ORDINALITY x(col,ord);
  SELECT string_agg(format('%I',col),',' ORDER BY ord) INTO target_list FROM unnest(target_names) WITH ORDINALITY x(col,ord);
  action_update:=CASE original.confupdtype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' ELSE NULL END;
  action_delete:=CASE original.confdeltype WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT' WHEN 'c' THEN 'CASCADE' ELSE NULL END;
  -- SET NULL/DEFAULT would affect the added immutable owner column, so such a
  -- future source requires a separately reviewed scoped reference contract.
  IF action_update IS NULL OR action_delete IS NULL THEN
   RAISE EXCEPTION 'f10_validate_reference_action_unsupported' USING ERRCODE='55000';
  END IF;
  defer_clause:=CASE WHEN original.condeferrable THEN
   CASE WHEN original.condeferred THEN ' DEFERRABLE INITIALLY DEFERRED' ELSE ' DEFERRABLE INITIALLY IMMEDIATE' END ELSE ' NOT DEFERRABLE' END;
  constraint_name:=('f10_scoped_'||substr(md5(spec.source_table::text||'.'||spec.original_constraint::text),1,16))::name;
  EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY(%s) REFERENCES public.%I(%s) ON UPDATE %s ON DELETE %s%s NOT VALID',
   spec.source_table,constraint_name,source_list,spec.target_table,target_list,action_update,action_delete,defer_clause);
  EXECUTE format('ALTER TABLE public.%I VALIDATE CONSTRAINT %I',spec.source_table,constraint_name);
 END LOOP;
 FOR rule IN SELECT * FROM nevora_tenancy.owned_table_contract WHERE storage='DIRECT_IMMUTABLE' AND anchor->>'kind'<>'ROOT' ORDER BY table_name LOOP
  EXECUTE format('ALTER TABLE public.%I ALTER COLUMN workspace_id SET NOT NULL',rule.table_name);
 END LOOP;
END;
$validate_ownership$;

CREATE TABLE nevora_tenancy.ownership_validation (
 migration_id integer PRIMARY KEY CHECK(migration_id=27),
 source_commit text NOT NULL,
 registry_sha256 text NOT NULL,
 capture_manifest_sha256 text NOT NULL CHECK(capture_manifest_sha256 ~ '^[a-f0-9]{64}$'),
 fence_generation bigint NOT NULL CHECK(fence_generation>0),
 scoped_references integer NOT NULL CHECK(scoped_references=89),
 validated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
INSERT INTO nevora_tenancy.ownership_validation(migration_id,source_commit,registry_sha256,capture_manifest_sha256,fence_generation,scoped_references)
 SELECT 27,schema_source_commit,registry_sha256,capture_manifest_sha256,fence_generation,89
 FROM nevora_tenancy.expansion_protocol WHERE migration_id=26;
CREATE FUNCTION nevora_tenancy.validation_record_immutable() RETURNS trigger
 LANGUAGE plpgsql SET search_path=pg_catalog AS $immutable_validation$
 BEGIN RAISE EXCEPTION 'f10_validation_record_immutable' USING ERRCODE='23514'; END;
$immutable_validation$;
CREATE TRIGGER f10_validation_record_immutable BEFORE UPDATE OR DELETE ON nevora_tenancy.ownership_validation
 FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.validation_record_immutable();
REVOKE ALL ON nevora_tenancy.ownership_validation FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.validation_record_immutable() FROM PUBLIC;
COMMIT;
