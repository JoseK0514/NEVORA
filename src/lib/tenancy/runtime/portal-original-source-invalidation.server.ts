import 'server-only';
import { types as nodeTypes } from 'node:util';
import { decodeTypedMigrationWireValue } from '../migrations/typed-wire';
import { validateWorkspaceIncarnation } from './workspace-incarnation';
import { INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL } from './catalog-fence.server';

// UNUSED transaction composition component. It does not open a connection,
// admit an installer/writer, execute SQL, create an operation, authenticate a
// parser/startup identity, or replace the original source guards/calendar bodies.
// A genuine independently controlled finite writer must adopt this exact prefix,
// its reviewed original mutation, and suffix in ONE own ReadCommitted transaction.
// FORCE-RLS, actual private mutation policies/privileges and source phase remain
// native gates. lockEmployeeIds is the complete externally proved actor/subject
// prelock set; subjects is only the exact subset to invalidate. Never repeat this
// prefix per employee after acquiring downstream locks. Neither input proves its
// own complete authorized footprint. FENCED never becomes ordinary mutation permission here.
export type SourceInvalidationKind = 'CONTROL_GENERATION' | 'SUBJECT_AUTHORIZATION' | 'SUBJECT_ACCESS';
export type PortalOriginalSourceInvalidationInput = Readonly<{
  format:'PORTAL_ORIGINAL_SOURCE_INVALIDATION_INPUT_V1'; kind:SourceInvalidationKind;
  databaseOid:string; installerRole:string; installerRoleOid:string;
  phase:'EXPANDED_LEGACY'|'FENCED'; fenceGeneration:string; captureManifestSha256:string|null;
  workspaceId:string|null; workspaceIncarnation:string|null;
  lockEmployeeIds:readonly string[];
  subjects:readonly Readonly<{employeeId:string;authorizationVersion:string;portalAccessVersion:string}>[];
}>;
// Input types and local issuance bind ordinary observations/compilation, not
// authenticated ownership, a complete authorized footprint or execution rights.
export type SourceInvalidationPlan = Readonly<{ tag?: string; text: string; values: readonly (string | null | readonly string[])[] }>;
export type PortalOriginalSourceInvalidationComponent = Readonly<{
  format: 'PORTAL_ORIGINAL_SOURCE_INVALIDATION_COMPONENT_V1'; kind: SourceInvalidationKind;
  isolationLevel: 'ReadCommitted'; workspaceId: string | null;
  prefix: readonly SourceInvalidationPlan[]; suffix: readonly SourceInvalidationPlan[];
  atomicCompositionRequirement: 'PREFIX_THEN_REVIEWED_FINITE_ORIGINAL_MUTATION_THEN_SUFFIX_IN_ONE_OWNING_TRANSACTION';
  verification: 'COMPOSITION_ONLY_NOT_WRITER_DATABASE_OR_TENANT_AUTHORITY'; remainingGates: readonly string[];
}>;
export type SourceInvalidationCompilation = Readonly<{status:'COMPILED_COMPONENT_NOT_AUTHORITY';component:PortalOriginalSourceInvalidationComponent}> |
  Readonly<{status:'BLOCKED';code:'INVALID_SOURCE_INVALIDATION_INPUT'|'FENCED_SOURCE_MUTATION_BLOCKED'|'SOURCE_GENERATION_EXHAUSTED'}>;
