// UNUSED source candidate. Root supplies and verifies the existing owned local
// controller; this module never creates resources, roles, privileges or authority.
import {readFileSync,realpathSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Socket} from 'node:net';
import {types as utilTypes} from 'node:util';
import {Client} from 'pg';
import type {GuardedTypedBackfillRequest} from './typed-guarded-backfill.server';
import {canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,OWNERSHIP_SOURCE,verifyOwnershipSource} from './ownership';
import {inspectTypedMigrationSnapshot} from './typed-snapshot';
import {isIssuedTypedTenantBackfillPlan} from './typed-backfill';
import {isIssuedTypedMigrationWireValue} from './typed-wire';

export const EMPLOYEE_NUMBER_INSTALLATION_SOURCE_SHA256='4bfb8494d4ee7407a34da9a38bebcc268a3f2ca7ba5a9309d3d441873af6a330';
const MAPPING_BODY_SHA='075cd3af5f0180b553926e2da4dd68028bb0c9ba18cb1399f16c8f1f19b89e51';
const IDENTITY_BODY_SHA='2434a5c2e3e22460f2363f4cdab2d7230759c15f05405f6bd7e6936cab6793e6';
const FENCE_BODY_SHA='28e074dcd7476327c72cc59ed4d97a6354ff90dfff17125a0f6adfe283653a45';
export type ControlledEnrollmentInstallerBinding=Readonly<{
 originalBinding:Readonly<{registryDigest:string;sourceDigest:string;currentSchemaDigest:string;snapshotId:string;fenceGeneration:string;factsDigest:string}>;
 captureRequestDigest:string;keyCaptureChecksum:string;planDigest:string;
}>;
declare const installationBrand:unique symbol, executionBrand:unique symbol;
export type EmployeeNumberEnrollmentInstallation=Readonly<{[installationBrand]:true}>;
export type EmployeeNumberInstallerExecutionWitness=Readonly<{[executionBrand]:true}>;
export type ControlledEnrollmentInstallerIdentity=Readonly<{
 database:string;databaseOid:string;marker:string;systemIdentifier:string;dataDirectory:string;
 role:string;roleOid:string;port:number;serverVersion:string;snapshotId:string;
}>;
export type EmployeeNumberBindingCode='ENROLLMENT_ORIGINAL_PLAN_REQUIRED'|'ENROLLMENT_REQUEST_DRIFT'|
 'ENROLLMENT_INSTALLATION_REQUIRED'|'ENROLLMENT_INSTALLATION_DRIFT'|'ENROLLMENT_INSTALLER_IDENTITY_DRIFT'|
 'ENROLLMENT_CLIENT_REQUIRED'|'ENROLLMENT_CLIENT_NOT_IDLE'|'ENROLLMENT_EXECUTION_REQUIRED'|
 'ENROLLMENT_LOCKS_REQUIRED'|'ENROLLMENT_APPLIED_REQUIRED'|'ENROLLMENT_NATIVE_READ_FAILED';
