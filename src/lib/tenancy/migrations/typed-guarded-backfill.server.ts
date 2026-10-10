// CONTROLLED_EMPLOYEE_NUMBER_EXECUTOR_IMPORTS_BEGIN
import {compileLegacyEmployeeNumberEnrollment,compareLegacyEmployeeNumberEnrollmentTarget,type LegacyEmployeeNumberEnrollment} from './employee-number-enrollment';
import {assertControlledEnrollmentInstallerOriginalLogin,admitControlledEnrollmentInstallerExecution,assertControlledEnrollmentInstallerExecution,getControlledEnrollmentInstallerBinding,isEmployeeNumberEnrollmentBindingFailure,type EmployeeNumberBindingCode} from './employee-number-enrollment-binding.server';
import {assertTypedKeyComparatorsOnLockedInstallerSource} from './key-comparator-recheck.server';
import {INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL} from '../runtime/catalog-fence.server';
// CONTROLLED_EMPLOYEE_NUMBER_EXECUTOR_IMPORTS_END

import {readFileSync,realpathSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {Socket} from 'node:net';
import {types as utilTypes} from 'node:util';
import {Client,type QueryResult} from 'pg';
import {canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,OWNERSHIP_SCHEMA_COMMIT,OWNERSHIP_SOURCE,verifyOwnershipSource,type JsonValue,type TableOwnership} from './ownership';
import {observeMigrationCatalog,type TypedMigrationCaptureFacts,type MigrationCaptureRequest} from './capture.server';
import {decodeTypedMigrationWireValue,isIssuedTypedMigrationWireValue,projectTypedMigrationWireValueToLegacy} from './typed-wire';
import {inspectTypedMigrationSnapshot} from './typed-snapshot';
import {isIssuedTypedTenantBackfillPlan,type TypedTenantBackfillPlan,type TypedBackfillEntry} from './typed-backfill';
import type {OwnedLocalBackfillIdentity} from './guarded-backfill.server';
import type {DatabaseComparatorRow} from './backfill';
import {assertTypedKeyComparatorsOnLockedSource,isKeyComparatorRecheckFailure} from './key-comparator-recheck.server';

import {describeTypedBackfillJournal,validateTypedBackfillJournalObservation,type TypedBackfillJournalDescriptor,type TypedBackfillJournalAssessment} from './typed-journal-contract';
import {bindOwnedTypedJournalInstallation,assertOwnedTypedJournalInstallation,isTypedJournalBindingFailure,type TypedJournalInstallation,type TypedJournalBindingCode} from './typed-journal-binding.server';

export type GuardedTypedBackfillRequest={mode:'OWNED_LOCAL';identity:OwnedLocalBackfillIdentity;facts:TypedMigrationCaptureFacts;captureRequest:MigrationCaptureRequest;plan:TypedTenantBackfillPlan;authority:{reference:string;operatorRole:string;factsDigest:string;planDigest:string}};
export type GuardedTypedBackfillCode=TypedJournalBindingCode|
 'TYPED_JOURNAL_DESCRIPTOR_DRIFT'|'TYPED_JOURNAL_RETRY_STATE_DRIFT'|'TYPED_JOURNAL_STORAGE_FAILED'|
 'TYPED_JOURNAL_ORIGINAL_UNCERTAIN_ATTEMPT_REQUIRED'|'TYPED_JOURNAL_FRESH_CLIENT_REQUIRED'|'TYPED_JOURNAL_UNAPPLIED_JOURNAL_DRIFT'|
 'UNSUPPORTED_REQUEST'|'TYPED_PLAN_REQUIRED'|'OWNED_LOCAL_MODE_REQUIRED'|'CAPTURE_BINDING_DRIFT'|'OPERATOR_CUSTODY_BINDING_DRIFT'|'OWNED_LOCAL_IDENTITY_REQUIRED'|
 'OWNED_PG_CLIENT_REQUIRED'|'CLIENT_ALREADY_IN_USE'|'CLIENT_NOT_IDLE'|'CLIENT_CONNECTION_NOT_OWNED'|'OWNED_LOCAL_IDENTITY_DRIFT'|'OWNED_DATABASE_IDENTITY_DRIFT'|'OPERATOR_ROLE_DRIFT'|
 'INSTALLED_SOURCE_DRIFT'|'INSTALLED_REGISTRY_DRIFT'|'CURRENT_CATALOG_DRIFT'|'CURRENT_COMPARATOR_CATALOG_DRIFT'|'CURRENT_COLLATION_DRIFT'|'CURRENT_COMPARATOR_ROW_DRIFT'|'FENCE_PROTOCOL_DRIFT'|
 'SOURCE_COLUMN_TYPE_DRIFT'|'SOURCE_ROW_SHAPE_DRIFT'|'SOURCE_NULLABILITY_DRIFT'|'SOURCE_WIRE_UNSUPPORTED'|'CURRENT_SOURCE_DRIFT'|'CURRENT_WIRE_SOURCE_DRIFT'|
 'DIRECT_OWNERSHIP_STATE_DRIFT'|'SIDECAR_OWNERSHIP_STATE_DRIFT'|'DIRECT_ATTRIBUTION_NOT_EXACT'|'SIDECAR_ATTRIBUTION_NOT_EXACT'|'OPERATOR_ARM_NOT_EXACT'|'OPERATOR_CLEAR_NOT_EXACT'|'COMMITTED_MANIFEST_REQUIRED'|
 'KEY_RECHECK_UNISSUED_OBSERVATIONS'|'KEY_RECHECK_TRANSACTION_REQUIRED'|'KEY_RECHECK_LOCKS_REQUIRED'|'KEY_RECHECK_SOURCE_DRIFT'|'KEY_RECHECK_COMPARATOR_DRIFT'|'KEY_RECHECK_READ_FAILED'|'TYPED_GUARDED_BACKFILL_FAILED';
export type GuardedTypedBackfillOutcome=
 {status:'APPLIED'|'UNCHANGED';mode:'WHOLE_PLAN_ATOMIC';planDigest:string;sourceRows:number;verification:'OWNED_LOCAL_ATOMIC_TYPED_BACKFILL_NOT_F10_COMPLETE'}|
 {status:'BLOCKED';code:GuardedTypedBackfillCode}|
 {status:'UNCERTAIN';code:'COMMIT_OUTCOME_UNKNOWN'|'ROLLBACK_UNCONFIRMED';planDigest:string;reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'};
export type GuardedTypedJournalBackfillOutcome=Exclude<GuardedTypedBackfillOutcome,{status:'APPLIED'|'UNCHANGED'}>|{
 status:'APPLIED'|'UNCHANGED';mode:'WHOLE_PLAN_ATOMIC';planDigest:string;sourceRows:number;
 verification:'OWNED_LOCAL_ATOMIC_TYPED_JOURNAL_BACKFILL_NOT_F10_COMPLETE';
 journal:{descriptorChecksum:string;chunkCount:number;effectsVerified:false;integration:'SAME_TRANSACTION_STRUCTURAL_WRITES'|'MATCHING_EXISTING_OBSERVATIONS_NO_PRIOR_ATOMICITY_CLAIM';verification:'ATOMIC_STRUCTURE_NOT_EFFECTS_OR_DATABASE_VERIFICATION'};
};

/** Observations describe the freshly locked original tuple, not a causal
 * COMMITTED/ROLLED_BACK disposition, durable restart recovery or tenant proof. */
export type TypedJournalReconciliationOutcome=
 {status:'OBSERVED';mode:'WHOLE_PLAN_ATOMIC';metadata:'APPLIED_METADATA_PRESENT'|'ORIGINAL_METADATA_ABSENT';planDigest:string;sourceRows:number;
 verification:'OWNED_LOCAL_ORIGINAL_ATTEMPT_OBSERVATION_NOT_COMMIT_DISPOSITION';
 journal:{descriptorChecksum:string;chunkCount:number;effectsVerified:false;observation:'MATCHING_EXISTING_OBSERVATIONS'|'NO_JOURNAL_OBSERVED'}}|
 {status:'BLOCKED';code:GuardedTypedBackfillCode}|
 {status:'UNCERTAIN';code:'RECONCILIATION_COMMIT_OUTCOME_UNKNOWN'|'ROLLBACK_UNCONFIRMED';planDigest:string;reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'};
// Only an actual uncertain journal invocation enrolls its detached original
// request and originating client. Public outcome fields, clones and serialized
// receipts cannot reconstruct this process-local identity; no restart claim.
const uncertainAttempts=new WeakMap<object,{client:Client;request:GuardedTypedBackfillRequest}>();
const active=new WeakSet<Client>(),SHA=/^[a-f0-9]{64}$/,UINT=/^(0|[1-9][0-9]*)$/;
const ident=(value:string)=>'"'+value.replace(/"/g,'""')+'"';
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
const order=(a:string,b:string)=>a<b?-1:a>b?1:0;
const key=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&!/[\p{Cc}\p{Cf}]/u.test(v);
const wireTypes={getTypeParser:()=>((value:string)=>value)};
const wireOids:Record<string,number>={text:25,date:1082,time:1083,smallint:21,timestamptz:1184,integer:23,jsonb:3802,boolean:16,uuid:2950,'text[]':1009,'char(64)':1042,'numeric(5,2)':1700,bigint:20,timestamp:1114,'char(32)':1042};
const casts:Record<string,string>={text:'pg_catalog.text',date:'pg_catalog.date',time:'pg_catalog.time',smallint:'pg_catalog.int2',timestamptz:'pg_catalog.timestamptz',integer:'pg_catalog.int4',jsonb:'pg_catalog.jsonb',boolean:'pg_catalog.bool',uuid:'pg_catalog.uuid','text[]':'pg_catalog.text[]','char(64)':'pg_catalog.bpchar(64)','numeric(5,2)':'pg_catalog.numeric(5,2)',bigint:'pg_catalog.int8',timestamp:'pg_catalog.timestamp','char(32)':'pg_catalog.bpchar(32)'};
class GuardFailure extends Error{constructor(readonly code:GuardedTypedBackfillCode){super(code);}}
function fail(code:GuardedTypedBackfillCode):never{throw new GuardFailure(code);}
async function raw(client:Client,text:string,values:unknown[]=[]):Promise<QueryResult<(string|null)[]>>{return client.query<(string|null)[]>({text,values,rowMode:'array',types:wireTypes});}
function closed(value:unknown,names:string[]):boolean{return value!==null&&typeof value==='object'&&!Array.isArray(value)&&same(Object.keys(value).sort(),[...names].sort());}
/** Copies only ordinary data descriptors. Proxies are rejected using Node's
 * trap-free predicate. The compiler plan and parser-issued immutable cells keep
 * their actual identity; JSON serialization never reissues either capability.
 */
function detach(value:unknown,ancestors=new Set<object>()):unknown{
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value))return value;
 if(typeof value!=='object'||value===null||utilTypes.isProxy(value)||ancestors.has(value))fail('UNSUPPORTED_REQUEST');
 if(isIssuedTypedTenantBackfillPlan(value)||isIssuedTypedMigrationWireValue(value))return value;
 const array=Array.isArray(value);if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))fail('UNSUPPORTED_REQUEST');
 const descriptors=Object.getOwnPropertyDescriptors(value),names=Reflect.ownKeys(value);if(names.some(n=>typeof n!=='string'))fail('UNSUPPORTED_REQUEST');
 ancestors.add(value);
 try{
  if(array){const length=descriptors.length;if(!length||!('value'in length)||!Number.isSafeInteger(length.value)||length.value<0||names.length!==length.value+1)fail('UNSUPPORTED_REQUEST');const out:unknown[]=[];for(let i=0;i<length.value;i++){const d=descriptors[String(i)];if(!d||!('value'in d)||!d.enumerable)fail('UNSUPPORTED_REQUEST');out.push(detach(d.value,ancestors));}return Object.freeze(out);}
  const out:Record<string,unknown>={};for(const n of names as string[]){const d=descriptors[n];if(!d||!('value'in d)||!d.enumerable)fail('UNSUPPORTED_REQUEST');Object.defineProperty(out,n,{value:detach(d.value,ancestors),enumerable:true});}return Object.freeze(out);
 }finally{ancestors.delete(value);}
}
function requestBinding(value:unknown):GuardedTypedBackfillRequest{
 if(typeof value!=='object'||value===null||utilTypes.isProxy(value))fail('UNSUPPORTED_REQUEST');
 const p=Object.getOwnPropertyDescriptor(value,'plan');
 if(!p||!('value'in p)||!isIssuedTypedTenantBackfillPlan(p.value))fail('TYPED_PLAN_REQUIRED');
 const captured=detach(value);if(!closed(captured,['mode','identity','facts','captureRequest','plan','authority']))fail('UNSUPPORTED_REQUEST');
 const request=captured as GuardedTypedBackfillRequest,{identity:i,facts,plan,authority:a,captureRequest:c}=request;
 if(request.mode!=='OWNED_LOCAL')fail('OWNED_LOCAL_MODE_REQUIRED');
 if(!closed(i,['database','databaseOid','marker','systemIdentifier','dataDirectory','role','port','clusterRoot','leasePath','postmasterPid','postmasterStart','roleOid'])||!closed(a,['reference','operatorRole','factsDigest','planDigest']))fail('UNSUPPORTED_REQUEST');
 if(!key(i.database)||!key(i.role)||!key(i.clusterRoot)||!key(i.leasePath)||!key(i.dataDirectory)||!key(i.marker)||!i.marker.startsWith('f10-owned:')||![i.databaseOid,i.systemIdentifier,i.roleOid,i.postmasterStart].every(v=>typeof v==='string'&&/^[1-9][0-9]*$/.test(v))||!Number.isSafeInteger(i.port)||i.port<1||i.port>65535||!Number.isSafeInteger(i.postmasterPid)||i.postmasterPid<1)fail('OWNED_LOCAL_IDENTITY_REQUIRED');
 const b=plan.manifest.boundary,inspected=inspectTypedMigrationSnapshot(facts,{sourceDigest:b.sourceDigest,currentSchemaDigest:b.currentSchemaDigest,snapshotId:b.snapshotId,fenceGeneration:b.fenceGeneration,factsDigest:b.factsDigest});
 if(inspected.status!=='INSPECTED'||!same(inspected.snapshot,plan.manifest.observations.snapshot))fail('CAPTURE_BINDING_DRIFT');
 const ownedIdentity={database:i.database,databaseOid:i.databaseOid,marker:i.marker,systemIdentifier:i.systemIdentifier,dataDirectory:i.dataDirectory,role:i.role,port:i.port};
 if(!closed(c,['identity','migrations','sourceDigest','catalogBaseline','expectedFenceGeneration'])||!closed(c.catalogBaseline,['sourceDigest','expansionSha256','registryDigest','catalogDigest'])||!same(c.identity,ownedIdentity)||c.sourceDigest!==facts.sourceDigest||c.catalogBaseline.sourceDigest!==facts.sourceDigest||c.catalogBaseline.registryDigest!==facts.registryDigest||c.catalogBaseline.catalogDigest!==facts.currentSchemaDigest||c.catalogBaseline.expansionSha256!=='fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb'||typeof c.expectedFenceGeneration!=='string'||!UINT.test(c.expectedFenceGeneration)||BigInt(c.expectedFenceGeneration)+BigInt(1)!==BigInt(facts.fence.generation)||!Array.isArray(c.migrations)||verifyOwnershipSource(c.migrations).length)fail('CAPTURE_BINDING_DRIFT');
 if(!key(a.reference)||a.operatorRole!==i.role||a.factsDigest!==facts.factsDigest||a.planDigest!==plan.digest||!SHA.test(a.planDigest))fail('OPERATOR_CUSTODY_BINDING_DRIFT');
 return request;
}
function requireIdle(client:Client){const d=Object.getOwnPropertyDescriptors(client);if(client.getTransactionStatus()!=='I'||d._activeQuery?.value!==null||!Array.isArray(d._queryQueue?.value)||d._queryQueue.value.length!==0||d._connected?.value!==true||d._connecting?.value!==false||d._ending?.value!==false||d.readyForQuery?.value!==true)fail('CLIENT_NOT_IDLE');}
function localConnection(client:Client,i:OwnedLocalBackfillIdentity){const s=client.connection.stream;if(client.host!=='127.0.0.1'||client.port!==i.port||client.database!==i.database||client.user!==i.role||client.ssl!==false||client.pipeline!==false||!(s instanceof Socket)||s.destroyed||s.remoteAddress!=='127.0.0.1'||s.remotePort!==i.port||s.localAddress!=='127.0.0.1')fail('CLIENT_CONNECTION_NOT_OWNED');}
function parseMetadata(value:unknown):JsonValue{if(typeof value!=='string')fail('INSTALLED_REGISTRY_DRIFT');const decoded=decodeTypedMigrationWireValue('jsonb',value);if(decoded.status!=='DECODED')fail('INSTALLED_REGISTRY_DRIFT');/* Only installed registry arrays/strings/small line numbers, never source cells. */const parsed=JSON.parse(value) as JsonValue;canonicalOwnershipJson(parsed);return parsed;}
type LocalLease = { root: string; data: string; port: number; pid: number; pidStart: string; systemIdentifier: string;
  closed: false; scope: 'OWNED_LOCAL_F10'; database: string; marker: string; authorizationReference: string;
  operatorRoles: { name: string; catalog: string[] }[] };