const issued = new WeakSet<object>();
const MAX_INT8 = '9223372036854775807';
const INVALID = Object.freeze({status:'BLOCKED' as const,code:'INVALID_SOURCE_INVALIDATION_INPUT' as const});
const FENCED = Object.freeze({status:'BLOCKED' as const,code:'FENCED_SOURCE_MUTATION_BLOCKED' as const});
const EXHAUSTED = Object.freeze({status:'BLOCKED' as const,code:'SOURCE_GENERATION_EXHAUSTED' as const});
const NO_VALUES: readonly [] = Object.freeze([] as const);
const GATES = Object.freeze([
  'GENUINE_CONTROLLED_WRITER_ADMISSION_AND_EXACT_PRIVILEGES',
  'CURRENT_READER_CONTROL_DATA_GENERATION_JOIN',
  'FULL_NATIVE_SOURCE_GUARD_ACL_CATALOG_AND_CONTROL_PREIMAGE_ADMISSION',
  'COMPLETE_SOURCE_FOOTPRINT_AND_COOPERATIVE_WRITER_LOCK_ADOPTION',
  'REVIEWED_FINITE_ORIGINAL_MUTATOR_AND_NATIVE_SOURCE_PHASE',
  'PRIVATE_FORCE_RLS_MUTATION_ACCESS_AND_AUDITED_OWNER_SOURCE_ENROLLMENT',
  'ATOMIC_COMPOSITION_AND_ORIGINAL_PLAN_UNKNOWN_COMMIT_RECONCILIATION',
  'NATIVE_CONCURRENCY_ROLLBACK_SOURCE_PRESERVATION_AND_RECOVERY_HIGH_WATER',
] as const);
function object(value: unknown): Record<string,unknown> | null {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return null;
  const proto=Object.getPrototypeOf(value); if (proto!==Object.prototype && proto!==null) return null;
  const descriptors=Object.getOwnPropertyDescriptors(value), copy:Record<string,unknown>=Object.create(null);
  for(const key of Reflect.ownKeys(descriptors)) {
    if(typeof key!=='string'||!Object.prototype.hasOwnProperty.call(descriptors[key],'value'))return null;
    copy[key]=descriptors[key].value;
  }
  return copy;
}
function closed(value:unknown,keys:readonly string[]):Record<string,unknown>|null {
  const r=object(value);return r&&Object.keys(r).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(r,k))?r:null;
}
function dense(value:unknown):unknown[]|null {
  if(!value||typeof value!=='object'||nodeTypes.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)return null;
  const d=Object.getOwnPropertyDescriptors(value as object),l=d.length;
  if(!l||!Object.prototype.hasOwnProperty.call(l,'value')||!Number.isSafeInteger(l.value)||l.value<0||Reflect.ownKeys(d).length!==l.value+1)return null;
  const a:unknown[]=[];
  for(let i=0;i<l.value;i++){const k=String(i);if(!Object.prototype.hasOwnProperty.call(d,k)||!Object.prototype.hasOwnProperty.call(d[k],'value'))return null;a.push(d[k].value);}
  return a;
}
function text(value:unknown):value is string {
  const decoded=decodeTypedMigrationWireValue('text',value);
  return decoded.status==='DECODED'&&decoded.value.kind==='SCALAR';
}
function positive(value:unknown):value is string{return validateWorkspaceIncarnation(value).status==='VALID';}
function zeroOrPositive(value:unknown):value is string {
  const decoded=decodeTypedMigrationWireValue('bigint',value);
  return decoded.status==='DECODED'&&decoded.value.kind==='SCALAR'&&!decoded.value.wire.text.startsWith('-');
}
function oid(value:unknown):value is string {
  return typeof value==='string'&&value.length<=10&&/^[1-9][0-9]*$/.test(value)&&BigInt(value)<=BigInt('4294967295');
}
function plan(tag:string,sql:string,values:readonly (string|null|readonly string[])[]=NO_VALUES):SourceInvalidationPlan {
  return Object.freeze({tag,text:sql,values:Object.freeze(values.map(v=>Array.isArray(v)?Object.freeze([...v]):v))});
}
// Fixed observed-source contract from accepted0026 and the frozen held-control
// query. SQL compares native typed values; these literals are source pins only.
const EXPECTED_CONTRACT_CTE = `source_expected_contract(table_name,storage,anchor,primary_key_columns,sidecar_name,mirror_columns,original_columns,source_path,source_line) AS (
 VALUES ('employees','DIRECT_IMMUTABLE','{"kind":"CAPTURED_IMMUTABLE"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id','primary_location_id']::name[],ARRAY['id','first_name','last_name','phone','email','role','primary_location_id','active','created_at','updated_at']::name[],'db/migrations/0001_initial.sql',18),
  ('locations','DIRECT_IMMUTABLE','{"kind":"DIRECT","column":"workspace_id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id','workspace_id']::name[],ARRAY['id','name','short_name','active','created_at','updated_at','workspace_id','clocker_key','calendar_serial','calendar_modified_at']::name[],'db/migrations/0001_initial.sql',3),
  ('employee_location_eligibility','DIRECT_IMMUTABLE','{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::jsonb,ARRAY['employee_id','location_id']::name[],NULL,ARRAY['employee_id','location_id']::name[],ARRAY['employee_id','location_id']::name[],'db/migrations/0001_initial.sql',35),
  ('workspaces','DIRECT_IMMUTABLE','{"kind":"ROOT","column":"id"}'::jsonb,ARRAY['id']::name[],NULL,ARRAY['id']::name[],ARRAY['id','name','time_zone','active','singleton','created_at','updated_at','shift_change_policy']::name[],'db/migrations/0008_workspace_positions.sql',3)
)`;
// Original calendar bodies use unqualified public relation names. Preserve those
// bodies while placing builtins first; no caller-selected schema/search path.
const SOURCE_SQL_CONTEXT = 'SET LOCAL search_path = pg_catalog, public, nevora_tenancy';
const CONTROL_TABLE_LOCKS = `LOCK TABLE nevora_tenancy.expansion_protocol,nevora_tenancy.owned_table_contract IN SHARE ROW EXCLUSIVE MODE`;
const IDENTITY = `SELECT (CASE WHEN
 pg_catalog.current_setting('transaction_isolation')='read committed' AND current_user=session_user
 AND pg_catalog.current_setting('role')='none'
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_database AS d WHERE d.datname=pg_catalog.current_database() AND d.oid=$1::pg_catalog.oid)
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity AS a JOIN pg_catalog.pg_roles AS r ON r.oid=a.usesysid
   WHERE a.pid=pg_catalog.pg_backend_pid() AND r.oid=$3::pg_catalog.oid AND r.rolname::pg_catalog.text=$2::pg_catalog.text
   AND r.rolname=session_user AND r.rolcanlogin)
 AND (SELECT pg_catalog.count(*) FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
   WHERE n.nspname='nevora_tenancy' AND c.relname IN('expansion_protocol','owned_table_contract')
   AND c.relkind='r' AND c.relpersistence='p' AND c.relowner=$3::pg_catalog.oid
   AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity)=2
 THEN '1' ELSE 'original_source_writer_identity_unmatched' END)::pg_catalog.int4 AS guard`;