const errors=new WeakSet<object>();
class BindingError extends Error{constructor(readonly code:EmployeeNumberBindingCode){super(code);errors.add(this);Object.freeze(this);}}
function fail(code:EmployeeNumberBindingCode):never{throw new BindingError(code);}
export function isEmployeeNumberEnrollmentBindingFailure(v:unknown):v is BindingError{return typeof v==='object'&&v!==null&&errors.has(v);}
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
const sha=(s:string)=>createHash('sha256').update(s,'utf8').digest('hex');
const OID=/^[1-9][0-9]*$/,SHA=/^[a-f0-9]{64}$/;
const nativeQuery=Client.prototype.query;
const wireTypes={getTypeParser:()=>((v:string)=>v)};
function plain(value:unknown,ancestors=new Set<object>()):unknown{
 if(isIssuedTypedTenantBackfillPlan(value)||isIssuedTypedMigrationWireValue(value))return value;
 if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number'&&Number.isSafeInteger(value)&&!Object.is(value,-0))return value;
 if(typeof value!=='object'||utilTypes.isProxy(value)||ancestors.has(value))fail('ENROLLMENT_REQUEST_DRIFT');
 const array=Array.isArray(value);if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))fail('ENROLLMENT_REQUEST_DRIFT');
 const d=Object.getOwnPropertyDescriptors(value as object),keys=Reflect.ownKeys(value);if(keys.some(k=>typeof k!=='string'))fail('ENROLLMENT_REQUEST_DRIFT');ancestors.add(value);
 try{
  if(array){const n=Object.hasOwn(d,'length')?d.length:undefined;if(!n||!Object.hasOwn(n,'value')||!Number.isSafeInteger(n.value)||n.value<0||keys.length!==n.value+1)fail('ENROLLMENT_REQUEST_DRIFT');const out:unknown[]=[];for(let i=0;i<n.value;i++){const k=String(i),x=Object.hasOwn(d,k)?d[k]:undefined;if(!x||!Object.hasOwn(x,'value')||!x.enumerable)fail('ENROLLMENT_REQUEST_DRIFT');out.push(plain(x.value,ancestors));}return Object.freeze(out);}
  const out:Record<string,unknown>={};for(const k of keys as string[]){const x=d[k];if(!Object.hasOwn(x,'value')||!x.enumerable)fail('ENROLLMENT_REQUEST_DRIFT');Object.defineProperty(out,k,{value:plain(x.value,ancestors),enumerable:true});}return Object.freeze(out);
 }finally{ancestors.delete(value);}
}
function fields(v:unknown,keys:string[]):v is Record<string,unknown>{return typeof v==='object'&&v!==null&&!Array.isArray(v)&&same(Object.keys(v).sort(),[...keys].sort());}
function request(v:unknown):GuardedTypedBackfillRequest{
 if(typeof v!=='object'||v===null||utilTypes.isProxy(v))fail('ENROLLMENT_ORIGINAL_PLAN_REQUIRED');
 const plan=Object.getOwnPropertyDescriptor(v,'plan');if(!plan||!Object.hasOwn(plan,'value')||!isIssuedTypedTenantBackfillPlan(plan.value))fail('ENROLLMENT_ORIGINAL_PLAN_REQUIRED');
 const copied=plain(v);if(!fields(copied,['mode','identity','facts','captureRequest','plan','authority']))fail('ENROLLMENT_REQUEST_DRIFT');
 const r=copied as unknown as GuardedTypedBackfillRequest;
 if(r.mode!=='OWNED_LOCAL'||!fields(r.identity,['database','databaseOid','marker','systemIdentifier','dataDirectory','role','port','clusterRoot','leasePath','postmasterPid','postmasterStart','roleOid'])||!fields(r.authority,['reference','operatorRole','factsDigest','planDigest']))fail('ENROLLMENT_REQUEST_DRIFT');
 const i=r.identity;
 if(![i.database,i.marker,i.systemIdentifier,i.dataDirectory,i.role,i.clusterRoot,i.leasePath,i.postmasterStart,i.roleOid,i.databaseOid].every(x=>typeof x==='string'&&x.length>0)||![i.databaseOid,i.systemIdentifier,i.roleOid,i.postmasterStart].every(x=>OID.test(x))||!Number.isSafeInteger(i.port)||!Number.isSafeInteger(i.postmasterPid)||typeof r.authority.reference!=='string'||!r.authority.reference.length)fail('ENROLLMENT_REQUEST_DRIFT');
 const b=r.plan.manifest.boundary,inspected=inspectTypedMigrationSnapshot(r.facts,{sourceDigest:b.sourceDigest,currentSchemaDigest:b.currentSchemaDigest,snapshotId:b.snapshotId,fenceGeneration:b.fenceGeneration,factsDigest:b.factsDigest});
 if(inspected.status!=='INSPECTED'||!same(inspected.snapshot,r.plan.manifest.observations.snapshot)||r.authority.planDigest!==r.plan.digest||r.authority.factsDigest!==r.facts.factsDigest||r.authority.operatorRole!==r.identity.role)fail('ENROLLMENT_REQUEST_DRIFT');
 const c=r.captureRequest;
 if(!fields(c,['identity','migrations','sourceDigest','catalogBaseline','expectedFenceGeneration'])||!fields(c.catalogBaseline,['sourceDigest','expansionSha256','registryDigest','catalogDigest'])||!Array.isArray(c.migrations)||!same(c.identity,{database:i.database,databaseOid:i.databaseOid,marker:i.marker,systemIdentifier:i.systemIdentifier,dataDirectory:i.dataDirectory,role:i.role,port:i.port})||verifyOwnershipSource(c.migrations).length||c.sourceDigest!==r.facts.sourceDigest||c.catalogBaseline.catalogDigest!==r.facts.currentSchemaDigest||c.catalogBaseline.registryDigest!==r.facts.registryDigest||c.catalogBaseline.sourceDigest!==r.facts.sourceDigest||c.catalogBaseline.expansionSha256!=='fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb'||typeof c.expectedFenceGeneration!=='string'||! /^(0|[1-9][0-9]*)$/.test(c.expectedFenceGeneration)||BigInt(c.expectedFenceGeneration)+BigInt(1)!==BigInt(r.facts.fence.generation))fail('ENROLLMENT_REQUEST_DRIFT');
 return r;
}
function binding(r:GuardedTypedBackfillRequest):ControlledEnrollmentInstallerBinding{
 const f=r.facts;return Object.freeze({originalBinding:Object.freeze({registryDigest:f.registryDigest,sourceDigest:f.sourceDigest,currentSchemaDigest:f.currentSchemaDigest,snapshotId:f.snapshot.id,fenceGeneration:f.fence.generation,factsDigest:f.factsDigest}),captureRequestDigest:ownershipDigest(r.captureRequest),keyCaptureChecksum:r.plan.manifest.observations.constraints.keyComparators.captureChecksum,planDigest:r.plan.digest});
}
/** Pure original-input integrity only. Does not issue/admit an installer. */
export function getControlledEnrollmentInstallerBinding(v:unknown):ControlledEnrollmentInstallerBinding{return binding(request(v));}
type RoleRecord=Readonly<{catalog:readonly string[];memberships:readonly (readonly string[])[]}>;
type Entry=Readonly<{format:'OWNED_LOCAL_EMPLOYEE_NUMBER_INSTALLATION_V1';invocation:string;database:string;databaseOid:string;marker:string;sourceSHA256:string;sourceText:string;captureCatalogDigest:string;installer:RoleRecord;capsuleText:string}>;
type Lease=Readonly<{root:string;data:string;port:number;pid:number;pidStart:string;systemIdentifier:string;closed:false;scope:'OWNED_LOCAL_F10';database:string;databaseOid:number|string;marker:string;user:string;invocation:string;authorizationReference:string;operatorRoles:readonly Readonly<{name:string;catalog:readonly string[]}>[];employeeNumberEnrollmentInstallations:readonly Entry[]}>;
type State={request:GuardedTypedBackfillRequest;binding:ControlledEnrollmentInstallerBinding;lease:Lease;entry:Entry;leaseBytes:string};
const installations=new WeakMap<object,State>(),preAdmitted=new WeakMap<Client,{state:State;backend:readonly (string|null)[]}>(),executions=new WeakMap<object,{client:Client;state:State;backend:readonly (string|null)[];transactionId:string}>();
function load(r:GuardedTypedBackfillRequest):State{
 const i=r.identity;
 try{
  if(typeof i.clusterRoot!=='string'||typeof i.leasePath!=='string'||typeof i.dataDirectory!=='string'||!OID.test(i.databaseOid)||!OID.test(i.roleOid)||!Number.isSafeInteger(i.port)||i.port<1024||i.port>65535||!Number.isSafeInteger(i.postmasterPid)||i.postmasterPid<1||!OID.test(i.postmasterStart))fail('ENROLLMENT_INSTALLATION_DRIFT');
  const root=realpathSync(i.clusterRoot),data=realpathSync(i.dataDirectory),path=realpathSync(i.leasePath),stat=statSync(path);
  if(root!==i.clusterRoot||data!==i.dataDirectory||data!==join(root,'data')||path!==i.leasePath||path!==join(root,'ownership.json')||!stat.isFile()||(stat.mode&0o777)!==0o600||process.getuid&&stat.uid!==process.getuid())fail('ENROLLMENT_INSTALLATION_DRIFT');
  const bytes=readFileSync(path,'utf8'),l=plain(JSON.parse(bytes)) as Lease;
  if(!l||l.closed!==false||l.scope!=='OWNED_LOCAL_F10'||l.root!==root||l.data!==data||l.port!==i.port||l.pid!==i.postmasterPid||l.pidStart!==i.postmasterStart||l.systemIdentifier!==i.systemIdentifier||l.authorizationReference!==r.authority.reference||typeof l.invocation!=='string'||! /^[a-f0-9]{16}$/.test(l.invocation)||l.marker!=='f10-owned:'+l.invocation||l.authorizationReference!=='F-DEV-COMPLETE-001:typed-capture:'+l.invocation||typeof l.database!=='string'||!l.database.length||i.database.indexOf(l.database+'_case_')!==0||i.marker!==l.marker+':case:'+i.database||typeof l.user!=='string'||!l.user.length||!Array.isArray(l.operatorRoles)||!l.operatorRoles.length||l.operatorRoles.some(o=>!fields(o,['name','catalog'])||typeof o.name!=='string'||!o.name.length||!Array.isArray(o.catalog)||o.catalog.length!==9||o.catalog.some(x=>typeof x!=='string')||!OID.test(o.catalog[0])||o.catalog[1]!==o.name)||!l.operatorRoles.some(o=>o.name===i.role&&o.catalog[0]===i.roleOid)||l.user===i.role||new Set(l.operatorRoles.map(o=>o.name)).size!==l.operatorRoles.length||new Set(l.operatorRoles.map(o=>o.catalog[0])).size!==l.operatorRoles.length)fail('ENROLLMENT_INSTALLATION_DRIFT');
  const pid=readFileSync(join(data,'postmaster.pid'),'utf8').split('\n');if(pid[0]!==String(i.postmasterPid)||realpathSync(pid[1])!==data||pid[2]!==i.postmasterStart||pid[3]!==String(i.port))fail('ENROLLMENT_INSTALLATION_DRIFT');process.kill(i.postmasterPid,0);
  if(!Array.isArray(l.employeeNumberEnrollmentInstallations))fail('ENROLLMENT_INSTALLATION_REQUIRED');
  for(const e of l.employeeNumberEnrollmentInstallations)if(!fields(e,['format','invocation','database','databaseOid','marker','sourceSHA256','sourceText','captureCatalogDigest','installer','capsuleText'])||!fields(e.installer,['catalog','memberships'])||!Array.isArray(e.installer.catalog)||e.installer.catalog.length!==9||e.installer.catalog.some((x:unknown)=>typeof x!=='string')||!Array.isArray(e.installer.memberships)||e.installer.memberships.some(x=>!Array.isArray(x)||x.length!==5||x.some(v=>typeof v!=='string')))fail('ENROLLMENT_INSTALLATION_DRIFT');
  const rows=l.employeeNumberEnrollmentInstallations.filter(e=>e.database===i.database);if(rows.length!==1)fail(rows.length?'ENROLLMENT_INSTALLATION_DRIFT':'ENROLLMENT_INSTALLATION_REQUIRED');const e=rows[0];
  if(e.format!=='OWNED_LOCAL_EMPLOYEE_NUMBER_INSTALLATION_V1'||e.invocation!==l.invocation||e.databaseOid!==i.databaseOid||e.marker!==i.marker||e.sourceSHA256!==EMPLOYEE_NUMBER_INSTALLATION_SOURCE_SHA256||typeof e.sourceText!=='string'||sha(e.sourceText)!==e.sourceSHA256||e.captureCatalogDigest!==r.facts.currentSchemaDigest||!SHA.test(e.captureCatalogDigest)||typeof e.capsuleText!=='string'||!e.capsuleText.length||e.installer.catalog[1]!==l.user||!OID.test(e.installer.catalog[0])||e.installer.catalog[2]!=='true'||e.installer.catalog[6]!=='true'||e.installer.catalog.slice(2).some((x:unknown)=>x!=='true'&&x!=='false')||l.operatorRoles.some(o=>o.catalog[0]===e.installer.catalog[0]))fail('ENROLLMENT_INSTALLATION_DRIFT');
  return {request:r,binding:binding(r),lease:l,entry:e,leaseBytes:bytes};
 }catch(e){if(isEmployeeNumberEnrollmentBindingFailure(e))throw e;fail('ENROLLMENT_INSTALLATION_DRIFT');}
}
/** Reads the independently root-owned actual lease. JSON equality is custody
 * binding only; native assertion is mandatory before any execution issuance. */