function ownedLease(request: GuardedTypedBackfillRequest): LocalLease {
  try {
    const i = request.identity, root = realpathSync(i.clusterRoot), data = realpathSync(i.dataDirectory);
    if (root !== i.clusterRoot || data !== i.dataDirectory || data !== join(root, 'data') || realpathSync(i.leasePath) !== join(root, 'ownership.json')) fail('OWNED_LOCAL_IDENTITY_DRIFT');
    const info = statSync(i.leasePath);
    if (!info.isFile() || (info.mode & 0o077) !== 0 || process.getuid && info.uid !== process.getuid()) fail('OWNED_LOCAL_IDENTITY_DRIFT');
    const lease = JSON.parse(readFileSync(i.leasePath, 'utf8')) as LocalLease;
    canonicalOwnershipJson(lease);
    if (lease.closed !== false || lease.scope !== 'OWNED_LOCAL_F10' || lease.root !== root || lease.data !== data || lease.port !== i.port || lease.pid !== i.postmasterPid ||
      lease.pidStart !== i.postmasterStart || lease.systemIdentifier !== i.systemIdentifier || lease.authorizationReference !== request.authority.reference ||
      !key(lease.database) || !key(lease.marker) || i.database.indexOf(lease.database + '_case_') !== 0 || i.marker !== lease.marker + ':case:' + i.database ||
      !Array.isArray(lease.operatorRoles) || !lease.operatorRoles.some(r => r.name === i.role && Array.isArray(r.catalog) && r.catalog[0] === i.roleOid)) fail('OWNED_LOCAL_IDENTITY_DRIFT');
    const pid = readFileSync(join(data, 'postmaster.pid'), 'utf8').split('\n');
    if (Number(pid[0]) !== i.postmasterPid || realpathSync(pid[1]) !== data || pid[2] !== i.postmasterStart || Number(pid[3]) !== i.port) fail('OWNED_LOCAL_IDENTITY_DRIFT');
    process.kill(i.postmasterPid, 0); // Presence check only; never stop/terminate a process.
    return lease;
  } catch { return fail('OWNED_LOCAL_IDENTITY_DRIFT'); }
}
async function databaseIdentity(client: Client, request: GuardedTypedBackfillRequest, lease: LocalLease) {
  const i = request.identity;
  const result = await raw(client, "SELECT current_database(),(SELECT oid::text FROM pg_database WHERE datname=current_database()),shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database'),(SELECT system_identifier::text FROM pg_control_system()),current_setting('data_directory'),session_user::text,current_user::text,host(inet_server_addr()),inet_server_port()::text,current_setting('server_version'),current_setting('server_encoding'),current_setting('session_replication_role'),floor(extract(epoch FROM pg_postmaster_start_time()))::bigint::text,current_setting('search_path'),current_setting('unix_socket_directories'),SYSTEM_USER::text,(SELECT usesysid::text FROM pg_stat_activity WHERE pid=pg_backend_pid()),current_setting('role')");
  const row = result.rows[0];
  if (result.rows.length !== 1 || !same(row.slice(0, 6), [i.database, i.databaseOid, i.marker, i.systemIdentifier, i.dataDirectory, i.role]) ||
    row[6] !== i.role || row[7] !== '127.0.0.1' || row[8] !== String(i.port) || (typeof row[9]!=='string'||!/^1[78]\./.test(row[9])) || row[10] !== 'UTF8' || row[11] !== 'origin' ||
    row[12] !== i.postmasterStart || row[13] !== 'pg_catalog' || row[14] !== '' || row[15] !== 'scram-sha-256:'+i.role || row[16] !== i.roleOid || row[17] !== 'none') fail('OWNED_DATABASE_IDENTITY_DRIFT');
  const role = (await raw(client, 'SELECT oid::text,rolname,rolsuper::text,rolinherit::text,rolcreaterole::text,rolcreatedb::text,rolcanlogin::text,rolreplication::text,rolbypassrls::text FROM pg_roles WHERE rolname=session_user')).rows;
  const allowed = lease.operatorRoles.find(r => r.name === i.role)!;
  if (role.length !== 1 || !same(role[0], allowed.catalog) || role[0][0] !== i.roleOid || !same(role[0].slice(2), ['false', 'false', 'false', 'false', 'true', 'false', 'false'])) fail('OPERATOR_ROLE_DRIFT');
  const membership = (await raw(client, 'SELECT p.rolname,m.admin_option::text,m.inherit_option::text,m.set_option::text FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member JOIN pg_roles p ON p.oid=m.roleid WHERE r.rolname=session_user ORDER BY p.rolname')).rows;
  if (!same(membership, [['pg_read_all_settings', 'false', 'true', 'true']])) fail('OPERATOR_ROLE_DRIFT');
  const privileges = (await raw(client, "SELECT has_schema_privilege(session_user,'public','CREATE')::text,has_schema_privilege(session_user,'nevora_tenancy','CREATE')::text,EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN('public','nevora_tenancy') AND (c.relowner=(SELECT oid FROM pg_roles WHERE rolname=session_user) OR has_table_privilege(session_user,c.oid,'TRIGGER')))::text")).rows;
  if (!same(privileges, [['false', 'false', 'false']])) fail('OPERATOR_ROLE_DRIFT');
}
async function installedContracts(client: Client) {
  const registry = getOwnershipRegistry();
  const installed = (await raw(client, 'SELECT path,source_sha256 FROM nevora_tenancy.source_migration_contract ORDER BY path')).rows;
  if (!same(installed, OWNERSHIP_SOURCE.map(s => [s.path, s.sha256]))) fail('INSTALLED_SOURCE_DRIFT');
  const rows = (await raw(client, "SELECT COALESCE(jsonb_agg(to_jsonb(q)),'[]'::jsonb)::text FROM (SELECT table_name,storage,anchor,primary_key_columns,sidecar_name,mirror_columns,original_columns,source_path,source_line FROM nevora_tenancy.owned_table_contract ORDER BY table_name) q")).rows;
  const expected = registry.tables.map(t => ({ table_name: t.table, storage: t.storage, anchor: t.anchor, primary_key_columns: t.primaryKey,
    sidecar_name: t.sidecar, mirror_columns: t.mirroredIdentityColumns, original_columns: t.columns.map(c => c.name), source_path: t.source.path, source_line: t.source.line }));
  if (rows.length !== 1 || rows[0].length !== 1 || !same(parseMetadata(rows[0][0]), expected)) fail('INSTALLED_REGISTRY_DRIFT');
}
async function catalog(client: Client, facts: TypedMigrationCaptureFacts) {
  const observed = await observeMigrationCatalog(client);
  if (observed.digest !== facts.currentSchemaDigest || !same(observed.catalog, facts.catalog)) fail('CURRENT_CATALOG_DRIFT');
}
const comparatorContracts = [
  { id: 'employees.email_ci', table: 'employees', column: 'email', index: 'employees_email_unique', expression: 'lower(email)', predicate: '(email IS NOT NULL)' },
  { id: 'positions.name_ci', table: 'positions', column: 'name', index: 'positions_workspace_name_unique', expression: 'lower(name)', predicate: null },
  { id: 'clocker_break_types.name_ci', table: 'clocker_break_types', column: 'name', index: 'clocker_break_type_name', expression: 'lower(name)', predicate: null },
  { id: 'schedule_templates.active_name_ci', table: 'schedule_templates', column: 'name', index: 'schedule_templates_name_unique', expression: 'lower(name)', predicate: '(active = true)' },
] as const;
/** Re-evaluate the exact closed SQL comparators using the current DB collation.
 * No JavaScript normalization, inferred locale, or tenant grouping is used. */