const CONTRACT_HOLD = `WITH held AS MATERIALIZED (
 SELECT c.table_name FROM nevora_tenancy.owned_table_contract AS c
 WHERE c.table_name::pg_catalog.text IN('employees','locations','employee_location_eligibility','workspaces')
 ORDER BY pg_catalog.convert_to(c.table_name::pg_catalog.text,'UTF8') FOR SHARE
) SELECT (CASE WHEN pg_catalog.count(*)=4 THEN '1' ELSE 'original_source_contract_missing' END)::pg_catalog.int4 AS guard FROM held`;
const CONTROL_BASELINE = `WITH ${EXPECTED_CONTRACT_CTE}
SELECT (CASE WHEN
 EXISTS(SELECT 1 FROM nevora_tenancy.expansion_protocol AS p WHERE p.migration_id=26
   AND p.phase=$1::pg_catalog.text AND p.fence_generation=$2::pg_catalog.int8 AND p.backfill_actor IS NULL
   AND p.capture_manifest_sha256 IS NOT DISTINCT FROM $3::pg_catalog.text
   AND p.schema_source_commit='7c628e374f03c9025b2c0cfd3568be033f07238d'
   AND p.registry_sha256='5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681')
 AND NOT EXISTS(SELECT 1 FROM source_expected_contract AS e WHERE NOT EXISTS(
   SELECT 1 FROM nevora_tenancy.owned_table_contract AS a WHERE pg_catalog.to_jsonb(a)=pg_catalog.to_jsonb(e)))
 THEN '1' ELSE 'original_source_control_stale' END)::pg_catalog.int4 AS guard`;
