-- F10 expand only. Original 0001-0025 content and global fences remain.
-- Fingerprints include source-operative trigger/RLS/constraint flags, never
-- OIDs, installed owner or session state. PG18 pg_get_* rendering is captured
-- locally; PG17/Neon rendering compatibility requires actual verification.
-- Local catalog bound to the source SHA list below; no legacy owner is assigned.
-- This prepares identity keys and FK specifications. Composite FK enforcement,
-- full capture/comparator validation, RLS, runtime grants and cutover are later gates.
BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public."availability_exceptions",public."availability_windows",public."break_entries",public."calendar_clock",public."calendar_operations",public."calendar_removals",public."calendar_subscriptions",public."clocker_break_type_events",public."clocker_break_types",public."clocker_command_ledger",public."clocker_device_credentials",public."clocker_device_events",public."clocker_devices",public."clocker_employee_clock_state",public."clocker_pin_configuration",public."clocker_pin_events",public."clocker_pin_limits",public."clocker_pin_sessions",public."communication_lifecycle",public."communication_operations",public."communication_receipts",public."communication_recipients",public."communication_revisions",public."communications",public."coverage_window_position_requirements",public."employee_attention_operations",public."employee_attention_receipts",public."employee_clocker_pins",public."employee_credentials",public."employee_location_eligibility",public."employee_positions",public."employee_scheduling_settings",public."employee_sessions",public."employees",public."location_coverage_windows",public."location_staffing_settings",public."locations",public."notifications",public."password_recovery_limits",public."password_recovery_proofs",public."payroll_export_profile_revisions",public."payroll_export_receipts",public."positions",public."push_deliveries",public."push_subscriptions",public."schedule_acknowledgements",public."schedule_generation_exclusions",public."schedule_publication_revision_shifts",public."schedule_publication_revisions",public."schedule_template_shifts",public."schedule_templates",public."schedule_week_settings",public."schedules",public."shift_callouts",public."shift_change_events",public."shift_change_operations",public."shift_change_participation",public."shift_exchanges",public."shifts",public."time_correction_adjustments",public."time_correction_events",public."time_correction_requests",public."time_entries",public."time_off_requests",public."timecard_revisions",public."weekly_availability_submissions",public."weekly_availability_windows",public."workspaces" IN ACCESS EXCLUSIVE MODE;
-- PG17 represents relation NOT NULL in pg_attribute; PG18 also has contype=n.
-- The common constraint hash excludes that version-specific representation,
-- adds actual PG18 conenforced (PG17 is necessarily enforced), and separately
-- checks column-keyed NOT NULL validation/enforcement/deferral plus attnotnull.
-- Unknown field-absent catalog versions fail closed. Other pg_get_* renderings
-- still require actual PG17/Neon evidence; this is not a compatibility claim.
DO $catalog_guard$
BEGIN
 IF to_regnamespace('nevora_tenancy') IS NOT NULL THEN RAISE EXCEPTION 'f10_expand_already_or_conflicting_namespace' USING ERRCODE='55000'; END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname) actual) IS DISTINCT FROM 'dd84b22be5f35d9b967cb0beace44e29dde4489344be23e8f2e591cb37698791' THEN RAISE EXCEPTION 'f10_expand_source_catalog_drift:tables' USING ERRCODE='55000'; END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,pg_get_expr(d.adbin,d.adrelid) default_value,a.attnum ordinal FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum) actual) IS DISTINCT FROM '4c2d90a08460d587ff6d2915382761dcffa89489c5488790e3410102578fc134' THEN RAISE EXCEPTION 'f10_expand_source_catalog_drift:columns' USING ERRCODE='55000'; END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,p.conname name,p.contype type,pg_get_constraintdef(p.oid,true) definition,p.convalidated validated,p.condeferrable deferrable,p.condeferred deferred,CASE WHEN current_setting('server_version_num')::int>=180000 THEN (to_jsonb(p)->>'conenforced')::boolean WHEN current_setting('server_version_num')::int BETWEEN 170000 AND 179999 THEN true ELSE NULL END enforced FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND p.contype<>'n' ORDER BY c.relname,p.conname) actual) IS DISTINCT FROM 'fc85dcd38d48c843bc938c34aa12ccc6ce9c887f4f72c229985206ff703cda03' THEN RAISE EXCEPTION 'f10_expand_source_catalog_drift:constraints' USING ERRCODE='55000'; END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname) actual) IS DISTINCT FROM '3fe03ab27e5a76500b81f32a75a928c72201d88acee80dd66a5a1910efe03cbb' THEN RAISE EXCEPTION 'f10_expand_source_catalog_drift:indexes' USING ERRCODE='55000'; END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,t.tgname name,t.tgenabled enabled,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal ORDER BY c.relname,t.tgname) actual) IS DISTINCT FROM '087036471e09f5aa2db7d81537ae282fc56db90b576dbb80f89f3916e6d47fcc' THEN RAISE EXCEPTION 'f10_expand_source_catalog_drift:triggers' USING ERRCODE='55000'; END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT p.proname name,pg_get_function_identity_arguments(p.oid) arguments,encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex') definition_sha256 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY p.proname,arguments) actual) IS DISTINCT FROM '289f3bc6a75afcc77ef42971d0a5c33db1d27a017b39d7f36eec249c56976625' THEN RAISE EXCEPTION 'f10_expand_source_catalog_drift:functions' USING ERRCODE='55000'; END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT viewname,encode(sha256(convert_to(definition,'UTF8')),'hex') definition_sha256 FROM pg_views WHERE schemaname='public' ORDER BY viewname) actual) IS DISTINCT FROM 'd173a2dd1dc506e37c2954cf5d0904f2ac0aca87b903ce135caa8bc5ad38588b' THEN RAISE EXCEPTION 'f10_expand_source_catalog_drift:views' USING ERRCODE='55000'; END IF;
 IF (SELECT encode(sha256(convert_to(COALESCE(jsonb_agg(to_jsonb(actual)),'[]'::jsonb)::text,'UTF8')),'hex') FROM (SELECT c.relname table_name,a.attname column_name,CASE WHEN current_setting('server_version_num')::int>=180000 THEN p.convalidated WHEN current_setting('server_version_num')::int BETWEEN 170000 AND 179999 THEN true ELSE NULL END validated,CASE WHEN current_setting('server_version_num')::int>=180000 THEN (to_jsonb(p)->>'conenforced')::boolean WHEN current_setting('server_version_num')::int BETWEEN 170000 AND 179999 THEN true ELSE NULL END enforced,CASE WHEN current_setting('server_version_num')::int>=180000 THEN p.condeferrable WHEN current_setting('server_version_num')::int BETWEEN 170000 AND 179999 THEN false ELSE NULL END deferrable,CASE WHEN current_setting('server_version_num')::int>=180000 THEN p.condeferred WHEN current_setting('server_version_num')::int BETWEEN 170000 AND 179999 THEN false ELSE NULL END deferred FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_constraint p ON p.conrelid=c.oid AND p.contype='n' AND p.conkey=ARRAY[a.attnum]::smallint[] WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull ORDER BY c.relname,a.attnum) actual) IS DISTINCT FROM '4f4a44d774407235d8c11878c03ea34f783076b11f29426bc9dd3253d49491ad' THEN RAISE EXCEPTION 'f10_expand_source_catalog_drift:not_null_state' USING ERRCODE='55000'; END IF;
END;
$catalog_guard$;
CREATE SCHEMA nevora_tenancy;
REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;