async function namespaceWitnesses(client: Client, facts: TypedMigrationCaptureFacts) {
  const rows: DatabaseComparatorRow[] = [];
  const engine = (await raw(client, "SELECT current_setting('server_version'),current_setting('server_encoding')")).rows;
  for (const contract of comparatorContracts) {
    const captured = facts.namespaceComparators.catalogs.find(c => c.contractId === contract.id)!;
    const d = captured.definition;
    if (!same(engine, [[d.serverVersion, d.serverEncoding]])) fail('CURRENT_COMPARATOR_CATALOG_DRIFT');
    const observed = (await raw(client, "SELECT pg_get_indexdef(i.indexrelid),pg_get_expr(i.indexprs,i.indrelid),pg_get_expr(i.indpred,i.indrelid),a.attcollation::text,i.indcollation[(i.indnkeyatts-1)]::text,i.indisunique::text,i.indisvalid::text,i.indisready::text,i.indislive::text,am.amname FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_namespace n ON n.oid=x.relnamespace JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attname=$2 JOIN pg_am am ON am.oid=x.relam WHERE n.nspname='public' AND x.relname=$1 AND i.indrelid=$3::regclass", [contract.index, contract.column, 'public.' + contract.table])).rows;
    if (observed.length !== 1 || d.expression !== contract.expression || d.predicate !== contract.predicate || !same(observed[0], [d.indexDefinition, d.expression, d.predicate, d.expressionCollation.oid, d.indexCollation.oid, 'true', 'true', 'true', 'true', 'btree'])) fail('CURRENT_COMPARATOR_CATALOG_DRIFT');
    for (const c of [d.expressionCollation, d.indexCollation]) {
      const actual = (await raw(client, "SELECT c.oid::text,n.nspname,c.collname,c.collprovider,c.collisdeterministic::text,c.collencoding::text,c.collcollate,c.collctype,COALESCE(to_jsonb(c)->>'colllocale',to_jsonb(c)->>'colliculocale'),c.collversion,pg_collation_actual_version(c.oid) FROM pg_collation c JOIN pg_namespace n ON n.oid=c.collnamespace WHERE c.oid=$1::oid", [c.oid])).rows;
      if (c.version !== c.actualVersion || actual.length !== 1 || !same(actual[0], [c.oid, c.schema, c.name, c.provider, String(c.deterministic), String(c.encoding), c.lcCollate, c.lcCtype, c.locale, c.version, c.actualVersion])) fail('CURRENT_COLLATION_DRIFT');
    }
    const rule = getOwnershipRegistry().tables.find(t => t.table === contract.table)!;
    const predicate = contract.predicate ?? 'true';
    const compared = contract.expression + ' COLLATE ' + ident(d.indexCollation.schema) + '.' + ident(d.indexCollation.name);
    const results = (await raw(client, 'SELECT ' + rule.primaryKey.map(ident).join(',') + ',(' + predicate + ')::text,' + contract.expression + ',CASE WHEN ' + predicate + ' THEN dense_rank() OVER (ORDER BY CASE WHEN ' + predicate + ' THEN ' + compared + ' END)::text ELSE NULL END FROM public.' + ident(contract.table))).rows;
    const source = facts.tables.find(t => t.table === contract.table)!;
    for (const result of results) {
      const keyWires=result.slice(0,rule.primaryKey.length);
      const row=source.rows.find(r=>same(rule.primaryKey.map(name=>r.columns.find(c=>c.name===name)!.wire),keyWires))??fail('CURRENT_COMPARATOR_ROW_DRIFT');
      const k=[...row.key];
      if (!['true', 'false'].includes(result[rule.primaryKey.length]??'')) fail('CURRENT_COMPARATOR_ROW_DRIFT');
      rows.push({ contractId: contract.id, key: k, rowChecksum: row.originalChecksum, included: result[rule.primaryKey.length] === 'true', expressionValue: result[rule.primaryKey.length + 1], comparisonClass: result[rule.primaryKey.length + 2] });
    }
  }
  rows.sort((a, b) => order(canonicalOwnershipJson([a.contractId, a.key]), canonicalOwnershipJson([b.contractId, b.key])));
  if (!same(rows, facts.namespaceComparators.rows)) fail('CURRENT_COMPARATOR_ROW_DRIFT');
}
async function protocol(client: Client, request: GuardedTypedBackfillRequest, plan: TypedTenantBackfillPlan, lock: boolean) {
  const rows = (await raw(client, 'SELECT phase,fence_generation::text,backfill_actor::text,capture_manifest_sha256,schema_source_commit,registry_sha256 FROM nevora_tenancy.expansion_protocol WHERE migration_id=26' + (lock ? ' FOR UPDATE' : ''))).rows;
  const row = rows[0];
  if (rows.length !== 1 || row[0] !== 'FENCED' || row[1] !== request.facts.fence.generation || row[2] !== null ||
    row[3] !== null && row[3] !== plan.digest || row[4] !== OWNERSHIP_SCHEMA_COMMIT || row[5] !== plan.manifest.boundary.registryDigest) fail('FENCE_PROTOCOL_DRIFT');
  return row[3] === plan.digest;
}