const WORKSPACE_HOLD = `WITH held AS MATERIALIZED (
 SELECT w.id FROM public.workspaces AS w WHERE w.id OPERATOR(pg_catalog.=) $1::pg_catalog.text
 AND pg_catalog.convert_to(w.id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8') FOR UPDATE
) SELECT (CASE WHEN pg_catalog.count(*)=1 THEN '1' ELSE 'original_source_workspace_missing' END)::pg_catalog.int4 AS guard FROM held`;
const EMPLOYEE_HOLD = `WITH held AS MATERIALIZED (
 SELECT e.id FROM public.employees AS e WHERE e.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text
 AND pg_catalog.convert_to(e.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8')
 AND EXISTS(SELECT 1 FROM pg_catalog.unnest($2::pg_catalog.text[]) AS requested(id)
   WHERE e.id OPERATOR(pg_catalog.=) requested.id AND pg_catalog.convert_to(e.id,'UTF8')=pg_catalog.convert_to(requested.id,'UTF8'))
 ORDER BY pg_catalog.convert_to(e.id,'UTF8') FOR UPDATE
) SELECT (CASE WHEN pg_catalog.count(*)=pg_catalog.cardinality($2::pg_catalog.text[]) THEN '1' ELSE 'original_source_employee_set_missing' END)::pg_catalog.int4 AS guard FROM held`;
const CREDENTIAL_HOLD = `WITH held AS MATERIALIZED (
 SELECT c.employee_id FROM public.employee_credentials AS c WHERE EXISTS(SELECT 1 FROM pg_catalog.unnest($1::pg_catalog.text[]) AS requested(id)
 WHERE c.employee_id OPERATOR(pg_catalog.=) requested.id AND pg_catalog.convert_to(c.employee_id,'UTF8')=pg_catalog.convert_to(requested.id,'UTF8'))
 ORDER BY pg_catalog.convert_to(c.employee_id,'UTF8') FOR UPDATE
) SELECT (CASE WHEN pg_catalog.count(*)=pg_catalog.cardinality($1::pg_catalog.text[]) THEN '1' ELSE 'original_source_credential_set_missing' END)::pg_catalog.int4 AS guard FROM held`;
const COUNTER_HOLD = `WITH held AS MATERIALIZED (
 SELECT c.incarnation FROM nevora_tenancy.workspace_incarnation_counter AS c WHERE c.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text
 AND pg_catalog.convert_to(c.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8') FOR SHARE
) SELECT (CASE WHEN pg_catalog.count(*)=1 THEN '1' ELSE 'original_source_counter_missing' END)::pg_catalog.int4 AS guard FROM held`;
const PORTAL_HOLD = `WITH held AS MATERIALIZED (
 SELECT p.employee_id FROM nevora_tenancy.portal_authority AS p WHERE p.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text
 AND pg_catalog.convert_to(p.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8')
 AND EXISTS(SELECT 1 FROM pg_catalog.unnest($2::pg_catalog.text[]) AS requested(id)
 WHERE p.employee_id OPERATOR(pg_catalog.=) requested.id AND pg_catalog.convert_to(p.employee_id,'UTF8')=pg_catalog.convert_to(requested.id,'UTF8'))
 ORDER BY pg_catalog.convert_to(p.employee_id,'UTF8') FOR UPDATE
) SELECT (CASE WHEN pg_catalog.count(*)=pg_catalog.cardinality($2::pg_catalog.text[]) THEN '1' ELSE 'original_source_portal_set_missing' END)::pg_catalog.int4 AS guard FROM held`;
const REQUESTED_CTE = `requested AS (
 SELECT x.id,($4::pg_catalog.text[])[x.position] AS authorization,($5::pg_catalog.text[])[x.position] AS access
 FROM pg_catalog.unnest($3::pg_catalog.text[]) WITH ORDINALITY AS x(id,position)
)`;
const SUBJECT_BASELINE = `WITH ${REQUESTED_CTE}
SELECT (CASE WHEN EXISTS(SELECT 1 FROM nevora_tenancy.workspace_incarnation_counter AS c
 WHERE c.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text AND pg_catalog.convert_to(c.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8')
 AND c.incarnation=$2::pg_catalog.int8)
 AND NOT EXISTS(SELECT 1 FROM requested AS x WHERE NOT EXISTS(SELECT 1 FROM nevora_tenancy.portal_authority AS p
 WHERE p.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text AND pg_catalog.convert_to(p.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8')
 AND p.employee_id OPERATOR(pg_catalog.=) x.id AND pg_catalog.convert_to(p.employee_id,'UTF8')=pg_catalog.convert_to(x.id,'UTF8')
 AND p.authorization_version=x.authorization::pg_catalog.int8 AND p.portal_access_version=x.access::pg_catalog.int8))
 THEN '1' ELSE 'original_source_generation_stale' END)::pg_catalog.int4 AS guard`;