export function bindOwnedEmployeeNumberEnrollmentInstallation(v:unknown):EmployeeNumberEnrollmentInstallation{
 const s=load(request(v)),handle=Object.freeze({});installations.set(handle,s);return handle as EmployeeNumberEnrollmentInstallation;
}
function client(c:Client,s:State,idle:boolean){
 if(typeof c!=='object'||c===null||utilTypes.isProxy(c)||!(c instanceof Client))fail('ENROLLMENT_CLIENT_REQUIRED');
 const i=s.request.identity,stream=c.connection.stream;
 if(c.host!=='127.0.0.1'||c.port!==i.port||c.database!==i.database||c.user!==s.lease.user||c.ssl!==false||c.pipeline!==false||!(stream instanceof Socket)||stream.destroyed||stream.remoteAddress!=='127.0.0.1'||stream.remotePort!==i.port||stream.localAddress!=='127.0.0.1')fail('ENROLLMENT_INSTALLER_IDENTITY_DRIFT');
 if(idle){const d=Object.getOwnPropertyDescriptors(c);if(c.getTransactionStatus()!=='I'||d._activeQuery?.value!==null||d._connected?.value!==true||d._connecting?.value!==false||d._ending?.value!==false||d.readyForQuery?.value!==true||!Array.isArray(d._queryQueue?.value)||d._queryQueue.value.length)fail('ENROLLMENT_CLIENT_NOT_IDLE');}else if(c.getTransactionStatus()!=='T')fail('ENROLLMENT_EXECUTION_REQUIRED');
}
async function raw(c:Client,text:string,values:unknown[]=[]):Promise<(string|null)[][]>{
 try{const r=await Reflect.apply(nativeQuery,c,[{text,values,rowMode:'array',types:wireTypes}]);return r.rows as (string|null)[][];}catch{fail('ENROLLMENT_NATIVE_READ_FAILED');}
}
const IDENTITY_SQL="/* F10_ENROLLMENT_INSTALLER_IDENTITY */ SELECT current_database(),(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()),pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database()),'pg_database'),(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),current_setting('data_directory'),session_user::text,current_user::text,pg_catalog.host(pg_catalog.inet_server_addr()),pg_catalog.inet_server_port()::text,current_setting('server_version'),current_setting('server_encoding'),current_setting('session_replication_role'),floor(extract(epoch FROM pg_catalog.pg_postmaster_start_time()))::bigint::text,current_setting('search_path'),current_setting('unix_socket_directories'),SYSTEM_USER::text,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()),current_setting('role'),current_setting('transaction_isolation'),current_setting('row_security'),current_setting('DateStyle'),current_setting('TimeZone'),pg_catalog.pg_backend_pid()::text,(SELECT backend_start::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()),pg_catalog.pg_current_snapshot()::text,pg_catalog.pg_current_xact_id_if_assigned()::text";
export const CONTROLLED_ENROLLMENT_INSTALLER_ROLE_SQL=Object.freeze({text:'SELECT oid::text,rolname,rolsuper::text,rolinherit::text,rolcreaterole::text,rolcreatedb::text,rolcanlogin::text,rolreplication::text,rolbypassrls::text FROM pg_catalog.pg_roles WHERE rolname=session_user',values:Object.freeze([] as const)});
export const CONTROLLED_ENROLLMENT_INSTALLER_MEMBERSHIPS_SQL=Object.freeze({text:'SELECT p.oid::text,p.rolname,m.admin_option::text,m.inherit_option::text,m.set_option::text FROM pg_catalog.pg_auth_members m JOIN pg_catalog.pg_roles p ON p.oid=m.roleid WHERE m.member=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=session_user) ORDER BY p.oid',values:Object.freeze([] as const)});
async function identity(c:Client,s:State,locked:boolean){
 const r=await raw(c,IDENTITY_SQL),i=s.request.identity,l=s.lease,e=s.entry;if(r.length!==1||r[0].length!==26||r[0].slice(0,25).some(x=>typeof x!=='string')||locked&&(typeof r[0][25]!=='string'||!OID.test(r[0][25])))fail('ENROLLMENT_INSTALLER_IDENTITY_DRIFT');const v=r[0] as string[];
 if(!same(v.slice(0,9),[i.database,i.databaseOid,i.marker,i.systemIdentifier,i.dataDirectory,l.user,l.user,'127.0.0.1',String(i.port)])||! /^18\.4(?:\s|$)/.test(v[9])||!same(v.slice(10,18),['UTF8','origin',i.postmasterStart,'pg_catalog','','scram-sha-256:'+l.user,e.installer.catalog[0],'none'])||locked&& !same(v.slice(18,22),['read committed','off','ISO, YMD','UTC'])||!OID.test(v[22])||!v[23]||! /^(0|[1-9][0-9]*):(0|[1-9][0-9]*):(?:(0|[1-9][0-9]*)(?:,(0|[1-9][0-9]*))*)?$/.test(v[24]))fail('ENROLLMENT_INSTALLER_IDENTITY_DRIFT');
 if(!same(await raw(c,CONTROLLED_ENROLLMENT_INSTALLER_ROLE_SQL.text),[e.installer.catalog])||!same(await raw(c,CONTROLLED_ENROLLMENT_INSTALLER_MEMBERSHIPS_SQL.text),e.installer.memberships))fail('ENROLLMENT_INSTALLER_IDENTITY_DRIFT');
 const base=await raw(c,"SELECT oid::text,pg_catalog.shobj_description(oid,'pg_database') FROM pg_catalog.pg_database WHERE datname=$1::text",[l.database]);if(!same(base,[[String(l.databaseOid),l.marker]]))fail('ENROLLMENT_INSTALLER_IDENTITY_DRIFT');
 return {native:v,observation:Object.freeze({database:i.database,databaseOid:i.databaseOid,marker:i.marker,systemIdentifier:i.systemIdentifier,dataDirectory:i.dataDirectory,role:l.user,roleOid:e.installer.catalog[0],port:i.port,serverVersion:v[9],snapshotId:v[24]})};
}