function keyWires(rule:TableOwnership,entry:TypedBackfillEntry):(string|null)[]{return rule.primaryKey.map(n=>entry.source.columns.find(c=>c.name===n)!.wire);}
function checkedFields(result:QueryResult<(string|null)[]>,columns:ReadonlyArray<{name:string;type:string}>){if(result.fields.length!==columns.length||result.fields.some((f,i)=>f.name!==columns[i].name||f.format!=='text'||f.dataTypeID!==wireOids[columns[i].type]))fail('SOURCE_COLUMN_TYPE_DRIFT');}
async function originalRows(client:Client,facts:TypedMigrationCaptureFacts){
 const all:JsonValue[]=[];
 for(const rule of getOwnershipRegistry().tables){
  const result=await raw(client,'SELECT '+rule.columns.map(c=>ident(c.name)).join(',')+' FROM public.'+ident(rule.table));checkedFields(result,rule.columns);
  const expected=facts.tables.find(t=>t.table===rule.table)!,seen=new Set<string>(),checks:{key:JsonValue[];checksum:string}[]=[];
  for(const values of result.rows){
   if(values.length!==rule.columns.length||values.some(v=>v!==null&&typeof v!=='string'))fail('SOURCE_ROW_SHAPE_DRIFT');
   const pk=rule.primaryKey.map(n=>values[rule.columns.findIndex(c=>c.name===n)]),source=expected.rows.find(r=>same(rule.primaryKey.map(n=>r.columns.find(c=>c.name===n)!.wire),pk));if(!source||seen.has(canonicalOwnershipJson(source.key)))fail('CURRENT_SOURCE_DRIFT');seen.add(canonicalOwnershipJson(source.key));
   const columns=rule.columns.map((c,index)=>{const wire=values[index];if(wire===null&&!c.nullable)fail('SOURCE_NULLABILITY_DRIFT');const d=decodeTypedMigrationWireValue(c.type,wire);if(d.status!=='DECODED')fail('SOURCE_WIRE_UNSUPPORTED');return {name:c.name,type:c.type,wire,value:d.value};});
   const checksum=ownershipDigest({format:'TYPED_SQL_WIRE_V1',columns});if(checksum!==source.originalChecksum||!same(columns,source.columns))fail('CURRENT_SOURCE_DRIFT');checks.push({key:[...source.key],checksum});all.push({table:rule.table,key:[...source.key],values,originalChecksum:checksum,wireChecksum:ownershipDigest(values)});
  }
  checks.sort((a,b)=>order(canonicalOwnershipJson(a.key),canonicalOwnershipJson(b.key)));if(checks.length!==expected.expectedCount||ownershipDigest(checks)!==expected.expectedChecksum)fail('CURRENT_SOURCE_DRIFT');
 }
 all.sort((a,b)=>order(canonicalOwnershipJson([(a as Record<string,JsonValue>).table,(a as Record<string,JsonValue>).key]),canonicalOwnershipJson([(b as Record<string,JsonValue>).table,(b as Record<string,JsonValue>).key])));if(!same(all,facts.wireRows))fail('CURRENT_WIRE_SOURCE_DRIFT');
}
async function ownershipState(client:Client,plan:TypedTenantBackfillPlan,applied:boolean){
 for(const rule of getOwnershipRegistry().tables){const entries=plan.entries.filter(e=>e.table===rule.table);
  if(rule.storage==='DIRECT_IMMUTABLE'&&rule.anchor.kind!=='ROOT'&&!rule.columns.some(c=>c.name==='workspace_id')){
   const columns=rule.primaryKey.map(n=>rule.columns.find(c=>c.name===n)!);const result=await raw(client,'SELECT '+rule.primaryKey.map(ident).join(',')+',workspace_id FROM public.'+ident(rule.table));checkedFields(result,[...columns,{name:'workspace_id',type:'text'}]);
   const expected=entries.map(e=>[...keyWires(rule,e),applied?e.source.workspaceId:null]);const actual=result.rows;if(actual.some(r=>r.length!==columns.length+1)||!same([...actual].sort((a,b)=>order(canonicalOwnershipJson(a),canonicalOwnershipJson(b))),expected.sort((a,b)=>order(canonicalOwnershipJson(a),canonicalOwnershipJson(b)))))fail('DIRECT_OWNERSHIP_STATE_DRIFT');
  }
  if(rule.sidecar){const names=[...new Set([...rule.primaryKey,...rule.mirroredIdentityColumns])].sort(order),columns=names.map(n=>rule.columns.find(c=>c.name===n)!);const result=await raw(client,'SELECT '+names.map(ident).join(',')+',workspace_id,source_checksum_sha256,capture_manifest_sha256 FROM public.'+ident(rule.sidecar));checkedFields(result,[...columns,{name:'workspace_id',type:'text'},{name:'source_checksum_sha256',type:'text'},{name:'capture_manifest_sha256',type:'text'}]);
   const expected=(applied?entries:[]).map(e=>[...names.map(n=>e.mirroredIdentity.find(c=>c.name===n)!.wire),e.source.workspaceId,e.sourceChecksum,plan.digest]);if(result.rows.some(r=>r.length!==columns.length+3)||!same([...result.rows].sort((a,b)=>order(canonicalOwnershipJson(a),canonicalOwnershipJson(b))),expected.sort((a,b)=>order(canonicalOwnershipJson(a),canonicalOwnershipJson(b)))))fail('SIDECAR_OWNERSHIP_STATE_DRIFT');
  }
 }
}
async function attribute(client:Client,rule:TableOwnership,entry:TypedBackfillEntry,planDigest:string){
 const effect=entry.effect;
 if(effect.kind==='ASSIGN_ADDED_DIRECT_WORKSPACE'){
  const values=[effect.workspaceId,...keyWires(rule,entry)],where=rule.primaryKey.map((n,i)=>ident(n)+'=$'+(i+2)+'::'+casts[rule.columns.find(c=>c.name===n)!.type]).join(' AND ');
  const result=await client.query('UPDATE public.'+ident(rule.table)+' SET workspace_id=$1::pg_catalog.text WHERE '+where+' AND workspace_id IS NULL',values);if(result.rowCount!==1)fail('DIRECT_ATTRIBUTION_NOT_EXACT');
 }else if(effect.kind==='INSERT_TYPED_SIDECAR'){
  const columns=effect.identity.map(c=>({name:c.name,type:c.type,wire:c.wire}));columns.push({name:'workspace_id',type:'text',wire:effect.workspaceId},{name:'source_checksum_sha256',type:'text',wire:effect.sourceChecksum},{name:'capture_manifest_sha256',type:'text',wire:planDigest});
  const result=await client.query('INSERT INTO public.'+ident(effect.table)+'('+columns.map(c=>ident(c.name)).join(',')+') VALUES('+columns.map((c,i)=>'$'+(i+1)+'::'+casts[c.type]).join(',')+')',columns.map(c=>c.wire));if(result.rowCount!==1)fail('SIDECAR_ATTRIBUTION_NOT_EXACT');
 }
}
/** Journal functions accept only complete immutable metadata derived beside
 * the genuine original compiler plan. No native source cell is projected. */