function subjectAdvance(access:boolean):string {return `WITH ${REQUESTED_CTE}, written AS (
 UPDATE nevora_tenancy.portal_authority AS p SET authorization_version=p.authorization_version OPERATOR(pg_catalog.+) 1::pg_catalog.int8${access?',portal_access_version=p.portal_access_version OPERATOR(pg_catalog.+) 1::pg_catalog.int8':''}
 FROM requested AS x WHERE p.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text
 AND pg_catalog.convert_to(p.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8')
 AND p.employee_id OPERATOR(pg_catalog.=) x.id AND pg_catalog.convert_to(p.employee_id,'UTF8')=pg_catalog.convert_to(x.id,'UTF8')
 AND p.authorization_version=x.authorization::pg_catalog.int8 AND p.portal_access_version=x.access::pg_catalog.int8
 AND EXISTS(SELECT 1 FROM nevora_tenancy.workspace_incarnation_counter AS c WHERE c.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text
 AND pg_catalog.convert_to(c.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8') AND c.incarnation=$2::pg_catalog.int8)
 RETURNING p.employee_id
) SELECT (CASE WHEN pg_catalog.count(*)=pg_catalog.cardinality($3::pg_catalog.text[]) THEN '1' ELSE 'source_generation_advance_mismatch' END)::pg_catalog.int4 AS guard FROM written`;}
function subjectPostcondition(access:boolean):string {return `WITH ${REQUESTED_CTE}
SELECT (CASE WHEN EXISTS(SELECT 1 FROM nevora_tenancy.workspace_incarnation_counter AS c
 WHERE c.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text AND pg_catalog.convert_to(c.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8') AND c.incarnation=$2::pg_catalog.int8)
 AND NOT EXISTS(SELECT 1 FROM requested AS x WHERE NOT EXISTS(SELECT 1 FROM nevora_tenancy.portal_authority AS p
 WHERE p.workspace_id OPERATOR(pg_catalog.=) $1::pg_catalog.text AND pg_catalog.convert_to(p.workspace_id,'UTF8')=pg_catalog.convert_to($1::pg_catalog.text,'UTF8')
 AND p.employee_id OPERATOR(pg_catalog.=) x.id AND pg_catalog.convert_to(p.employee_id,'UTF8')=pg_catalog.convert_to(x.id,'UTF8')
 AND p.authorization_version=x.authorization::pg_catalog.int8 OPERATOR(pg_catalog.+) 1::pg_catalog.int8
 AND p.portal_access_version=x.access::pg_catalog.int8${access?' OPERATOR(pg_catalog.+) 1::pg_catalog.int8':''}))
 THEN '1' ELSE 'source_generation_advance_mismatch' END)::pg_catalog.int4 AS guard`;}