// Full operative native capture, not source approval. It includes owner/OID,
// policy, grants and dependencies omitted by observeMigrationCatalog. The root
// records the exact native text before the original capture; no caller builds it.
export const EMPLOYEE_NUMBER_INSTALLATION_CAPSULE_SQL=Object.freeze({text:`/* F10_EMPLOYEE_NUMBER_INSTALLATION_CAPSULE */
WITH fixed_relations AS (
 SELECT c.*,n.nspname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE (n.nspname='public' AND c.relkind='r') OR (n.nspname='nevora_tenancy' AND c.relname IN('employee_login_identity','expansion_protocol','owned_table_contract','source_migration_contract'))
), fixed_functions AS (
 SELECT p.*,l.lanname FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE n.nspname='nevora_tenancy' AND p.proname IN('guard_employee_login_identity','source_identity_guard','source_write_fence')
), expanded_acl AS (
 SELECT 'SCHEMA' kind,n.oid::text object_oid,'' column_name,a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a WHERE n.nspname='nevora_tenancy'
 UNION ALL SELECT 'TABLE',c.oid::text,'',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable FROM fixed_relations c CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
 UNION ALL SELECT 'COLUMN',c.oid::text,v.attname,a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable FROM fixed_relations c JOIN pg_catalog.pg_attribute v ON v.attrelid=c.oid CROSS JOIN LATERAL pg_catalog.aclexplode(v.attacl) a WHERE v.attnum>0 AND NOT v.attisdropped
 UNION ALL SELECT 'FUNCTION',p.oid::text,'',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable FROM fixed_functions p CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
)
SELECT pg_catalog.jsonb_build_object(
 'schema',(SELECT pg_catalog.to_jsonb(n) FROM pg_catalog.pg_namespace n WHERE n.nspname='nevora_tenancy'),
 'relations',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('oid',c.oid::text,'schema',c.nspname,'name',c.relname,'owner',c.relowner::text,'kind',c.relkind,'persistence',c.relpersistence,'partition',c.relispartition,'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,'acl',c.relacl,'replicaIdentity',c.relreplident) ORDER BY c.oid) FROM fixed_relations c),'[]'::jsonb),
 'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_catalog.pg_attribute a JOIN fixed_relations c ON c.oid=a.attrelid WHERE a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb),
 'defaults',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.adrelid,d.adnum) FROM pg_catalog.pg_attrdef d JOIN fixed_relations c ON c.oid=d.adrelid),'[]'::jsonb),
 'constraints',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(k)||pg_catalog.jsonb_build_object('definition',pg_catalog.pg_get_constraintdef(k.oid,false),'expression',pg_catalog.pg_get_expr(k.conbin,k.conrelid,false)) ORDER BY k.oid) FROM pg_catalog.pg_constraint k JOIN fixed_relations c ON c.oid=k.conrelid),'[]'::jsonb),
 'indexes',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i)||pg_catalog.jsonb_build_object('indkey',i.indkey::text,'indclass',i.indclass::text,'indcollation',i.indcollation::text,'indoption',i.indoption::text,'owner',x.relowner::text,'kind',x.relkind,'persistence',x.relpersistence,'options',x.reloptions,'method',am.amname,'definition',pg_catalog.pg_get_indexdef(i.indexrelid)) ORDER BY i.indexrelid) FROM pg_catalog.pg_index i JOIN fixed_relations c ON c.oid=i.indrelid JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid JOIN pg_catalog.pg_am am ON am.oid=x.relam),'[]'::jsonb),
 'indexComponents',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('indexOid',i.indexrelid::text,'ordinal',k.position+1,'attribute',i.indkey[k.position],'collation',i.indcollation[k.position]::text,'attributeCollation',a.attcollation::text,'opclassNamespace',n.nspname,'opclassName',o.opcname,'opclassType',o.opcintype::text,'opclassDefault',o.opcdefault,'option',i.indoption[k.position]) ORDER BY i.indexrelid,k.position) FROM pg_catalog.pg_index i JOIN fixed_relations c ON c.oid=i.indrelid CROSS JOIN LATERAL pg_catalog.generate_series(0,i.indnkeyatts-1) k(position) LEFT JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[k.position] LEFT JOIN pg_catalog.pg_opclass o ON o.oid=i.indclass[k.position] LEFT JOIN pg_catalog.pg_namespace n ON n.oid=o.opcnamespace),'[]'::jsonb),
 'functions',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)||pg_catalog.jsonb_build_object('proargtypes',p.proargtypes::text,'prosupport',p.prosupport::oid::text,'definition',pg_catalog.pg_get_functiondef(p.oid),'bodySHA256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')) ORDER BY p.oid) FROM fixed_functions p),'[]'::jsonb),
 'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)||pg_catalog.jsonb_build_object('tgattr',t.tgattr::text,'tgargs',t.tgargs::text,'definition',pg_catalog.pg_get_triggerdef(t.oid,false)) ORDER BY t.oid) FROM pg_catalog.pg_trigger t JOIN fixed_relations c ON c.oid=t.tgrelid),'[]'::jsonb),
 'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)||pg_catalog.jsonb_build_object('using',pg_catalog.pg_get_expr(p.polqual,p.polrelid,false),'withCheck',pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false)) ORDER BY p.oid) FROM pg_catalog.pg_policy p JOIN fixed_relations c ON c.oid=p.polrelid),'[]'::jsonb),
 'acls',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY kind,object_oid::oid,column_name COLLATE pg_catalog."C",grantee::oid,grantor::oid,privilege_type) FROM expanded_acl a),'[]'::jsonb),
 'dependencies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY classid,objid,objsubid,refclassid,refobjid,refobjsubid,deptype) FROM pg_catalog.pg_depend d WHERE (d.classid='pg_catalog.pg_proc'::regclass AND d.objid IN(SELECT oid FROM fixed_functions)) OR (d.classid='pg_catalog.pg_class'::regclass AND d.objid IN(SELECT oid FROM fixed_relations)) OR (d.classid='pg_catalog.pg_trigger'::regclass AND d.objid IN(SELECT t.oid FROM pg_catalog.pg_trigger t JOIN fixed_relations c ON c.oid=t.tgrelid))),'[]'::jsonb),
 'contracts',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY table_name) FROM nevora_tenancy.owned_table_contract t),'[]'::jsonb),
 'migrations',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY path) FROM nevora_tenancy.source_migration_contract t),'[]'::jsonb)
)::text AS capsule;`,values:Object.freeze([] as const)});