-- This row never asserts a complete/validated capture. FENCED must be selected
-- by the later privileged operator. Its row lock is the serialization boundary:
-- every original-table write holds FOR SHARE until its transaction ends.
CREATE TABLE nevora_tenancy.expansion_protocol (
 migration_id integer PRIMARY KEY CHECK(migration_id=26),
 phase text NOT NULL CHECK(phase IN('EXPANDED_LEGACY','FENCED')),
 fence_generation bigint NOT NULL DEFAULT 0 CHECK(fence_generation>=0),
 backfill_actor name,
 capture_manifest_sha256 text CHECK(capture_manifest_sha256 ~ '^[a-f0-9]{64}$'),
 schema_source_commit text NOT NULL CHECK(schema_source_commit ~ '^[a-f0-9]{40}$'),
 registry_sha256 text NOT NULL CHECK(registry_sha256 ~ '^[a-f0-9]{64}$'),
 CHECK(phase<>'EXPANDED_LEGACY' OR (backfill_actor IS NULL AND capture_manifest_sha256 IS NULL)),
 CHECK(backfill_actor IS NULL OR (phase='FENCED' AND capture_manifest_sha256 IS NOT NULL))
);
INSERT INTO nevora_tenancy.expansion_protocol(migration_id,phase,schema_source_commit,registry_sha256) VALUES(26,'EXPANDED_LEGACY','7c628e374f03c9025b2c0cfd3568be033f07238d','5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681');
CREATE TABLE nevora_tenancy.source_migration_contract (
 path text PRIMARY KEY,
 source_sha256 text NOT NULL CHECK(source_sha256 ~ '^[a-f0-9]{64}$')
);
INSERT INTO nevora_tenancy.source_migration_contract VALUES
('db/migrations/0001_initial.sql','330e125060422506f92403307224b739b73f5fc8697ed43039b22e56bcba61a1'),
('db/migrations/0002_schedule_health.sql','0dd019d1658c22763d11531ef72b39db9e5a106bb418b1a4fc63f5caaff7f9f0'),
('db/migrations/0003_schedule_assistance.sql','d82513ab58c0e8a84f976a05c2be0e342309467c586ded8347cce4ef9001900a'),
('db/migrations/0004_assistance_layer.sql','c0263d1e40bbfe3aa646a4740b0fe345728783eac39dfda916495ccf7a1ab7e5'),
('db/migrations/0005_time_clock.sql','fc4afbdf4770bd7a3a718cd54fd204bc8df1b96296c04cb676dab3f4f6d0c4e5'),
('db/migrations/0006_scheduling_rule_inputs.sql','4a0eb437395a5f4d1873c9b06b3c1104da5a23319e968d422a5a14f3c310483a'),
('db/migrations/0007_portal_web_push.sql','020c45cbeb1c5000be22b3ce240f94225fc0c88471e540a67246dd54085440d2'),
('db/migrations/0008_workspace_positions.sql','f517e18d468556c25814141a959427c969f620fa4ac6e98cc709b31ee1d88756'),
('db/migrations/0009_schedule_generation.sql','aadde6a1f5d3167ed4f346817d1feeb0c9f99f28d50adcf904a989b86120f007'),
('db/migrations/0010_shift_coverage_automation.sql','0d8b55abe49995204bda9e63492026158b91b8dc4ca414d05c77b595a6474d8e'),
('db/migrations/0011_clocker_devices.sql','788b748bbbd995c44f40d130ea079296aa3e6affcad86c78cbb3857e866c0cd0'),
('db/migrations/0012_clocker_pins.sql','9b607ca2e9e111953695ba5cf1a1dbc87f65ae483caeccc3d8056f19aab8c90f'),
('db/migrations/0013_clocker_punches.sql','f222d8b52e5cace6698f22b8d4a10fa5ffcd93db1d8c7d5cfd551a02b74216e5'),
('db/migrations/0014_clocker_breaks.sql','c20cd86b16fe2f82c05b69687402c52f37a648eb1d79c8f1418436ed8e4c5508'),
('db/migrations/0015_clocker_schedule_context.sql','5b5160bff760e17d4e235c35e4936271fba0b8124f5da8a8989e01478fff6796'),
('db/migrations/0016_time_corrections.sql','36532a3efc7c641a96b447f5caf2efbd3c4184cbfae2c6e080b548fa3fac4b35'),
('db/migrations/0017_missing_time_supersession.sql','2a35c4e3180c3294c7197af56415b231bf66a0b30417000e08de17d161ef8fea'),
('db/migrations/0018_timecards.sql','0221827d5faa0670a85661b6a15e59882382703a42bb9800576c30a1f66c1a81'),
('db/migrations/0019_payroll_export_mappings.sql','1610d1018824ec84ba9cdbe2f42f3ae36c12ba509a735ea10dce3ee21b594262'),
('db/migrations/0020_account_recovery.sql','26bc594863f1950588250be50a1ae66ba2191f90e8a908aea6a41a6ac76c61db'),
('db/migrations/0021_timecard_reassignment_interlock.sql','c5e9f1df923c67d4764427cca9f005fed93a4cb148c4a469866d15d4253b4918'),
('db/migrations/0022_timecard_reopen_revision_authority.sql','616dc741d8b48679b05958cfbd9dcf3ece018a356892034f2f1ad6a644ba584b'),
('db/migrations/0023_employee_attention_receipts.sql','2758fd0dd5567839537483bb49eba8f4e5618b67a9a77c1deccf0e550cefcef1'),
('db/migrations/0024_contextual_communications.sql','f130df4238379aa50347decbc863c51f37b108a9f5975b49ca8696b49fc08277'),
('db/migrations/0025_calendar_subscriptions.sql','357bce5c806af4f3f0d9ff8a5b48e09a90b1342e8168206efce4f949072d824b');
CREATE TABLE nevora_tenancy.owned_table_contract (
 table_name name PRIMARY KEY,
 storage text NOT NULL CHECK(storage IN('DIRECT_IMMUTABLE','IMMUTABLE_PARENT','TYPED_HISTORICAL_SIDECAR','GLOBAL_SECURITY_CONTROL')),
 anchor jsonb NOT NULL CHECK(jsonb_typeof(anchor)='object'),
 primary_key_columns name[] NOT NULL CHECK(cardinality(primary_key_columns)>0),
 sidecar_name name,
 mirror_columns name[] NOT NULL,
 original_columns name[] NOT NULL,
 source_path text NOT NULL,
 source_line integer NOT NULL CHECK(source_line>0)
);
INSERT INTO nevora_tenancy.owned_table_contract VALUES
('availability_exceptions','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id']::name[],ARRAY['id','employee_id','date','kind','start_time','end_time','note']::name[],'db/migrations/0001_initial.sql',72),
('availability_windows','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id']::name[],ARRAY['id','employee_id','day_of_week','start_time','end_time']::name[],'db/migrations/0001_initial.sql',60),
('break_entries','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["time_entry_id"],"target":"time_entries","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['break_type_id','id','time_entry_id']::name[],ARRAY['id','time_entry_id','break_start_at','break_end_at','version','break_type_id','break_type_snapshot']::name[],'db/migrations/0005_time_clock.sql',35),
('calendar_clock','DIRECT_IMMUTABLE','{"kind":"INSTALLATION_PROVENANCE"}'::jsonb,ARRAY['singleton']::name[],NULL,ARRAY['singleton']::name[],ARRAY['singleton','serial','modified_at']::name[],'db/migrations/0025_calendar_subscriptions.sql',5),
('calendar_operations','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id','actor_employee_id','operation_id']::name[],NULL,ARRAY['actor_employee_id','operation_id','workspace_id']::name[],ARRAY['workspace_id','actor_employee_id','operation_id','authority','payload_hash','result','created_at']::name[],'db/migrations/0025_calendar_subscriptions.sql',47),
('calendar_removals','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id','employee_id','source_shift_id','removal_revision_id']::name[],NULL,ARRAY['employee_id','previous_publication_shift_id','removal_revision_id','source_shift_id','workspace_id']::name[],ARRAY['workspace_id','employee_id','source_shift_id','previous_publication_shift_id','removal_revision_id','calendar_serial','removed_at']::name[],'db/migrations/0025_calendar_subscriptions.sql',85),
('calendar_subscriptions','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id','workspace_id']::name[],ARRAY['id','workspace_id','employee_id','digest','generation','allowed_location_ids','issued_at','revoked_at','revocation_reason']::name[],'db/migrations/0025_calendar_subscriptions.sql',38),
('clocker_break_type_events','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["break_type_id"],"target":"clocker_break_types","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['actor_employee_id','break_type_id','id']::name[],ARRAY['id','break_type_id','version','actor_employee_id','settings','occurred_at']::name[],'db/migrations/0014_clocker_breaks.sql',17),
('clocker_break_types','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['created_by','id','updated_by','workspace_id']::name[],ARRAY['id','workspace_id','name','category','target_minutes','active','version','created_by','updated_by','created_at','updated_at']::name[],'db/migrations/0014_clocker_breaks.sql',3),
('clocker_command_ledger','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["device_id"],"target":"clocker_devices","targetColumns":["id"]}'::jsonb,ARRAY['device_id','command_id']::name[],NULL,ARRAY['command_id','device_id','employee_id','time_entry_id']::name[],ARRAY['device_id','command_id','employee_id','credential_version','request_hash','action','time_entry_id','performed_at','result']::name[],'db/migrations/0013_clocker_punches.sql',9),
('clocker_device_credentials','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["device_id"],"target":"clocker_devices","targetColumns":["id"]}'::jsonb,ARRAY['credential_hash']::name[],NULL,ARRAY['credential_hash','device_id']::name[],ARRAY['credential_hash','device_id','credential_version','issued_at']::name[],'db/migrations/0011_clocker_devices.sql',74),
('clocker_device_events','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["device_id"],"target":"clocker_devices","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['actor_employee_id','device_id','id']::name[],ARRAY['id','device_id','actor_employee_id','kind','device_version','occurred_at']::name[],'db/migrations/0011_clocker_devices.sql',51),
('clocker_devices','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["location_id"],"target":"locations","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['enrollment_owner_id','id','location_id']::name[],ARRAY['id','location_id','name','active','last_seen_at','credential_hash','credential_version','enrollment_hash','enrollment_expires_at','enrollment_owner_id','enrollment_session_hash','enrolled_at','revoked_at','version','created_at','updated_at']::name[],'db/migrations/0005_time_clock.sql',3),
('clocker_employee_clock_state','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['employee_id']::name[],NULL,ARRAY['employee_id']::name[],ARRAY['employee_id','revision']::name[],'db/migrations/0013_clocker_punches.sql',5),
('clocker_pin_configuration','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id']::name[],NULL,ARRAY['workspace_id']::name[],ARRAY['workspace_id','key_identity']::name[],'db/migrations/0012_clocker_pins.sql',3),
('clocker_pin_events','TYPED_HISTORICAL_SIDECAR','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],'clocker_pin_events_tenant_ownership',ARRAY['actor_employee_id','employee_id','id']::name[],ARRAY['id','employee_id','actor_employee_id','pin_version','occurred_at']::name[],'db/migrations/0012_clocker_pins.sql',17),
('clocker_pin_limits','DIRECT_IMMUTABLE','{"kind":"TYPED_SCOPE","discriminator":"scope","identifier":"scope_id"}'::jsonb,ARRAY['scope','scope_id']::name[],NULL,ARRAY['scope','scope_id']::name[],ARRAY['scope','scope_id','failures','failure_window','attempts','attempt_window','latest_attempt']::name[],'db/migrations/0012_clocker_pins.sql',28),
('clocker_pin_sessions','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["device_id"],"target":"clocker_devices","targetColumns":["id"]}'::jsonb,ARRAY['device_id']::name[],NULL,ARRAY['device_id','employee_id']::name[],ARRAY['device_id','employee_id','token_hash','pin_version','credential_version','employee_updated_at','expires_at','created_at']::name[],'db/migrations/0012_clocker_pins.sql',38),
('communication_lifecycle','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['actor_employee_id','communication_id','id','revision_id','workspace_id']::name[],ARRAY['id','workspace_id','communication_id','revision_id','actor_employee_id','kind','occurred_at']::name[],'db/migrations/0024_contextual_communications.sql',107),
('communication_operations','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id','actor_employee_id','operation_id']::name[],NULL,ARRAY['actor_employee_id','communication_id','operation_id','receipt_id','revision_id','workspace_id']::name[],ARRAY['workspace_id','actor_employee_id','operation_id','session_hash','payload_hash','kind','communication_id','revision_id','receipt_id','created_at']::name[],'db/migrations/0024_contextual_communications.sql',91),
('communication_receipts','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['communication_id','content_hash','employee_id','id','revision_id','workspace_id']::name[],ARRAY['id','workspace_id','communication_id','revision_id','employee_id','content_hash','acknowledged_at']::name[],'db/migrations/0024_contextual_communications.sql',79),
('communication_recipients','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id','communication_id','revision_id','employee_id']::name[],NULL,ARRAY['communication_id','content_hash','employee_id','location_id','revision_id','source_shift_id','workspace_id']::name[],ARRAY['workspace_id','communication_id','revision_id','employee_id','content_hash','location_id','grant_kind','source_shift_id','assignment_episode_id','terms_fingerprint','observed_at','provenance']::name[],'db/migrations/0024_contextual_communications.sql',59),
('communication_revisions','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['communication_id','created_by','id','location_id','source_shift_id','workspace_id']::name[],ARRAY['id','workspace_id','communication_id','version','created_by','type','scope_kind','location_id','business_date','source_shift_id','assignment_episode_id','terms_fingerprint','title','body','acknowledgement','expires_at','content_hash','audience_fingerprint','audience_observed_at','published_at','created_at']::name[],'db/migrations/0024_contextual_communications.sql',24),
('communications','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['author_employee_id','head_revision_id','id','workspace_id']::name[],ARRAY['id','workspace_id','author_employee_id','state','head_revision_id','created_at']::name[],'db/migrations/0024_contextual_communications.sql',9),
('coverage_window_position_requirements','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["coverage_window_id"],"target":"location_coverage_windows","targetColumns":["id"]}'::jsonb,ARRAY['coverage_window_id','position_id']::name[],NULL,ARRAY['coverage_window_id','position_id']::name[],ARRAY['coverage_window_id','position_id','quantity']::name[],'db/migrations/0008_workspace_positions.sql',48),
('employee_attention_operations','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id','employee_id','operation_id']::name[],NULL,ARRAY['employee_id','operation_id','workspace_id']::name[],ARRAY['workspace_id','employee_id','operation_id','command_hash','result','created_at']::name[],'db/migrations/0023_employee_attention_receipts.sql',13),
('employee_attention_receipts','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id','source_id','workspace_id']::name[],ARRAY['id','workspace_id','employee_id','source_kind','source_id','source_version','read_at']::name[],'db/migrations/0023_employee_attention_receipts.sql',3),
('employee_clocker_pins','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['employee_id']::name[],NULL,ARRAY['employee_id','updated_by','workspace_id']::name[],ARRAY['employee_id','workspace_id','lookup_hash','pin_hash','version','updated_by','updated_at']::name[],'db/migrations/0012_clocker_pins.sql',7),
('employee_credentials','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['employee_id']::name[],NULL,ARRAY['employee_id']::name[],ARRAY['employee_id','password_hash','must_change_password','password_updated_at']::name[],'db/migrations/0001_initial.sql',41),
('employee_location_eligibility','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['employee_id','location_id']::name[],NULL,ARRAY['employee_id','location_id']::name[],ARRAY['employee_id','location_id']::name[],'db/migrations/0001_initial.sql',35),
('employee_positions','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['employee_id','position_id']::name[],NULL,ARRAY['employee_id','position_id']::name[],ARRAY['employee_id','position_id']::name[],'db/migrations/0008_workspace_positions.sql',43),
('employee_scheduling_settings','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['employee_id']::name[],NULL,ARRAY['employee_id']::name[],ARRAY['employee_id','target_weekly_hours','updated_at','maximum_weekly_hours','operational_rule_profile']::name[],'db/migrations/0002_schedule_health.sql',18),
('employee_sessions','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['token_hash']::name[],NULL,ARRAY['employee_id','token_hash']::name[],ARRAY['token_hash','employee_id','expires_at','created_at']::name[],'db/migrations/0001_initial.sql',48),
('employees','DIRECT_IMMUTABLE','{"kind":"CAPTURED_IMMUTABLE"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id','primary_location_id']::name[],ARRAY['id','first_name','last_name','phone','email','role','primary_location_id','active','created_at','updated_at']::name[],'db/migrations/0001_initial.sql',18),
('location_coverage_windows','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["location_id"],"target":"locations","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id','location_id']::name[],ARRAY['id','location_id','day_of_week','start_time','end_time','minimum_staff','created_at','updated_at']::name[],'db/migrations/0003_schedule_assistance.sql',9),
('location_staffing_settings','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["location_id"],"target":"locations","targetColumns":["id"]}'::jsonb,ARRAY['location_id']::name[],NULL,ARRAY['location_id']::name[],ARRAY['location_id','minimum_staff_per_shift','updated_at','requires_designated_lead']::name[],'db/migrations/0002_schedule_health.sql',3),
('locations','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id','workspace_id']::name[],ARRAY['id','name','short_name','active','created_at','updated_at','workspace_id','clocker_key','calendar_serial','calendar_modified_at']::name[],'db/migrations/0001_initial.sql',3),
('notifications','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id','source_id']::name[],ARRAY['id','employee_id','type','title','body','read_at','created_at','action_href','event_key','environment','source_kind','source_id','source_version','effective_version','purpose','due_at','expires_at','urgency','cancelled_at','push_state','item_keys']::name[],'db/migrations/0001_initial.sql',182),
('password_recovery_limits','GLOBAL_SECURITY_CONTROL','{"kind":"GLOBAL_SECURITY_CONTROL"}'::jsonb,ARRAY['scope','bucket']::name[],NULL,ARRAY['bucket','scope']::name[],ARRAY['scope','bucket','attempts']::name[],'db/migrations/0020_account_recovery.sql',21),
('password_recovery_proofs','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['token_hash']::name[],NULL,ARRAY['actor_employee_id','employee_id','token_hash']::name[],ARRAY['token_hash','employee_id','credential_updated_at','employee_updated_at','method','actor_employee_id','attestation','created_at','expires_at','used_at','retired_at']::name[],'db/migrations/0020_account_recovery.sql',3),
('payroll_export_profile_revisions','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id','profile_id','revision']::name[],NULL,ARRAY['actor_employee_id','profile_id','revision','workspace_id']::name[],ARRAY['workspace_id','profile_id','revision','operation_id','actor_employee_id','command_hash','profile','created_at']::name[],'db/migrations/0019_payroll_export_mappings.sql',2),
('payroll_export_receipts','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id','actor_employee_id','operation_id']::name[],NULL,ARRAY['actor_employee_id','operation_id','workspace_id']::name[],ARRAY['workspace_id','operation_id','actor_employee_id','command_hash','payload','created_at']::name[],'db/migrations/0019_payroll_export_mappings.sql',8),
('positions','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id','workspace_id']::name[],ARRAY['id','workspace_id','name','active','created_at','updated_at']::name[],'db/migrations/0008_workspace_positions.sql',34),
('push_deliveries','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["notification_id"],"target":"notifications","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id','notification_id','subscription_id']::name[],ARRAY['id','notification_id','subscription_id','generation','status','attempt_count','next_attempt_at','expires_at','lease_token','lease_expires_at','accepted_at','error_class','created_at','updated_at']::name[],'db/migrations/0007_portal_web_push.sql',61),
('push_subscriptions','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id']::name[],ARRAY['id','employee_id','installation_hash','environment','endpoint_fingerprint','encrypted_material','generation','session_hash','status','consent_at','updated_at','expires_at','last_test_at']::name[],'db/migrations/0007_portal_web_push.sql',36),
('schedule_acknowledgements','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['week_start','employee_id']::name[],NULL,ARRAY['employee_id','publication_revision_id','week_start']::name[],ARRAY['week_start','employee_id','acknowledged_at','publication_revision_id']::name[],'db/migrations/0003_schedule_assistance.sql',75),
('schedule_generation_exclusions','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['cleared_by','created_by','deleted_source_shift_id','id','location_id','position_id','workspace_id']::name[],ARRAY['id','workspace_id','week_start','location_id','assignment_start','assignment_end','position_id','claims','deleted_source_shift_id','created_by','created_at','cleared_by','cleared_at']::name[],'db/migrations/0009_schedule_generation.sql',36),
('schedule_publication_revision_shifts','TYPED_HISTORICAL_SIDECAR','{"kind":"PARENT","columns":["revision_id"],"target":"schedule_publication_revisions","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],'schedule_publication_revision_shifts_tenant_ownership',ARRAY['employee_id','id','location_id','position_id','revision_id','schedule_id','source_shift_id']::name[],ARRAY['id','revision_id','source_shift_id','schedule_id','location_id','employee_id','date','start_time','end_time','notes','is_designated_lead','is_callout_approved','position_id','position_name']::name[],'db/migrations/0004_assistance_layer.sql',28),
('schedule_publication_revisions','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["created_by"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['affected_location_id','created_by','id','source_id']::name[],ARRAY['id','week_start','revision_number','source_type','source_id','affected_location_id','created_by','created_at','calendar_serial','calendar_modified_at']::name[],'db/migrations/0004_assistance_layer.sql',11),
('schedule_template_shifts','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["template_id"],"target":"schedule_templates","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id','location_id','position_id','template_id']::name[],ARRAY['id','template_id','location_id','day_offset','start_time','end_time','employee_id','is_designated_lead','notes','position_id']::name[],'db/migrations/0003_schedule_assistance.sql',95),
('schedule_templates','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["created_by"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['created_by','id']::name[],ARRAY['id','name','created_by','active','created_at','updated_at']::name[],'db/migrations/0003_schedule_assistance.sql',82),
('schedule_week_settings','DIRECT_IMMUTABLE','{"kind":"INSTALLATION_PROVENANCE"}'::jsonb,ARRAY['week_start']::name[],NULL,ARRAY['updated_by','week_start']::name[],ARRAY['week_start','availability_deadline','updated_by','updated_at']::name[],'db/migrations/0003_schedule_assistance.sql',23),
('schedules','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["location_id"],"target":"locations","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['created_by','id','location_id','published_by']::name[],ARRAY['id','location_id','week_start','status','created_by','published_by','published_at','created_at','updated_at']::name[],'db/migrations/0001_initial.sql',111),
('shift_callouts','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["shift_id"],"target":"shifts","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id','linked_coverage_request_id','reviewed_by','shift_id']::name[],ARRAY['id','shift_id','employee_id','reason_code','reason_note','status','reviewed_by','reviewed_at','created_at','request_revision','legacy_manual','assignment_episode_id','reviewed_terms_fingerprint','source_terms','outcome_reason','linked_coverage_request_id','escalated_at']::name[],'db/migrations/0003_schedule_assistance.sql',44),
('shift_change_events','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['actor_employee_id','id','request_id']::name[],ARRAY['id','workspace_id','request_kind','request_id','request_revision','event_kind','actor_employee_id','source_terms','target_terms','participants','callout_reason_code','callout_reason_note','outcome_reason','outcome_mode','created_at']::name[],'db/migrations/0010_shift_coverage_automation.sql',146),
('shift_change_operations','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['workspace_id','actor_employee_id','operation_id']::name[],NULL,ARRAY['actor_employee_id','operation_id','request_id','workspace_id']::name[],ARRAY['workspace_id','actor_employee_id','operation_id','command_fingerprint','request_id','result','created_at']::name[],'db/migrations/0010_shift_coverage_automation.sql',184),
('shift_change_participation','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["shift_id"],"target":"shifts","targetColumns":["id"]}'::jsonb,ARRAY['shift_id']::name[],NULL,ARRAY['callout_id','exchange_id','shift_id']::name[],ARRAY['shift_id','exchange_id','callout_id','role']::name[],'db/migrations/0010_shift_coverage_automation.sql',103),
('shift_exchanges','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["source_shift_id"],"target":"shifts","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id','linked_callout_id','prior_request_id','requested_by_employee_id','resolved_by','source_shift_id','target_employee_id','target_shift_id']::name[],ARRAY['id','kind','source_shift_id','requested_by_employee_id','target_employee_id','target_shift_id','status','resolved_by','resolved_at','created_at','request_revision','legacy_manual','requester_consent','target_consent','source_terms','target_terms','submission_deadline','completion_deadline','policy_revision','recorded_approval_mode','outcome_mode','outcome_reason','prior_request_id','linked_callout_id','escalated_at']::name[],'db/migrations/0001_initial.sql',143),
('shifts','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["schedule_id"],"target":"schedules","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id','position_id','schedule_id']::name[],ARRAY['id','schedule_id','employee_id','date','start_time','end_time','notes','created_at','updated_at','is_designated_lead','position_id','assignment_origin','generated_claims','assignment_episode_id','terms_revision']::name[],'db/migrations/0001_initial.sql',125),
('time_correction_adjustments','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['break_entry_id','created_by','employee_id','id','location_id','request_id','supersedes_adjustment_id','time_entry_id','workspace_id']::name[],ARRAY['id','request_id','workspace_id','employee_id','kind','time_entry_id','break_entry_id','location_id','effective_start_at','effective_end_at','source_revision','source_snapshot','supersedes_adjustment_id','created_by','created_at']::name[],'db/migrations/0016_time_corrections.sql',37),
('time_correction_events','IMMUTABLE_PARENT','{"kind":"PARENT","columns":["request_id"],"target":"time_correction_requests","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['actor_employee_id','adjustment_id','id','request_id']::name[],ARRAY['id','request_id','revision','event_kind','actor_employee_id','operation_hash','decision_note','adjustment_id','result','occurred_at']::name[],'db/migrations/0016_time_corrections.sql',66),
('time_correction_requests','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['base_adjustment_id','break_entry_id','employee_id','id','location_id','requested_by_employee_id','time_entry_id','workspace_id']::name[],ARRAY['id','workspace_id','employee_id','requested_by_employee_id','kind','time_entry_id','break_entry_id','location_id','source_revision','source_snapshot','base_adjustment_id','proposal','reason','request_hash','created_at']::name[],'db/migrations/0016_time_corrections.sql',5),
('time_entries','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['device_id','employee_id','id','location_id']::name[],ARRAY['id','employee_id','location_id','device_id','clock_in_at','clock_out_at','status','created_at','updated_at','version','schedule_context']::name[],'db/migrations/0005_time_clock.sql',12),
('time_off_requests','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id','reviewed_by']::name[],ARRAY['id','employee_id','start_date','end_date','start_time','end_time','reason','status','reviewed_by','reviewed_at','created_at']::name[],'db/migrations/0001_initial.sql',87),
('timecard_revisions','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['operation_id']::name[],NULL,ARRAY['actor_employee_id','employee_id','operation_id','workspace_id']::name[],ARRAY['operation_id','workspace_id','employee_id','start_date','end_date','revision','action','actor_employee_id','source_hash','snapshot','command_hash','note','occurred_at']::name[],'db/migrations/0018_timecards.sql',4),
('weekly_availability_submissions','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['week_start','employee_id']::name[],NULL,ARRAY['employee_id','week_start']::name[],ARRAY['week_start','employee_id','submitted_at','updated_at','uses_normal_availability']::name[],'db/migrations/0004_assistance_layer.sql',3),
('weekly_availability_windows','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['employee_id','id']::name[],ARRAY['id','week_start','employee_id','day_of_week','start_time','end_time','updated_at']::name[],'db/migrations/0003_schedule_assistance.sql',30),
('workspaces','DIRECT_IMMUTABLE','{"kind":"ROOT","column":"id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id']::name[],ARRAY['id','name','time_zone','active','singleton','created_at','updated_at','shift_change_policy']::name[],'db/migrations/0008_workspace_positions.sql',3);
-- Catalog-derived original live FK declarations only. Historical literal
-- references deliberately lacking FKs are NOT converted to live-parent FKs.
-- These are installation specifications, not installed/validated constraints.
CREATE TABLE nevora_tenancy.composite_fk_specification (
 source_table name NOT NULL REFERENCES nevora_tenancy.owned_table_contract(table_name),
 original_constraint name NOT NULL,
 target_table name NOT NULL REFERENCES nevora_tenancy.owned_table_contract(table_name),
 source_columns name[] NOT NULL,
 target_columns name[] NOT NULL,
 original_definition text NOT NULL,
 installation_state text NOT NULL DEFAULT 'NOT_INSTALLED' CHECK(installation_state='NOT_INSTALLED'),
 PRIMARY KEY(source_table,original_constraint)
);
INSERT INTO nevora_tenancy.composite_fk_specification(source_table,original_constraint,target_table,source_columns,target_columns,original_definition) VALUES
('availability_exceptions','availability_exceptions_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('availability_windows','availability_windows_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('break_entries','break_entries_break_type_id_fkey','clocker_break_types',ARRAY['workspace_id','break_type_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (break_type_id) REFERENCES clocker_break_types(id)'),
('break_entries','break_entries_time_entry_id_fkey','time_entries',ARRAY['workspace_id','time_entry_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (time_entry_id) REFERENCES time_entries(id)'),
('calendar_operations','calendar_operations_actor_employee_id_fkey','employees',ARRAY['workspace_id','actor_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (actor_employee_id) REFERENCES employees(id)'),
('calendar_removals','calendar_removals_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('calendar_removals','calendar_removals_removal_revision_id_fkey','schedule_publication_revisions',ARRAY['workspace_id','removal_revision_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (removal_revision_id) REFERENCES schedule_publication_revisions(id) ON DELETE RESTRICT'),
('calendar_subscriptions','calendar_subscriptions_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('clocker_break_types','clocker_break_types_created_by_fkey','employees',ARRAY['workspace_id','created_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (created_by) REFERENCES employees(id)'),
('clocker_break_types','clocker_break_types_updated_by_fkey','employees',ARRAY['workspace_id','updated_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (updated_by) REFERENCES employees(id)'),
('clocker_employee_clock_state','clocker_employee_clock_state_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('clocker_pin_sessions','clocker_pin_sessions_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('communication_lifecycle','communication_lifecycle_actor_employee_id_fkey','employees',ARRAY['workspace_id','actor_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (actor_employee_id) REFERENCES employees(id)'),
('communication_operations','communication_operations_actor_employee_id_fkey','employees',ARRAY['workspace_id','actor_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (actor_employee_id) REFERENCES employees(id)'),
('communication_recipients','communication_recipients_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('communication_revisions','communication_revisions_created_by_fkey','employees',ARRAY['workspace_id','created_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (created_by) REFERENCES employees(id)'),
('communications','communications_author_employee_id_fkey','employees',ARRAY['workspace_id','author_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (author_employee_id) REFERENCES employees(id)'),
('coverage_window_position_requirements','coverage_window_position_requirements_coverage_window_id_fkey','location_coverage_windows',ARRAY['workspace_id','coverage_window_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (coverage_window_id) REFERENCES location_coverage_windows(id) ON DELETE CASCADE'),
('coverage_window_position_requirements','coverage_window_position_requirements_position_id_fkey','positions',ARRAY['workspace_id','position_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (position_id) REFERENCES positions(id)'),
('employee_attention_operations','employee_attention_operations_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('employee_attention_receipts','employee_attention_receipts_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('employee_clocker_pins','employee_clocker_pins_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('employee_clocker_pins','employee_clocker_pins_updated_by_fkey','employees',ARRAY['workspace_id','updated_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (updated_by) REFERENCES employees(id)'),
('employee_location_eligibility','employee_location_eligibility_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('employee_location_eligibility','employee_location_eligibility_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id)'),
('employee_positions','employee_positions_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('employee_positions','employee_positions_position_id_fkey','positions',ARRAY['workspace_id','position_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (position_id) REFERENCES positions(id)'),
('employee_scheduling_settings','employee_scheduling_settings_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('employees','employees_primary_location_id_fkey','locations',ARRAY['workspace_id','primary_location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (primary_location_id) REFERENCES locations(id)'),
('location_coverage_windows','location_coverage_windows_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE'),
('location_staffing_settings','location_staffing_settings_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE'),
('notifications','notifications_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('payroll_export_profile_revisions','payroll_export_profile_revisions_actor_employee_id_fkey','employees',ARRAY['workspace_id','actor_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (actor_employee_id) REFERENCES employees(id)'),
('payroll_export_receipts','payroll_export_receipts_actor_employee_id_fkey','employees',ARRAY['workspace_id','actor_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (actor_employee_id) REFERENCES employees(id)'),
('push_deliveries','push_deliveries_notification_id_fkey','notifications',ARRAY['workspace_id','notification_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE'),
('push_deliveries','push_deliveries_subscription_id_fkey','push_subscriptions',ARRAY['workspace_id','subscription_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE'),
('push_subscriptions','push_subscriptions_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('schedule_acknowledgements','schedule_acknowledgements_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('schedule_acknowledgements','schedule_acknowledgements_publication_revision_id_fkey','schedule_publication_revisions',ARRAY['workspace_id','publication_revision_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (publication_revision_id) REFERENCES schedule_publication_revisions(id)'),
('schedule_generation_exclusions','schedule_generation_exclusions_cleared_by_fkey','employees',ARRAY['workspace_id','cleared_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (cleared_by) REFERENCES employees(id)'),
('schedule_generation_exclusions','schedule_generation_exclusions_created_by_fkey','employees',ARRAY['workspace_id','created_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (created_by) REFERENCES employees(id)'),
('schedule_generation_exclusions','schedule_generation_exclusions_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id)'),
('schedule_generation_exclusions','schedule_generation_exclusions_position_id_fkey','positions',ARRAY['workspace_id','position_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (position_id) REFERENCES positions(id)'),
('schedule_publication_revisions','schedule_publication_revisions_affected_location_id_fkey','locations',ARRAY['workspace_id','affected_location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (affected_location_id) REFERENCES locations(id)'),
('schedule_publication_revisions','schedule_publication_revisions_created_by_fkey','employees',ARRAY['workspace_id','created_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (created_by) REFERENCES employees(id)'),
('schedule_template_shifts','schedule_template_shifts_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('schedule_template_shifts','schedule_template_shifts_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id)'),
('schedule_template_shifts','schedule_template_shifts_position_id_fkey','positions',ARRAY['workspace_id','position_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (position_id) REFERENCES positions(id)'),
('schedule_template_shifts','schedule_template_shifts_template_id_fkey','schedule_templates',ARRAY['workspace_id','template_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (template_id) REFERENCES schedule_templates(id) ON DELETE CASCADE'),
('schedule_templates','schedule_templates_created_by_fkey','employees',ARRAY['workspace_id','created_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (created_by) REFERENCES employees(id)'),
('schedule_week_settings','schedule_week_settings_updated_by_fkey','employees',ARRAY['workspace_id','updated_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (updated_by) REFERENCES employees(id)'),
('schedules','schedules_created_by_fkey','employees',ARRAY['workspace_id','created_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (created_by) REFERENCES employees(id)'),
('schedules','schedules_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id)'),
('schedules','schedules_published_by_fkey','employees',ARRAY['workspace_id','published_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (published_by) REFERENCES employees(id)'),
('shift_callouts','shift_callouts_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('shift_callouts','shift_callouts_reviewed_by_fkey','employees',ARRAY['workspace_id','reviewed_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (reviewed_by) REFERENCES employees(id)'),
('shift_callouts','shift_callouts_shift_id_fkey','shifts',ARRAY['workspace_id','shift_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE'),
('shift_change_participation','shift_change_participation_callout_id_fkey','shift_callouts',ARRAY['workspace_id','callout_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (callout_id) REFERENCES shift_callouts(id) ON DELETE CASCADE'),
('shift_change_participation','shift_change_participation_exchange_id_fkey','shift_exchanges',ARRAY['workspace_id','exchange_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (exchange_id) REFERENCES shift_exchanges(id) ON DELETE CASCADE'),
('shift_change_participation','shift_change_participation_shift_id_fkey','shifts',ARRAY['workspace_id','shift_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE'),
('shift_exchanges','shift_exchanges_requested_by_employee_id_fkey','employees',ARRAY['workspace_id','requested_by_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (requested_by_employee_id) REFERENCES employees(id)'),
('shift_exchanges','shift_exchanges_resolved_by_fkey','employees',ARRAY['workspace_id','resolved_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (resolved_by) REFERENCES employees(id)'),
('shift_exchanges','shift_exchanges_source_shift_id_fkey','shifts',ARRAY['workspace_id','source_shift_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (source_shift_id) REFERENCES shifts(id) ON DELETE CASCADE'),
('shift_exchanges','shift_exchanges_target_employee_id_fkey','employees',ARRAY['workspace_id','target_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (target_employee_id) REFERENCES employees(id)'),
('shift_exchanges','shift_exchanges_target_shift_id_fkey','shifts',ARRAY['workspace_id','target_shift_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (target_shift_id) REFERENCES shifts(id)'),
('shifts','shifts_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('shifts','shifts_position_id_fkey','positions',ARRAY['workspace_id','position_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (position_id) REFERENCES positions(id)'),
('shifts','shifts_schedule_id_fkey','schedules',ARRAY['workspace_id','schedule_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE'),
('time_correction_adjustments','time_correction_adjustments_break_entry_id_fkey','break_entries',ARRAY['workspace_id','break_entry_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (break_entry_id) REFERENCES break_entries(id)'),
('time_correction_adjustments','time_correction_adjustments_created_by_fkey','employees',ARRAY['workspace_id','created_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (created_by) REFERENCES employees(id)'),
('time_correction_adjustments','time_correction_adjustments_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('time_correction_adjustments','time_correction_adjustments_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id)'),
('time_correction_adjustments','time_correction_adjustments_request_id_fkey','time_correction_requests',ARRAY['workspace_id','request_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (request_id) REFERENCES time_correction_requests(id)'),
('time_correction_adjustments','time_correction_adjustments_supersedes_adjustment_id_fkey','time_correction_adjustments',ARRAY['workspace_id','supersedes_adjustment_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (supersedes_adjustment_id) REFERENCES time_correction_adjustments(id)'),
('time_correction_adjustments','time_correction_adjustments_time_entry_id_fkey','time_entries',ARRAY['workspace_id','time_entry_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (time_entry_id) REFERENCES time_entries(id)'),
('time_correction_requests','time_correction_request_base_adjustment','time_correction_adjustments',ARRAY['workspace_id','base_adjustment_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (base_adjustment_id) REFERENCES time_correction_adjustments(id)'),
('time_correction_requests','time_correction_requests_break_entry_id_fkey','break_entries',ARRAY['workspace_id','break_entry_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (break_entry_id) REFERENCES break_entries(id)'),
('time_correction_requests','time_correction_requests_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('time_correction_requests','time_correction_requests_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id)'),
('time_correction_requests','time_correction_requests_requested_by_employee_id_fkey','employees',ARRAY['workspace_id','requested_by_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (requested_by_employee_id) REFERENCES employees(id)'),
('time_correction_requests','time_correction_requests_time_entry_id_fkey','time_entries',ARRAY['workspace_id','time_entry_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (time_entry_id) REFERENCES time_entries(id)'),
('time_entries','time_entries_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('time_entries','time_entries_location_id_fkey','locations',ARRAY['workspace_id','location_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (location_id) REFERENCES locations(id)'),
('time_off_requests','time_off_requests_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('time_off_requests','time_off_requests_reviewed_by_fkey','employees',ARRAY['workspace_id','reviewed_by']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (reviewed_by) REFERENCES employees(id)'),
('timecard_revisions','timecard_revisions_actor_employee_id_fkey','employees',ARRAY['workspace_id','actor_employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (actor_employee_id) REFERENCES employees(id)'),
('timecard_revisions','timecard_revisions_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id)'),
('weekly_availability_submissions','weekly_availability_submissions_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE'),
('weekly_availability_windows','weekly_availability_windows_employee_id_fkey','employees',ARRAY['workspace_id','employee_id']::name[],ARRAY['workspace_id','id']::name[],'FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE');
ALTER TABLE public."availability_exceptions" ADD COLUMN workspace_id text;
ALTER TABLE public."availability_exceptions" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."availability_exceptions" ADD CONSTRAINT f10_tenant_9cccc285dd79 UNIQUE("workspace_id","id");
ALTER TABLE public."availability_windows" ADD COLUMN workspace_id text;
ALTER TABLE public."availability_windows" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."availability_windows" ADD CONSTRAINT f10_tenant_6f2335ffb60d UNIQUE("workspace_id","id");
ALTER TABLE public."break_entries" ADD COLUMN workspace_id text;
ALTER TABLE public."break_entries" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."break_entries" ADD CONSTRAINT f10_tenant_cac3adfa1ac9 UNIQUE("workspace_id","id");
ALTER TABLE public."calendar_clock" ADD COLUMN workspace_id text;
ALTER TABLE public."calendar_clock" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."calendar_clock" ADD CONSTRAINT f10_tenant_96563d073a18 UNIQUE("workspace_id","singleton");
ALTER TABLE public."calendar_subscriptions" ADD CONSTRAINT f10_tenant_5c2924fb19b1 UNIQUE("workspace_id","id");
ALTER TABLE public."clocker_break_types" ADD CONSTRAINT f10_tenant_037cd89ef1f3 UNIQUE("workspace_id","id");
ALTER TABLE public."clocker_employee_clock_state" ADD COLUMN workspace_id text;
ALTER TABLE public."clocker_employee_clock_state" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."clocker_employee_clock_state" ADD CONSTRAINT f10_tenant_250e941cc3ce UNIQUE("workspace_id","employee_id");
ALTER TABLE public."clocker_pin_limits" ADD COLUMN workspace_id text;
ALTER TABLE public."clocker_pin_limits" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."clocker_pin_limits" ADD CONSTRAINT f10_tenant_9262484fb333 UNIQUE("workspace_id","scope","scope_id");
ALTER TABLE public."clocker_pin_sessions" ADD COLUMN workspace_id text;
ALTER TABLE public."clocker_pin_sessions" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."clocker_pin_sessions" ADD CONSTRAINT f10_tenant_736d956e53b1 UNIQUE("workspace_id","device_id");
ALTER TABLE public."communication_lifecycle" ADD CONSTRAINT f10_tenant_c4b3b0102f3c UNIQUE("workspace_id","id");
ALTER TABLE public."communication_receipts" ADD CONSTRAINT f10_tenant_40c3d6083440 UNIQUE("workspace_id","id");
ALTER TABLE public."communication_revisions" ADD CONSTRAINT f10_tenant_a85cb972c8d9 UNIQUE("workspace_id","id");
ALTER TABLE public."coverage_window_position_requirements" ADD COLUMN workspace_id text;
ALTER TABLE public."coverage_window_position_requirements" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."coverage_window_position_requirements" ADD CONSTRAINT f10_tenant_8d8d063e6a8e UNIQUE("workspace_id","coverage_window_id","position_id");
ALTER TABLE public."employee_attention_receipts" ADD CONSTRAINT f10_tenant_bf9a8c859bea UNIQUE("workspace_id","id");
ALTER TABLE public."employee_clocker_pins" ADD CONSTRAINT f10_tenant_2e14d6c87e4f UNIQUE("workspace_id","employee_id");
ALTER TABLE public."employee_location_eligibility" ADD COLUMN workspace_id text;
ALTER TABLE public."employee_location_eligibility" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."employee_location_eligibility" ADD CONSTRAINT f10_tenant_d4d2dd749788 UNIQUE("workspace_id","employee_id","location_id");
ALTER TABLE public."employee_positions" ADD COLUMN workspace_id text;
ALTER TABLE public."employee_positions" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."employee_positions" ADD CONSTRAINT f10_tenant_eb0d83971cf1 UNIQUE("workspace_id","employee_id","position_id");
ALTER TABLE public."employee_scheduling_settings" ADD COLUMN workspace_id text;
ALTER TABLE public."employee_scheduling_settings" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."employee_scheduling_settings" ADD CONSTRAINT f10_tenant_61eef0e14125 UNIQUE("workspace_id","employee_id");
ALTER TABLE public."employees" ADD COLUMN workspace_id text;
ALTER TABLE public."employees" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."employees" ADD CONSTRAINT f10_tenant_c49de3d265fb UNIQUE("workspace_id","id");
ALTER TABLE public."location_coverage_windows" ADD COLUMN workspace_id text;
ALTER TABLE public."location_coverage_windows" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."location_coverage_windows" ADD CONSTRAINT f10_tenant_5d63995ce01d UNIQUE("workspace_id","id");
ALTER TABLE public."location_staffing_settings" ADD COLUMN workspace_id text;
ALTER TABLE public."location_staffing_settings" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."location_staffing_settings" ADD CONSTRAINT f10_tenant_b184aae0d7fd UNIQUE("workspace_id","location_id");
ALTER TABLE public."notifications" ADD COLUMN workspace_id text;
ALTER TABLE public."notifications" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."notifications" ADD CONSTRAINT f10_tenant_8bb6922758ad UNIQUE("workspace_id","id");
ALTER TABLE public."positions" ADD CONSTRAINT f10_tenant_f50871d14c19 UNIQUE("workspace_id","id");
ALTER TABLE public."push_deliveries" ADD COLUMN workspace_id text;
ALTER TABLE public."push_deliveries" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."push_deliveries" ADD CONSTRAINT f10_tenant_627a6a3464c9 UNIQUE("workspace_id","id");
ALTER TABLE public."push_subscriptions" ADD COLUMN workspace_id text;
ALTER TABLE public."push_subscriptions" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."push_subscriptions" ADD CONSTRAINT f10_tenant_537cfd63173b UNIQUE("workspace_id","id");
ALTER TABLE public."schedule_acknowledgements" ADD COLUMN workspace_id text;
ALTER TABLE public."schedule_acknowledgements" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."schedule_acknowledgements" ADD CONSTRAINT f10_tenant_7255b58327c1 UNIQUE("workspace_id","week_start","employee_id");
ALTER TABLE public."schedule_generation_exclusions" ADD CONSTRAINT f10_tenant_4468318b53d6 UNIQUE("workspace_id","id");
ALTER TABLE public."schedule_publication_revisions" ADD COLUMN workspace_id text;
ALTER TABLE public."schedule_publication_revisions" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."schedule_publication_revisions" ADD CONSTRAINT f10_tenant_b2ddca82f3e8 UNIQUE("workspace_id","id");
ALTER TABLE public."schedule_template_shifts" ADD COLUMN workspace_id text;
ALTER TABLE public."schedule_template_shifts" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."schedule_template_shifts" ADD CONSTRAINT f10_tenant_4d34496656ca UNIQUE("workspace_id","id");
ALTER TABLE public."schedule_templates" ADD COLUMN workspace_id text;
ALTER TABLE public."schedule_templates" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."schedule_templates" ADD CONSTRAINT f10_tenant_da8f88439934 UNIQUE("workspace_id","id");
ALTER TABLE public."schedule_week_settings" ADD COLUMN workspace_id text;
ALTER TABLE public."schedule_week_settings" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."schedule_week_settings" ADD CONSTRAINT f10_tenant_4947a3685c77 UNIQUE("workspace_id","week_start");
ALTER TABLE public."schedules" ADD COLUMN workspace_id text;
ALTER TABLE public."schedules" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."schedules" ADD CONSTRAINT f10_tenant_6e9a1ab2a01b UNIQUE("workspace_id","id");
ALTER TABLE public."shift_callouts" ADD COLUMN workspace_id text;
ALTER TABLE public."shift_callouts" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."shift_callouts" ADD CONSTRAINT f10_tenant_7b7ed981589d UNIQUE("workspace_id","id");
ALTER TABLE public."shift_change_events" ADD CONSTRAINT f10_tenant_f05fbb2f1b26 UNIQUE("workspace_id","id");
ALTER TABLE public."shift_change_participation" ADD COLUMN workspace_id text;
ALTER TABLE public."shift_change_participation" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."shift_change_participation" ADD CONSTRAINT f10_tenant_5d24a9a1f097 UNIQUE("workspace_id","shift_id");
ALTER TABLE public."shift_exchanges" ADD COLUMN workspace_id text;
ALTER TABLE public."shift_exchanges" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."shift_exchanges" ADD CONSTRAINT f10_tenant_e0a06756b7bc UNIQUE("workspace_id","id");
ALTER TABLE public."shifts" ADD COLUMN workspace_id text;
ALTER TABLE public."shifts" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."shifts" ADD CONSTRAINT f10_tenant_2da3a789df29 UNIQUE("workspace_id","id");
ALTER TABLE public."time_correction_adjustments" ADD CONSTRAINT f10_tenant_b5126c4bfb26 UNIQUE("workspace_id","id");
ALTER TABLE public."time_correction_requests" ADD CONSTRAINT f10_tenant_8595221f4431 UNIQUE("workspace_id","id");
ALTER TABLE public."time_entries" ADD COLUMN workspace_id text;
ALTER TABLE public."time_entries" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."time_entries" ADD CONSTRAINT f10_tenant_dbeb6346febd UNIQUE("workspace_id","id");
ALTER TABLE public."time_off_requests" ADD COLUMN workspace_id text;
ALTER TABLE public."time_off_requests" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."time_off_requests" ADD CONSTRAINT f10_tenant_dde353667f16 UNIQUE("workspace_id","id");
ALTER TABLE public."timecard_revisions" ADD CONSTRAINT f10_tenant_c188f50df214 UNIQUE("workspace_id","operation_id");
ALTER TABLE public."weekly_availability_submissions" ADD COLUMN workspace_id text;
ALTER TABLE public."weekly_availability_submissions" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."weekly_availability_submissions" ADD CONSTRAINT f10_tenant_c8a24634098b UNIQUE("workspace_id","week_start","employee_id");
ALTER TABLE public."weekly_availability_windows" ADD COLUMN workspace_id text;
ALTER TABLE public."weekly_availability_windows" ADD CONSTRAINT f10_workspace_reference FOREIGN KEY(workspace_id) REFERENCES public.workspaces(id) NOT VALID;
ALTER TABLE public."weekly_availability_windows" ADD CONSTRAINT f10_tenant_8e838141fa33 UNIQUE("workspace_id","id");
-- Source IDs and mirrors use their existing SQL types. The source FK is
-- deferred to permit sidecar-first insertion in one transaction. No FK is
-- attached to deleted/historical source_shift_id/location/employee literals.
CREATE TABLE public.clocker_pin_events_tenant_ownership (
 id text PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES public.workspaces(id),
 employee_id text NOT NULL,
 actor_employee_id text NOT NULL,
 source_checksum_sha256 text NOT NULL CHECK(source_checksum_sha256 ~ '^[a-f0-9]{64}$'),
 capture_manifest_sha256 text NOT NULL CHECK(capture_manifest_sha256 ~ '^[a-f0-9]{64}$'),
 FOREIGN KEY(id) REFERENCES public.clocker_pin_events(id) DEFERRABLE INITIALLY DEFERRED,
 UNIQUE(workspace_id,id)
);
CREATE TABLE public.schedule_publication_revision_shifts_tenant_ownership (
 id text PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES public.workspaces(id),
 revision_id text NOT NULL,
 source_shift_id text,
 schedule_id text NOT NULL,
 location_id text NOT NULL,
 employee_id text NOT NULL,
 position_id text,
 source_checksum_sha256 text NOT NULL CHECK(source_checksum_sha256 ~ '^[a-f0-9]{64}$'),
 capture_manifest_sha256 text NOT NULL CHECK(capture_manifest_sha256 ~ '^[a-f0-9]{64}$'),
 FOREIGN KEY(id) REFERENCES public.schedule_publication_revision_shifts(id) DEFERRABLE INITIALLY DEFERRED,
 UNIQUE(workspace_id,id)
);
REVOKE ALL ON ALL TABLES IN SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON public.clocker_pin_events_tenant_ownership,public.schedule_publication_revision_shifts_tenant_ownership FROM PUBLIC;

CREATE FUNCTION nevora_tenancy.source_write_fence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,nevora_tenancy AS $write_fence$
DECLARE state nevora_tenancy.expansion_protocol%ROWTYPE;
BEGIN
 SELECT * INTO STRICT state FROM nevora_tenancy.expansion_protocol WHERE migration_id=26 FOR SHARE;
 IF state.phase='FENCED' AND TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'f10_source_truncate_fenced' USING ERRCODE='55000'; END IF;
 IF state.phase='FENCED' AND
   (state.backfill_actor IS NULL OR state.backfill_actor::text<>session_user::text OR state.capture_manifest_sha256 IS NULL) THEN
  RAISE EXCEPTION 'f10_legacy_writes_fenced' USING ERRCODE='55000';
 END IF;
 RETURN NULL;
END;
$write_fence$;

CREATE FUNCTION nevora_tenancy.source_identity_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,nevora_tenancy AS $identity_guard$
DECLARE state nevora_tenancy.expansion_protocol%ROWTYPE;
 rule nevora_tenancy.owned_table_contract%ROWTYPE;
 col name;
 old_row jsonb;
 new_row jsonb;
BEGIN
 SELECT * INTO STRICT state FROM nevora_tenancy.expansion_protocol WHERE migration_id=26;
 SELECT * INTO STRICT rule FROM nevora_tenancy.owned_table_contract WHERE table_name=TG_TABLE_NAME::name;
 IF state.phase='FENCED' THEN
  -- Only the separately bound operator may fill NULL direct metadata while all
  -- original values and identity columns remain byte/value stable. It cannot
  -- insert/delete original history or bypass existing append-only triggers.
  IF TG_OP<>'UPDATE' OR state.backfill_actor IS NULL OR state.backfill_actor::text<>session_user::text OR state.capture_manifest_sha256 IS NULL THEN
   RAISE EXCEPTION 'f10_source_write_not_backfill' USING ERRCODE='55000';
  END IF;
  IF rule.storage<>'DIRECT_IMMUTABLE' OR rule.anchor->>'kind'='ROOT' OR
    (to_jsonb(NEW)-'workspace_id') IS DISTINCT FROM (to_jsonb(OLD)-'workspace_id') THEN
   RAISE EXCEPTION 'f10_backfill_source_content_immutable' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
  old_row:=to_jsonb(OLD);new_row:=to_jsonb(NEW);
  FOREACH col IN ARRAY rule.primary_key_columns LOOP
   IF new_row->col::text IS DISTINCT FROM old_row->col::text THEN
    RAISE EXCEPTION 'f10_source_identity_immutable' USING ERRCODE='23514';
   END IF;
  END LOOP;
  IF rule.storage='IMMUTABLE_PARENT' THEN
   FOR col IN SELECT jsonb_array_elements_text(rule.anchor->'columns')::name LOOP
    IF new_row->col::text IS DISTINCT FROM old_row->col::text THEN
     RAISE EXCEPTION 'f10_parent_identity_immutable' USING ERRCODE='23514';
    END IF;
   END LOOP;
  END IF;
  IF rule.storage='DIRECT_IMMUTABLE' AND rule.anchor->>'kind'<>'ROOT' THEN
   IF old_row->>'workspace_id' IS NOT NULL AND new_row->>'workspace_id' IS DISTINCT FROM old_row->>'workspace_id' THEN
    RAISE EXCEPTION 'f10_workspace_immutable' USING ERRCODE='23514';
   ELSIF old_row->>'workspace_id' IS NULL AND new_row->>'workspace_id' IS NOT NULL AND state.phase<>'FENCED' THEN
    RAISE EXCEPTION 'f10_unproven_owner_fill' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$identity_guard$;

CREATE FUNCTION nevora_tenancy.sidecar_immutable() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $sidecar_immutable$
BEGIN
 RAISE EXCEPTION 'f10_sidecar_immutable' USING ERRCODE='23514';
END;
$sidecar_immutable$;

CREATE FUNCTION nevora_tenancy.historical_pair_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,nevora_tenancy AS $historical_pair$
DECLARE source_row jsonb;owned_row jsonb;col text;mirrors text[];
BEGIN
 IF TG_TABLE_NAME IN('clocker_pin_events','clocker_pin_events_tenant_ownership') THEN
  SELECT to_jsonb(s) INTO source_row FROM public.clocker_pin_events s WHERE s.id=NEW.id;
  SELECT to_jsonb(s) INTO owned_row FROM public.clocker_pin_events_tenant_ownership s WHERE s.id=NEW.id;
  mirrors:=ARRAY['id','employee_id','actor_employee_id'];
 ELSIF TG_TABLE_NAME IN('schedule_publication_revision_shifts','schedule_publication_revision_shifts_tenant_ownership') THEN
  SELECT to_jsonb(s) INTO source_row FROM public.schedule_publication_revision_shifts s WHERE s.id=NEW.id;
  SELECT to_jsonb(s) INTO owned_row FROM public.schedule_publication_revision_shifts_tenant_ownership s WHERE s.id=NEW.id;
  mirrors:=ARRAY['id','revision_id','source_shift_id','schedule_id','location_id','employee_id','position_id'];
 ELSE RAISE EXCEPTION 'f10_unknown_historical_pair' USING ERRCODE='23514';
 END IF;
 -- Legacy source rows may lack ownership until separately captured. Metadata
 -- may never survive without its exact source row and typed mirror identity.
 IF owned_row IS NULL THEN RETURN NULL; END IF;
 IF TG_OP='UPDATE' AND TG_TABLE_NAME IN('clocker_pin_events','schedule_publication_revision_shifts') AND to_jsonb(NEW) IS DISTINCT FROM to_jsonb(OLD) THEN RAISE EXCEPTION 'f10_captured_source_immutable' USING ERRCODE='23514'; END IF;
 IF source_row IS NULL THEN RAISE EXCEPTION 'f10_sidecar_source_missing' USING ERRCODE='23503'; END IF;
 FOREACH col IN ARRAY mirrors LOOP
  IF source_row->col IS DISTINCT FROM owned_row->col THEN RAISE EXCEPTION 'f10_sidecar_source_identity' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NULL;
END;
$historical_pair$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nevora_tenancy FROM PUBLIC;
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."availability_exceptions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."availability_exceptions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."availability_windows" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."availability_windows" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."break_entries" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."break_entries" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."calendar_clock" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."calendar_clock" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."calendar_operations" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."calendar_operations" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."calendar_removals" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."calendar_removals" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."calendar_subscriptions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."calendar_subscriptions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_break_type_events" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_break_type_events" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_break_types" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_break_types" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_command_ledger" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_command_ledger" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_device_credentials" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_device_credentials" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_device_events" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_device_events" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_devices" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_devices" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_employee_clock_state" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_employee_clock_state" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_pin_configuration" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_pin_configuration" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_pin_events" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_pin_events" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_pin_limits" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_pin_limits" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_pin_sessions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."clocker_pin_sessions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."communication_lifecycle" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."communication_lifecycle" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."communication_operations" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."communication_operations" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."communication_receipts" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."communication_receipts" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."communication_recipients" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."communication_recipients" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."communication_revisions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."communication_revisions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."communications" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."communications" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."coverage_window_position_requirements" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."coverage_window_position_requirements" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employee_attention_operations" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employee_attention_operations" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employee_attention_receipts" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employee_attention_receipts" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employee_clocker_pins" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employee_clocker_pins" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employee_credentials" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employee_credentials" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employee_location_eligibility" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employee_location_eligibility" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employee_positions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employee_positions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employee_scheduling_settings" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employee_scheduling_settings" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employee_sessions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employee_sessions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."employees" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."employees" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."location_coverage_windows" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."location_coverage_windows" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."location_staffing_settings" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."location_staffing_settings" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."locations" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."locations" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."notifications" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."notifications" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."password_recovery_limits" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."password_recovery_limits" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."password_recovery_proofs" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."password_recovery_proofs" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."payroll_export_profile_revisions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."payroll_export_profile_revisions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."payroll_export_receipts" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."payroll_export_receipts" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."positions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."positions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."push_deliveries" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."push_deliveries" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."push_subscriptions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."push_subscriptions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedule_acknowledgements" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."schedule_acknowledgements" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedule_generation_exclusions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."schedule_generation_exclusions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedule_publication_revision_shifts" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."schedule_publication_revision_shifts" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedule_publication_revisions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."schedule_publication_revisions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedule_template_shifts" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."schedule_template_shifts" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedule_templates" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."schedule_templates" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedule_week_settings" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."schedule_week_settings" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedules" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."schedules" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."shift_callouts" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."shift_callouts" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."shift_change_events" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."shift_change_events" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."shift_change_operations" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."shift_change_operations" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."shift_change_participation" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."shift_change_participation" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."shift_exchanges" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."shift_exchanges" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."shifts" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."shifts" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."time_correction_adjustments" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."time_correction_adjustments" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."time_correction_events" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."time_correction_events" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."time_correction_requests" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."time_correction_requests" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."time_entries" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."time_entries" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."time_off_requests" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."time_off_requests" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."timecard_revisions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."timecard_revisions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."weekly_availability_submissions" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."weekly_availability_submissions" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."weekly_availability_windows" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."weekly_availability_windows" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."workspaces" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON public."workspaces" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."clocker_pin_events_tenant_ownership" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_sidecar_immutable BEFORE UPDATE OR DELETE ON public."clocker_pin_events_tenant_ownership" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.sidecar_immutable();
CREATE CONSTRAINT TRIGGER f10_historical_pair AFTER INSERT OR UPDATE ON public."clocker_pin_events_tenant_ownership" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.historical_pair_guard();
CREATE CONSTRAINT TRIGGER f10_historical_pair AFTER INSERT OR UPDATE ON public."clocker_pin_events" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.historical_pair_guard();
CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON public."schedule_publication_revision_shifts_tenant_ownership" FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
CREATE TRIGGER f10_sidecar_immutable BEFORE UPDATE OR DELETE ON public."schedule_publication_revision_shifts_tenant_ownership" FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.sidecar_immutable();
CREATE CONSTRAINT TRIGGER f10_historical_pair AFTER INSERT OR UPDATE ON public."schedule_publication_revision_shifts_tenant_ownership" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.historical_pair_guard();
CREATE CONSTRAINT TRIGGER f10_historical_pair AFTER INSERT OR UPDATE ON public."schedule_publication_revision_shifts" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.historical_pair_guard();
COMMIT;