const CONTROL_ADVANCE = `WITH written AS (
 UPDATE nevora_tenancy.expansion_protocol AS p SET fence_generation=p.fence_generation OPERATOR(pg_catalog.+) 1::pg_catalog.int8
 WHERE p.migration_id=26 AND p.phase=$1::pg_catalog.text AND p.fence_generation=$2::pg_catalog.int8
 AND p.backfill_actor IS NULL AND p.capture_manifest_sha256 IS NOT DISTINCT FROM $3::pg_catalog.text
 AND p.schema_source_commit='7c628e374f03c9025b2c0cfd3568be033f07238d'
 AND p.registry_sha256='5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681'
 RETURNING p.fence_generation
) SELECT (CASE WHEN pg_catalog.count(*)=1 THEN '1' ELSE 'source_generation_advance_mismatch' END)::pg_catalog.int4 AS guard FROM written`;
const CONTROL_OBSERVATION = `SELECT pg_catalog.jsonb_build_object(
 'protocol',(SELECT pg_catalog.to_jsonb(p) FROM nevora_tenancy.expansion_protocol AS p WHERE p.migration_id=26),
 'contracts',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(c) ORDER BY pg_catalog.convert_to(c.table_name::pg_catalog.text,'UTF8'))
 FROM nevora_tenancy.owned_table_contract AS c),'[]'::pg_catalog.jsonb)
)::pg_catalog.text AS source_controls`;
// This full-current-row read is raw change evidence only (accepted registry68). The component does not
// authenticate, replace, approve or enroll changed contract rows from its input.
const CONTROL_POSTCONDITION = `SELECT (CASE WHEN EXISTS(SELECT 1 FROM nevora_tenancy.expansion_protocol AS p
 WHERE p.migration_id=26 AND p.phase=$1::pg_catalog.text
 AND p.fence_generation=$2::pg_catalog.int8 OPERATOR(pg_catalog.+) 1::pg_catalog.int8
 AND p.backfill_actor IS NULL AND p.capture_manifest_sha256 IS NOT DISTINCT FROM $3::pg_catalog.text
 AND p.schema_source_commit='7c628e374f03c9025b2c0cfd3568be033f07238d'
 AND p.registry_sha256='5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681')
 THEN '1' ELSE 'source_generation_advance_mismatch' END)::pg_catalog.int4 AS guard`;