function validateCapsule(text:string,s:State){
 let parsed:unknown;try{parsed=plain(JSON.parse(text));}catch{fail('ENROLLMENT_INSTALLATION_DRIFT');}
 if(!fields(parsed,['schema','relations','columns','defaults','constraints','indexes','indexComponents','functions','triggers','policies','acls','dependencies','contracts','migrations']))fail('ENROLLMENT_INSTALLATION_DRIFT');
 const q=parsed as Record<string,unknown>,array=(k:string):Record<string,unknown>[]=>{const v=q[k];if(!Array.isArray(v)||v.some(x=>typeof x!=='object'||x===null||Array.isArray(x)))fail('ENROLLMENT_INSTALLATION_DRIFT');return v as Record<string,unknown>[];};
 const owner=s.entry.installer.catalog[0],schema=q.schema as Record<string,unknown>;if(!schema||String(schema.nspowner)!==owner||schema.nspname!=='nevora_tenancy'||!OID.test(String(schema.oid)))fail('ENROLLMENT_INSTALLATION_DRIFT');
 const relations=array('relations'),mapping=relations.filter(c=>c.schema==='nevora_tenancy'&&c.name==='employee_login_identity');
 const publicNames=[...new Set(getOwnershipRegistry().tables.flatMap(t=>t.sidecar?[t.table,t.sidecar]:[t.table]))];
 const names=[...publicNames.map(n=>'public.'+n),'nevora_tenancy.employee_login_identity','nevora_tenancy.expansion_protocol','nevora_tenancy.owned_table_contract','nevora_tenancy.source_migration_contract'];
 if(publicNames.length!==70||relations.length!==74||!same(relations.map(c=>c.schema+'.'+c.name).sort(),names.sort())||relations.some(c=>typeof c.oid!=='string'||!OID.test(c.oid)||c.kind!=='r'||c.persistence!=='p'||c.partition!==false||c.owner!==owner)||new Set(relations.map(c=>c.oid)).size!==relations.length||mapping.length!==1||mapping[0].rls!==true||mapping[0].forceRls!==true)fail('ENROLLMENT_INSTALLATION_DRIFT');
 const tableOid=mapping[0].oid,columns=array('columns').filter(c=>String(c.attrelid)===tableOid);if(columns.length!==4||!same(columns.map(c=>[c.attname,c.attnum,c.atttypid,c.atttypmod,c.attnotnull,c.attidentity,c.attgenerated,c.atthasdef]),[['employee_id',1,'25',-1,true,'','',false],['workspace_id',2,'25',-1,true,'','',false],['employee_number',3,'25',-1,true,'','',false],['normalized_number',4,'25',-1,true,'','',false]])||array('defaults').some(d=>String(d.adrelid)===tableOid)||array('policies').some(p=>String(p.polrelid)===tableOid))fail('ENROLLMENT_INSTALLATION_DRIFT');
 const functions=array('functions');for(const [name,hash,definer,path] of [['guard_employee_login_identity',MAPPING_BODY_SHA,false,['search_path=pg_catalog']],['source_identity_guard',IDENTITY_BODY_SHA,true,['search_path=pg_catalog, nevora_tenancy']],['source_write_fence',FENCE_BODY_SHA,true,['search_path=pg_catalog, nevora_tenancy']]] as const){const f=functions.filter(x=>x.proname===name);if(f.length!==1||String(f[0].proowner)!==owner||f[0].bodySHA256!==hash||f[0].prosecdef!==definer||f[0].pronargs!==0||f[0].proargtypes!==''||f[0].provariadic!=='0'||f[0].pronargdefaults!==0||f[0].proargdefaults!==null||f[0].prokind!=='f'||f[0].prorettype!=='2279'||f[0].proretset!==false||f[0].provolatile!=='v'||f[0].proparallel!=='u'||f[0].lanname!=='plpgsql'||f[0].proisstrict!==false||f[0].proleakproof!==false||f[0].prosupport!=='0'||f[0].probin!==null||f[0].proargmodes!==null||f[0].proallargtypes!==null||!same(f[0].proconfig,path))fail('ENROLLMENT_INSTALLATION_DRIFT');}
 const f=functions.find(x=>x.proname==='guard_employee_login_identity')!,triggers=array('triggers').filter(t=>String(t.tgrelid)===tableOid&&!t.tgisinternal);
 if(triggers.length!==2||!same(triggers.map(t=>[t.tgname,t.tgtype]).sort(),[['employee_login_identity_row_guard',27],['employee_login_identity_truncate_guard',34]]))fail('ENROLLMENT_INSTALLATION_DRIFT');
 for(const t of triggers)if(String(t.tgfoid)!==String(f.oid)||t.tgenabled!=='O'||t.tgdeferrable!==false||t.tginitdeferred!==false||t.tgconstraint!=='0'||t.tgnargs!==0||t.tgqual!==null||t.tgargs!=='\\x'||t.tgattr!==''||t.tgoldtable!==null||t.tgnewtable!==null)fail('ENROLLMENT_INSTALLATION_DRIFT');
 const workspace=relations.find(c=>c.schema==='public'&&c.name==='workspaces')!,employee=relations.find(c=>c.schema==='public'&&c.name==='employees')!;
 for(const parent of [workspace,employee])for(const [name,type,functionName] of [['f10_identity_guard',31,'source_identity_guard'],['f10_write_fence',62,'source_write_fence']] as const){const ts=array('triggers').filter(t=>String(t.tgrelid)===parent.oid&&t.tgname===name),fn=functions.find(x=>x.proname===functionName)!;if(ts.length!==1)fail('ENROLLMENT_INSTALLATION_DRIFT');const t=ts[0];if(String(t.tgfoid)!==String(fn.oid)||t.tgtype!==type||t.tgisinternal!==false||t.tgenabled!=='O'||t.tgdeferrable!==false||t.tginitdeferred!==false||t.tgconstraint!=='0'||t.tgnargs!==0||t.tgqual!==null||t.tgargs!=='\\x'||t.tgattr!==''||t.tgoldtable!==null||t.tgnewtable!==null)fail('ENROLLMENT_INSTALLATION_DRIFT');}
 const constraints=array('constraints'),indexes=array('indexes'),components=array('indexComponents');
 const column=(rel:unknown,name:string)=>{const cs=array('columns').filter(c=>String(c.attrelid)===rel&&c.attname===name);if(cs.length!==1||cs[0].atttypid!=='25'||cs[0].atttypmod!==-1||cs[0].attidentity!==''||cs[0].attgenerated!=='')fail('ENROLLMENT_INSTALLATION_DRIFT');return cs[0];};
 const workspaceId=column(workspace.oid,'id'),employeeId=column(employee.oid,'id'),employeeWorkspace=column(employee.oid,'workspace_id');if(workspaceId.attnotnull!==true||employeeId.attnotnull!==true)fail('ENROLLMENT_INSTALLATION_DRIFT');
 const key=(rel:unknown,kind:string,attrs:unknown[],name?:string)=>{const cs=constraints.filter(c=>String(c.conrelid)===rel&&c.contype===kind&&same(c.conkey,attrs)&&(name===undefined||c.conname===name));if(cs.length!==1)fail('ENROLLMENT_INSTALLATION_DRIFT');const c=cs[0],ix=indexes.filter(x=>String(x.indexrelid)===String(c.conindid)&&String(x.indrelid)===rel);if(c.convalidated!==true||c.conenforced!==true||c.condeferrable!==false||c.condeferred!==false||ix.length!==1)fail('ENROLLMENT_INSTALLATION_DRIFT');const x=ix[0],parts=components.filter(p=>p.indexOid===String(c.conindid));if(x.owner!==owner||x.kind!=='i'||x.persistence!=='p'||x.method!=='btree'||x.options!==null||x.indisunique!==true||x.indisvalid!==true||x.indisready!==true||x.indislive!==true||x.indimmediate!==true||x.indisprimary!==(kind==='p')||x.indnullsnotdistinct!==false||x.indexprs!==null||x.indpred!==null||x.indnatts!==attrs.length||x.indnkeyatts!==attrs.length||parts.length!==attrs.length||!same(parts.map(p=>p.attribute),attrs)||parts.some((p,i)=>p.ordinal!==i+1||p.opclassNamespace!=='pg_catalog'||p.opclassName!=='text_ops'||p.opclassType!=='25'||p.opclassDefault!==true||p.collation!==p.attributeCollation||p.option!==0))fail('ENROLLMENT_INSTALLATION_DRIFT');};
 key(workspace.oid,'p',[workspaceId.attnum]);key(employee.oid,'p',[employeeId.attnum]);key(employee.oid,'u',[employeeWorkspace.attnum,employeeId.attnum],'f10_tenant_c49de3d265fb');key(tableOid,'p',[1]);key(tableOid,'u',[2,4]);
 const mappingConstraints=constraints.filter(c=>String(c.conrelid)===tableOid&&c.contype!=='n');if(mappingConstraints.length!==6||mappingConstraints.filter(c=>c.contype==='c').length!==2||mappingConstraints.filter(c=>c.contype==='c').some(c=>c.convalidated!==true||c.conenforced!==true||c.condeferrable!==false||c.condeferred!==false))fail('ENROLLMENT_INSTALLATION_DRIFT');
 for(const [attrs,parent,parentAttrs] of [[[2],workspace.oid,[workspaceId.attnum]],[[2,1],employee.oid,[employeeWorkspace.attnum,employeeId.attnum]]] as const){const cs=mappingConstraints.filter(c=>c.contype==='f'&&same(c.conkey,attrs)&&String(c.confrelid)===parent&&same(c.confkey,parentAttrs));if(cs.length!==1||cs[0].convalidated!==true||cs[0].conenforced!==true||cs[0].condeferrable!==false||cs[0].condeferred!==false||cs[0].confupdtype!=='r'||cs[0].confdeltype!=='r'||cs[0].confmatchtype!=='s')fail('ENROLLMENT_INSTALLATION_DRIFT');}
 const acls=array('acls'),nonOwner=acls.filter(a=>a.grantee!==owner&&(a.kind==='SCHEMA'||a.object_oid===tableOid||a.object_oid===String(f.oid)));
 const expected=s.lease.operatorRoles.map(o=>['SCHEMA',String(schema.oid),'',o.catalog[0],owner,'USAGE',false]);
 if(!same(nonOwner.map(a=>[a.kind,a.object_oid,a.column_name,a.grantee,a.grantor,a.privilege_type,a.is_grantable]).map(canonicalOwnershipJson).sort(),expected.map(canonicalOwnershipJson).sort()))fail('ENROLLMENT_INSTALLATION_DRIFT');
 const registry=getOwnershipRegistry();if(!same(q.migrations,OWNERSHIP_SOURCE.map(x=>({path:x.path,source_sha256:x.sha256})))||!same(q.contracts,registry.tables.map(t=>({table_name:t.table,storage:t.storage,anchor:t.anchor,primary_key_columns:t.primaryKey,sidecar_name:t.sidecar,mirror_columns:t.mirroredIdentityColumns,original_columns:t.columns.map(c=>c.name),source_path:t.source.path,source_line:t.source.line}))))fail('ENROLLMENT_INSTALLATION_DRIFT');
}
async function installation(c:Client,s:State){
 const current=load(s.request);if(!same(current.entry,s.entry)||!same(current.lease,s.lease)||current.leaseBytes!==s.leaseBytes)fail('ENROLLMENT_INSTALLATION_DRIFT');
 const rows=await raw(c,EMPLOYEE_NUMBER_INSTALLATION_CAPSULE_SQL.text);if(rows.length!==1||rows[0].length!==1||typeof rows[0][0]!=='string'||rows[0][0]!==s.entry.capsuleText)fail('ENROLLMENT_INSTALLATION_DRIFT');validateCapsule(rows[0][0],s);
 // Native named C collation cannot be inferred from a catalog integer alone.
 const collation=await raw(c,"SELECT n.nspname,c.collname,c.collprovider::text,c.collisdeterministic::text,c.collencoding::text FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_collation c ON c.oid=a.attcollation JOIN pg_catalog.pg_namespace n ON n.oid=c.collnamespace WHERE a.attrelid='nevora_tenancy.employee_login_identity'::regclass AND a.attname='normalized_number'");if(!same(collation,[['pg_catalog','C','c','true','-1']]))fail('ENROLLMENT_INSTALLATION_DRIFT');
}
export async function assertOwnedEmployeeNumberEnrollmentInstallation(c:Client,value:unknown):Promise<void>{
 if(typeof value!=='object'||value===null||!installations.has(value))fail('ENROLLMENT_INSTALLATION_REQUIRED');const s=installations.get(value)!;
 if(typeof c!=='object'||c===null||utilTypes.isProxy(c)||!(c instanceof Client))fail('ENROLLMENT_CLIENT_REQUIRED');const idle=c.getTransactionStatus()==='I';client(c,s,idle);await identity(c,s,!idle);await installation(c,s);
}
/** Real original LOGIN checks before BEGIN; no opaque execution is issued here. */
export async function assertControlledEnrollmentInstallerOriginalLogin(c:Client,v:unknown):Promise<void>{
 const s=load(request(v));client(c,s,true);const observed=await identity(c,s,false);await installation(c,s);client(c,s,true);preAdmitted.set(c,{state:s,backend:observed.native.slice(22,24)});
}
async function locks(c:Client,s:State){
 const names=[...new Set(getOwnershipRegistry().tables.flatMap(t=>t.sidecar?[t.table,t.sidecar]:[t.table]))].sort();
 const rows=await raw(c,"SELECT n.nspname,c.relname,c.oid::text,l.mode,l.granted::text FROM pg_catalog.pg_locks l JOIN pg_catalog.pg_class c ON c.oid=l.relation JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE l.pid=pg_catalog.pg_backend_pid() AND l.database=(SELECT oid FROM pg_catalog.pg_database WHERE datname=current_database()) AND ((n.nspname='public' AND c.relname=ANY($1::text[])) OR (n.nspname='nevora_tenancy' AND c.relname='employee_login_identity'))",[names]);
 if(names.length!==70||names.some(n=>!rows.some(r=>r[0]==='public'&&r[1]===n&&r[4]==='true'&&['ShareRowExclusiveLock','AccessExclusiveLock'].includes(r[3]!)))||!rows.some(r=>r[0]==='nevora_tenancy'&&r[1]==='employee_login_identity'&&r[4]==='true'&&['ShareRowExclusiveLock','AccessExclusiveLock'].includes(r[3]!)))fail('ENROLLMENT_LOCKS_REQUIRED');
 const advisory=await raw(c,"WITH k AS (SELECT ('x'||substr(encode(sha256(convert_to('nevora.runtime.catalog-fence.v1:'||oid::text,'UTF8')),'hex'),1,16))::bit(64)::bigint value,oid FROM pg_catalog.pg_database WHERE datname=current_database()) SELECT count(*)::text FROM k JOIN pg_catalog.pg_locks l ON l.locktype='advisory' AND l.pid=pg_catalog.pg_backend_pid() AND l.database=k.oid AND l.classid::bigint=((k.value>>32)&4294967295::bigint) AND l.objid::bigint=(k.value&4294967295::bigint) AND l.objsubid=1 AND l.mode='ExclusiveLock' AND l.granted");if(!same(advisory,[['1']]))fail('ENROLLMENT_LOCKS_REQUIRED');
 const p=await raw(c,'SELECT phase,fence_generation::text,backfill_actor::text,capture_manifest_sha256,schema_source_commit,registry_sha256 FROM nevora_tenancy.expansion_protocol WHERE migration_id=26');if(!same(p,[['FENCED',s.request.facts.fence.generation,null,s.request.plan.digest,'7c628e374f03c9025b2c0cfd3568be033f07238d',s.request.facts.registryDigest]]))fail('ENROLLMENT_APPLIED_REQUIRED');
}
/** Called by the fixed owning executor only after exclusive FIRST, source70,
 * mapping and protocol-row locks and its ALL68 APPLIED checks. Current locks
 * alone cannot prove acquisition order or xact-versus-session advisory origin. */