async function journalQuery(client:Client,text:string,values:unknown[]=[]){
 try{return await raw(client,text,values);}catch{fail('TYPED_JOURNAL_STORAGE_FAILED');}
}
async function journalObservation(client:Client,plan:TypedTenantBackfillPlan,descriptor:TypedBackfillJournalDescriptor,text:string,values:unknown[]):Promise<TypedBackfillJournalAssessment>{
 const rows=(await journalQuery(client,text,values)).rows;
 if(rows.length!==1||rows[0].length!==1||typeof rows[0][0]!=='string')fail('TYPED_JOURNAL_DESCRIPTOR_DRIFT');
 const decoded=decodeTypedMigrationWireValue('jsonb',rows[0][0]);if(decoded.status!=='DECODED')fail('TYPED_JOURNAL_DESCRIPTOR_DRIFT');
 const projected=projectTypedMigrationWireValueToLegacy(decoded.value);if(projected.status!=='CONVERTED'||projected.origin!=='JSON')fail('TYPED_JOURNAL_DESCRIPTOR_DRIFT');
 const assessment=validateTypedBackfillJournalObservation(plan,descriptor,projected.value);
 if(assessment.status!=='STRUCTURAL_OBSERVATIONS_ONLY')fail('TYPED_JOURNAL_DESCRIPTOR_DRIFT');return assessment.assessment;
}
async function journalPresent(client:Client,plan:TypedTenantBackfillPlan){
 const rows=(await journalQuery(client,'/* F10_TYPED_JOURNAL_EXISTS */ SELECT plan_digest FROM nevora_tenancy.typed_backfill_journal_plan WHERE plan_digest=$1::pg_catalog.text',[plan.digest])).rows;
 if(rows.length>1||rows.length===1&&!same(rows[0],[plan.digest]))fail('TYPED_JOURNAL_DESCRIPTOR_DRIFT');return rows.length===1;
}
const journalRead=(client:Client,plan:TypedTenantBackfillPlan,d:TypedBackfillJournalDescriptor)=>journalObservation(client,plan,d,'/* F10_TYPED_JOURNAL_READ */ SELECT nevora_tenancy.read_typed_backfill_journal($1::pg_catalog.text)::pg_catalog.text',[canonicalOwnershipJson(d)]);
function journalStarted(a:TypedBackfillJournalAssessment){if(a.chunks.some(c=>c.observedState!=='STARTED'&&c.observedState!=='UNKNOWN'))fail('TYPED_JOURNAL_RETRY_STATE_DRIFT');}
/** Fixed observation only: never register, advance UNKNOWN, repair or replay.
 * The complete source70 and journal2 lock set precedes these native reads. */
async function observeJournalWithoutMutation(client:Client,plan:TypedTenantBackfillPlan,d:TypedBackfillJournalDescriptor,applied:boolean){
 const present=await journalPresent(client,plan);
 if(!applied){
  const chunks=await journalQuery(client,'/* F10_TYPED_JOURNAL_CHUNKS_EXIST */ SELECT plan_digest FROM nevora_tenancy.typed_backfill_journal_chunk WHERE plan_digest=$1::pg_catalog.text LIMIT 1',[plan.digest]);
  if(present||chunks.rows.length)fail('TYPED_JOURNAL_UNAPPLIED_JOURNAL_DRIFT');
  return;
 }
 if(!present)fail('TYPED_JOURNAL_RETRY_STATE_DRIFT');
 journalStarted(await journalRead(client,plan,d));
}
async function prepareJournal(client:Client,plan:TypedTenantBackfillPlan,d:TypedBackfillJournalDescriptor,retry:boolean){
 const present=await journalPresent(client,plan);if(retry&&!present)fail('TYPED_JOURNAL_RETRY_STATE_DRIFT');
 let observed=present?await journalRead(client,plan,d):await journalObservation(client,plan,d,'/* F10_TYPED_JOURNAL_REGISTER */ SELECT nevora_tenancy.register_typed_backfill_journal($1::pg_catalog.text)::pg_catalog.text',[canonicalOwnershipJson(d)]);
 if(retry){journalStarted(observed);return;}
 // Complete locked original source/target checks already proved absence. This
 // is the fresh original-plan reconciliation needed to retain UNKNOWN. Never
 // downgrade UNKNOWN, allocate a new ID or claim prior effects/atomicity.
 for(const c of observed.chunks)if(c.observedState==='NOT_STARTED')observed=await journalObservation(client,plan,d,'/* F10_TYPED_JOURNAL_START */ SELECT nevora_tenancy.observe_typed_backfill_journal($1::pg_catalog.text,$2::pg_catalog.text,$3::pg_catalog.text,$4::pg_catalog.text)::pg_catalog.text',[canonicalOwnershipJson(d),c.chunk.id,c.retryIdentity,'STARTED']);
 journalStarted(await journalRead(client,plan,d));
}

