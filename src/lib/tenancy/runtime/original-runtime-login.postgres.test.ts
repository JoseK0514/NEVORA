import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { Client } from 'pg';
import { appendFileSync, lstatSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL, RUNTIME_CATALOG_SHARED_FENCE_SQL } from './catalog-fence.server';

// PREPARATION HOLD: root alone selects fresh owned native OLD/GREEN invocations.
// No URL/discovery/startup/provider. Exact final pin literals must be supplied
// from the frozen five-file producer READY before any credential read/connection.
// Keep prior byte custody checks while allowing only the reviewed marked additions.
function beforePortalDependencyInsertions(text: string): string {
  for (const name of ['PORTAL_SOURCE_DEPENDENCY_ADMISSION', 'PORTAL_SOURCE_DEPENDENCY_CTES']) {
    const start = '-- ' + name + '_BEGIN', end = '-- ' + name + '_END';
    if (!text.includes(start) && !text.includes(end)) continue;
    expect(text.split(start)).toHaveLength(2); expect(text.split(end)).toHaveLength(2);
    const after = text.indexOf(end) + end.length;
    expect(text.slice(after, after + 1)).toBe('\n');
    text = text.slice(0, text.indexOf(start)) + text.slice(after + 1);
  }
  return text;
}

const portalDependencyCurrentPins: Record<string, string> = {
  "audited-role-guard.sql": "ba0b4617d66892ad350e42221e9ad1dc27b406c35d5103b9eba28b08ea6a02e0",
  "audited-role-guard-installer.sql": "cfbe111978adc37a1ce0025ce843fb37e7e43b71f568c3dd01c68b126c23f7d5",
  "original-runtime-login.sql": "0993c3ba476cc8dab6d80ee2e0287ba9d18072b3dab99aee8bcab23814c4e6b8",
  "original-runtime-login-installer.sql": "a63f71569af622928d879c1b6759440a42f20f9f599efd24eb80bfb2e1be584f"
};
function expectFrozenSql(text: string, name: string, historicalPin: string): void {
  expect(hash(beforePortalDependencyInsertions(text))).toBe(historicalPin);
  expect(hash(text)).toBe(portalDependencyCurrentPins[name] ?? historicalPin);
}
const pins = {
  'control-storage.sql': '4edaaa14492e8b91b30ecb26b4f9582af97c8380543761eee8bcc605ef40de66',
  'audited-helper-storage.sql': '2a7d8c979e5e854ddd0e516a07ce20eed15365efcfb1c21812ffffe9e31d9603',
  'audited-role-guard.sql': '28ce7c57e59426c12437fb4c14ded3e48c074ff67c9051ac36ae3e180c83443f',
  'audited-role-guard-installer.sql': '9f8fd73c7a0f2711aaac38836377d9a1ca6e0b504ab899c32c6558a2366b6f99',
  'original-runtime-login.sql': 'd27ddb080930638b32557767b81d2d249cd46511351baad8eb9d4154a77533db',
  'catalog-fence.server.ts': '2244d516b56bb7b4bbb76b47699971ed71c8ec0aebdeee6b8031692d2c1d0a2f',
} as const;
const effectivePins: Record<string, string> = { ...pins,
  'audited-role-guard-installer.sql': String(pins['audited-role-guard.sql']) === 'd00f270f726111283289dc02a050125128541fdb414e08812660bc0ccb232f21'
    ? 'c8ff5783981a93048359b66b35a35793cc131df843da40f1b432c5f75df69d30' : pins['audited-role-guard-installer.sql'],
};
// Thirty seconds is a test-case lifecycle budget only, never a business SLA,
// statement-timeout approval or workload performance guarantee. Each variant
// is a separate case; its own rollback/restoration finishes before the next case.
const QA_ONLY_CASE_TIMEOUT_MS = 30000;
const leasePath = process.env.F_OL_OWNED_LEASE, runPath = process.env.F_OL_RUN_DIR;
const hash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
const q = (value: string) => '"' + value.replace(/"/g, '""') + '"';
const literal = (value: string) => "'" + value.replace(/'/g, "''") + "'";
const validatorSignature = 'nevora_tenancy.require_original_runtime_login_kind()';
const guardSignature = 'nevora_tenancy.assert_audited_runtime_role(text)';
const oldNativeSHA256 = 'fba1c31e39cf91ef4f3287968d2a2ec3fa93ca6faf32d796b6fd03fbf53c137f';
const retainedOldNative = "audit_contracts(name,route_kind,argument_types,return_type,runtime_kinds) AS (\n  VALUES\n    ('resolve_portal','DIRECT_CALL','25 25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['APP']::pg_catalog.text[]),\n    ('resolve_clocker','DIRECT_CALL','25 25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['APP']::pg_catalog.text[]),\n    ('resolve_calendar','DIRECT_CALL','25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['APP']::pg_catalog.text[]),\n    ('resolve_worker','DIRECT_CALL','25 25 25 25 25 25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['WORKER']::pg_catalog.text[]),\n    ('resolve_provisioner','DIRECT_CALL','25 25 25 25 25 25 25 25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['APP']::pg_catalog.text[]),\n    ('lock_and_assert_current_proof','DIRECT_CALL','3802'::pg_catalog.oidvector::pg_catalog.oid[],16::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[]),\n    ('assert_current_proof','DIRECT_CALL','3802'::pg_catalog.oidvector::pg_catalog.oid[],16::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[]),\n    ('source_write_fence','TRIGGER_ROUTE',''::pg_catalog.oidvector::pg_catalog.oid[],2279::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[]),\n    ('source_identity_guard','TRIGGER_ROUTE',''::pg_catalog.oidvector::pg_catalog.oid[],2279::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[]),\n    ('historical_pair_guard','TRIGGER_ROUTE',''::pg_catalog.oidvector::pg_catalog.oid[],2279::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[])\n), audit_runtime_bindings AS (\n  SELECT b.kind,b.role_oid,b.role_name FROM nevora_tenancy.runtime_role_binding AS b\n  JOIN pg_catalog.pg_roles AS r ON r.oid=b.role_oid AND r.rolname=b.role_name\n  WHERE b.kind COLLATE pg_catalog.\"C\" IN ('APP','WORKER') AND r.rolcanlogin\n    AND NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcreaterole\n    AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolinherit\n    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members AS m\n      WHERE m.member=r.oid OR m.roleid=r.oid OR m.grantor=r.oid)\n    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_shdepend AS d\n      WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND d.refobjid=r.oid AND d.deptype='o')\n), audit_settings AS (\n  SELECT DISTINCT c.oid FROM nevora_tenancy.runtime_role_binding AS b\n  JOIN pg_catalog.pg_class AS c ON c.oid=b.pg_settings_oid\n  JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace\n  WHERE c.oid='pg_catalog.pg_settings'::pg_catalog.regclass AND c.relkind='v' AND n.nspname='pg_catalog'\n    AND pg_catalog.pg_get_viewdef(c.oid,false) COLLATE pg_catalog.\"C\"=b.pg_settings_definition COLLATE pg_catalog.\"C\"\n    AND ARRAY(SELECT pg_catalog.pg_get_ruledef(w.oid,false) FROM pg_catalog.pg_rewrite AS w\n      WHERE w.ev_class=c.oid ORDER BY w.rulename COLLATE pg_catalog.\"C\") COLLATE pg_catalog.\"C\"\n      =b.pg_settings_rules COLLATE pg_catalog.\"C\"\n), audit_functions AS (\n  SELECT p.oid,p.proowner AS owner_oid,p.pronamespace AS schema_oid,n.nspname AS schema_name,\n    p.prosecdef AS security_definer,\n    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8')), 'hex') AS source_sha256,\n    pg_catalog.jsonb_build_object(\n      'oid',p.oid::text,'schemaOid',n.oid::text,'schema',n.nspname::text,'name',p.proname::text,\n      'identityArguments',pg_catalog.pg_get_function_identity_arguments(p.oid),\n      'definition',pg_catalog.pg_get_functiondef(p.oid),'ownerOid',p.proowner::text,\n      'languageOid',l.oid::text,'language',l.lanname::text,'returnTypeOid',p.prorettype::text,\n      'argumentTypeOids',pg_catalog.to_jsonb(ARRAY(SELECT arg::text FROM pg_catalog.unnest(p.proargtypes::pg_catalog.oid[]) WITH ORDINALITY AS args(arg,position) ORDER BY position)),\n      'kind',p.prokind::text,'volatility',p.provolatile::text,'securityDefiner',p.prosecdef,\n      'leakproof',p.proleakproof,'parallel',p.proparallel::text,'variadicTypeOid',p.provariadic::text,\n      'defaultArgumentCount',p.pronargdefaults,'supportFunctionOid',p.prosupport::pg_catalog.oid::text,\n      'configuration',pg_catalog.to_jsonb(p.proconfig),'returnsSet',p.proretset,\n      'acl',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n        'grantorOid',a.grantor::text,'granteeOid',a.grantee::text,'privilege',a.privilege_type,'isGrantable',a.is_grantable)\n        ORDER BY a.grantee,a.grantor,a.privilege_type COLLATE pg_catalog.\"C\",a.is_grantable)\n        FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog.\"char\",p.proowner))) AS a),'[]'::pg_catalog.jsonb)\n    ) AS observation\n  FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace\n  JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang\n  WHERE p.prokind='f'\n), audit_routes AS (\n  SELECT t.oid,t.tgfoid AS function_oid,t.tgrelid AS relation_oid,\n    pg_catalog.jsonb_build_object(\n      'oid',t.oid::text,'relationOid',c.oid::text,'relationSchemaOid',n.oid::text,\n      'relationSchema',n.nspname::text,'relationName',c.relname::text,'relationKind',c.relkind::text,\n      'relationPersistence',c.relpersistence::text,'relationOwnerOid',c.relowner::text,\n      'relationRls',c.relrowsecurity,'relationForceRls',c.relforcerowsecurity,\n      'functionOid',t.tgfoid::text,'name',t.tgname::text,'definition',pg_catalog.pg_get_triggerdef(t.oid,false),\n      'enabled',t.tgenabled::text,'internal',t.tgisinternal,'type',t.tgtype,\n      'parentOid',t.tgparentid::text,'constraintOid',t.tgconstraint::text,\n      'constraintRelationOid',t.tgconstrrelid::text,'constraintIndexOid',t.tgconstrindid::text,\n      'deferrable',t.tgdeferrable,'initiallyDeferred',t.tginitdeferred,\n      'argumentCount',t.tgnargs,'argumentsHex',pg_catalog.encode(t.tgargs,'hex'),\n      'attributeNumbers',pg_catalog.to_jsonb(ARRAY(SELECT att::int FROM pg_catalog.unnest(t.tgattr::pg_catalog.int2[]) WITH ORDINALITY AS attrs(att,position) ORDER BY position)),\n      'qualifier',pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,false),\n      'oldTransitionTable',t.tgoldtable::text,'newTransitionTable',t.tgnewtable::text\n    ) AS observation\n  FROM pg_catalog.pg_trigger AS t JOIN pg_catalog.pg_class AS c ON c.oid=t.tgrelid\n  JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace\n), audit_lock_columns AS (\n  -- A native source match is not proof of immutability or approval. Installing a\n  -- nonempty list needs the separately retained source-completeness review.\n  SELECT c.oid AS relation_oid,a.attnum AS attribute_number,\n    pg_catalog.jsonb_build_object('relationOid',c.oid::text,'relationSchemaOid',n.oid::text,\n      'schema',n.nspname::text,'name',c.relname::text,'column',a.attname::text,\n      'attributeNumber',a.attnum,'typeOid',a.atttypid::text,\n      'sourceObservation',pg_catalog.jsonb_build_object(\n        'kind',c.relkind::text,'persistence',c.relpersistence::text,'ownerOid',c.relowner::text,\n        'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,\n        'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n          'number',col.attnum,'name',col.attname::text,'typeOid',col.atttypid::text,'typeModifier',col.atttypmod,\n          'notNull',col.attnotnull,'identity',col.attidentity::text,'generated',col.attgenerated::text,\n          'default',pg_catalog.pg_get_expr(def.adbin,def.adrelid,false)) ORDER BY col.attnum)\n          FROM pg_catalog.pg_attribute AS col LEFT JOIN pg_catalog.pg_attrdef AS def ON def.adrelid=col.attrelid AND def.adnum=col.attnum\n          WHERE col.attrelid=c.oid AND col.attnum>0 AND NOT col.attisdropped),'[]'::pg_catalog.jsonb),\n        'constraints',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n          'oid',co.oid::text,'name',co.conname::text,'definition',pg_catalog.pg_get_constraintdef(co.oid,false),\n          'validated',co.convalidated,'deferrable',co.condeferrable,'deferred',co.condeferred,\n          'enforced',pg_catalog.to_jsonb(co)->'conenforced') ORDER BY co.oid)\n          FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid),'[]'::pg_catalog.jsonb),\n        'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n          'oid',policy.oid::text,'name',policy.polname::text,'command',policy.polcmd::text,\n          'permissive',policy.polpermissive,'roleOids',pg_catalog.to_jsonb(ARRAY(\n            SELECT target.role_oid::text FROM pg_catalog.unnest(policy.polroles) AS target(role_oid) ORDER BY target.role_oid)),\n          'using',pg_catalog.pg_get_expr(policy.polqual,policy.polrelid,false),\n          'withCheck',pg_catalog.pg_get_expr(policy.polwithcheck,policy.polrelid,false)) ORDER BY policy.oid)\n          FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid=c.oid),'[]'::pg_catalog.jsonb),\n        'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n          'route',route.observation,'function',f.observation) ORDER BY route.oid)\n          FROM audit_routes AS route JOIN audit_functions AS f ON f.oid=route.function_oid WHERE route.relation_oid=c.oid),'[]'::pg_catalog.jsonb),\n        'rules',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n          'oid',w.oid::text,'enabled',w.ev_enabled::text,'definition',pg_catalog.pg_get_ruledef(w.oid,false)) ORDER BY w.oid)\n          FROM pg_catalog.pg_rewrite AS w WHERE w.ev_class=c.oid),'[]'::pg_catalog.jsonb))) AS observation\n  FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace\n  JOIN pg_catalog.pg_attribute AS a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped\n  WHERE c.relkind IN ('r','p') AND c.relpersistence='p' AND n.nspname<>'pg_catalog'\n    AND NOT (n.nspname='nevora_tenancy' AND c.relname IN ('runtime_role_binding','audited_helper_capability'))\n), audit_function_current AS (\n  -- Stage one is intentionally independent of owner/ACL profile observations.\n  -- It permits source-bound provisional rows inside the installer's transaction\n  -- to bootstrap actual owner closure. Such rows still fail audit_capabilities.\n  SELECT c.runtime_kind,c.route_kind,c.function_oid,c.route_oid,f.owner_oid\n  FROM nevora_tenancy.audited_helper_capability AS c\n  JOIN audit_functions AS f ON f.oid=c.function_oid\n  JOIN pg_catalog.pg_proc AS p ON p.oid=f.oid\n  JOIN audit_contracts AS contract ON p.proname=contract.name AND c.route_kind=contract.route_kind\n    AND c.runtime_kind=ANY(contract.runtime_kinds)\n  JOIN pg_catalog.pg_roles AS owner ON owner.oid=f.owner_oid\n  JOIN audit_runtime_bindings AS binding ON binding.kind=c.runtime_kind\n  LEFT JOIN audit_routes AS route ON route.oid=c.route_oid AND route.function_oid=c.function_oid\n  WHERE f.schema_name='nevora_tenancy'\n    AND c.runtime_kind COLLATE pg_catalog.\"C\" IN ('APP','WORKER')\n    AND c.route_kind COLLATE pg_catalog.\"C\" IN ('DIRECT_CALL','TRIGGER_ROUTE') AND c.function_observation = f.observation\n    AND c.review_source_sha256 = f.source_sha256 AND c.review_reference<>''\n    -- Both vectors preserve the native oidvector zero lower bound; no text\n    -- identity spelling or SQL array-dimension mismatch substitutes for types.\n    AND p.proargtypes::pg_catalog.oid[] = contract.argument_types\n    AND p.prorettype = contract.return_type AND p.prokind='f' AND NOT p.proretset\n    AND p.provolatile='v' AND p.prosecdef AND NOT p.proleakproof AND p.proparallel='u'\n    AND p.provariadic=0 AND p.pronargdefaults=0 AND p.prosupport=0\n    AND f.observation->>'language' IN ('sql','plpgsql')\n    AND (p.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[] OR\n      p.proconfig=ARRAY['search_path=pg_catalog, nevora_tenancy']::pg_catalog.text[])\n    AND NOT owner.rolcanlogin AND NOT owner.rolsuper AND NOT owner.rolbypassrls\n    AND NOT owner.rolcreaterole AND NOT owner.rolcreatedb AND NOT owner.rolreplication AND NOT owner.rolinherit\n    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members AS m\n      WHERE m.member=owner.oid OR m.roleid=owner.oid OR m.grantor=owner.oid)\n    AND ((c.route_kind='DIRECT_CALL' AND c.route_oid=0 AND c.route_observation IS NULL\n      AND pg_catalog.has_function_privilege(binding.role_oid,p.oid,'EXECUTE')\n      AND pg_catalog.has_schema_privilege(binding.role_oid,p.pronamespace,'USAGE')) OR\n      (c.route_kind='TRIGGER_ROUTE' AND c.route_oid<>0 AND c.route_observation IS NOT NULL\n       AND c.route_observation = route.observation AND (route.observation->>'internal')::pg_catalog.bool=false\n       AND route.observation->>'enabled' IN ('O','A','R')\n       AND (pg_catalog.has_table_privilege(binding.role_oid,route.relation_oid,'INSERT,UPDATE,DELETE')\n         OR pg_catalog.has_any_column_privilege(binding.role_oid,route.relation_oid,'INSERT,UPDATE'))))\n    AND NOT EXISTS (\n      SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog.\"char\",p.proowner))) AS acl\n      WHERE acl.is_grantable OR acl.privilege_type<>'EXECUTE' OR (acl.grantee<>p.proowner AND NOT (\n        c.route_kind='DIRECT_CALL' AND EXISTS (SELECT 1 FROM audit_runtime_bindings AS binding\n          WHERE binding.role_oid = acl.grantee AND binding.kind=ANY(contract.runtime_kinds) AND EXISTS (\n            SELECT 1 FROM nevora_tenancy.audited_helper_capability AS named\n            WHERE named.function_oid=c.function_oid AND named.runtime_kind COLLATE pg_catalog.\"C\"=binding.kind COLLATE pg_catalog.\"C\"\n              AND named.route_kind='DIRECT_CALL' AND named.route_oid=0 AND named.route_observation IS NULL\n              AND named.function_observation=f.observation AND named.review_source_sha256=f.source_sha256\n              AND named.review_reference<>''))))\n    )\n), audit_owner_ids AS (\n  -- Capture raw actual owners even with empty/invalid registrations or unsafe\n  -- flags. Observation does not approve them; safe is evaluated separately.\n  SELECT DISTINCT f.owner_oid AS oid FROM audit_functions AS f\n  JOIN pg_catalog.pg_proc AS p ON p.oid=f.oid\n  JOIN audit_contracts AS contract ON p.proname=contract.name\n    AND p.proargtypes::pg_catalog.oid[]=contract.argument_types AND p.prorettype=contract.return_type\n  WHERE f.schema_name='nevora_tenancy'\n), audit_owner_native_acls AS (\n  -- Native defaults matter: an absent explicit ACL is not an absent privilege.\n  SELECT 'DATABASE'::text AS class,d.oid AS object_oid,0::int AS sub_id,a.*\n    FROM pg_catalog.pg_database AS d CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(d.datacl,pg_catalog.acldefault('d'::pg_catalog.\"char\",d.datdba))) AS a\n  UNION ALL SELECT 'SCHEMA',n.oid,0,a.* FROM pg_catalog.pg_namespace AS n CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n'::pg_catalog.\"char\",n.nspowner))) AS a\n  UNION ALL SELECT 'RELATION',c.oid,0,a.* FROM pg_catalog.pg_class AS c CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault(CASE WHEN c.relkind='S' THEN 's'::pg_catalog.\"char\" ELSE 'r'::pg_catalog.\"char\" END,c.relowner))) AS a\n  UNION ALL SELECT 'COLUMN',c.oid,col.attnum,a.* FROM pg_catalog.pg_attribute AS col JOIN pg_catalog.pg_class AS c ON c.oid=col.attrelid CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(col.attacl,pg_catalog.acldefault('c'::pg_catalog.\"char\",c.relowner))) AS a WHERE col.attnum>0 AND NOT col.attisdropped\n  UNION ALL SELECT 'FUNCTION',p.oid,0,a.* FROM pg_catalog.pg_proc AS p CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog.\"char\",p.proowner))) AS a\n  UNION ALL SELECT 'TYPE',t.oid,0,a.* FROM pg_catalog.pg_type AS t CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.typacl,pg_catalog.acldefault('T'::pg_catalog.\"char\",t.typowner))) AS a\n  UNION ALL SELECT 'LANGUAGE',l.oid,0,a.* FROM pg_catalog.pg_language AS l CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(l.lanacl,pg_catalog.acldefault('l'::pg_catalog.\"char\",l.lanowner))) AS a\n  UNION ALL SELECT 'TABLESPACE',t.oid,0,a.* FROM pg_catalog.pg_tablespace AS t CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.spcacl,pg_catalog.acldefault('t'::pg_catalog.\"char\",t.spcowner))) AS a\n  UNION ALL SELECT 'FDW',f.oid,0,a.* FROM pg_catalog.pg_foreign_data_wrapper AS f CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(f.fdwacl,pg_catalog.acldefault('F'::pg_catalog.\"char\",f.fdwowner))) AS a\n  UNION ALL SELECT 'SERVER',s.oid,0,a.* FROM pg_catalog.pg_foreign_server AS s CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(s.srvacl,pg_catalog.acldefault('S'::pg_catalog.\"char\",s.srvowner))) AS a\n  UNION ALL SELECT 'DEFAULT_ACL',d.oid,0,a.* FROM pg_catalog.pg_default_acl AS d CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) AS a\n  UNION ALL SELECT 'LARGE_OBJECT',l.oid,0,a.* FROM pg_catalog.pg_largeobject_metadata AS l CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(l.lomacl,pg_catalog.acldefault('L'::pg_catalog.\"char\",l.lomowner))) AS a\n  UNION ALL SELECT 'PARAMETER',p.oid,0,a.* FROM pg_catalog.pg_parameter_acl AS p CROSS JOIN LATERAL pg_catalog.aclexplode(p.paracl) AS a\n), audit_owner_checks AS (\n  SELECT owner.oid,\n    pg_catalog.has_database_privilege(owner.oid,pg_catalog.current_database(),'CREATE') AS database_create,\n    pg_catalog.has_database_privilege(owner.oid,pg_catalog.current_database(),'TEMPORARY') AS database_temporary,\n    EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS n WHERE pg_catalog.has_schema_privilege(owner.oid,n.oid,'CREATE')) AS schema_create,\n    EXISTS (SELECT 1 FROM pg_catalog.pg_tablespace AS t WHERE pg_catalog.has_tablespace_privilege(owner.oid,t.oid,'CREATE')) AS tablespace_create,\n    -- Only matching explicitly reviewed row-lock column UPDATE can be excepted.\n    -- All table-level writes, INSERT/REFERENCES columns and other mutations deny.\n    EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c\n      WHERE c.relkind IN ('r','p','v','m','f','S') AND (\n        (c.relkind='S' AND pg_catalog.has_sequence_privilege(owner.oid,c.oid,'USAGE,UPDATE')) OR\n        (c.relkind<>'S' AND (pg_catalog.has_table_privilege(owner.oid,c.oid,'INSERT,DELETE,REFERENCES,TRUNCATE,TRIGGER,MAINTAIN')\n          OR pg_catalog.has_any_column_privilege(owner.oid,c.oid,'INSERT,REFERENCES')\n          OR (c.oid NOT IN (SELECT settings.oid FROM audit_settings AS settings) AND (\n            pg_catalog.has_table_privilege(owner.oid,c.oid,'UPDATE') OR EXISTS (\n              SELECT 1 FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped\n                AND pg_catalog.has_column_privilege(owner.oid,c.oid,a.attnum,'UPDATE') AND NOT EXISTS (\n                  SELECT 1 FROM nevora_tenancy.audited_helper_capability AS registered\n                  JOIN audit_function_current AS current ON current.function_oid=registered.function_oid\n                    AND current.runtime_kind=registered.runtime_kind AND current.route_kind=registered.route_kind AND current.route_oid=registered.route_oid\n                  CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(registered.owner_lock_columns) AS declared(value)\n                  JOIN audit_lock_columns AS lock_column ON lock_column.relation_oid=c.oid AND lock_column.attribute_number=a.attnum\n                  WHERE current.owner_oid=owner.oid AND lock_column.observation = declared.value))))))\n      )) OR EXISTS (SELECT 1 FROM audit_owner_native_acls AS acl WHERE acl.class='LARGE_OBJECT'\n        AND acl.grantee IN (0::pg_catalog.oid,owner.oid) AND acl.privilege_type='UPDATE') AS destructive_or_trigger_or_maintain,\n    EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace\n      WHERE n.nspname='nevora_tenancy' AND c.relname IN ('runtime_role_binding','audited_helper_capability') AND (\n        pg_catalog.has_table_privilege(owner.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')\n        OR pg_catalog.has_any_column_privilege(owner.oid,c.oid,'INSERT,UPDATE,REFERENCES'))) AS control_registry_mutation,\n    EXISTS (SELECT 1 FROM pg_catalog.pg_parameter_acl AS p CROSS JOIN LATERAL pg_catalog.aclexplode(p.paracl) AS a\n      WHERE a.grantee IN (0::pg_catalog.oid,owner.oid)) AS parameter_grants,\n    EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_data_wrapper AS f WHERE pg_catalog.has_foreign_data_wrapper_privilege(owner.oid,f.oid,'USAGE'))\n      OR EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_server AS s WHERE pg_catalog.has_server_privilege(owner.oid,s.oid,'USAGE')) AS foreign_data_usage,\n    EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace\n      WHERE n.nspname='pg_catalog' AND pg_catalog.has_function_privilege(owner.oid,p.oid,'EXECUTE') AND NOT EXISTS (\n        SELECT 1 FROM pg_catalog.aclexplode(COALESCE((SELECT i.initprivs FROM pg_catalog.pg_init_privs AS i\n          WHERE i.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND i.objoid=p.oid AND i.objsubid=0),\n          pg_catalog.acldefault('f'::pg_catalog.\"char\",p.proowner))) AS initial\n        WHERE initial.grantee=0::pg_catalog.oid AND initial.privilege_type='EXECUTE')) AS new_privileged_catalog_calls,\n    EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p\n      WHERE p.prosecdef AND pg_catalog.has_function_privilege(owner.oid,p.oid,'EXECUTE')\n        AND pg_catalog.has_schema_privilege(owner.oid,p.pronamespace,'USAGE')\n        AND NOT EXISTS (SELECT 1 FROM audit_function_current AS current WHERE current.function_oid=p.oid)) AS unreviewed_callable_definers\n  FROM audit_owner_ids AS ids JOIN pg_catalog.pg_roles AS owner ON owner.oid=ids.oid\n), audit_owners AS (\n  SELECT owner.oid,\n    pg_catalog.jsonb_build_object('oid',owner.oid::text,'name',owner.rolname::text,'canLogin',owner.rolcanlogin,\n      'superuser',owner.rolsuper,'bypassRls',owner.rolbypassrls,'createRole',owner.rolcreaterole,\n      'createDb',owner.rolcreatedb,'replication',owner.rolreplication,'inherit',owner.rolinherit,\n      'memberships',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n        'roleOid',m.roleid::text,'memberOid',m.member::text,'grantorOid',m.grantor::text,\n        'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option) ORDER BY m.roleid,m.member,m.grantor)\n        FROM pg_catalog.pg_auth_members AS m WHERE m.member=owner.oid OR m.roleid=owner.oid OR m.grantor=owner.oid),'[]'::pg_catalog.jsonb),\n      'ownership',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n        'databaseOid',d.dbid::text,'classOid',d.classid::text,'objectOid',d.objid::text,'subId',d.objsubid,'dependencyType',d.deptype::text)\n        ORDER BY d.dbid,d.classid,d.objid,d.objsubid,d.deptype)\n        FROM pg_catalog.pg_shdepend AS d WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND d.refobjid=owner.oid AND d.deptype='o'),'[]'::pg_catalog.jsonb)\n    ) AS observation,\n    pg_catalog.jsonb_build_object('aclRows',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(\n      'class',a.class,'objectOid',a.object_oid::text,'subId',a.sub_id,'grantorOid',a.grantor::text,\n      'granteeOid',a.grantee::text,'privilege',a.privilege_type,'isGrantable',a.is_grantable)\n      ORDER BY a.class COLLATE pg_catalog.\"C\",a.object_oid,a.sub_id,a.grantee,a.grantor,a.privilege_type COLLATE pg_catalog.\"C\",a.is_grantable)\n      FROM audit_owner_native_acls AS a WHERE a.grantee IN (0::pg_catalog.oid,owner.oid)),'[]'::pg_catalog.jsonb),\n      'effectiveChecks',pg_catalog.jsonb_build_object('databaseCreate',checks.database_create,'databaseTemporary',checks.database_temporary,\n        'schemaCreate',checks.schema_create,'tablespaceCreate',checks.tablespace_create,\n        'destructiveOrTriggerOrMaintain',checks.destructive_or_trigger_or_maintain,\n        'controlRegistryMutation',checks.control_registry_mutation,'parameterGrants',checks.parameter_grants,\n        'foreignDataUsage',checks.foreign_data_usage,'newPrivilegedCatalogCalls',checks.new_privileged_catalog_calls,\n        'unreviewedCallableDefiners',checks.unreviewed_callable_definers)) AS acl_observation,\n    NOT (checks.database_create OR checks.database_temporary OR checks.schema_create OR checks.tablespace_create\n      OR checks.destructive_or_trigger_or_maintain OR checks.control_registry_mutation OR checks.parameter_grants\n      OR checks.foreign_data_usage OR checks.new_privileged_catalog_calls OR checks.unreviewed_callable_definers)\n      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_shdepend AS d\n        WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND d.refobjid=owner.oid AND d.deptype='o' AND NOT (\n          d.dbid=(SELECT db.oid FROM pg_catalog.pg_database AS db WHERE db.datname=pg_catalog.current_database())\n          AND d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objsubid=0\n          AND EXISTS (SELECT 1 FROM audit_function_current AS current WHERE current.function_oid=d.objid AND current.owner_oid=owner.oid)))\n      AND NOT EXISTS (SELECT 1 FROM audit_owner_native_acls AS a WHERE a.grantee IN (0::pg_catalog.oid,owner.oid) AND a.is_grantable) AS safe\n  FROM audit_owner_ids AS ids JOIN pg_catalog.pg_roles AS owner ON owner.oid=ids.oid\n  JOIN audit_owner_checks AS checks ON checks.oid=owner.oid\n), audit_owner_consistency AS (\n  SELECT current.owner_oid FROM nevora_tenancy.audited_helper_capability AS c\n  JOIN audit_function_current AS current ON current.runtime_kind=c.runtime_kind AND current.route_kind=c.route_kind\n    AND current.function_oid=c.function_oid AND current.route_oid=c.route_oid\n  GROUP BY current.owner_oid\n  HAVING COUNT(DISTINCT c.owner_observation)=1 AND COUNT(DISTINCT c.owner_acl_observation)=1\n    AND COUNT(DISTINCT c.owner_lock_columns)=1\n), audit_capabilities AS (\n  SELECT c.runtime_kind,c.route_kind,c.function_oid,c.route_oid\n  FROM nevora_tenancy.audited_helper_capability AS c JOIN audit_function_current AS current\n    ON current.runtime_kind=c.runtime_kind AND current.route_kind=c.route_kind AND current.function_oid=c.function_oid AND current.route_oid=c.route_oid\n  JOIN audit_owners AS o ON o.oid=current.owner_oid AND o.safe\n  JOIN audit_owner_consistency AS consistent ON consistent.owner_oid=o.oid\n  WHERE c.owner_observation = o.observation AND c.owner_acl_observation = o.acl_observation\n    AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(c.owner_lock_columns) AS declared(value)\n      WHERE NOT EXISTS (SELECT 1 FROM audit_lock_columns AS lock_column\n        WHERE lock_column.observation = declared.value AND pg_catalog.has_column_privilege(o.oid,lock_column.relation_oid,lock_column.attribute_number,'UPDATE')))\n    AND pg_catalog.jsonb_array_length(c.owner_lock_columns)=(SELECT COUNT(DISTINCT declared.value) FROM pg_catalog.jsonb_array_elements(c.owner_lock_columns) AS declared(value))\n    AND NOT EXISTS (SELECT 1 FROM nevora_tenancy.audited_helper_capability AS sibling\n      WHERE sibling.function_oid=c.function_oid AND sibling.dependencies<>c.dependencies)\n    AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(c.dependencies) AS dependency(value)\n      WHERE NOT EXISTS (SELECT 1 FROM audit_functions AS f WHERE f.observation=dependency.value\n        AND pg_catalog.has_function_privilege(o.oid,f.oid,'EXECUTE') AND pg_catalog.has_schema_privilege(o.oid,f.schema_oid,'USAGE')\n        AND (f.schema_name='pg_catalog' OR EXISTS (SELECT 1 FROM audit_function_current AS target WHERE target.function_oid=f.oid))))\n    AND pg_catalog.jsonb_array_length(c.dependencies)=(SELECT COUNT(DISTINCT dependency.value) FROM pg_catalog.jsonb_array_elements(c.dependencies) AS dependency(value))\n    -- Every native pg_depend function edge is covered; this cannot prove PL/pgSQL\n    -- callgraph completeness or dynamic SQL. Those source-review gates stay open.\n    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend AS d\n      WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid=c.function_oid\n        AND d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.refobjid<>c.function_oid\n        AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(c.dependencies) AS dependency(value)\n          JOIN audit_functions AS f ON f.observation=dependency.value WHERE f.oid=d.refobjid))\n)";
type Lease = { scope: string; closed: boolean; invocation: string; authorizationReference: string;
  root: string; data: string; pid: number; pidStart: string; port: number; systemIdentifier: string;
  database: string; databaseOid: string | number; marker: string; user: string; credentialFile: string };
type Role = { name: string; oid: string };
type OwnedObject = { kind: 'schema' | 'table' | 'function'; schema: string; name: string;
  oid: string; ownerOid: string; signature?: string; dropped: boolean };
type JsonRecord = Record<string, unknown>;
type Capability = { runtime_kind: 'APP' | 'WORKER'; route_kind: 'DIRECT_CALL'; function_oid: string; route_oid: '0';
  function_observation: JsonRecord; owner_observation: JsonRecord; owner_acl_observation: JsonRecord;
  dependencies: JsonRecord[]; route_observation: null; review_reference: string; review_source_sha256: string; owner_lock_columns: [] };
type Outcome = { firstGuard: boolean; finalGuard: boolean | null; value: unknown; sqlstate: string;
  messageTag: string; identity: JsonRecord; immediateStatus: string | null; synchronizedStatus: string | null };

describe.skipIf(!leasePath && !runPath)('root-owned original LOGIN native prerequisite', () => {
  let lease: Lease, admin: Client, app: Client, worker: Client, outsider: Client, fenceInstaller: Client | undefined;
  let password = '', installerOid = '', verified = false, runVerified = false;
  let appRole: Role, workerRole: Role, outsiderRole: Role, appOwner: Role, workerOwner: Role, undeclaredOwner: Role;
  let guardSource = '', validatorSource = '', baselineRoles: unknown, baselineRows: Capability[] = [];
  let setupCommitted = false;
  const sources: Record<string, string> = {}, roles: Role[] = [], objects: OwnedObject[] = [];
  const recordDigest = createHash('sha256');
  let recordCount = 0, recordBytes = 0;
  const featureObservations: { caseId: 'OL01'; outcome: Outcome }[] = [];
  const clients = new Set<Client>(), closedClients = new Set<Client>(), pending = new Set<Promise<unknown>>();
  const roots: { kind: 'APP' | 'WORKER'; signature: string; owner: Role; depends: boolean; object: OwnedObject }[] = [];
  const sqlstate = (error: unknown) => {
    const code = (error as { code?: unknown })?.code;
    return typeof code === 'string' && /^[A-Z0-9]{5}$/.test(code) ? code : 'UNKNOWN';
  };
  const messageTag = (error: unknown) => {
    const value = (error as { message?: unknown })?.message;
    return value === 'original_runtime_login_denied' ? 'ORIGINAL_LOGIN_FIXED_DENIAL'
      : value === 'fictional_original_login_kind_denied' ? 'FIXTURE_FIXED_KIND_DENIAL' : 'OTHER_SUPPRESSED';
  };
  function record(value: unknown) {
    const encoded = JSON.stringify(value), line = encoded + '\n';
    appendFileSync(join(runPath!, 'original-login-operations.jsonl'), line, { mode: 0o600 });
    recordDigest.update(line, 'utf8'); recordCount += 1; recordBytes += Buffer.byteLength(line, 'utf8');
    const observation = value as { caseId?: unknown; outcome?: Outcome };
    if (observation.caseId === 'OL01' && observation.outcome)
      featureObservations.push(JSON.parse(JSON.stringify({ caseId: 'OL01', outcome: observation.outcome })));
  }
  async function query(client: Client, text: string, values: unknown[] = []) {
    try { return await client.query(text, values); } catch (error) { throw Error('owned_original_login_sql_' + sqlstate(error)); }
  }
  async function rejected(client: Client, text: string, values: unknown[] = []) {
    try { await client.query(text, values); return { sqlstate: 'NO_ERROR', messageTag: 'NONE' }; }
    catch (error) { return { sqlstate: sqlstate(error), messageTag: messageTag(error) }; }
  }
  async function connect(user: string) {
    const client = new Client({ host: '127.0.0.1', port: lease.port, database: lease.database, user, password,
      connectionTimeoutMillis: 3000, statement_timeout: 15000 }); clients.add(client);
    try { await client.connect(); } catch { throw Error('owned_original_login_connection_failed'); }
    await query(client, 'SET search_path=pg_catalog'); expect(client.getTransactionStatus()).toBe('I'); return client;
  }
  async function baseIdentity() {
    const row = (await query(admin, `SELECT current_database() db,
      (SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) oid,
      pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database()),'pg_database') marker,
      current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()) system_id,
      session_user::text role,current_user::text current_role,pg_catalog.host(pg_catalog.inet_server_addr()) host,
      pg_catalog.inet_server_port() port,current_setting('server_version') version,current_setting('server_encoding') encoding`)).rows[0];
    expect(row).toMatchObject({ db: lease.database, oid: String(lease.databaseOid), marker: lease.marker,
      data: lease.data, system_id: lease.systemIdentifier, role: lease.user, current_role: lease.user,
      host: '127.0.0.1', port: lease.port, encoding: 'UTF8' }); expect(row.version).toMatch(/^18\.4(?:\s|$)/); return row;
  }
  async function identity(client: Client) {
    return (await query(client, `SELECT pg_catalog.pg_backend_pid() pid,session_user::text session,current_user::text current_role,
      current_setting('role') role,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_backend_pid()) original_oid`)).rows[0] as JsonRecord;
  }
  async function roleCatalog() {
    return (await query(admin, 'SELECT oid::text oid,rolname::text name,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls FROM pg_catalog.pg_roles ORDER BY oid')).rows;
  }
  async function createRole(suffix: string, login: boolean) {
    const name = lease.invocation + '_' + suffix;
    expect((await query(admin, 'SELECT oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows).toEqual([]);
    await query(admin, 'CREATE ROLE ' + q(name) + (login ? ' LOGIN' : ' NOLOGIN') + ' NOSUPERUSER NOBYPASSRLS NOCREATEROLE NOCREATEDB NOREPLICATION NOINHERIT' + (login ? ' PASSWORD ' + literal(password) : ''));
    const role = { name, oid: (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [name])).rows[0].oid as string };
    roles.push(role); record({ operation: 'EXACT_OWN_ROLE_CREATED', ...role, login }); return role;
  }
  async function remember(kind: OwnedObject['kind'], schema: string, name: string, ownerOid: string, signature?: string) {
    const row = kind === 'schema'
      ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE nspname=$1', [name])).rows[0]
      : kind === 'table' ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=pg_catalog.to_regclass($1)', [q(schema) + '.' + q(name)])).rows[0]
        : (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)', [q(schema) + '.' + q(name) + signature])).rows[0];
    expect(row).toEqual({ oid: expect.stringMatching(/^[0-9]+$/), owner: ownerOid });
    const object: OwnedObject = { kind, schema, name, oid: row.oid, ownerOid, ...(signature ? { signature } : {}), dropped: false };
    objects.push(object); record({ operation: 'EXACT_OWN_OBJECT_CREATED', ...object }); return object;
  }
  async function drop(object: OwnedObject) {
    const target = object.kind === 'schema' ? q(object.name) : q(object.schema) + '.' + q(object.name) + (object.signature ?? '');
    const rows = object.kind === 'schema'
      ? (await query(admin, 'SELECT oid::text oid,nspowner::text owner FROM pg_catalog.pg_namespace WHERE oid=$1::oid', [object.oid])).rows
      : object.kind === 'table' ? (await query(admin, 'SELECT oid::text oid,relowner::text owner FROM pg_catalog.pg_class WHERE oid=$1::oid', [object.oid])).rows
        : (await query(admin, 'SELECT oid::text oid,proowner::text owner FROM pg_catalog.pg_proc WHERE oid=$1::oid', [object.oid])).rows;
    expect(rows).toEqual([{ oid: object.oid, owner: object.ownerOid }]);
    if (object.kind !== 'schema') {
      const resolver = object.kind === 'function' ? 'to_regprocedure' : 'to_regclass';
      expect((await query(admin, 'SELECT pg_catalog.' + resolver + '($1)::oid::text oid', [target])).rows).toEqual([{ oid: object.oid }]);
    }
    await query(admin, 'DROP ' + object.kind.toUpperCase() + ' ' + target); object.dropped = true;
    const relation = object.kind === 'schema' ? 'pg_namespace' : object.kind === 'table' ? 'pg_class' : 'pg_proc';
    expect((await query(admin, 'SELECT oid FROM pg_catalog.' + relation + ' WHERE oid=$1::oid', [object.oid])).rows).toEqual([]);
    record({ operation: 'EXACT_OWN_OBJECT_DROPPED', ...object });
  }
  async function exclusive<T>(body: () => Promise<T>): Promise<T> {
    expect(admin.getTransactionStatus()).toBe('I'); await query(admin, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    try { await query(admin, INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text); const value = await body(); await query(admin, 'COMMIT'); return value; }
    finally { await query(admin, 'ROLLBACK'); expect(admin.getTransactionStatus()).toBe('I'); }
  }
  function nativeQuery(select: string) {
    const a = '-- AUDITED_NATIVE_CTES_BEGIN', z = '-- AUDITED_NATIVE_CTES_END';
    expect(guardSource.split(a)).toHaveLength(2); expect(guardSource.split(z)).toHaveLength(2);
    const block = guardSource.slice(guardSource.indexOf(a) + a.length, guardSource.indexOf(z)).trim();
    return { text: 'WITH ' + block + '\n' + select, nativeSHA256: hash(block) };
  }
  async function nativeFunction(signature: string) {
    const command = nativeQuery('SELECT f.observation,f.source_sha256 FROM audit_functions f WHERE f.oid=pg_catalog.to_regprocedure($1)');
    const rows = (await query(admin, command.text, [signature])).rows; expect(rows).toHaveLength(1);
    expect(rows[0].source_sha256).toBe(hash(rows[0].observation.definition)); return rows[0] as { observation: JsonRecord; source_sha256: string };
  }
  async function registryRows(): Promise<Capability[]> {
    return (await query(admin, 'SELECT pg_catalog.to_jsonb(c) value FROM nevora_tenancy.audited_helper_capability c ORDER BY runtime_kind COLLATE pg_catalog."C",function_oid')).rows.map(row => row.value as Capability);
  }
  async function writeCapability(row: Capability, client: Client = admin) {
    const columns = ['runtime_kind','route_kind','function_oid','route_oid','function_observation','owner_observation','owner_acl_observation','dependencies','route_observation','review_reference','review_source_sha256','owner_lock_columns'] as const;
    const jsonColumns: string[] = ['function_observation','owner_observation','owner_acl_observation','dependencies','route_observation','owner_lock_columns'];
    await query(client, 'INSERT INTO nevora_tenancy.audited_helper_capability(' + columns.map(q).join(',') + ') VALUES(' + columns.map((c,i) => '$' + (i+1) + (jsonColumns.includes(c) ? '::jsonb' : '')).join(',') + ')', columns.map(c => jsonColumns.includes(c) ? row[c] === null ? null : JSON.stringify(row[c]) : row[c]));
  }
  async function refreshCapabilities() {
    expect(admin.getTransactionStatus()).toBe('T'); const dependency = (await nativeFunction(validatorSignature)).observation;
    const provisional: Capability[] = [];
    for (const root of roots) {
      const f = await nativeFunction(root.signature);
      provisional.push({ runtime_kind: root.kind, route_kind: 'DIRECT_CALL', function_oid: root.object.oid, route_oid: '0',
        function_observation: f.observation, owner_observation: {}, owner_acl_observation: {}, dependencies: root.depends ? [dependency] : [],
        route_observation: null, review_reference: 'F-DEV-COMPLETE-001:fictional-original-login:' + lease.invocation,
        review_source_sha256: f.source_sha256, owner_lock_columns: [] });
    }
    await query(admin, 'DELETE FROM nevora_tenancy.audited_helper_capability'); for (const row of provisional) await writeCapability(row);
    const captured: Capability[] = [];
    for (const root of roots) {
      const command = nativeQuery(`SELECT o.observation,o.acl_observation,o.safe FROM audit_owners o WHERE o.oid=$1::oid`);
      const rows = (await query(admin, command.text, [root.owner.oid])).rows; expect(rows).toHaveLength(1);
      const row = provisional.find(item => item.function_oid === root.object.oid)!;
      captured.push({ ...row, owner_observation: rows[0].observation, owner_acl_observation: rows[0].acl_observation });
      record({ operation: 'NATIVE_OWNER_PROFILE_UNMODIFIED', rootOid: root.object.oid, owner: root.owner,
        nativeSHA256: command.nativeSHA256, native: rows[0], noBooleanConstructor: true });
    }
    await query(admin, 'DELETE FROM nevora_tenancy.audited_helper_capability'); for (const row of captured) await writeCapability(row);
    const actual = await registryRows(); expect(actual).toEqual(captured.sort((a,b) => a.runtime_kind < b.runtime_kind ? -1 : a.runtime_kind > b.runtime_kind ? 1 : BigInt(a.function_oid) < BigInt(b.function_oid) ? -1 : 1));
    record({ operation: 'NATIVE_COMPLETE_DESCRIPTOR_PROFILE_CAPTURE', validator: dependency, provisional, actual, guardSourceSHA256: hash(guardSource), claim: 'FIXTURE_OBSERVATIONS_NOT_SOURCE_REVIEW_AUTHORITY_PROOF_OR_ACTIVATION' }); return actual;
  }
  function rootSource(name: 'resolve_portal' | 'resolve_worker', expectedKind: 'APP' | 'WORKER') {
    const args = Array(name === 'resolve_portal' ? 2 : 6).fill('pg_catalog.text').join(',');
    return `CREATE OR REPLACE FUNCTION nevora_tenancy.${name}(${args}) RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER SET search_path=pg_catalog AS $fictional_original_login$ DECLARE observed_kind pg_catalog.text; BEGIN observed_kind:=nevora_tenancy.require_original_runtime_login_kind(); IF observed_kind COLLATE pg_catalog."C" <> '${expectedKind}' THEN RAISE EXCEPTION 'fictional_original_login_kind_denied' USING ERRCODE='42501'; END IF; RETURN pg_catalog.jsonb_build_object('fixture','original-login-only','observedKind',observed_kind); END $fictional_original_login$;`;
  }
  async function poll(body: () => Promise<boolean>, label: string) {
    const end = Date.now() + 8000;
    do { if (await body()) return; await new Promise(done => setTimeout(done, 10)); } while (Date.now() < end);
    throw Error('owned_original_login_observation_timeout_' + label);
  }
  async function guards(client: Client, kind: 'APP' | 'WORKER') {
    return (await query(client, 'SELECT nevora_tenancy.assert_audited_runtime_role($1::text) allowed', [kind])).rows[0].allowed as boolean;
  }
  async function observe(client: Client, kind: 'APP' | 'WORKER', signature?: string): Promise<Outcome> {
    // A substituted installer backend may itself abort. Observe its native state
    // on a distinct exact-owned installer connection, never through aborted SQL.
    const observer = client === admin ? (fenceInstaller ??= await connect(lease.user)) : admin;
    if (client === admin) expect(await identity(observer)).toMatchObject({session:lease.user,current_role:lease.user,role:'none',original_oid:installerOid});
    expect(client.getTransactionStatus()).toBe('I'); await query(client, 'BEGIN ISOLATION LEVEL READ COMMITTED');
    let outcome: Outcome | undefined;
    try {
      // First SQL after own BEGIN; no native role/source statement before fence.
      await query(client, RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
      const currentIdentity = await identity(client), firstGuard = await guards(client, kind);
      const target = signature ?? (kind === 'APP' ? 'nevora_tenancy.resolve_portal' : 'nevora_tenancy.resolve_worker');
      const count = target.endsWith('require_original_runtime_login_kind') ? 0 : kind === 'APP' ? 2 : 6;
      try {
        const value = (await client.query('SELECT ' + target + '(' + Array(count).fill("'fictional'::pg_catalog.text").join(',') + ') value')).rows[0].value;
        outcome = { firstGuard, finalGuard: await guards(client, kind), value, sqlstate: 'NO_ERROR', messageTag: 'NONE',
          identity: currentIdentity, immediateStatus: client.getTransactionStatus() ?? null, synchronizedStatus: client.getTransactionStatus() ?? null };
      } catch (error) {
        const immediateStatus = client.getTransactionStatus() ?? null;
        await poll(async () => {
          const state = (await query(observer, 'SELECT pid,state FROM pg_catalog.pg_stat_activity WHERE pid=$1', [currentIdentity.pid])).rows;
          return state.length === 1 && state[0].state === 'idle in transaction (aborted)' && client.getTransactionStatus() === 'E';
        }, 'ORIGINAL_BACKEND_ABORTED_READY');
        outcome = { firstGuard, finalGuard: null, value: null, sqlstate: sqlstate(error), messageTag: messageTag(error),
          identity: currentIdentity, immediateStatus, synchronizedStatus: client.getTransactionStatus() ?? null };
      }
      record({ operation: 'FRESH_SHARED_NATIVE_LOGIN_OBSERVATION', kind, target, outcome,
        claim: 'ROLE_KIND_FIXTURE_ONLY_NO_CREDENTIAL_CURRENT_PROOF_DOMAIN_OR_TENANT_AUTHORITY' }); return outcome;
    } finally {
      // Own read transaction only, including error promise / ReadyForQuery races.
      await query(client, 'ROLLBACK'); expect(client.getTransactionStatus()).toBe('I');
    }
  }
  const expectAllowed = (outcome: Outcome, kind: 'APP' | 'WORKER') => {
    expect(outcome.firstGuard).toBe(true); expect(outcome.finalGuard).toBe(true);
    expect(outcome.sqlstate).toBe('NO_ERROR'); expect(outcome.value).toEqual({ fixture: 'original-login-only', observedKind: kind });
  };
  const expectDenied = (outcome: Outcome) => {
    expect(outcome.firstGuard).toBe(false); expect(outcome.sqlstate).toBe('42501');
    expect(outcome.messageTag).toBe('ORIGINAL_LOGIN_FIXED_DENIAL'); expect(outcome.synchronizedStatus).toBe('E');
  };
  async function allFunctionCatalog() {
    return (await query(admin, `SELECT p.oid::text oid,p.proowner::text owner,pg_get_functiondef(p.oid) definition,
      p.proargtypes::text args,p.proallargtypes::text allargs,p.proargmodes,p.proargnames,p.prorettype::text returns,
      p.proretset,p.prosecdef,p.provolatile,p.proparallel,p.proleakproof,p.proconfig,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('grantor',a.grantor::text,'grantee',a.grantee::text,
        'privilege',a.privilege_type,'grantable',a.is_grantable) ORDER BY a.grantee,a.grantor,a.privilege_type COLLATE pg_catalog."C",a.is_grantable)
        FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a),'[]'::jsonb) acl
      FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='nevora_tenancy' ORDER BY p.oid`)).rows;
  }
  async function withMutation(label: string, change: () => Promise<void>, undo: () => Promise<void>, body: () => Promise<void>, recapture = true) {
    const before = await registryRows(), catalog = await allFunctionCatalog(), roleRows = await roleCatalog();
    let changed = false;
    try {
      await exclusive(async () => { await change(); if (recapture) await refreshCapabilities(); }); changed = true; await body();
    } finally {
      if (changed) await exclusive(async () => { await undo(); await refreshCapabilities(); });
      expect(await registryRows()).toEqual(before); expect(await allFunctionCatalog()).toEqual(catalog); expect(await roleCatalog()).toEqual(roleRows);
      record({ operation: 'EXACT_MUTATION_AND_NATIVE_RESTORATION', label, beforeRegistry: before, afterRegistry: await registryRows(),
        originalFunctionCatalog: catalog, restoredFunctionCatalog: await allFunctionCatalog(), roleRows });
    }
  }
  function oldGraphCopy(source: string) {
    expect(hash(retainedOldNative)).toBe(oldNativeSHA256);
    const a = '-- AUDITED_NATIVE_CTES_BEGIN', z = '-- AUDITED_NATIVE_CTES_END';
    expect(source.split(a)).toHaveLength(2); expect(source.split(z)).toHaveLength(2);
    return source.slice(0, source.indexOf(a) + a.length) + '\n' + retainedOldNative + '\n\n' + source.slice(source.indexOf(z));
  }
  async function restoreDefinition(signature: string, definition: string) {
    const beforeOid = (await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', [signature])).rows[0].oid;
    await query(admin, definition);
    expect((await query(admin, 'SELECT pg_catalog.to_regprocedure($1)::oid::text oid', [signature])).rows).toEqual([{ oid: beforeOid }]);
  }
  beforeAll(async () => {
    expect(leasePath !== undefined && runPath !== undefined).toBe(true);
    expect(process.env.DATABASE_URL === undefined && process.env.FUEL_TEST_DATABASE_URL === undefined).toBe(true);
    expect(isAbsolute(leasePath!) && isAbsolute(runPath!)).toBe(true);
    expect(realpathSync(leasePath!)).toBe(leasePath); expect(realpathSync(runPath!)).toBe(runPath);
    const uid = process.getuid?.(); expect(uid !== undefined).toBe(true);
    for (const p of [leasePath!, runPath!]) { const st = lstatSync(p); expect(st.isSymbolicLink()).toBe(false); expect(st.uid).toBe(uid); }
    expect(statSync(runPath!).isDirectory()).toBe(true); expect(lstatSync(leasePath!).isFile()).toBe(true);
    expect(lstatSync(leasePath!).mode & 0o777).toBe(0o600); runVerified = true;
    lease = JSON.parse(readFileSync(leasePath!, 'utf8')) as Lease;
    expect(lease.scope).toBe('OWNED_LOCAL_F10'); expect(lease.closed).toBe(false);
    expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/); expect(lease.marker).toBe('f10-owned:' + lease.invocation);
    expect(lease.authorizationReference).toBe('F-DEV-COMPLETE-001:original-runtime-login:' + lease.invocation);
    expect(Number.isSafeInteger(lease.port) && lease.port > 1024 && lease.port < 65536).toBe(true);
    expect(Number.isSafeInteger(lease.pid) && lease.pid > 0).toBe(true);
    expect(realpathSync(lease.root)).toBe(lease.root); expect(realpathSync(lease.data)).toBe(join(lease.root, 'data'));
    for (const p of [lease.root,lease.data]) { const st=lstatSync(p);expect(st.isDirectory()&&!st.isSymbolicLink()).toBe(true);expect(st.uid).toBe(uid); }
    expect(leasePath!.startsWith(lease.root + sep)).toBe(true);
    const pid = readFileSync(join(lease.data, 'postmaster.pid'), 'utf8').split('\n');
    expect(Number(pid[0])).toBe(lease.pid); expect(realpathSync(pid[1])).toBe(lease.data);
    expect(pid[2]).toBe(lease.pidStart); expect(Number(pid[3])).toBe(lease.port);
    const credentialStat = lstatSync(lease.credentialFile);
    expect(credentialStat.isFile() && !credentialStat.isSymbolicLink()).toBe(true); expect(credentialStat.uid).toBe(uid);
    expect(credentialStat.mode & 0o777).toBe(0o600); expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile);
    expect(lease.credentialFile.startsWith(lease.root + sep)).toBe(true);
    for (const [name, expected] of Object.entries(effectivePins)) {
      expect(expected).toMatch(/^[0-9a-f]{64}$/); const value = readFileSync(resolve('src/lib/tenancy/runtime', name), 'utf8');
      expectFrozenSql(value, name, expected); sources[name] = value;
    }
    expect(hash(retainedOldNative)).toBe(oldNativeSHA256);
    guardSource = sources['audited-role-guard.sql']; validatorSource = sources['original-runtime-login.sql'];
    const fragment = guardSource.slice(guardSource.indexOf('CREATE OR REPLACE FUNCTION')).replace('CREATE OR REPLACE FUNCTION', 'CREATE FUNCTION');
    expect(sources['audited-role-guard-installer.sql']).toContain(fragment);
    password = readFileSync(lease.credentialFile, 'utf8'); expect(password.length > 0).toBe(true);
    admin = await connect(lease.user); const base = await baseIdentity();
    installerOid = (await query(admin, 'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1', [lease.user])).rows[0].oid;
    expect((await query(admin, 'SELECT datdba::text owner FROM pg_catalog.pg_database WHERE oid=$1::oid', [String(lease.databaseOid)])).rows).toEqual([{ owner: installerOid }]);
    expect((await query(admin, "SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
    expect((await query(admin, "SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);
    baselineRoles = await roleCatalog(); verified = true;
    record({ operation: 'EXACT_ROOT_SUPPLIED_EMPTY_BASE', base, sourcePins: effectivePins, testSHA256: hash(readFileSync(resolve('src/lib/tenancy/runtime/original-runtime-login.postgres.test.ts'))), baselineRoles });
    await exclusive(async () => {
      appRole = await createRole('app', true); workerRole = await createRole('worker', true); outsiderRole = await createRole('outsider', true);
      appOwner = await createRole('app_owner', false); workerOwner = await createRole('worker_owner', false); undeclaredOwner = await createRole('undeclared_owner', false);
      await query(admin, 'REVOKE CREATE,TEMPORARY ON DATABASE ' + q(lease.database) + ' FROM PUBLIC');
      await query(admin, 'REVOKE CREATE ON SCHEMA public FROM PUBLIC');
      await query(admin, 'GRANT CONNECT ON DATABASE ' + q(lease.database) + ' TO ' + [appRole,workerRole,outsiderRole].map(r => q(r.name)).join(','));
      await query(admin, 'CREATE SCHEMA nevora_tenancy'); await remember('schema', '', 'nevora_tenancy', installerOid);
    });
    // Accepted standalone sources own their BEGIN/exclusive/COMMIT. Never nest them.
    await query(admin, sources['control-storage.sql']); await remember('table','nevora_tenancy','runtime_role_binding',installerOid);
    await query(admin, sources['audited-helper-storage.sql']); await remember('table','nevora_tenancy','audited_helper_capability',installerOid);
    await exclusive(async () => {
      const settings = (await query(admin, `SELECT 'pg_catalog.pg_settings'::regclass::oid::text oid,
        pg_get_viewdef('pg_catalog.pg_settings'::regclass,false) definition,
        ARRAY(SELECT pg_get_ruledef(w.oid,false) FROM pg_catalog.pg_rewrite w WHERE w.ev_class='pg_catalog.pg_settings'::regclass ORDER BY w.rulename COLLATE pg_catalog."C") rules`)).rows[0];
      for (const [kind, role] of [['APP',appRole],['WORKER',workerRole]] as const)
        await query(admin, 'INSERT INTO nevora_tenancy.runtime_role_binding(kind,role_name,role_oid,pg_settings_oid,pg_settings_definition,pg_settings_rules) VALUES($1,$2,$3::oid,$4::oid,$5,$6::text[])',[kind,role.name,role.oid,settings.oid,settings.definition,settings.rules]);
      await query(admin, guardSource); await remember('function','nevora_tenancy','assert_audited_runtime_role',installerOid,'(text)');
      await query(admin, validatorSource); await remember('function','nevora_tenancy','require_original_runtime_login_kind',installerOid,'()');
      for (const signature of [guardSignature,validatorSignature]) await query(admin, 'REVOKE ALL ON FUNCTION ' + signature + ' FROM PUBLIC');
      const runtimeNames = [appRole,workerRole].map(r => q(r.name)).join(',');
      const ownerNames = [appOwner,workerOwner,undeclaredOwner].map(r => q(r.name)).join(',');
      await query(admin, 'REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC');
      await query(admin, 'GRANT USAGE ON SCHEMA nevora_tenancy TO ' + runtimeNames + ',' + ownerNames);
      await query(admin, 'GRANT SELECT ON TABLE nevora_tenancy.runtime_role_binding,nevora_tenancy.audited_helper_capability TO ' + runtimeNames + ',' + ownerNames);
      await query(admin, 'GRANT EXECUTE ON FUNCTION ' + guardSignature + ' TO ' + runtimeNames);
      await query(admin, 'GRANT EXECUTE ON FUNCTION ' + validatorSignature + ' TO ' + [appOwner,workerOwner].map(r => q(r.name)).join(','));
      for (const [name,kind,owner,runtime,count] of [['resolve_portal','APP',appOwner,appRole,2],['resolve_worker','WORKER',workerOwner,workerRole,6]] as const) {
        await query(admin,rootSource(name,kind)); const signature = 'nevora_tenancy.' + name + '(' + Array(count).fill('text').join(',') + ')';
        await query(admin,'ALTER FUNCTION ' + signature + ' OWNER TO ' + q(owner.name)); await query(admin,'REVOKE ALL ON FUNCTION ' + signature + ' FROM PUBLIC');
        await query(admin,'GRANT EXECUTE ON FUNCTION ' + signature + ' TO ' + q(runtime.name));
        roots.push({ kind, signature, owner, depends: true, object: await remember('function','nevora_tenancy',name,owner.oid,'(' + Array(count).fill('text').join(',') + ')') });
      }
      const calendar = 'nevora_tenancy.resolve_calendar(text)';
      await query(admin, `CREATE FUNCTION nevora_tenancy.resolve_calendar(pg_catalog.text) RETURNS pg_catalog.jsonb LANGUAGE sql VOLATILE PARALLEL UNSAFE SECURITY DEFINER SET search_path=pg_catalog AS $fictional_undeclared$ SELECT '{"fixture":"undeclared-dependency-owner-only"}'::pg_catalog.jsonb $fictional_undeclared$`);
      await query(admin,'ALTER FUNCTION ' + calendar + ' OWNER TO ' + q(undeclaredOwner.name)); await query(admin,'REVOKE ALL ON FUNCTION ' + calendar + ' FROM PUBLIC');
      await query(admin,'GRANT EXECUTE ON FUNCTION ' + calendar + ' TO ' + q(appRole.name));
      roots.push({ kind:'APP',signature:calendar,owner:undeclaredOwner,depends:false,object:await remember('function','nevora_tenancy','resolve_calendar',undeclaredOwner.oid,'(text)') });
      baselineRows = await refreshCapabilities();
    });
    setupCommitted = true; app = await connect(appRole.name); worker = await connect(workerRole.name); outsider = await connect(outsiderRole.name);
    record({ operation:'BEFORE_NATIVE_FEATURE_ASSERTIONS_NO_POSITIVE_SETUP_ASSERT',sourcePins:effectivePins,roles,objects,registry:await registryRows(),functionCatalog:await allFunctionCatalog(),
      originalApp:await identity(app),originalWorker:await identity(worker),claim:'FIXED_LITERAL_KIND_WRAPPERS_ONLY_NOT_ACTUAL_RESOLVERS_OR_CURRENT_PROOF_TRUE_FIXTURES' });
    writeFileSync(join(runPath!,'original-login-fixture-custody.json'),JSON.stringify({ base,roles,objects,installerOid,sourcePins:effectivePins,setupCommitted,
      authority:'ROOT_SUPPLIED_OWNED_FIXTURE_ONLY_SOURCE_HASHES_NOT_OPERATOR_OR_TENANT_AUTHORITY' },null,2),{flag:'wx',mode:0o600});
  },30000);

  it('OL01 original APP LOGIN traverses the genuine self dependency and returns its fixed kind',async () => {
    const outcome = await observe(app,'APP'); record({caseId:'OL01',outcome,registry:await registryRows(),nativeFunctions:await allFunctionCatalog()});
    expect(outcome.identity).toMatchObject({session:appRole.name,current_role:appRole.name,role:'none',original_oid:appRole.oid});
    // Root OLD selects this SAME callback only. Record both guard=false and fixed
    // wrapper42501 before desired-positive assertion; no beforeAll feature fail.
    expectAllowed(outcome,'APP');
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL02 original WORKER LOGIN returns only WORKER through its separate fixed wrapper',async () => {
    const outcome=await observe(worker,'WORKER'); record({caseId:'OL02',outcome});
    expect(outcome.identity).toMatchObject({session:workerRole.name,current_role:workerRole.name,role:'none',original_oid:workerRole.oid}); expectAllowed(outcome,'WORKER');
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL03 direct APP and WORKER validator invocation is denied without public or runtime EXECUTE',async () => {
    for(const [client,kind] of [[app,'APP'],[worker,'WORKER']] as const) {
      const outcome=await observe(client,kind,'nevora_tenancy.require_original_runtime_login_kind');
      record({caseId:'OL03',kind,outcome}); expect(outcome.firstGuard).toBe(true);expect(outcome.sqlstate).toBe('42501');expect(outcome.messageTag).toBe('OTHER_SUPPRESSED');
    }
    const acl=(await nativeFunction(validatorSignature)).observation.acl as JsonRecord[];
    expect(acl.some(a=>['0',appRole.oid,workerRole.oid,outsiderRole.oid].includes(a.granteeOid as string))).toBe(false);
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it.each([['configuration','SET search_path=pg_catalog, public'],['volatility','STABLE'],['security','SECURITY DEFINER'],['parallel','PARALLEL SAFE']] as const)
  ('OL04 rejects stale then genuinely recaptured unsafe self %s metadata',async (_label,clause) => {
    const original=(await nativeFunction(validatorSignature)).observation.definition as string;
    await withMutation('self_'+_label,async()=>{await query(admin,'ALTER FUNCTION '+validatorSignature+' '+clause);},async()=>{await restoreDefinition(validatorSignature,original);},async()=>{
      const stale=await observe(app,'APP');expectDenied(stale);
      await exclusive(refreshCapabilities);const recaptured=await observe(app,'APP');record({caseId:'OL04',label:_label,stale,recaptured,native:(await nativeFunction(validatorSignature)).observation});expectDenied(recaptured);
    },false);
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it.each(['missing','duplicate','extra'] as const)('OL05 rejects %s retained self descriptors without manufacturing native observations',async variant=>{
    await withMutation('descriptor_'+variant,async()=>{
      const rows=await registryRows(),row=rows.find(r=>r.function_oid===roots[0].object.oid)!;
      const dependency=(await nativeFunction(validatorSignature)).observation;
      const deps=variant==='missing'?[]:variant==='duplicate'?[dependency,dependency]:[{...dependency,unexpected:true}];
      await query(admin,'UPDATE nevora_tenancy.audited_helper_capability SET dependencies=$1::jsonb WHERE function_oid=$2::oid',[JSON.stringify(deps),row.function_oid]);
    },async()=>{},async()=>{const outcome=await observe(app,'APP');record({caseId:'OL05',variant,outcome});expectDenied(outcome);},false);
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it.each(['PUBLIC','APP','FOREIGN_LOGIN','UNDECLARED_SAFE_OWNER','GRANT_OPTION'] as const)('OL06 recaptures and rejects actual %s self EXECUTE widening',async variant=>{
    const who=variant==='PUBLIC'?'PUBLIC':q(variant==='APP'?appRole.name:variant==='FOREIGN_LOGIN'?outsiderRole.name:variant==='UNDECLARED_SAFE_OWNER'?undeclaredOwner.name:appOwner.name);
    const grant='GRANT EXECUTE ON FUNCTION '+validatorSignature+' TO '+who+(variant==='GRANT_OPTION'?' WITH GRANT OPTION':'');
    const undo=variant==='GRANT_OPTION'?'REVOKE GRANT OPTION FOR EXECUTE ON FUNCTION '+validatorSignature+' FROM '+who:'REVOKE EXECUTE ON FUNCTION '+validatorSignature+' FROM '+who;
    await withMutation('self_acl_'+variant,async()=>{await query(admin,grant);},async()=>{await query(admin,undo);},async()=>{
      const outcome=await observe(app,'APP');record({caseId:'OL06',variant,outcome,native:(await nativeFunction(validatorSignature)).observation});expectDenied(outcome);
      if(variant==='UNDECLARED_SAFE_OWNER') {
        const cmd=nativeQuery('SELECT o.safe,o.observation FROM audit_owners o WHERE o.oid=$1::oid');const owner=(await query(admin,cmd.text,[undeclaredOwner.oid])).rows[0];
        expect(owner.safe).toBe(true);expect((await registryRows()).find(r=>r.function_oid===roots[2].object.oid)!.dependencies).toEqual([]);record({caseId:'OL06',undeclaredSafeOwnerActual:owner});
      }
    });
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL07 removal of declared owner EXECUTE is not repaired by recapturing profiles',async()=>{
    await withMutation('missing_owner_execute',async()=>{await query(admin,'REVOKE EXECUTE ON FUNCTION '+validatorSignature+' FROM '+q(appOwner.name));},async()=>{await query(admin,'GRANT EXECUTE ON FUNCTION '+validatorSignature+' TO '+q(appOwner.name));},async()=>{const outcome=await observe(app,'APP');record({caseId:'OL07',outcome});expect(outcome.firstGuard).toBe(false);expect(outcome.sqlstate).toBe('42501');});
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it.each([['LOGIN','NOLOGIN'],['SUPERUSER','NOSUPERUSER'],['BYPASSRLS','NOBYPASSRLS'],['CREATEROLE','NOCREATEROLE'],['CREATEDB','NOCREATEDB'],['REPLICATION','NOREPLICATION'],['INHERIT','NOINHERIT']] as const)
  ('OL08 native owner %s remains unsafe after honest profile recapture',async(unsafe,safe)=>{
    await withMutation('owner_flag_'+unsafe,async()=>{await query(admin,'ALTER ROLE '+q(appOwner.name)+' '+unsafe);},async()=>{await query(admin,'ALTER ROLE '+q(appOwner.name)+' '+safe);},async()=>{const outcome=await observe(app,'APP');record({caseId:'OL08',unsafe,outcome,rows:await registryRows()});expectDenied(outcome);});
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it.each(['AS_MEMBER','AS_GRANTED_ROLE'] as const)('OL09 denies owner membership %s with actual complete membership tuples',async direction=>{
    const target=direction==='AS_MEMBER'?outsiderRole:appOwner,member=direction==='AS_MEMBER'?appOwner:outsiderRole;
    await withMutation('owner_membership_'+direction,async()=>{await query(admin,'GRANT '+q(target.name)+' TO '+q(member.name));},async()=>{await query(admin,'REVOKE '+q(target.name)+' FROM '+q(member.name));},async()=>{const outcome=await observe(app,'APP');record({caseId:'OL09',direction,outcome,memberships:(await query(admin,'SELECT roleid::text,member::text,grantor::text,admin_option,inherit_option,set_option FROM pg_catalog.pg_auth_members ORDER BY roleid,member')).rows});expectDenied(outcome);});
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL10 granting ownership of the INVOKER to a root owner stays denied by the unchanged ownership envelope',async()=>{
    await withMutation('self_owned_by_root_owner',async()=>{await query(admin,'ALTER FUNCTION '+validatorSignature+' OWNER TO '+q(appOwner.name));},async()=>{
      await query(admin,'ALTER FUNCTION '+validatorSignature+' OWNER TO '+q(lease.user));
      await query(admin,'GRANT EXECUTE ON FUNCTION '+validatorSignature+' TO '+q(appOwner.name)+','+q(workerOwner.name));
    },async()=>{const outcome=await observe(app,'APP');record({caseId:'OL10',outcome,rows:await registryRows()});expectDenied(outcome);});
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL11 genuinely shared-owner profiles must stay mutually consistent across both kinds',async()=>{
    const root=roots[1],originalOwner=root.owner;
    await withMutation('inconsistent_shared_owner',async()=>{
      await query(admin,'ALTER FUNCTION '+root.signature+' OWNER TO '+q(appOwner.name));root.owner=appOwner;root.object.ownerOid=appOwner.oid;
      // The former owner is temporarily rootless and must not retain a terminal
      // EXECUTE grant pretending to be an independently declared owner.
      await query(admin,'REVOKE EXECUTE ON FUNCTION '+validatorSignature+' FROM '+q(originalOwner.name));
    },async()=>{
      await query(admin,'ALTER FUNCTION '+root.signature+' OWNER TO '+q(originalOwner.name));root.owner=originalOwner;root.object.ownerOid=originalOwner.oid;
      await query(admin,'GRANT EXECUTE ON FUNCTION '+validatorSignature+' TO '+q(originalOwner.name));
    },async()=>{
      const actual=await registryRows();const shared=actual.filter(r=>[roots[0].object.oid,root.object.oid].includes(r.function_oid));
      expect(shared).toHaveLength(2);expect(shared[0].owner_observation).toEqual(shared[1].owner_observation);
      expect(shared[0].owner_acl_observation).toEqual(shared[1].owner_acl_observation);
      expectAllowed(await observe(app,'APP'),'APP');expectAllowed(await observe(worker,'WORKER'),'WORKER');
      await exclusive(async()=>{await query(admin,"UPDATE nevora_tenancy.audited_helper_capability SET owner_observation=owner_observation || '{\"unobserved\":true}'::jsonb WHERE function_oid=$1::oid",[roots[0].object.oid]);});
      const outcome=await observe(app,'APP');record({caseId:'OL11',actualSharedNativeProfiles:shared,outcome});expectDenied(outcome);
    });
  },QA_ONLY_CASE_TIMEOUT_MS);
  it('OL12 wrong-kind registration never becomes an allowed declared root by profile recapture',async()=>{
    await withMutation('wrong_kind',async()=>{const row=(await registryRows()).find(r=>r.function_oid===roots[0].object.oid)!;await writeCapability({...row,runtime_kind:'WORKER'});},async()=>{},async()=>{const outcome=await observe(app,'APP');record({caseId:'OL12',outcome,rows:await registryRows()});expectDenied(outcome);},false);
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL13 exact source wrapper compares observed APP to its fixed literal before returning fixture metadata',async()=>{
    const root=roots[0],original=(await nativeFunction(root.signature)).observation.definition as string;
    await withMutation('fixed_kind_mismatch',async()=>{await query(admin,rootSource('resolve_portal','WORKER'));},async()=>{await restoreDefinition(root.signature,original);},async()=>{
      const outcome=await observe(app,'APP');record({caseId:'OL13',outcome,rootSource:(await nativeFunction(root.signature)).observation});
      expect(outcome.firstGuard).toBe(true);expect(outcome.sqlstate).toBe('42501');expect(outcome.messageTag).toBe('FIXTURE_FIXED_KIND_DENIAL');
    });
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL14 privileged backend substitution cannot impersonate the actual APP original LOGIN',async()=>{
    const original=await identity(admin);expect(original.original_oid).toBe(installerOid);
    try {
      await query(admin,'SET SESSION AUTHORIZATION '+q(appRole.name));
      const substituted=await identity(admin),outcome=await observe(admin,'APP');
      record({caseId:'OL14',original,substituted,outcome});expect(substituted).toMatchObject({session:appRole.name,current_role:appRole.name,role:'none',original_oid:installerOid});expectDenied(outcome);
    } finally {await query(admin,'RESET SESSION AUTHORIZATION');await query(admin,'RESET ROLE');expect(await identity(admin)).toEqual(original);await baseIdentity();}
    const runtimeAttempt=await rejected(app,'SET ROLE '+q(workerRole.name));record({caseId:'OL14',runtimeAttempt});expect(runtimeAttempt.sqlstate).toBe('42501');expect((await identity(app)).role).toBe('none');
    try {await query(admin,'SET ROLE '+q(appRole.name));const assigned=await identity(admin);const outcome=await observe(admin,'APP');record({caseId:'OL14',assigned,outcome});expect(assigned.role).toBe(appRole.name);expectDenied(outcome);}
    finally {await query(admin,'RESET ROLE');expect(await identity(admin)).toEqual(original);}
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it.each(['OID','NAME'] as const)('OL15 rejects actual runtime binding %s drift',async variant=>{
    await withMutation('binding_'+variant,async()=>{
      await query(admin,'UPDATE nevora_tenancy.runtime_role_binding SET '+(variant==='OID'?'role_oid=$1::oid':'role_name=$1::name')+" WHERE kind='APP'",[variant==='OID'?outsiderRole.oid:outsiderRole.name]);
    },async()=>{await query(admin,"UPDATE nevora_tenancy.runtime_role_binding SET role_oid=$1::oid,role_name=$2::name WHERE kind='APP'",[appRole.oid,appRole.name]);},async()=>{const outcome=await observe(app,'APP');record({caseId:'OL15',variant,outcome});expectDenied(outcome);},false);
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL16 a native different input signature is not a self dependency or extra eligible root',async()=>{
    let overload:OwnedObject|undefined;
    await withMutation('different_signature',async()=>{
      await query(admin,`CREATE FUNCTION nevora_tenancy.require_original_runtime_login_kind(pg_catalog.text) RETURNS pg_catalog.text LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER SET search_path=pg_catalog AS $unapproved_signature$ BEGIN RAISE EXCEPTION 'original_runtime_login_denied' USING ERRCODE='42501'; END $unapproved_signature$`);
      overload=await remember('function','nevora_tenancy','require_original_runtime_login_kind',installerOid,'(text)');
      await query(admin,'REVOKE ALL ON FUNCTION nevora_tenancy.require_original_runtime_login_kind(text) FROM PUBLIC');
      await query(admin,'GRANT EXECUTE ON FUNCTION nevora_tenancy.require_original_runtime_login_kind(text) TO '+q(appOwner.name));
      const native=(await nativeFunction('nevora_tenancy.require_original_runtime_login_kind(text)')).observation;
      await query(admin,'UPDATE nevora_tenancy.audited_helper_capability SET dependencies=$1::jsonb WHERE function_oid=$2::oid',[JSON.stringify([native]),roots[0].object.oid]);
      record({caseId:'OL16',actualWrongSignature:native});
    },async()=>{await drop(overload!);},async()=>{const outcome=await observe(app,'APP');record({caseId:'OL16',outcome});expectDenied(outcome);},false);
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL17 exact owned DROP/recreate changes the self OID and stale original descriptors remain denied',async()=>{
    const original=objects.find(o=>o.name==='require_original_runtime_login_kind'&&o.signature==='()'&&!o.dropped)!;
    let replacement:OwnedObject|undefined;
    await exclusive(async()=>{
      await drop(original);await query(admin,validatorSource);await query(admin,'REVOKE ALL ON FUNCTION '+validatorSignature+' FROM PUBLIC');
      await query(admin,'GRANT EXECUTE ON FUNCTION '+validatorSignature+' TO '+q(appOwner.name)+','+q(workerOwner.name));
      replacement=await remember('function','nevora_tenancy','require_original_runtime_login_kind',installerOid,'()');
    });
    try {
      expect(replacement!.oid).not.toBe(original.oid);const stale=await observe(app,'APP');record({caseId:'OL17',original,replacement,stale});expectDenied(stale);
    } finally {await exclusive(refreshCapabilities);}
    const current=await observe(app,'APP');expectAllowed(current,'APP');expect((await query(admin,'SELECT oid FROM pg_catalog.pg_proc WHERE oid=$1::oid',[original.oid])).rows).toEqual([]);
    baselineRows=await registryRows();record({caseId:'OL17',current,originalOIDAbsent:true,newOriginalPlanForFixtureOnly:baselineRows});
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL18 required owner schema USAGE is observed exactly and cannot be omitted',async()=>{
    await withMutation('owner_schema_usage',async()=>{await query(admin,'REVOKE USAGE ON SCHEMA nevora_tenancy FROM '+q(appOwner.name));},async()=>{await query(admin,'GRANT USAGE ON SCHEMA nevora_tenancy TO '+q(appOwner.name));},async()=>{
      const outcome=await observe(app,'APP');record({caseId:'OL18',outcome});expect(outcome.firstGuard).toBe(false);expect(outcome.sqlstate).toBe('42501');
    });
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL19 parsed nonexecuted SQL-body native dependency denies the graph and fixed wrapper kind, without claiming isolated callgraph completeness',async()=>{
    const original=(await nativeFunction(validatorSignature)).observation.definition as string;
    await withMutation('native_non_catalog_edge',async()=>{
      await query(admin,`CREATE OR REPLACE FUNCTION nevora_tenancy.require_original_runtime_login_kind() RETURNS pg_catalog.text LANGUAGE sql VOLATILE PARALLEL UNSAFE SECURITY INVOKER SET search_path=pg_catalog BEGIN ATOMIC SELECT CASE WHEN false THEN nevora_tenancy.resolve_portal('fictional'::text,'fictional'::text)->>'observedKind' ELSE 'WORKER'::pg_catalog.text END; END`);
    },async()=>{await restoreDefinition(validatorSignature,original);},async()=>{
      const native=(await nativeFunction(validatorSignature)).observation;
      const edges=(await query(admin,`SELECT d.refobjid::text oid,n.nspname::text schema,p.proname::text name,d.deptype
        FROM pg_catalog.pg_depend d LEFT JOIN pg_catalog.pg_proc p ON p.oid=d.refobjid LEFT JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
        WHERE d.classid='pg_catalog.pg_proc'::regclass AND d.objid=pg_catalog.to_regprocedure($1) AND d.refclassid='pg_catalog.pg_proc'::regclass ORDER BY d.refobjid`,[validatorSignature])).rows;
      const outcome=await observe(app,'APP');record({caseId:'OL19',native,edges,outcome,
        limit:'SQL_LANGUAGE_AND_NATIVE_NONCATALOG_EDGE_BOTH_CHANGED_NO_ISOLATED_EDGE_BRANCH_OR_PLPGSQL_CALLGRAPH_CERTIFICATION',
        denialAuthority:'EXACT_OUTER_FIXTURE_KIND_COMPARISON_REPLACED_SQL_BODY_HAS_NO_ORIGINAL_VALIDATOR_DENIAL'});
      expect(edges).toContainEqual(expect.objectContaining({oid:roots[0].object.oid,schema:'nevora_tenancy',name:'resolve_portal'}));expect(native.language).toBe('sql');
      expect(outcome.firstGuard).toBe(false); expect(outcome.sqlstate).toBe('42501');
      expect(outcome.messageTag).toBe('FIXTURE_FIXED_KIND_DENIAL'); expect(outcome.synchronizedStatus).toBe('E');
    });
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it.each(['EXTERNAL_COPY','VALIDATOR_COPY'] as const)('OL20 independent %s old-graph source misalignment remains explicit',async variant=>{
    const signature=variant==='EXTERNAL_COPY'?guardSignature:validatorSignature;
    const original=(await nativeFunction(signature)).observation.definition as string;
    const partial=oldGraphCopy(original),beforeSource=guardSource;
    await withMutation('copy_'+variant,async()=>{await query(admin,partial);if(variant==='EXTERNAL_COPY')guardSource=partial;},async()=>{
      await restoreDefinition(signature,original);guardSource=beforeSource;
    },async()=>{
      const outcome=await observe(app,'APP');record({caseId:'OL20',variant,outcome,oldNativeSHA256,partialDefinitionSHA256:hash(partial),actualFunctions:await allFunctionCatalog(),claim:'INTENTIONAL_COPY_MISALIGNMENT_NEGATIVE_NOT_NEW_APPROVED_HELPER_SOURCE'});
      if(variant==='EXTERNAL_COPY') {expect(outcome.firstGuard).toBe(false);expect(outcome.sqlstate).toBe('NO_ERROR');expect(outcome.value).toEqual({fixture:'original-login-only',observedKind:'APP'});expect(outcome.finalGuard).toBe(false);}
      else {expect(outcome.firstGuard).toBe(true);expect(outcome.sqlstate).toBe('42501');expect(outcome.messageTag).toBe('ORIGINAL_LOGIN_FIXED_DENIAL');}
    });
  }, QA_ONLY_CASE_TIMEOUT_MS);
  it('OL21 original fresh shared acquire waits before role/helper and observes a cooperating privileged role change',async()=>{
    fenceInstaller??=await connect(lease.user);const writer=fenceInstaller;
    const writerIdentity=await identity(writer),readerIdentity=await identity(app);
    let attempt:Promise<Outcome>|undefined,changed=false;
    await query(writer,'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      await query(writer,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      attempt=observe(app,'APP');pending.add(attempt);
      await poll(async()=>{
        const rows=(await query(admin,`SELECT pid,mode,granted,database::text database,classid::text classid,objid::text objid,objsubid
          FROM pg_catalog.pg_locks WHERE locktype='advisory' AND pid=ANY($1::int[]) ORDER BY pid,mode`,[[writerIdentity.pid,readerIdentity.pid]])).rows;
        const held=rows.find(r=>r.pid===writerIdentity.pid&&r.mode==='ExclusiveLock'&&r.granted),wait=rows.find(r=>r.pid===readerIdentity.pid&&r.mode==='ShareLock'&&!r.granted);
        if(!held||!wait)return false;expect({...held,pid:0,mode:'',granted:false}).toEqual({...wait,pid:0,mode:'',granted:false});
        const state=(await query(admin,'SELECT pid,state,wait_event_type,wait_event,pg_catalog.pg_blocking_pids(pid) blockers FROM pg_catalog.pg_stat_activity WHERE pid=$1',[readerIdentity.pid])).rows[0];
        expect(state).toMatchObject({pid:readerIdentity.pid,state:'active',wait_event_type:'Lock',wait_event:'advisory'});expect(state.blockers).toContain(writerIdentity.pid);
        record({caseId:'OL21',stage:'SHARED_FIRST_NATIVE_WAIT',rows,state,readerIdentity,writerIdentity});return true;
      },'SHARED_FIRST_WAIT');
      await query(writer,'ALTER ROLE '+q(appRole.name)+' INHERIT');changed=true;await query(writer,'COMMIT');
      const outcome=await attempt;pending.delete(attempt);attempt=undefined;record({caseId:'OL21',stage:'FRESH_POST_WAIT_ROLE_DENIAL',outcome});expectDenied(outcome);
    } finally {
      await query(writer,'ROLLBACK');
      if(attempt){const outcome=await attempt;pending.delete(attempt);record({caseId:'OL21',stage:'OWN_PENDING_ATTEMPT_RECONCILED',outcome});}
      if(changed)await exclusive(async()=>{await query(admin,'ALTER ROLE '+q(appRole.name)+' NOINHERIT');await refreshCapabilities();});
      expect(writer.getTransactionStatus()).toBe('I');expect(app.getTransactionStatus()).toBe('I');
    }
    expectAllowed(await observe(app,'APP'),'APP');
  },QA_ONLY_CASE_TIMEOUT_MS);
  it('OL22 own exclusive partial registry setup rollback exposes no partial rows to a fresh waiting runtime',async()=>{
    fenceInstaller??=await connect(lease.user);const writer=fenceInstaller,before=await registryRows();let attempt:Promise<Outcome>|undefined;
    await query(writer,'BEGIN ISOLATION LEVEL READ COMMITTED');
    try {
      await query(writer,INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
      await query(writer,'DELETE FROM nevora_tenancy.audited_helper_capability');
      const row={...before[0],owner_observation:{},owner_acl_observation:{}}; // intentionally invalid, never a false safe profile
      await writeCapability(row,writer);
      const provisional=(await query(writer,'SELECT pg_catalog.to_jsonb(c) value FROM nevora_tenancy.audited_helper_capability c')).rows;
      const wid=await identity(writer),rid=await identity(app);attempt=observe(app,'APP');pending.add(attempt);
      await poll(async()=>{const rows=(await query(admin,"SELECT pid,mode,granted FROM pg_catalog.pg_locks WHERE locktype='advisory' AND pid=ANY($1::int[])",[[wid.pid,rid.pid]])).rows;return rows.some(r=>r.pid===rid.pid&&r.mode==='ShareLock'&&!r.granted)&&rows.some(r=>r.pid===wid.pid&&r.mode==='ExclusiveLock'&&r.granted);},'PARTIAL_SETUP_WAIT');
      record({caseId:'OL22',provisional,before,writer:wid,reader:rid,claim:'INVALID_PARTIAL_PROFILES_WITHIN_OWN_EXCLUSIVE_TRANSACTION_ONLY'});
      await query(writer,'ROLLBACK');const outcome=await attempt;pending.delete(attempt);attempt=undefined;expectAllowed(outcome,'APP');
    } finally {await query(writer,'ROLLBACK');expect(writer.getTransactionStatus()).toBe('I');if(attempt){const value=await attempt;pending.delete(attempt);record({caseId:'OL22',reconciled:value});}expect(app.getTransactionStatus()).toBe('I');}
    expect(await registryRows()).toEqual(before);record({caseId:'OL22',restored:await registryRows()});
  },QA_ONLY_CASE_TIMEOUT_MS);

  afterAll(async()=>{
    let cleaned=false;const closure:{client:'INSTALLER'|'FICTIONAL_LOGIN';closed:boolean;status:string|null}[]=[];
    try {
      // Complete known own pending calls after releasing known own fence holds.
      if(fenceInstaller&&pending.size)await query(fenceInstaller,'ROLLBACK');
      for(const attempt of pending){await attempt;pending.delete(attempt);}
      for(const client of clients)if(client!==admin){
        // These are only this suite's verified clients. Queue rollback regardless of
        // a potentially stale driver status after an error promise.
        await query(client,'ROLLBACK');expect(client.getTransactionStatus()).toBe('I');
        await client.end();closedClients.add(client);closure.push({client:client===fenceInstaller?'INSTALLER':'FICTIONAL_LOGIN',closed:true,status:client.getTransactionStatus()??null});
      }
      if(verified&&admin){
        await query(admin,'ROLLBACK');expect(admin.getTransactionStatus()).toBe('I');
        await query(admin,'RESET SESSION AUTHORIZATION');await query(admin,'RESET ROLE');await baseIdentity();
        record({operation:'FINAL_NATIVE_FUNCTIONS_REGISTRY_AND_ROLES_BEFORE_EXACT_DROP',functions:await allFunctionCatalog(),registry:await registryRows(),baselineRows,roles:await roleCatalog(),objects});
        expect(await registryRows()).toEqual(baselineRows);
        for(const object of [...objects].reverse())if(!object.dropped)await drop(object);
        for(const role of [...roles].reverse()){
          expect((await query(admin,'SELECT oid::text oid FROM pg_catalog.pg_roles WHERE rolname=$1',[role.name])).rows).toEqual([{oid:role.oid}]);
          await query(admin,'REVOKE CONNECT ON DATABASE '+q(lease.database)+' FROM '+q(role.name));await query(admin,'DROP ROLE '+q(role.name));
          expect((await query(admin,'SELECT oid FROM pg_catalog.pg_roles WHERE oid=$1::oid OR rolname=$2',[role.oid,role.name])).rows).toEqual([]);record({operation:'EXACT_OWN_ROLE_DROPPED',...role});
        }
        expect(await roleCatalog()).toEqual(baselineRoles);
        expect((await query(admin,"SELECT oid FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'")).rows).toEqual([]);
        expect((await query(admin,"SELECT c.oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S')")).rows).toEqual([]);cleaned=true;
      }
    } finally {
      for(const client of clients)if(!closedClients.has(client)){
        const status=client.getTransactionStatus()??null;try{await client.end();closedClients.add(client);closure.push({client:client===admin||client===fenceInstaller?'INSTALLER':'FICTIONAL_LOGIN',closed:true,status});}
        catch{closure.push({client:client===admin||client===fenceInstaller?'INSTALLER':'FICTIONAL_LOGIN',closed:false,status});}
      }
      password='';if(runVerified)writeFileSync(join(runPath!,'original-login-cleanup.json'),JSON.stringify({verified,setupCommitted,cleaned,roles,objects,closure,featureObservations,
        recordEvidence:{path:join(runPath!,'original-login-operations.jsonl'),sha256:recordDigest.digest('hex'),
          byteLength:recordBytes,recordCount,format:'COMPLETE_UNMODIFIED_UTF8_JSONL',
          nativeTestSourceSHA256:hash(readFileSync(resolve('src/lib/tenancy/runtime/original-runtime-login.postgres.test.ts')))},
        connectedOrAttemptedClients:clients.size,closedClients:closedClients.size,pendingAttempts:pending.size,
        scope:'ONLY_EXACT_NEW_FICTIONAL_OBJECTS_AND_ROLES_NO_DATABASE_DROP_OR_CLUSTER_CONTROL',
        claim:'PREPARED_NATIVE_SUITE_NOT_ACTUAL_EXECUTION_RESOLVER_CURRENT_PROOF_TENANT_RLS_FULL_F10_NEON_OR_EXTERNAL_REVIEW'},null,2),{flag:'wx',mode:0o600});
    }
  },60000);
});