/** This is compilation provenance only, trap-free even for revoked proxies. */
export function isPortalOriginalSourceInvalidationComponent(value:unknown):value is PortalOriginalSourceInvalidationComponent {
  return !!value&&typeof value==='object'&&issued.has(value);
}
export function compilePortalOriginalSourceInvalidation(value:unknown):SourceInvalidationCompilation {
  const r=closed(value,['format','kind','databaseOid','installerRole','installerRoleOid','phase','fenceGeneration',
    'captureManifestSha256','workspaceId','workspaceIncarnation','lockEmployeeIds','subjects']);
  if(!r||r.format!=='PORTAL_ORIGINAL_SOURCE_INVALIDATION_INPUT_V1'||
    (r.kind!=='CONTROL_GENERATION'&&r.kind!=='SUBJECT_AUTHORIZATION'&&r.kind!=='SUBJECT_ACCESS')||
    !oid(r.databaseOid)||!oid(r.installerRoleOid)||!text(r.installerRole)||
    (r.phase!=='EXPANDED_LEGACY'&&r.phase!=='FENCED')||!zeroOrPositive(r.fenceGeneration)||
    !(r.captureManifestSha256===null||(typeof r.captureManifestSha256==='string'&&/^[a-f0-9]{64}$/.test(r.captureManifestSha256)))||
    (r.phase==='EXPANDED_LEGACY'&&r.captureManifestSha256!==null))return INVALID;
  const list=dense(r.subjects),locks=dense(r.lockEmployeeIds);if(!list||!locks)return INVALID;
  const lockIds:string[]=[];
  for(const id of locks){if(!text(id)||(lockIds.length>0&&Buffer.compare(Buffer.from(lockIds[lockIds.length-1],'utf8'),Buffer.from(id,'utf8'))>=0))return INVALID;lockIds.push(id);}
  const lockSet=new Set(lockIds);
  const subjectIds:string[]=[],authorizations:string[]=[],accesses:string[]=[];
  for(const item of list){const s=closed(item,['employeeId','authorizationVersion','portalAccessVersion']);
    if(!s||!text(s.employeeId)||!lockSet.has(s.employeeId)||!positive(s.authorizationVersion)||!positive(s.portalAccessVersion)||
      (subjectIds.length>0&&Buffer.compare(Buffer.from(subjectIds[subjectIds.length-1],'utf8'),Buffer.from(s.employeeId,'utf8'))>=0))return INVALID;
    if(s.authorizationVersion===MAX_INT8||(r.kind==='SUBJECT_ACCESS'&&s.portalAccessVersion===MAX_INT8))return EXHAUSTED;
    subjectIds.push(s.employeeId);authorizations.push(s.authorizationVersion);accesses.push(s.portalAccessVersion);
  }
  const control=r.kind==='CONTROL_GENERATION';
  if(control){if(r.workspaceId!==null||r.workspaceIncarnation!==null||list.length!==0||lockIds.length!==0)return INVALID;if(r.fenceGeneration===MAX_INT8)return EXHAUSTED;}
  else{if(!text(r.workspaceId)||!positive(r.workspaceIncarnation)||list.length===0||lockIds.length===0)return INVALID;if(r.phase==='FENCED')return FENCED;}
  const identityValues=Object.freeze([r.databaseOid,r.installerRole,r.installerRoleOid]);
  const controlValues=Object.freeze([r.phase,r.fenceGeneration,r.captureManifestSha256]);
  const prefix:SourceInvalidationPlan[]=[INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL,
    plan('SOURCE_SQL_CONTEXT',SOURCE_SQL_CONTEXT),plan('ORIGINAL_INSTALLER_IDENTITY',IDENTITY,identityValues),plan('CONTROL_TABLE_LOCKS',CONTROL_TABLE_LOCKS),
    plan('PROTOCOL_HOLD',`WITH held AS MATERIALIZED (SELECT p.migration_id FROM nevora_tenancy.expansion_protocol AS p WHERE p.migration_id=26 FOR ${control?'UPDATE':'SHARE'})
 SELECT (CASE WHEN pg_catalog.count(*)=1 THEN '1' ELSE 'original_source_protocol_missing' END)::pg_catalog.int4 AS guard FROM held`),
    plan('CONTRACT_HOLD',CONTRACT_HOLD),plan('CONTROL_BASELINE',CONTROL_BASELINE,controlValues)];
  const suffix:SourceInvalidationPlan[]=[];
  if(control){prefix.push(plan('ADVANCE_CONTROL_GENERATION',CONTROL_ADVANCE,controlValues));suffix.push(plan('CONTROL_ADVANCE_POSTCONDITION',CONTROL_POSTCONDITION,controlValues));}
  else{
    const workspaceId=r.workspaceId as string,incarnation=r.workspaceIncarnation as string;
    const subjectValues=Object.freeze([workspaceId,incarnation,Object.freeze(subjectIds),Object.freeze(authorizations),Object.freeze(accesses)]);
    prefix.push(plan('WORKSPACE_HOLD',WORKSPACE_HOLD,[workspaceId]),plan('EMPLOYEE_SET_HOLD',EMPLOYEE_HOLD,[workspaceId,lockIds]),
      plan('CREDENTIAL_SET_HOLD',CREDENTIAL_HOLD,[lockIds]),plan('COUNTER_HOLD',COUNTER_HOLD,[workspaceId]),
      plan('PORTAL_SET_HOLD',PORTAL_HOLD,[workspaceId,lockIds]),plan('SUBJECT_BASELINE',SUBJECT_BASELINE,subjectValues),
      plan('ADVANCE_SUBJECT_VERSIONS',subjectAdvance(r.kind==='SUBJECT_ACCESS'),subjectValues));
    suffix.push(plan('CONTROL_BASELINE',CONTROL_BASELINE,controlValues),plan('SUBJECT_ADVANCE_POSTCONDITION',subjectPostcondition(r.kind==='SUBJECT_ACCESS'),subjectValues));
  }
  suffix.push(plan('CURRENT_CONTROL_OBSERVATION_NOT_AUTHORITY',CONTROL_OBSERVATION),plan('ORIGINAL_INSTALLER_IDENTITY',IDENTITY,identityValues));
  const component:PortalOriginalSourceInvalidationComponent=Object.freeze({format:'PORTAL_ORIGINAL_SOURCE_INVALIDATION_COMPONENT_V1',
    kind:r.kind,isolationLevel:'ReadCommitted',workspaceId:r.workspaceId as string|null,prefix:Object.freeze(prefix),suffix:Object.freeze(suffix),
    atomicCompositionRequirement:'PREFIX_THEN_REVIEWED_FINITE_ORIGINAL_MUTATION_THEN_SUFFIX_IN_ONE_OWNING_TRANSACTION',
    verification:'COMPOSITION_ONLY_NOT_WRITER_DATABASE_OR_TENANT_AUTHORITY',remainingGates:GATES});
  issued.add(component);return Object.freeze({status:'COMPILED_COMPONENT_NOT_AUTHORITY',component});
}