/** Root-authorized exact fictional LOCAL custody only. No connection/resource is
 * created. Every original native wire is rechecked; only compiler-issued added
 * metadata effects are attempted, atomically. Parser/plan/digest identity never
 * authenticates an operator. There is no legacy projection, durable chunk
 * completion, tenant proof, RLS, runtime, cutover or F10 completion. The private
 * journal mode only adds same-transaction structural observations; the original
 * entrypoint remains journal-free.
 * Caller transactions are refused; a begun COMMIT is always uncertain on error.
 */
function execute(client:Client,value:unknown,journalMode:false):Promise<GuardedTypedBackfillOutcome>;
function execute(client:Client,value:unknown,journalMode:true):Promise<GuardedTypedJournalBackfillOutcome>;
function execute(client:Client,value:unknown,journalMode:true,observationOnly:true):Promise<TypedJournalReconciliationOutcome>;
async function execute(client:Client,value:unknown,journalMode:boolean,observationOnly=false):Promise<GuardedTypedBackfillOutcome|GuardedTypedJournalBackfillOutcome|TypedJournalReconciliationOutcome>{
 let began=false,committing=false,planDigest='',registered=false,originalRequest:GuardedTypedBackfillRequest|undefined;
 try{
  // Genuine plan and complete safe detachment precede client/DB property reads.
  const request=requestBinding(value),plan=request.plan;planDigest=plan.digest;originalRequest=request;
  if(typeof client!=='object'||client===null||utilTypes.isProxy(client)||!(client instanceof Client))fail('OWNED_PG_CLIENT_REQUIRED');
  if(active.has(client))fail('CLIENT_ALREADY_IN_USE');active.add(client);registered=true;
  requireIdle(client);localConnection(client,request.identity);const lease=ownedLease(request);
  let installation:TypedJournalInstallation|undefined,descriptor:TypedBackfillJournalDescriptor|undefined;
  if(journalMode){installation=bindOwnedTypedJournalInstallation(lease,request.identity);const description=describeTypedBackfillJournal(plan);if(description.status!=='DESCRIBED')fail('TYPED_JOURNAL_DESCRIPTOR_DRIFT');descriptor=description.descriptor;}
  await databaseIdentity(client,request,lease);if(installation)await assertOwnedTypedJournalInstallation(client,installation);await installedContracts(client);await catalog(client,request.facts);await protocol(client,request,plan,false);requireIdle(client);localConnection(client,request.identity);
  began=true;await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
  // Session controls contain no MVCC SELECT; no snapshot/protocol read can occur
  // before the complete deterministic self-conflicting source lock set.
  await client.query("SET LOCAL search_path=pg_catalog; SET LOCAL row_security=off; SET LOCAL DateStyle='ISO, YMD'; SET LOCAL TimeZone='UTC'; SET LOCAL lock_timeout='5000ms'; SET LOCAL statement_timeout='15000ms'");
  const registry=getOwnershipRegistry(),locks=[...new Set([...registry.tables.map(t=>t.table),...registry.tables.flatMap(t=>t.sidecar?[t.sidecar]:[])])].sort(order);
  await client.query('LOCK TABLE '+locks.map(t=>'public.'+ident(t)).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
  if(journalMode)await client.query('/* F10_TYPED_JOURNAL_LOCK */ LOCK TABLE nevora_tenancy.typed_backfill_journal_chunk,nevora_tenancy.typed_backfill_journal_plan IN SHARE ROW EXCLUSIVE MODE');
  const retry=await protocol(client,request,plan,true);ownedLease(request);await databaseIdentity(client,request,lease);await installedContracts(client);await catalog(client,request.facts);await originalRows(client,request.facts);await namespaceWitnesses(client,request.facts);await ownershipState(client,plan,retry);
  const keys=plan.manifest.observations.constraints.keyComparators;
  await assertTypedKeyComparatorsOnLockedSource(client,request.facts,request.captureRequest,keys,retry?{manifestDigest:plan.digest,actor:null}:undefined);
  if(installation&&descriptor){const current=bindOwnedTypedJournalInstallation(ownedLease(request),request.identity);if(!same(current,installation))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');await assertOwnedTypedJournalInstallation(client,current);if(observationOnly)await observeJournalWithoutMutation(client,plan,descriptor,retry);else await prepareJournal(client,plan,descriptor,retry);}
  if(!retry&&!observationOnly){
   const armed=await client.query("UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=session_user,capture_manifest_sha256=$1 WHERE migration_id=26 AND phase='FENCED' AND fence_generation=$2::bigint AND backfill_actor IS NULL AND capture_manifest_sha256 IS NULL",[plan.digest,request.facts.fence.generation]);if(armed.rowCount!==1)fail('OPERATOR_ARM_NOT_EXACT');
   await client.query('SET LOCAL search_path=pg_catalog,public');const rules=new Map(registry.tables.map(t=>[t.table,t]));for(const entry of plan.entries)await attribute(client,rules.get(entry.table)!,entry,plan.digest);
   await client.query('SET CONSTRAINTS ALL IMMEDIATE');await client.query('SET LOCAL search_path=pg_catalog');
   await originalRows(client,request.facts);await namespaceWitnesses(client,request.facts);await ownershipState(client,plan,true);await catalog(client,request.facts);await installedContracts(client);await databaseIdentity(client,request,lease);ownedLease(request);
   await assertTypedKeyComparatorsOnLockedSource(client,request.facts,request.captureRequest,keys,{manifestDigest:plan.digest,actor:request.identity.role});
   const cleared=await client.query("UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=NULL WHERE migration_id=26 AND phase='FENCED' AND fence_generation=$2::bigint AND backfill_actor=session_user AND capture_manifest_sha256=$1",[plan.digest,request.facts.fence.generation]);if(cleared.rowCount!==1)fail('OPERATOR_CLEAR_NOT_EXACT');
  }
  const finalApplied=await protocol(client,request,plan,true);if(observationOnly?finalApplied!==retry:!finalApplied)fail(observationOnly?'FENCE_PROTOCOL_DRIFT':'COMMITTED_MANIFEST_REQUIRED');
  await originalRows(client,request.facts);await ownershipState(client,plan,observationOnly?retry:true);await namespaceWitnesses(client,request.facts);await catalog(client,request.facts);await installedContracts(client);await databaseIdentity(client,request,lease);ownedLease(request);localConnection(client,request.identity);
  await assertTypedKeyComparatorsOnLockedSource(client,request.facts,request.captureRequest,keys,observationOnly&&!retry?undefined:{manifestDigest:plan.digest,actor:null});
  if(installation&&descriptor){
   // Deferred identity/coverage guards remain enabled; make every pending
   // journal/source constraint effective before the final committed snapshot.
   await client.query('SET CONSTRAINTS ALL IMMEDIATE');
   const current=bindOwnedTypedJournalInstallation(ownedLease(request),request.identity);if(!same(current,installation))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');await assertOwnedTypedJournalInstallation(client,current);if(observationOnly)await observeJournalWithoutMutation(client,plan,descriptor,retry);else journalStarted(await journalRead(client,plan,descriptor));await databaseIdentity(client,request,lease);localConnection(client,request.identity);
  }
  committing=true;await client.query('COMMIT');began=false;
  if(observationOnly&&descriptor)return {status:'OBSERVED',mode:'WHOLE_PLAN_ATOMIC',metadata:retry?'APPLIED_METADATA_PRESENT':'ORIGINAL_METADATA_ABSENT',planDigest:plan.digest,sourceRows:request.facts.tables.reduce((n,t)=>n+t.expectedCount,0),verification:'OWNED_LOCAL_ORIGINAL_ATTEMPT_OBSERVATION_NOT_COMMIT_DISPOSITION',journal:{descriptorChecksum:descriptor.descriptorChecksum,chunkCount:descriptor.chunks.length,effectsVerified:false,observation:retry?'MATCHING_EXISTING_OBSERVATIONS':'NO_JOURNAL_OBSERVED'}};
  if(descriptor)return {status:retry?'UNCHANGED':'APPLIED',mode:'WHOLE_PLAN_ATOMIC',planDigest:plan.digest,sourceRows:request.facts.tables.reduce((n,t)=>n+t.expectedCount,0),verification:'OWNED_LOCAL_ATOMIC_TYPED_JOURNAL_BACKFILL_NOT_F10_COMPLETE',journal:{descriptorChecksum:descriptor.descriptorChecksum,chunkCount:descriptor.chunks.length,effectsVerified:false,integration:retry?'MATCHING_EXISTING_OBSERVATIONS_NO_PRIOR_ATOMICITY_CLAIM':'SAME_TRANSACTION_STRUCTURAL_WRITES',verification:'ATOMIC_STRUCTURE_NOT_EFFECTS_OR_DATABASE_VERIFICATION'}};
  return {status:retry?'UNCHANGED':'APPLIED',mode:'WHOLE_PLAN_ATOMIC',planDigest:plan.digest,sourceRows:request.facts.tables.reduce((n,t)=>n+t.expectedCount,0),verification:'OWNED_LOCAL_ATOMIC_TYPED_BACKFILL_NOT_F10_COMPLETE'};
 }catch(error){
  if(committing){
   if(observationOnly)return {status:'UNCERTAIN',code:'RECONCILIATION_COMMIT_OUTCOME_UNKNOWN',planDigest,reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'};
   const result={status:'UNCERTAIN' as const,code:'COMMIT_OUTCOME_UNKNOWN' as const,planDigest,reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' as const};
   if(journalMode&&originalRequest)uncertainAttempts.set(result,{client,request:originalRequest});return result;
  }
  if(began){try{await client.query('ROLLBACK');}catch{
   const result={status:'UNCERTAIN' as const,code:'ROLLBACK_UNCONFIRMED' as const,planDigest,reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED' as const};
   if(journalMode&&!observationOnly&&originalRequest)uncertainAttempts.set(result,{client,request:originalRequest});return result;
  }}
  return {status:'BLOCKED',code:typeof error==='object'&&error!==null&&!utilTypes.isProxy(error)&&error instanceof GuardFailure?error.code:isTypedJournalBindingFailure(error)?error.code:isKeyComparatorRecheckFailure(error)?error.code:'TYPED_GUARDED_BACKFILL_FAILED'};
 }finally{if(registered)active.delete(client);}
}

/** Original journal-free entrypoint and outcome remain unchanged. */
export function executeGuardedTypedLocalBackfill(client:Client,value:unknown):Promise<GuardedTypedBackfillOutcome>{return execute(client,value,false);}
/** Distinct opt-in owned-local successor. Root-installed exact journal controls
 * must precede original capture. Original metadata attribution and STARTED
 * structural observations share one transaction; UNKNOWN is never promoted.
 * An applied retry cannot retrospectively create/repair journal evidence. No
 * COMPLETE, effectsVerified=true, chunk resume or F10/tenant authority follows.
 */
export function executeGuardedTypedLocalBackfillWithJournal(client:Client,value:unknown):Promise<GuardedTypedJournalBackfillOutcome>{return execute(client,value,true);}

/** Observe a genuine original uncertain attempt on a different owned client.
 * No connection, resource, DDL, journal/state mutation, repair or replay is
 * created. Table/row locks require the unchanged accepted operator privileges;
 * this is observation-only SQL, not a READ ONLY transaction/principal claim.
 * The original attempt remains uncertain; this process-local handle does not
 * authenticate durable restart recovery, high-water or a commit disposition. */
export function reconcileGuardedTypedLocalBackfillJournal(client:Client,attempt:unknown):Promise<TypedJournalReconciliationOutcome>{
 if(typeof attempt!=='object'||attempt===null||!uncertainAttempts.has(attempt))return Promise.resolve({status:'BLOCKED',code:'TYPED_JOURNAL_ORIGINAL_UNCERTAIN_ATTEMPT_REQUIRED'});
 const original=uncertainAttempts.get(attempt)!;
 if(client===original.client)return Promise.resolve({status:'BLOCKED',code:'TYPED_JOURNAL_FRESH_CLIENT_REQUIRED'});
 return execute(client,original.request,true,true);
}

// CONTROLLED_EMPLOYEE_NUMBER_EXECUTOR_ADDITION_BEGIN
// UNUSED SOURCE PREPARATION. Root must adopt and execute the genuine original
// controller/installer and independently pinned source before this local lane.
// All original executor APIs and operator-only admission remain unchanged.
export type GuardedTypedEmployeeNumberEnrollmentCode=GuardedTypedBackfillCode|EmployeeNumberBindingCode|
 'EMPLOYEE_NUMBER_SOURCE_DRIFT'|'EMPLOYEE_NUMBER_TARGET_DRIFT'|'EMPLOYEE_NUMBER_INSERT_NOT_EXACT';
export type GuardedTypedEmployeeNumberEnrollmentOutcome=
 {status:'ENROLLED'|'OBSERVED_IDENTICAL';mode:'WHOLE_PLAN_ATOMIC';planDigest:string;mappingRows:number;
  verification:'CONTROLLED_LOCAL_MAPPING_OBSERVATIONS_NOT_AUTH_OR_CUTOVER'}|
 {status:'BLOCKED';code:GuardedTypedEmployeeNumberEnrollmentCode}|
 {status:'UNCERTAIN';code:'COMMIT_OUTCOME_UNKNOWN'|'ROLLBACK_UNCONFIRMED';planDigest:string;
  reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'};
class EmployeeNumberExecutorFailure extends Error{
 constructor(readonly code:GuardedTypedEmployeeNumberEnrollmentCode){super(code);}
}
function employeeNumberExecutorFail(code:GuardedTypedEmployeeNumberEnrollmentCode):never{throw new EmployeeNumberExecutorFailure(code);}
type EmployeeMappingTuple=readonly [string,string,string,string];
async function readLockedEmployeeNumberTarget(client:Client):Promise<EmployeeMappingTuple[]>{
 const result=await raw(client,
  '/* F10_EMPLOYEE_NUMBER_TARGET */ SELECT employee_id,workspace_id,employee_number,normalized_number FROM nevora_tenancy.employee_login_identity ORDER BY pg_catalog.convert_to(employee_id,\'UTF8\')');
 checkedFields(result,[{name:'employee_id',type:'text'},{name:'workspace_id',type:'text'},
  {name:'employee_number',type:'text'},{name:'normalized_number',type:'text'}]);
 return result.rows.map(row=>{
  const [employeeId,workspaceId,employeeNumber,normalizedNumber]=row;
  if(row.length!==4||typeof employeeId!=='string'||typeof workspaceId!=='string'||typeof employeeNumber!=='string'||typeof normalizedNumber!=='string')employeeNumberExecutorFail('EMPLOYEE_NUMBER_TARGET_DRIFT');
  return [employeeId,workspaceId,employeeNumber,normalizedNumber] as const;
 });
}
function exactEmployeeNumberTarget(enrollment:LegacyEmployeeNumberEnrollment,rows:EmployeeMappingTuple[]){
 const outcome=compareLegacyEmployeeNumberEnrollmentTarget(enrollment,rows);
 if(outcome.status==='BLOCKED')employeeNumberExecutorFail('EMPLOYEE_NUMBER_TARGET_DRIFT');return outcome.status;
}
async function prepareLockedEmployeeNumberEnrollment(client:Client,enrollment:LegacyEmployeeNumberEnrollment){
 // ALL68 original APPLIED state must already be proved. This separate exact
 // wire read compares actual added ownership to the complete genuine plan.
 const applied=await raw(client,
  '/* F10_EMPLOYEE_NUMBER_APPLIED_SOURCE */ SELECT id,workspace_id FROM public.employees ORDER BY pg_catalog.convert_to(id,\'UTF8\')');
 checkedFields(applied,[{name:'id',type:'text'},{name:'workspace_id',type:'text'}]);
 if(applied.rows.some(row=>row.length!==2||row.some(v=>typeof v!=='string')))employeeNumberExecutorFail('EMPLOYEE_NUMBER_SOURCE_DRIFT');
 const expected=enrollment.rows.map(r=>[r.employeeId,r.workspaceId]);
 const sort=(rows:readonly (readonly (string|null)[])[])=>[...rows].sort((a,b)=>order(canonicalOwnershipJson(a),canonicalOwnershipJson(b)));
 if(!same(sort(applied.rows),sort(expected)))employeeNumberExecutorFail('EMPLOYEE_NUMBER_SOURCE_DRIFT');
 const before=await readLockedEmployeeNumberTarget(client),state=exactEmployeeNumberTarget(enrollment,before);
 if(state==='COMPLETE_IDENTICAL')return 'MATCHING_EXISTING_OBSERVATIONS' as const;
 for(const row of enrollment.rows){
  const inserted=await raw(client,
   '/* F10_EMPLOYEE_NUMBER_INSERT */ INSERT INTO nevora_tenancy.employee_login_identity (employee_id,workspace_id,employee_number,normalized_number) VALUES ($1::pg_catalog.text,$2::pg_catalog.text,$3::pg_catalog.text,$4::pg_catalog.text) RETURNING employee_id,workspace_id,employee_number,normalized_number',
   [row.employeeId,row.workspaceId,row.employeeNumber,row.normalizedNumber]);
  checkedFields(inserted,[{name:'employee_id',type:'text'},{name:'workspace_id',type:'text'},
   {name:'employee_number',type:'text'},{name:'normalized_number',type:'text'}]);
  if(inserted.rowCount!==1||!same(inserted.rows,[[row.employeeId,row.workspaceId,row.employeeNumber,row.normalizedNumber]]))employeeNumberExecutorFail('EMPLOYEE_NUMBER_INSERT_NOT_EXACT');
 }
 await client.query('SET CONSTRAINTS ALL IMMEDIATE');
 if(exactEmployeeNumberTarget(enrollment,await readLockedEmployeeNumberTarget(client))!=='COMPLETE_IDENTICAL')employeeNumberExecutorFail('EMPLOYEE_NUMBER_TARGET_DRIFT');
 return 'INSERTED_IN_THIS_TRANSACTION' as const;
}

/** Fixed local installer lane for the complete legacy employee-number mapping.
 * A genuine original plan, approved native installation and independently
 * authenticated existing root-controlled installer are distinct prerequisites.
 * The original captured operator request remains unchanged. This lane never
 * attributes original metadata, arms/clears protocol, installs objects, grants
 * access, registers a journal or issues a tenant proof. Complete-identical rows
 * are observations only, with no causal producer or restart-recovery claim.
 */
export async function executeGuardedTypedLocalEmployeeNumberEnrollment(client:Client,value:unknown):Promise<GuardedTypedEmployeeNumberEnrollmentOutcome>{
 let began=false,committing=false,planDigest='',registered=false;
 try{
  // Real request/plan validation and the accepted normalizer/compiler execute
  // synchronously before any supplied Client property or native behavior read.
  const request=requestBinding(value),plan=request.plan;planDigest=plan.digest;
  const compiled=compileLegacyEmployeeNumberEnrollment(plan);
  if(compiled.status!=='COMPILED')employeeNumberExecutorFail('EMPLOYEE_NUMBER_SOURCE_DRIFT');
  const enrollment=compiled.enrollment,binding=getControlledEnrollmentInstallerBinding(request);
  if(typeof client!=='object'||client===null||utilTypes.isProxy(client)||!(client instanceof Client))fail('OWNED_PG_CLIENT_REQUIRED');
  if(active.has(client))fail('CLIENT_ALREADY_IN_USE');active.add(client);registered=true;
  requireIdle(client);ownedLease(request);
  // Keep old localConnection/databaseIdentity operator-only. The separate
  // producer verifies actual original installer TCP/SCRAM/native role/custody.
  await assertControlledEnrollmentInstallerOriginalLogin(client,request);
  await installedContracts(client);await catalog(client,request.facts);await protocol(client,request,plan,false);
  requireIdle(client);ownedLease(request);
  began=true;await client.query('BEGIN ISOLATION LEVEL READ COMMITTED');
  // This exact imported native transaction fence is the FIRST statement.
  // No MVCC/protocol/source read precedes the entire fixed source+mapping set.
  await client.query(INSTALLER_CATALOG_EXCLUSIVE_FENCE_SQL.text);
  await client.query("SET LOCAL search_path=pg_catalog; SET LOCAL row_security=off; SET LOCAL DateStyle='ISO, YMD'; SET LOCAL TimeZone='UTC'; SET LOCAL lock_timeout='5000ms'; SET LOCAL statement_timeout='15000ms'");
  const registry=getOwnershipRegistry(),locks=[...new Set([...registry.tables.map(t=>t.table),...registry.tables.flatMap(t=>t.sidecar?[t.sidecar]:[])])].sort(order);
  await client.query('LOCK TABLE '+locks.map(t=>'public.'+ident(t)).join(',')+' IN SHARE ROW EXCLUSIVE MODE');
  await client.query('LOCK TABLE nevora_tenancy.employee_login_identity IN SHARE ROW EXCLUSIVE MODE');
  const applied=await protocol(client,request,plan,true);
  if(!applied)employeeNumberExecutorFail('ENROLLMENT_APPLIED_REQUIRED');
  ownedLease(request);await installedContracts(client);await catalog(client,request.facts);
  await originalRows(client,request.facts);await namespaceWitnesses(client,request.facts);await ownershipState(client,plan,true);
  // Witness cannot be obtained by a caller object, hash, protocol flag, a
  // facade Client or held locks alone. All68 APPLIED checks above are required.
  const witness=await admitControlledEnrollmentInstallerExecution(client,request);
  await assertTypedKeyComparatorsOnLockedInstallerSource(client,request.facts,request.captureRequest,plan,witness);
  const effect=await prepareLockedEmployeeNumberEnrollment(client,enrollment);
  // Make pending native constraints effective, then repeat complete source,
  // original namespaces/key classes, private native capsule/role/lease/backend
  // and assigned transaction continuity. Original actor stays NULL throughout.
  await client.query('SET CONSTRAINTS ALL IMMEDIATE');
  if(!await protocol(client,request,plan,true))employeeNumberExecutorFail('ENROLLMENT_APPLIED_REQUIRED');
  await originalRows(client,request.facts);await ownershipState(client,plan,true);await namespaceWitnesses(client,request.facts);
  await catalog(client,request.facts);await installedContracts(client);ownedLease(request);
  await assertControlledEnrollmentInstallerExecution(client,witness,binding);
  await assertTypedKeyComparatorsOnLockedInstallerSource(client,request.facts,request.captureRequest,plan,witness);
  if(exactEmployeeNumberTarget(enrollment,await readLockedEmployeeNumberTarget(client))!=='COMPLETE_IDENTICAL')employeeNumberExecutorFail('EMPLOYEE_NUMBER_TARGET_DRIFT');
  await assertControlledEnrollmentInstallerExecution(client,witness,binding);
  if(!await protocol(client,request,plan,true))employeeNumberExecutorFail('ENROLLMENT_APPLIED_REQUIRED');
  ownedLease(request);
  committing=true;await client.query('COMMIT');began=false;
  return {status:effect==='INSERTED_IN_THIS_TRANSACTION'?'ENROLLED':'OBSERVED_IDENTICAL',mode:'WHOLE_PLAN_ATOMIC',planDigest:plan.digest,
   mappingRows:enrollment.rows.length,verification:'CONTROLLED_LOCAL_MAPPING_OBSERVATIONS_NOT_AUTH_OR_CUTOVER'};
 }catch(error){
  // A failed COMMIT acknowledgement cannot prove rollback. Send no subsequent
  // SQL, including ROLLBACK; retain the exact original-plan/fresh-client marker.
  if(committing)return {status:'UNCERTAIN',code:'COMMIT_OUTCOME_UNKNOWN',planDigest,reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'};
  if(began){try{await client.query('ROLLBACK');}catch{return {status:'UNCERTAIN',code:'ROLLBACK_UNCONFIRMED',planDigest,reconciliation:'FRESH_OWNED_CLIENT_ORIGINAL_PLAN_REQUIRED'};}}
  return {status:'BLOCKED',code:typeof error==='object'&&error!==null&&!utilTypes.isProxy(error)&&(error instanceof EmployeeNumberExecutorFailure||error instanceof GuardFailure)?error.code:
   isEmployeeNumberEnrollmentBindingFailure(error)?error.code:isKeyComparatorRecheckFailure(error)?error.code:'TYPED_GUARDED_BACKFILL_FAILED'};
 }finally{if(registered)active.delete(client);}
}
// CONTROLLED_EMPLOYEE_NUMBER_EXECUTOR_ADDITION_END