export async function admitControlledEnrollmentInstallerExecution(c:Client,v:unknown):Promise<EmployeeNumberInstallerExecutionWitness>{
 const r=request(v),prior=typeof c==='object'&&c!==null&&!utilTypes.isProxy(c)?preAdmitted.get(c):undefined;if(!prior||!same(binding(r),prior.state.binding))fail('ENROLLMENT_EXECUTION_REQUIRED');const s=load(r);if(!same(s.entry,prior.state.entry)||s.leaseBytes!==prior.state.leaseBytes)fail('ENROLLMENT_INSTALLATION_DRIFT');
 client(c,s,false);await locks(c,s);const observed=await identity(c,s,true);if(!same(observed.native.slice(22,24),prior.backend))fail('ENROLLMENT_INSTALLER_IDENTITY_DRIFT');await installation(c,s);const witness=Object.freeze({});executions.set(witness,{client:c,state:s,backend:observed.native.slice(22,24),transactionId:observed.native[25]});preAdmitted.delete(c);return witness as EmployeeNumberInstallerExecutionWitness;
}
/** Trap-free continuity only, never authority by shape, hash or local identity. */
export function isControlledEnrollmentInstallerExecution(v:unknown,c:Client):v is EmployeeNumberInstallerExecutionWitness{return typeof v==='object'&&v!==null&&executions.get(v)?.client===c;}
export async function assertControlledEnrollmentInstallerExecution(c:Client,v:unknown,expectedBinding:ControlledEnrollmentInstallerBinding):Promise<ControlledEnrollmentInstallerIdentity>{
 if(!isControlledEnrollmentInstallerExecution(v,c))fail('ENROLLMENT_EXECUTION_REQUIRED');const e=executions.get(v)!;
 if(!same(plain(expectedBinding),e.state.binding))fail('ENROLLMENT_REQUEST_DRIFT');client(c,e.state,false);await locks(c,e.state);const observed=await identity(c,e.state,true);if(!same(observed.native.slice(22,24),e.backend)||observed.native[25]!==e.transactionId)fail('ENROLLMENT_INSTALLER_IDENTITY_DRIFT');await installation(c,e.state);return observed.observation;
}
