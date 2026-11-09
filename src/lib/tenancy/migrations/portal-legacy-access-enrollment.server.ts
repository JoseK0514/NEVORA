// PORTAL_LEGACY_RECONCILIATION_IMPORT_BEGIN
import {compareLegacyEmployeeNumberEnrollmentTarget} from './employee-number-enrollment';
// PORTAL_LEGACY_RECONCILIATION_IMPORT_END
// UNUSED LOCAL whole-plan enrollment producer. Root authenticates the existing
// leased maintenance controller/build and independently retains its ledger.
// No runtime caller, reviewed DTO, hash equality or ordinary parser issues it.
import 'server-only';
import {constants,openSync,closeSync,fstatSync,readFileSync,lstatSync,realpathSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {types as utilTypes} from 'node:util';
import {Client} from 'pg';
import {CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS} from '../../capabilities/policy';
import type {Capability} from '../../capabilities/types';
import type {UserRole} from '../../domain';
import {canonicalOwnershipJson,ownershipDigest} from './ownership';
import {decodeTypedMigrationWireValue,isIssuedTypedMigrationWireValue} from './typed-wire';
import {PORTAL_SOURCE_IMAGE_BYTES} from '../runtime/portal-source-image.generated';
import {isIssuedTypedTenantBackfillPlan,type TypedBackfillEntry} from './typed-backfill';
import {compileLegacyEmployeeNumberEnrollment} from './employee-number-enrollment';
import {assertTypedKeyComparatorsOnLockedInstallerSource} from './key-comparator-recheck.server';
import {getControlledEnrollmentInstallerBinding,isControlledEnrollmentInstallerExecution,
 assertControlledEnrollmentInstallerExecution,type EmployeeNumberInstallerExecutionWitness,
 type ControlledEnrollmentInstallerBinding,type ControlledEnrollmentInstallerIdentity} from './employee-number-enrollment-binding.server';
import type {GuardedTypedBackfillRequest} from './typed-guarded-backfill.server';

export type PortalLegacyEnrollmentCode='GENUINE_WHOLE_PLAN_REQUIRED'|'OWNED_INSTALLER_REQUIRED'|
 'CONTROLLER_LEDGER_REQUIRED'|'CONTROLLER_LEDGER_DRIFT'|'SOURCE_OR_GRANT_COMMAND_DRIFT'|
 'PRIVATE_INSTALLATION_DRIFT'|'NONEMPTY_TARGET'|'NATIVE_WRITE_NOT_EXACT';
const errors=new WeakSet<object>();
class EnrollmentFailure extends Error{constructor(readonly code:PortalLegacyEnrollmentCode){super(code);errors.add(this);Object.freeze(this);}}
function fail(code:PortalLegacyEnrollmentCode):never{throw new EnrollmentFailure(code);}
export function isPortalLegacyEnrollmentFailure(value:unknown):value is EnrollmentFailure{
 return typeof value==='object'&&value!==null&&errors.has(value);
}
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
const busy=new WeakSet<object>();
const nativeQuery=Client.prototype.query;
const wireTypes={getTypeParser:()=>((value:string)=>value)};
const OID=/^[1-9][0-9]*$/;
const text=(v:unknown):v is string=>typeof v==='string'&&decodeTypedMigrationWireValue('text',v).status==='DECODED';
const positive=(v:unknown):v is string=>typeof v==='string'&&v!=='0'&&v[0]!=='-'&&decodeTypedMigrationWireValue('bigint',v).status==='DECODED';
const order=(a:string,b:string)=>Buffer.compare(Buffer.from(a,'utf8'),Buffer.from(b,'utf8'));
// Exact selected physical source custody, not source equality as operator/build authentication.
export const PORTAL_LEGACY_SOURCE_BINDINGS=Object.freeze({
 "src/lib/auth/session.ts": "f1cc1cd4714f1580f27ca00f038a7ecf597813dee23ffac3ed1725e303908fc0",
 "src/lib/auth/permissions.ts": "33cd895853312b1d7ace7910a44e373fa4f037da856d97c0c807af9344598920",
 "src/lib/capabilities/policy.ts": "2c8b81fdbb5a790f778f6de18062e788e312bf38bc873171c23fee8150940df8",
 "src/lib/capabilities/types.ts": "1a58a71719cc656ffa2830a0ffcc075668d1d10593f9556bb3dc03dd8cca0444",
 "src/lib/tenancy/identity.ts": "223d023e27452dd1b751ecef412e8db0c0bbb19da93e594d4eef5fef681a584b",
 "src/lib/tenancy/migrations/employee-number-enrollment.ts": "251a4c7b579a59ac9854b58480163d4ded8433048c9658c907b1c6db33f2e7f2",
 "src/lib/tenancy/migrations/employee-number-enrollment-binding.server.ts": "dcf84aff0babe18f3d3af85c7f18612661275351680daa0eee8c5c33c347cae9",
 "src/lib/tenancy/migrations/key-comparator-recheck.server.ts": "b9ab8c3f190ed576e0bf1845b982ee3a285f5f6a5ebb22b8a1ec50522c1e78c3",
 "src/lib/tenancy/migrations/typed-guarded-backfill.server.ts": "f0b33f2a17fe464d56e29ca608f445ec4d2f86724187ea6c46ea5e245077988c",
 "src/lib/tenancy/migrations/typed-backfill.ts": "5d6de8bd06df045f05745e4ed2978f03869ae64f46f67902b86467562e24c29e",
 "src/lib/tenancy/migrations/typed-wire.ts": "8e352202761344afb449d4dbf565603b77965264aea20a8ede01832acc670957",
 "src/lib/tenancy/runtime/portal-authority-storage.sql": "e8afeff01d13775eeecd462e7a6e2bb662e1279ce44fd3ded2b383e34821a094",
 "src/lib/tenancy/runtime/portal-administrative-authority-storage.sql": "06d78b8e7e6118109312d07d48d56231266b38853bcdd8792e1e298836af42a4",
 "src/lib/tenancy/runtime/portal-session-issuance-storage.sql": "4625ff35db3c4c3b63ef9e575468af75f4e4935c8af9934ec5b99e3cf346397e",
 "src/lib/tenancy/runtime/workspace-incarnation-storage.sql": "b3d8c8ecf96fb4ff72255e85a53a50ddc97a1633dfdf94cea19b4496382a07f9",
 "src/lib/tenancy/runtime/capability-policy-definition-storage.sql": "75e8f70dbd5e2381cdde2c425aa634fafe0fe420392b07ab858cf9900382a386",
 "src/lib/tenancy/runtime/employee-login-identity-storage.sql": "4bfb8494d4ee7407a34da9a38bebcc268a3f2ca7ba5a9309d3d441873af6a330",
 "NEW:src/lib/tenancy/runtime/portal-access-lineage-storage.sql": "3907e6be68c41647a3a0696d0d6e6e2fe98463735565753cbb724bfafaabfcf8",
 "src/lib/tenancy/runtime/portal-source-image.generated.ts": "9433a47dd4b796e85b094119bff8a2fa564853499f69e64d8430e997e49ad2f8"
});

function detach(v:unknown,seen=new Set<object>()):unknown{
 if(isIssuedTypedTenantBackfillPlan(v)||isIssuedTypedMigrationWireValue(v))return v;
 if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isSafeInteger(v)&&!Object.is(v,-0))return v;
 if(typeof v!=='object'||utilTypes.isProxy(v)||seen.has(v))fail('CONTROLLER_LEDGER_DRIFT');
 const array=Array.isArray(v),keys=Reflect.ownKeys(v),d=Object.getOwnPropertyDescriptors(v);
 if(Object.getPrototypeOf(v)!==(array?Array.prototype:Object.prototype)||keys.some(k=>typeof k!=='string'))fail('CONTROLLER_LEDGER_DRIFT');
 seen.add(v);try{
  if(array){const n=Object.hasOwn(d,'length')?d.length:undefined;
   if(!n||!Object.hasOwn(n,'value')||!Number.isSafeInteger(n.value)||n.value<0||keys.length!==n.value+1)fail('CONTROLLER_LEDGER_DRIFT');
   const out:unknown[]=[];for(let i=0;i<n.value;i++){const k=String(i),x=Object.hasOwn(d,k)?d[k]:undefined;
    if(!x||!Object.hasOwn(x,'value')||!x.enumerable)fail('CONTROLLER_LEDGER_DRIFT');out.push(detach(x.value,seen));}return Object.freeze(out);}
  const out:Record<string,unknown>={};for(const k of keys as string[]){const x=d[k];if(!Object.hasOwn(x,'value')||!x.enumerable)fail('CONTROLLER_LEDGER_DRIFT');
   Object.defineProperty(out,k,{value:detach(x.value,seen),enumerable:true});}return Object.freeze(out);
 }finally{seen.delete(v);}
}
function fields(v:unknown,names:readonly string[]):v is Record<string,unknown>{
 return typeof v==='object'&&v!==null&&!Array.isArray(v)&&same(Object.keys(v).sort(),[...names].sort());
}
type WorkspaceCommand=Readonly<{workspaceId:string;incarnation:string;policyId:string;policyRevision:string;installationEpoch:string}>;
type SubjectCommand=Readonly<{workspaceId:string;employeeId:string;sourceEmployeeChecksum:string;sourceCredentialChecksum:string|null;
 sourceRole:UserRole;initialAuthorizationVersion:string;initialPortalAccessVersion:string;
 legacyAccess:'PRESERVED'|'ABSENT';capabilities:readonly Capability[];administrativeCapabilities:readonly Capability[]}>;
type LedgerEntry=Readonly<{format:'CONTROLLED_LOCAL_CAPTURED_LEGACY_PORTAL_ACCESS_V1';invocation:string;
 database:string;databaseOid:string;marker:string;installerRole:string;installerRoleOid:string;
 binding:ControlledEnrollmentInstallerBinding;sourceBindings:typeof PORTAL_LEGACY_SOURCE_BINDINGS;
 currentPrivateCatalogText:string;workspaces:readonly WorkspaceCommand[];subjects:readonly SubjectCommand[]}>;
type Ledger={path:string;bytes:string;dev:number;ino:number;entry:LedgerEntry};

function loadLedger(identity:ControlledEnrollmentInstallerIdentity,binding:ControlledEnrollmentInstallerBinding):Ledger{
 const root=dirname(identity.dataDirectory),path=join(root,'ownership.json');let fd:number|undefined;
 try{
  if(realpathSync(root)!==root||realpathSync(identity.dataDirectory)!==join(root,'data')||lstatSync(path).isSymbolicLink())fail('CONTROLLER_LEDGER_DRIFT');
  fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);const s=fstatSync(fd);
  if(!s.isFile()||s.nlink!==1||(s.mode&0o777)!==0o600||process.getuid&&s.uid!==process.getuid())fail('CONTROLLER_LEDGER_DRIFT');
  const bytes=readFileSync(fd,'utf8'),lease=detach(JSON.parse(bytes)) as Record<string,unknown>;
  if(!lease||lease.closed!==false||lease.scope!=='OWNED_LOCAL_F10'||lease.root!==root||lease.data!==identity.dataDirectory||
   lease.port!==identity.port||lease.systemIdentifier!==identity.systemIdentifier||typeof lease.invocation!=='string'||!lease.invocation.length)fail('CONTROLLER_LEDGER_DRIFT');
  const rows=lease.portalLegacyAccessEnrollments;
  if(!Array.isArray(rows))fail('CONTROLLER_LEDGER_REQUIRED');
  const selected=rows.filter(v=>fields(v,['format','invocation','database','databaseOid','marker','installerRole','installerRoleOid','binding','sourceBindings','currentPrivateCatalogText','workspaces','subjects'])&&v.database===identity.database);
  if(selected.length!==1)fail('CONTROLLER_LEDGER_REQUIRED');const e=selected[0] as unknown as LedgerEntry;
  if(e.format!=='CONTROLLED_LOCAL_CAPTURED_LEGACY_PORTAL_ACCESS_V1'||e.invocation!==lease.invocation||e.database!==identity.database||
   e.databaseOid!==identity.databaseOid||e.marker!==identity.marker||e.installerRole!==identity.role||e.installerRoleOid!==identity.roleOid||
   !same(e.binding,binding)||!same(e.sourceBindings,PORTAL_LEGACY_SOURCE_BINDINGS)||!text(e.currentPrivateCatalogText)||!e.currentPrivateCatalogText.length||
   !Array.isArray(e.workspaces)||!Array.isArray(e.subjects))fail('CONTROLLER_LEDGER_DRIFT');
  if(e.workspaces.some(w=>!fields(w,['workspaceId','incarnation','policyId','policyRevision','installationEpoch'])||!text(w.workspaceId)||!text(w.policyId)||
    ![w.incarnation,w.policyRevision,w.installationEpoch].every(positive))||new Set(e.workspaces.map(w=>w.workspaceId)).size!==e.workspaces.length)fail('CONTROLLER_LEDGER_DRIFT');
  if(e.subjects.some(s=>!fields(s,['workspaceId','employeeId','sourceEmployeeChecksum','sourceCredentialChecksum','sourceRole','initialAuthorizationVersion','initialPortalAccessVersion','legacyAccess','capabilities','administrativeCapabilities'])||
    !text(s.workspaceId)||!text(s.employeeId)||![s.initialAuthorizationVersion,s.initialPortalAccessVersion].every(positive)||
    !text(s.sourceRole)||!text(s.legacyAccess)||!['OWNER','MANAGER','LEAD','EMPLOYEE'].includes(s.sourceRole)||!['PRESERVED','ABSENT'].includes(s.legacyAccess)||!Array.isArray(s.capabilities)||!Array.isArray(s.administrativeCapabilities)))fail('CONTROLLER_LEDGER_DRIFT');
  return {path,bytes,dev:s.dev,ino:s.ino,entry:e};
 }catch(error){if(isPortalLegacyEnrollmentFailure(error))throw error;return fail('CONTROLLER_LEDGER_DRIFT');}finally{if(fd!==undefined)closeSync(fd);}
}
function repeatLedger(ledger:Ledger){let fd:number|undefined;try{
 if(lstatSync(ledger.path).isSymbolicLink())fail('CONTROLLER_LEDGER_DRIFT');fd=openSync(ledger.path,constants.O_RDONLY|constants.O_NOFOLLOW);const s=fstatSync(fd);
 if(s.dev!==ledger.dev||s.ino!==ledger.ino||s.nlink!==1||(s.mode&0o777)!==0o600||process.getuid&&s.uid!==process.getuid()||readFileSync(fd,'utf8')!==ledger.bytes)fail('CONTROLLER_LEDGER_DRIFT');
 }finally{if(fd!==undefined)closeSync(fd);}}
async function raw(c:Client,text:string,values:readonly unknown[]=[]):Promise<readonly (readonly (string|null)[])[]>{
 const result=await Reflect.apply(nativeQuery,c,[{text,values:[...values],rowMode:'array',types:wireTypes}]);
 return result.rows as (string|null)[][];
}
const PRIVATE_RELATIONS=Object.freeze(['workspace_incarnation_counter','capability_policy_definition','workspace_capability_policy_installation',
 'portal_authority','portal_session_issuance','portal_administrative_authority','portal_administrative_capability','portal_administrative_location','portal_access_lineage'] as const);
export const PORTAL_LEGACY_ENROLLMENT_PRIVATE_LOCK_SQL=Object.freeze({text:'LOCK TABLE '+PRIVATE_RELATIONS.map(n=>'nevora_tenancy.'+n).join(',')+' IN SHARE ROW EXCLUSIVE MODE',values:Object.freeze([] as const)});
// Stable semantic native catalog fields only; no pg_class statistics/visibility
// counters. Root retains THIS query's exact native text before whole capture.
export const PORTAL_LEGACY_ENROLLMENT_CATALOG_SQL=Object.freeze({text:`
WITH fixed AS (
 SELECT c.*,n.nspname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='nevora_tenancy' AND c.relname IN ('workspace_incarnation_counter','capability_policy_definition',
 'workspace_capability_policy_installation','portal_authority','portal_session_issuance','portal_administrative_authority',
 'portal_administrative_capability','portal_administrative_location','portal_access_lineage')
), functions AS (SELECT p.*,l.lanname FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE p.oid IN(SELECT t.tgfoid FROM pg_catalog.pg_trigger t JOIN fixed c ON c.oid=t.tgrelid WHERE NOT t.tgisinternal)),
 expanded AS (
 SELECT 'TABLE' kind,c.oid::text object_oid,'' column_name,a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable
 FROM fixed c CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
 UNION ALL SELECT 'COLUMN',c.oid::text,v.attname,a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable
 FROM fixed c JOIN pg_catalog.pg_attribute v ON v.attrelid=c.oid CROSS JOIN LATERAL pg_catalog.aclexplode(v.attacl) a
 WHERE v.attnum>0 AND NOT v.attisdropped
 UNION ALL SELECT 'FUNCTION',p.oid::text,'',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable
 FROM functions p CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
)
SELECT pg_catalog.jsonb_build_object(
 'schema',(SELECT pg_catalog.to_jsonb(n) FROM pg_catalog.pg_namespace n WHERE n.nspname='nevora_tenancy'),
 'relations',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('oid',c.oid::text,'name',c.relname,
 'owner',c.relowner::text,'kind',c.relkind,'persistence',c.relpersistence,'partition',c.relispartition,'rls',c.relrowsecurity,
 'forceRls',c.relforcerowsecurity,'acl',c.relacl,'options',c.reloptions,'replicaIdentity',c.relreplident) ORDER BY c.oid) FROM fixed c),'[]'::jsonb),
 'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.attrelid,a.attnum) FROM pg_catalog.pg_attribute a JOIN fixed c ON c.oid=a.attrelid WHERE a.attnum>0 AND NOT a.attisdropped),'[]'::jsonb),
 'defaults',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.adrelid,d.adnum) FROM pg_catalog.pg_attrdef d JOIN fixed c ON c.oid=d.adrelid),'[]'::jsonb),
 'constraints',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(k)||pg_catalog.jsonb_build_object('definition',pg_catalog.pg_get_constraintdef(k.oid,false)) ORDER BY k.oid) FROM pg_catalog.pg_constraint k JOIN fixed c ON c.oid=k.conrelid),'[]'::jsonb),
 'indexes',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i)||pg_catalog.jsonb_build_object('definition',pg_catalog.pg_get_indexdef(i.indexrelid),'owner',x.relowner::text,'kind',x.relkind,'persistence',x.relpersistence) ORDER BY i.indexrelid) FROM pg_catalog.pg_index i JOIN fixed c ON c.oid=i.indrelid JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid),'[]'::jsonb),
 'functions',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)||pg_catalog.jsonb_build_object('definition',pg_catalog.pg_get_functiondef(p.oid),'bodySha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')) ORDER BY p.oid) FROM functions p),'[]'::jsonb),
 'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t)||pg_catalog.jsonb_build_object('definition',pg_catalog.pg_get_triggerdef(t.oid,false)) ORDER BY t.oid) FROM pg_catalog.pg_trigger t JOIN fixed c ON c.oid=t.tgrelid),'[]'::jsonb),
 'rules',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r)||pg_catalog.jsonb_build_object('definition',pg_catalog.pg_get_ruledef(r.oid,false)) ORDER BY r.oid) FROM pg_catalog.pg_rewrite r JOIN fixed c ON c.oid=r.ev_class),'[]'::jsonb),
 'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(p)||pg_catalog.jsonb_build_object('using',pg_catalog.pg_get_expr(p.polqual,p.polrelid,false),'withCheck',pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false)) ORDER BY p.oid) FROM pg_catalog.pg_policy p JOIN fixed c ON c.oid=p.polrelid),'[]'::jsonb),
 'acls',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY kind,object_oid::oid,column_name COLLATE pg_catalog."C",grantee::oid,grantor::oid,privilege_type) FROM expanded a),'[]'::jsonb),
 'defaultAcls',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.oid) FROM pg_catalog.pg_default_acl d WHERE d.defaclrole=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user) OR d.defaclnamespace='nevora_tenancy'::regnamespace),'[]'::jsonb),
 'initialPrivileges',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i) ORDER BY classoid,objoid,objsubid,privtype) FROM pg_catalog.pg_init_privs i WHERE i.objoid IN(SELECT oid FROM fixed UNION SELECT oid FROM functions)),'[]'::jsonb),
 'dependencies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY classid,objid,objsubid,refclassid,refobjid,refobjsubid,deptype) FROM pg_catalog.pg_depend d WHERE (d.classid='pg_catalog.pg_class'::regclass AND d.objid IN(SELECT oid FROM fixed)) OR (d.classid='pg_catalog.pg_proc'::regclass AND d.objid IN(SELECT oid FROM functions)) OR (d.classid='pg_catalog.pg_trigger'::regclass AND d.objid IN(SELECT t.oid FROM pg_catalog.pg_trigger t JOIN fixed c ON c.oid=t.tgrelid))),'[]'::jsonb)
)::text;`,values:Object.freeze([] as const)});
const PRIVATE_GUARD_BODY_BINDINGS=Object.freeze({
 "guard_workspace_incarnation_counter": "ad86b5c7b5adb0fa3f150d7f71f8d7ea7ffb08951efc4610f0f8f7277139f120",
 "guard_portal_authority": "5a971382baf425367090ad60490ed8b243718456b8acb332d734a90a6fec4664",
 "guard_portal_administrative_authority": "2bcb5cc9efff33fcd29778c458085a25a1c1e396ff1021b10a58473a8c1f5ef0",
 "guard_portal_session_issuance": "0e31e162a3f41d323a6acc94cf1bbdf574c6edba2a1594e1e7612a5611c44e8f",
 "guard_capability_policy_storage": "64e874e6af06d180772365b30f8ae6bd10508674caa63f13cf11a84286938d3b",
 "guard_portal_access_lineage": "17d4860bad150afcc411c8f1d0c70312b2fa66434ff60072a13ddd74d33cd7b6"
});
function validatePrivateCatalog(bytes:string,owner:string){
 const c=detach(JSON.parse(bytes));if(!fields(c,['schema','relations','columns','defaults','constraints','indexes','functions','triggers','rules','policies','acls','defaultAcls','initialPrivileges','dependencies']))fail('PRIVATE_INSTALLATION_DRIFT');
 const schema=c.schema as Record<string,unknown>;
 // JSON OIDs stay native string wires; no generic String coercion.
 if(!schema||schema.nspname!=='nevora_tenancy'||schema.nspowner!==owner||typeof schema.oid!=='string'||!OID.test(schema.oid))fail('PRIVATE_INSTALLATION_DRIFT');
 const relations=c.relations as Record<string,unknown>[],acls=c.acls as Record<string,unknown>[],functions=c.functions as Record<string,unknown>[];
 if(!Array.isArray(functions)||functions.length!==Object.keys(PRIVATE_GUARD_BODY_BINDINGS).length||
  Object.entries(PRIVATE_GUARD_BODY_BINDINGS).some(([name,hash])=>functions.filter(p=>p.proname===name&&p.bodySha256===hash&&p.proowner===owner&&p.prosecdef===false&&p.prorettype==='2279'&&p.pronargs===0&&p.pronargdefaults===0&&p.provariadic==='0'&&p.proretset===false&&p.proisstrict===false&&p.proleakproof===false&&p.provolatile==='v'&&p.proparallel==='u'&&p.lanname==='plpgsql'&&same(p.proconfig,['search_path=pg_catalog'])).length!==1))fail('PRIVATE_INSTALLATION_DRIFT');
 if(!Array.isArray(relations)||relations.length!==PRIVATE_RELATIONS.length||!same(relations.map(r=>r.name).sort(),[...PRIVATE_RELATIONS].sort())||
  relations.some(r=>r.owner!==owner||r.kind!=='r'||r.persistence!=='p'||r.partition!==false||r.rls!==true||r.forceRls!==true)||
  !Array.isArray(c.policies)||c.policies.length||!Array.isArray(c.rules)||c.rules.length||!Array.isArray(acls)||acls.some(a=>a.grantee!==owner))fail('PRIVATE_INSTALLATION_DRIFT');
}
async function catalog(c:Client,ledger:Ledger,identity:ControlledEnrollmentInstallerIdentity){
 const rows=await raw(c,PORTAL_LEGACY_ENROLLMENT_CATALOG_SQL.text);
 if(rows.length!==1||rows[0].length!==1||typeof rows[0][0]!=='string'||rows[0][0]!==ledger.entry.currentPrivateCatalogText)fail('PRIVATE_INSTALLATION_DRIFT');
 validatePrivateCatalog(rows[0][0],identity.roleOid);
}
function sourceCell(entry:TypedBackfillEntry,name:string,type:string):string|null{
 const column=entry.source.columns.find(c=>c.name===name);
 if(!column||column.type!==type||decodeTypedMigrationWireValue(type,column.wire).status!=='DECODED')fail('SOURCE_OR_GRANT_COMMAND_DRIFT');return column.wire;
}
function sourceText(entry:TypedBackfillEntry,name:string,type='text'):string{
 const value=sourceCell(entry,name,type);if(value===null)fail('SOURCE_OR_GRANT_COMMAND_DRIFT');return value;
}
function commandGrants(command:SubjectCommand,role:UserRole){
 const caps=command.capabilities,admin=command.administrativeCapabilities;
 if(caps.some(v=>typeof v!=='string')||admin.some(v=>typeof v!=='string')||new Set(caps).size!==caps.length||new Set(admin).size!==admin.length||
  !same([...caps].sort(order),caps)||!same([...admin].sort(order),admin)||
  caps.some(cap=>!CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS.some(rule=>rule.capability===cap&&rule.roles.includes(role)))||
  admin.some(cap=>!caps.includes(cap)||!CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS.some(rule=>rule.capability===cap&&rule.roles.includes(role)&&rule.variant!=='SELF'))||
  role!=='OWNER'&&role!=='MANAGER'&&admin.length||role==='MANAGER'&&caps.some(cap=>CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS.some(rule=>rule.capability===cap&&rule.requiresExplicitManagerGrant&&!admin.includes(cap)))||
  command.legacyAccess==='ABSENT'&&(caps.length||admin.length))fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
 // The ceiling only rejects an invalid controlled command. It never creates
 // grants. Exact explicit sets below come from the authenticated root ledger.
 return {format:'CONTROLLED_CAPTURED_LEGACY_EFFECTIVE_GRANTS_V1',role,capabilities:caps,
  administrativeCapabilities:admin,administrativeScope:role==='OWNER'||role==='MANAGER'?{kind:'ALL_TENANT'}:null};
}
const EMPTY_TARGET_SQL="SELECT (SELECT count(*)::text FROM nevora_tenancy.portal_authority),(SELECT count(*)::text FROM nevora_tenancy.portal_administrative_authority),(SELECT count(*)::text FROM nevora_tenancy.portal_administrative_capability),(SELECT count(*)::text FROM nevora_tenancy.portal_administrative_location),(SELECT count(*)::text FROM nevora_tenancy.portal_session_issuance),(SELECT count(*)::text FROM nevora_tenancy.portal_access_lineage)";
const POLICY_SQL=`SELECT c.workspace_id,c.incarnation::text,h.policy_id,h.policy_revision::text,h.installation_epoch::text,
 pg_catalog.encode(d.canonical_policy_source,'hex'),d.canonical_policy_source_sha256,
 pg_catalog.encode(d.vocabulary_source,'hex'),d.vocabulary_source_sha256,
 pg_catalog.encode(d.approved_prd_source,'hex'),d.approved_prd_source_sha256
 FROM nevora_tenancy.workspace_incarnation_counter c JOIN nevora_tenancy.workspace_capability_policy_installation h
 ON h.workspace_id=c.workspace_id AND pg_catalog.convert_to(h.workspace_id,'UTF8')=pg_catalog.convert_to(c.workspace_id,'UTF8') AND h.workspace_incarnation=c.incarnation
 JOIN nevora_tenancy.capability_policy_definition d ON d.policy_id=h.policy_id AND d.revision=h.policy_revision
 WHERE c.workspace_id=$1::text AND pg_catalog.convert_to(c.workspace_id,'UTF8')=pg_catalog.convert_to($1::text,'UTF8')`;
const PORTAL_INSERT_SQL=`INSERT INTO nevora_tenancy.portal_authority(workspace_id,employee_id,authorization_version,portal_access_version,capability_policy_revision,portal_state,proof_provenance,provenance_reference)
 VALUES($1::text,$2::text,$3::bigint,$4::bigint,$5::bigint,$6::text,'LEGACY_UNVERIFIED',$7::text)
 RETURNING workspace_id,employee_id,authorization_version::text,portal_access_version::text,capability_policy_revision::text,portal_state,proof_provenance,provenance_reference`;
const ADMIN_INSERT_SQL=`INSERT INTO nevora_tenancy.portal_administrative_authority(workspace_id,employee_id,scope_kind,scope_origin,provenance_reference,capability_policy_revision)
 VALUES($1::text,$2::text,'ALL_TENANT','LEGACY_COMPATIBILITY',$3::text,$4::bigint) RETURNING workspace_id,employee_id`;
const CAP_INSERT_SQL=`INSERT INTO nevora_tenancy.portal_administrative_capability(workspace_id,employee_id,capability)
 VALUES($1::text,$2::text,$3::text) RETURNING workspace_id,employee_id,capability`;
const LINEAGE_INSERT_SQL=`INSERT INTO nevora_tenancy.portal_access_lineage(workspace_id,employee_id,workspace_incarnation,authorization_version,portal_access_version,policy_id,policy_revision,installation_epoch,lineage_kind,provenance_reference,capture_source,effective_grants,source_manifest_sha256)
 VALUES($1::text,$2::text,$3::bigint,$4::bigint,$5::bigint,$6::text,$7::bigint,$8::bigint,'CAPTURED_LEGACY_EXISTING_ACCESS',$9::text,$10::jsonb,$11::jsonb,$12::text)
 RETURNING workspace_id,employee_id`;
const LIVE_INSERT_SQL=`INSERT INTO nevora_tenancy.portal_session_issuance(token_hash,workspace_id,employee_id,workspace_incarnation,portal_access_version,session_created_at)
 VALUES($1::char(64),$2::text,$3::text,$4::bigint,$5::bigint,$6::timestamptz)
 RETURNING token_hash::text,workspace_id,employee_id,workspace_incarnation::text,portal_access_version::text,session_created_at::text`;
async function writeExact(c:Client,sql:string,values:readonly unknown[],expected:readonly (readonly (string|null)[])[]){
 if(!same(await raw(c,sql,values),expected))fail('NATIVE_WRITE_NOT_EXACT');
}
const TARGET_SQL=`SELECT pg_catalog.jsonb_build_object(
 'portal',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(workspace_id,employee_id,authorization_version::text,portal_access_version::text,capability_policy_revision::text,portal_state,proof_provenance,provenance_reference) ORDER BY pg_catalog.convert_to(workspace_id,'UTF8'),pg_catalog.convert_to(employee_id,'UTF8')) FROM nevora_tenancy.portal_authority),'[]'::jsonb),
 'admin',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(workspace_id,employee_id,scope_kind,scope_origin,provenance_reference,capability_policy_revision::text) ORDER BY pg_catalog.convert_to(workspace_id,'UTF8'),pg_catalog.convert_to(employee_id,'UTF8')) FROM nevora_tenancy.portal_administrative_authority),'[]'::jsonb),
 'capabilities',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(workspace_id,employee_id,capability) ORDER BY pg_catalog.convert_to(workspace_id,'UTF8'),pg_catalog.convert_to(employee_id,'UTF8'),pg_catalog.convert_to(capability,'UTF8')) FROM nevora_tenancy.portal_administrative_capability),'[]'::jsonb),
 'locations',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(workspace_id,employee_id,location_id) ORDER BY pg_catalog.convert_to(workspace_id,'UTF8'),pg_catalog.convert_to(employee_id,'UTF8'),pg_catalog.convert_to(location_id,'UTF8')) FROM nevora_tenancy.portal_administrative_location),'[]'::jsonb),
 'live',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(token_hash::text,workspace_id,employee_id,workspace_incarnation::text,portal_access_version::text,session_created_at::text) ORDER BY pg_catalog.convert_to(token_hash::text,'UTF8')) FROM nevora_tenancy.portal_session_issuance),'[]'::jsonb),
 'lineage',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(workspace_id,employee_id,workspace_incarnation::text,authorization_version::text,portal_access_version::text,policy_id,policy_revision::text,installation_epoch::text,lineage_kind,provenance_reference,capture_source,effective_grants,source_manifest_sha256) ORDER BY pg_catalog.convert_to(workspace_id,'UTF8'),pg_catalog.convert_to(employee_id,'UTF8')) FROM nevora_tenancy.portal_access_lineage),'[]'::jsonb)
)::text;`;
export type PortalLegacyEnrollmentOutcome=Readonly<{status:'ENROLLED_IN_OWNING_TRANSACTION_NOT_PORTAL_PROOF';
 planDigest:string;subjects:number;administrativeSubjects:number;capabilityRows:number;liveRows:number;
 verification:'LOCAL_CONTROLLED_LINEAGE_AND_GRANT_WRITES_NOT_RUNTIME_OR_RECOVERY_AUTHORITY'}>;
/** Called INSIDE the accepted owning local RC transaction after exclusive FIRST,
 * source70/mapping locks, genuine ALL68 APPLIED source/key checks and issuance of
 * that transaction's opaque installer witness. Throws fixed failure on any drift:
 * caller MUST acknowledge whole ROLLBACK; it cannot commit partial effects.
 * This component does not own BEGIN/COMMIT, retry, cookies, sessions or proofs.
 */
export async function enrollCapturedLegacyPortalAccessOnOwnedInstaller(client:Client,value:unknown,witness:EmployeeNumberInstallerExecutionWitness):Promise<PortalLegacyEnrollmentOutcome>{
 // Complete original plan/witness provenance precedes every Client/property read.
 if(typeof value!=='object'||value===null||utilTypes.isProxy(value))fail('GENUINE_WHOLE_PLAN_REQUIRED');
 const p=Object.getOwnPropertyDescriptor(value,'plan');if(!p||!Object.hasOwn(p,'value')||!isIssuedTypedTenantBackfillPlan(p.value))fail('GENUINE_WHOLE_PLAN_REQUIRED');
 const binding=getControlledEnrollmentInstallerBinding(value),request=detach(value) as GuardedTypedBackfillRequest,plan=p.value;
 if(!isControlledEnrollmentInstallerExecution(witness,client))fail('OWNED_INSTALLER_REQUIRED');
 if(busy.has(client))fail('OWNED_INSTALLER_REQUIRED');busy.add(client);
 try{
  const compiled=compileLegacyEmployeeNumberEnrollment(plan);if(compiled.status!=='COMPILED')fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
  const identity=await assertControlledEnrollmentInstallerExecution(client,witness,binding),ledger=loadLedger(identity,binding),e=ledger.entry;
  await assertTypedKeyComparatorsOnLockedInstallerSource(client,request.facts,request.captureRequest,plan,witness);
  await raw(client,PORTAL_LEGACY_ENROLLMENT_PRIVATE_LOCK_SQL.text);await catalog(client,ledger,identity);repeatLedger(ledger);
  if(!same(await raw(client,EMPTY_TARGET_SQL),[['0','0','0','0','0','0']]))fail('NONEMPTY_TARGET');
  const employees=plan.entries.filter(r=>r.table==='employees'),credentials=plan.entries.filter(r=>r.table==='employee_credentials');
  const sessions=plan.entries.filter(r=>r.table==='employee_sessions');
  if(e.subjects.length!==employees.length||!same(e.subjects.map(s=>[s.workspaceId,s.employeeId]).sort((a,b)=>order(canonicalOwnershipJson(a),canonicalOwnershipJson(b))),
   compiled.enrollment.rows.map(r=>[r.workspaceId,r.employeeId]).sort((a,b)=>order(canonicalOwnershipJson(a),canonicalOwnershipJson(b)))))fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
  const ids=[...new Set(compiled.enrollment.rows.map(r=>r.workspaceId))].sort(order);
  if(!same(e.workspaces.map(w=>w.workspaceId).sort(order),ids))fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
  for(const w of e.workspaces){const rows=await raw(client,POLICY_SQL,[w.workspaceId]);
   if(rows.length!==1||rows[0].length!==11||!same(rows[0].slice(0,5),[w.workspaceId,w.incarnation,w.policyId,w.policyRevision,w.installationEpoch])||
    rows[0][6]!==PORTAL_LEGACY_SOURCE_BINDINGS['src/lib/capabilities/policy.ts']||rows[0][8]!==PORTAL_LEGACY_SOURCE_BINDINGS['src/lib/capabilities/types.ts']||
    rows[0][10]!==APPROVED_PRD_SHA256||rows[0][5]!==imageHex('canonicalPolicySource')||rows[0][7]!==imageHex('vocabularySource')||rows[0][9]!==imageHex('approvedPRDSource'))fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
   // SQL storage hash CHECKs and independently retained exact catalog/body/source
   // custody bind complete bytea preimages; these are not authenticated execution.
  }
  const rows=[...e.subjects].sort((a,b)=>order(a.workspaceId,b.workspaceId)||order(a.employeeId,b.employeeId));
  let administrativeSubjects=0,capabilityRows=0,liveRows=0;
  const target:{portal:unknown[][];admin:unknown[][];capabilities:unknown[][];locations:unknown[][];live:unknown[][];lineage:unknown[][]}={portal:[],admin:[],capabilities:[],locations:[],live:[],lineage:[]};
  for(const s of rows){
   const source=employees.filter(r=>sourceText(r,'id')===s.employeeId),cred=credentials.filter(r=>sourceText(r,'employee_id')===s.employeeId);
   if(source.length!==1||cred.length>1||source[0].source.workspaceId!==s.workspaceId||source[0].sourceChecksum!==s.sourceEmployeeChecksum||
    sourceText(source[0],'role')!==s.sourceRole||(cred[0]?.sourceChecksum??null)!==s.sourceCredentialChecksum||
    s.legacyAccess==='PRESERVED'&&cred.length!==1||s.legacyAccess==='ABSENT'&&cred.length!==0)fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
   const w=e.workspaces.find(w=>w.workspaceId===s.workspaceId)!;
   const grants=commandGrants(s,s.sourceRole),reference='captured-legacy:'+plan.digest+':'+s.sourceEmployeeChecksum;
   const capture={format:'CONTROLLED_CAPTURED_LEGACY_PORTAL_LINEAGE_V1',invocation:e.invocation,databaseOid:e.databaseOid,
    installerRoleOid:e.installerRoleOid,binding,employee:{key:source[0].key,sourceChecksum:source[0].sourceChecksum,wireChecksum:source[0].wireChecksum,role:s.sourceRole},
    credential:cred.length?{key:cred[0].key,sourceChecksum:cred[0].sourceChecksum,wireChecksum:cred[0].wireChecksum}:null,
    legacyAccess:s.legacyAccess,sourceBindings:e.sourceBindings};
   const state=s.legacyAccess==='PRESERVED'?'ENABLED':'DISABLED';
   target.portal.push([s.workspaceId,s.employeeId,s.initialAuthorizationVersion,s.initialPortalAccessVersion,w.policyRevision,state,'LEGACY_UNVERIFIED',reference]);
   await writeExact(client,PORTAL_INSERT_SQL,[s.workspaceId,s.employeeId,s.initialAuthorizationVersion,s.initialPortalAccessVersion,w.policyRevision,state,reference],
    [[s.workspaceId,s.employeeId,s.initialAuthorizationVersion,s.initialPortalAccessVersion,w.policyRevision,state,'LEGACY_UNVERIFIED',reference]]);
   if(s.legacyAccess==='PRESERVED'&&(s.sourceRole==='OWNER'||s.sourceRole==='MANAGER')){
    await writeExact(client,ADMIN_INSERT_SQL,[s.workspaceId,s.employeeId,reference,w.policyRevision],[[s.workspaceId,s.employeeId]]);administrativeSubjects++;
    target.admin.push([s.workspaceId,s.employeeId,'ALL_TENANT','LEGACY_COMPATIBILITY',reference,w.policyRevision]);
    for(const capability of s.administrativeCapabilities){await writeExact(client,CAP_INSERT_SQL,[s.workspaceId,s.employeeId,capability],[[s.workspaceId,s.employeeId,capability]]);capabilityRows++;target.capabilities.push([s.workspaceId,s.employeeId,capability]);}
   }
   await writeExact(client,LINEAGE_INSERT_SQL,[s.workspaceId,s.employeeId,w.incarnation,s.initialAuthorizationVersion,s.initialPortalAccessVersion,w.policyId,w.policyRevision,w.installationEpoch,
    reference,canonicalOwnershipJson(capture),canonicalOwnershipJson(grants),ownershipDigest(e.sourceBindings)],[[s.workspaceId,s.employeeId]]);
   target.lineage.push([s.workspaceId,s.employeeId,w.incarnation,s.initialAuthorizationVersion,s.initialPortalAccessVersion,w.policyId,w.policyRevision,w.installationEpoch,'CAPTURED_LEGACY_EXISTING_ACCESS',reference,capture,grants,ownershipDigest(e.sourceBindings)]);
   const capturedSessions=sessions.filter(r=>sourceText(r,'employee_id')===s.employeeId);
   // No source token/expiry is regenerated. Native char64 equality/created_at
   // stays at source precision. Expired historical LIVE rows are not credentials.
   if(s.legacyAccess==='PRESERVED')for(const session of capturedSessions){
    const token=sourceText(session,'token_hash','char(64)'),created=sourceText(session,'created_at','timestamptz');
    await writeExact(client,LIVE_INSERT_SQL,[token,s.workspaceId,s.employeeId,w.incarnation,s.initialPortalAccessVersion,created],
     [[token,s.workspaceId,s.employeeId,w.incarnation,s.initialPortalAccessVersion,created]]);liveRows++;
    target.live.push([token,s.workspaceId,s.employeeId,w.incarnation,s.initialPortalAccessVersion,created]);
   }
  }
  await raw(client,'SET CONSTRAINTS ALL IMMEDIATE');
  target.live.sort((a,b)=>order(a[0] as string,b[0] as string));const targetRows=await raw(client,TARGET_SQL);
  if(targetRows.length!==1||targetRows[0].length!==1||typeof targetRows[0][0]!=='string'||!same(detach(JSON.parse(targetRows[0][0])),target))fail('NATIVE_WRITE_NOT_EXACT');
  // Repeated exact genuine full source/key/catalog and root/lease/transaction
  // checks precede caller COMMIT; private writes never replace original facts.
  await assertTypedKeyComparatorsOnLockedInstallerSource(client,request.facts,request.captureRequest,plan,witness);
  await assertControlledEnrollmentInstallerExecution(client,witness,binding);await catalog(client,ledger,identity);repeatLedger(ledger);
  return Object.freeze({status:'ENROLLED_IN_OWNING_TRANSACTION_NOT_PORTAL_PROOF',planDigest:plan.digest,subjects:rows.length,
   administrativeSubjects,capabilityRows,liveRows,verification:'LOCAL_CONTROLLED_LINEAGE_AND_GRANT_WRITES_NOT_RUNTIME_OR_RECOVERY_AUTHORITY'});
 }finally{busy.delete(client);}
}
const APPROVED_PRD_SHA256='35e4084c2c365777c78f0d1e2e65533b06758c1f3062cf1b10feb539af8bf7a7';
function imageHex(name:string):string{const bytes=(PORTAL_SOURCE_IMAGE_BYTES as Readonly<Record<string,unknown>>)[name];
 if(!Array.isArray(bytes)||bytes.some(b=>typeof b!=='number'||!Number.isInteger(b)||b<0||b>255))fail('SOURCE_OR_GRANT_COMMAND_DRIFT');return Buffer.from(bytes).toString('hex');}


// PORTAL_LEGACY_RECONCILIATION_EXPECTATION_BEGIN
// SOURCE PREPARATION ONLY / UNEXECUTED. This addition lives in the original
// producer module, reusing its exact native SQL, source cells and command rules.
// It exposes no source/credential/lineage rows and issues no proof or recovery
// authority. Only the actual owning API retains the private expectation handle.
declare const portalExpectationBrand:unique symbol;
export type PortalLegacyReconciliationExpectation=Readonly<{[portalExpectationBrand]:true}>;
export type PortalLegacyReconciliationCode='PORTAL_ENROLLMENT_EXPECTATION_REQUIRED'|
 'PORTAL_ENROLLMENT_FRESH_CLIENT_REQUIRED'|'PORTAL_ENROLLMENT_TARGET_DRIFT'|
 'PORTAL_ENROLLMENT_POLICY_SOURCE_DRIFT';
const reconciliationErrors=new WeakSet<object>();
class PortalReconciliationFailure extends Error{
 constructor(readonly code:PortalLegacyReconciliationCode){super(code);reconciliationErrors.add(this);Object.freeze(this);}
}
function reconciliationFail(code:PortalLegacyReconciliationCode):never{throw new PortalReconciliationFailure(code);}
export function isPortalLegacyReconciliationFailure(value:unknown):value is PortalReconciliationFailure{
 return typeof value==='object'&&value!==null&&reconciliationErrors.has(value);
}
type PortalTarget={portal:unknown[][];admin:unknown[][];capabilities:unknown[][];locations:unknown[][];live:unknown[][];lineage:unknown[][]};
type CompletePortalTarget=Readonly<{mapping:readonly (readonly string[])[];portal:unknown}>;
type PortalExpectationState=Readonly<{originalClient:Client;request:GuardedTypedBackfillRequest;
 binding:ControlledEnrollmentInstallerBinding;ledger:Ledger;policyText:string;
 baseline:CompletePortalTarget;expected:CompletePortalTarget;counts:Readonly<{
 mappingRows:number;subjects:number;administrativeSubjects:number;capabilityRows:number;locationRows:number;liveRows:number;lineageRows:number}>;baselineCounts:Readonly<{
 mappingRows:number;subjects:number;administrativeSubjects:number;capabilityRows:number;locationRows:number;liveRows:number;lineageRows:number}>}>;
const portalExpectations=new WeakMap<object,PortalExpectationState>();
const MAPPING_TARGET_SQL="/* PORTAL_ENROLLMENT_RECONCILIATION_MAPPING */ SELECT employee_id,workspace_id,employee_number,normalized_number FROM nevora_tenancy.employee_login_identity ORDER BY pg_catalog.convert_to(employee_id,'UTF8')";
// Every counter/definition/head row is retained, including unreferenced append-
// only definitions. All int8 values are native strings; no rounding or defaults.
const POLICY_STATE_SQL=`SELECT pg_catalog.jsonb_build_object(
 'counter',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(workspace_id,incarnation::text) ORDER BY pg_catalog.convert_to(workspace_id,'UTF8')) FROM nevora_tenancy.workspace_incarnation_counter),'[]'::jsonb),
 'definition',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(policy_id,revision::text,definition,pg_catalog.encode(canonical_policy_source,'hex'),canonical_policy_source_sha256,pg_catalog.encode(vocabulary_source,'hex'),vocabulary_source_sha256,pg_catalog.encode(approved_prd_source,'hex'),approved_prd_source_sha256) ORDER BY pg_catalog.convert_to(policy_id,'UTF8'),revision) FROM nevora_tenancy.capability_policy_definition),'[]'::jsonb),
 'head',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(workspace_id,workspace_incarnation::text,installation_epoch::text,policy_id,policy_revision::text) ORDER BY pg_catalog.convert_to(workspace_id,'UTF8')) FROM nevora_tenancy.workspace_capability_policy_installation),'[]'::jsonb)
)::text;`;
async function nativeJsonText(client:Client,sql:string):Promise<string>{
 const rows=await raw(client,sql);
 if(rows.length!==1||rows[0].length!==1||typeof rows[0][0]!=='string')reconciliationFail('PORTAL_ENROLLMENT_TARGET_DRIFT');
 // Parse/detach only native JSON text; never enumerate caller-supplied values.
 try{detach(JSON.parse(rows[0][0]));}catch{reconciliationFail('PORTAL_ENROLLMENT_TARGET_DRIFT');}
 return rows[0][0];
}
async function completeTarget(client:Client):Promise<CompletePortalTarget>{
 const mapping=await raw(client,MAPPING_TARGET_SQL);
 if(mapping.some(row=>row.length!==4||row.some(value=>typeof value!=='string')))reconciliationFail('PORTAL_ENROLLMENT_TARGET_DRIFT');
 return detach({mapping,portal:JSON.parse(await nativeJsonText(client,TARGET_SQL))}) as CompletePortalTarget;
}
function expectation(value:unknown):PortalExpectationState{
 if(typeof value!=='object'||value===null||!portalExpectations.has(value))reconciliationFail('PORTAL_ENROLLMENT_EXPECTATION_REQUIRED');
 return portalExpectations.get(value)!;
}
/** Called before ANY mapping or Portal DML, after original ALL68 APPLIED proof
 * and opaque same-backend/assigned-xid installer admission. Original producer
 * remains unchanged. Its exact canonical ceiling is reused only for rejection;
 * approved explicit sets still come from the authenticated controller ledger.
 */
export async function preparePortalLegacyReconciliationExpectation(client:Client,value:unknown,witness:EmployeeNumberInstallerExecutionWitness):Promise<PortalLegacyReconciliationExpectation>{
 if(typeof value!=='object'||value===null||utilTypes.isProxy(value))fail('GENUINE_WHOLE_PLAN_REQUIRED');
 const p=Object.getOwnPropertyDescriptor(value,'plan');if(!p||!Object.hasOwn(p,'value')||!isIssuedTypedTenantBackfillPlan(p.value))fail('GENUINE_WHOLE_PLAN_REQUIRED');
 const binding=getControlledEnrollmentInstallerBinding(value),request=detach(value) as GuardedTypedBackfillRequest,plan=p.value;
 if(!isControlledEnrollmentInstallerExecution(witness,client))fail('OWNED_INSTALLER_REQUIRED');
 const compiled=compileLegacyEmployeeNumberEnrollment(plan);if(compiled.status!=='COMPILED')fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
 const identity=await assertControlledEnrollmentInstallerExecution(client,witness,binding),ledger=loadLedger(identity,binding),e=ledger.entry;
 await raw(client,PORTAL_LEGACY_ENROLLMENT_PRIVATE_LOCK_SQL.text);await catalog(client,ledger,identity);repeatLedger(ledger);
 await assertTypedKeyComparatorsOnLockedInstallerSource(client,request.facts,request.captureRequest,plan,witness);
 if(!same(await raw(client,EMPTY_TARGET_SQL),[['0','0','0','0','0','0']]))fail('NONEMPTY_TARGET');
 const baseline=await completeTarget(client);
 const compared=compareLegacyEmployeeNumberEnrollmentTarget(compiled.enrollment,baseline.mapping);
 if(compared.status==='BLOCKED')reconciliationFail('PORTAL_ENROLLMENT_TARGET_DRIFT');
 const employees=plan.entries.filter(r=>r.table==='employees'),credentials=plan.entries.filter(r=>r.table==='employee_credentials'),sessions=plan.entries.filter(r=>r.table==='employee_sessions');
 const byIdentity=(pairs:readonly (readonly string[])[])=>[...pairs].sort((a,b)=>order(canonicalOwnershipJson(a),canonicalOwnershipJson(b)));
 if(e.subjects.length!==employees.length||!same(byIdentity(e.subjects.map(s=>[s.workspaceId,s.employeeId])),byIdentity(compiled.enrollment.rows.map(r=>[r.workspaceId,r.employeeId]))))fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
 if(!same(e.workspaces.map(w=>w.workspaceId).sort(order),[...new Set(compiled.enrollment.rows.map(r=>r.workspaceId))].sort(order)))fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
 for(const w of e.workspaces){const rows=await raw(client,POLICY_SQL,[w.workspaceId]);
  if(rows.length!==1||rows[0].length!==11||!same(rows[0].slice(0,5),[w.workspaceId,w.incarnation,w.policyId,w.policyRevision,w.installationEpoch])||
   rows[0][6]!==PORTAL_LEGACY_SOURCE_BINDINGS['src/lib/capabilities/policy.ts']||rows[0][8]!==PORTAL_LEGACY_SOURCE_BINDINGS['src/lib/capabilities/types.ts']||rows[0][10]!==APPROVED_PRD_SHA256||
   rows[0][5]!==imageHex('canonicalPolicySource')||rows[0][7]!==imageHex('vocabularySource')||rows[0][9]!==imageHex('approvedPRDSource'))fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
 }
 const policyText=await nativeJsonText(client,POLICY_STATE_SQL),target:PortalTarget={portal:[],admin:[],capabilities:[],locations:[],live:[],lineage:[]};
 for(const s of [...e.subjects].sort((a,b)=>order(a.workspaceId,b.workspaceId)||order(a.employeeId,b.employeeId))){
  const source=employees.filter(r=>sourceText(r,'id')===s.employeeId),cred=credentials.filter(r=>sourceText(r,'employee_id')===s.employeeId);
  if(source.length!==1||cred.length>1||source[0].source.workspaceId!==s.workspaceId||source[0].sourceChecksum!==s.sourceEmployeeChecksum||sourceText(source[0],'role')!==s.sourceRole||
   (cred[0]?.sourceChecksum??null)!==s.sourceCredentialChecksum||s.legacyAccess==='PRESERVED'&&cred.length!==1||s.legacyAccess==='ABSENT'&&cred.length!==0)fail('SOURCE_OR_GRANT_COMMAND_DRIFT');
  const w=e.workspaces.find(w=>w.workspaceId===s.workspaceId)!;
  const grants=commandGrants(s,s.sourceRole),reference='captured-legacy:'+plan.digest+':'+s.sourceEmployeeChecksum;
  const capture={format:'CONTROLLED_CAPTURED_LEGACY_PORTAL_LINEAGE_V1',invocation:e.invocation,databaseOid:e.databaseOid,installerRoleOid:e.installerRoleOid,binding,
   employee:{key:source[0].key,sourceChecksum:source[0].sourceChecksum,wireChecksum:source[0].wireChecksum,role:s.sourceRole},
   credential:cred.length?{key:cred[0].key,sourceChecksum:cred[0].sourceChecksum,wireChecksum:cred[0].wireChecksum}:null,legacyAccess:s.legacyAccess,sourceBindings:e.sourceBindings};
  target.portal.push([s.workspaceId,s.employeeId,s.initialAuthorizationVersion,s.initialPortalAccessVersion,w.policyRevision,s.legacyAccess==='PRESERVED'?'ENABLED':'DISABLED','LEGACY_UNVERIFIED',reference]);
  if(s.legacyAccess==='PRESERVED'&&(s.sourceRole==='OWNER'||s.sourceRole==='MANAGER')){
   target.admin.push([s.workspaceId,s.employeeId,'ALL_TENANT','LEGACY_COMPATIBILITY',reference,w.policyRevision]);
   for(const cap of s.administrativeCapabilities)target.capabilities.push([s.workspaceId,s.employeeId,cap]);
  }
  target.lineage.push([s.workspaceId,s.employeeId,w.incarnation,s.initialAuthorizationVersion,s.initialPortalAccessVersion,w.policyId,w.policyRevision,w.installationEpoch,
   'CAPTURED_LEGACY_EXISTING_ACCESS',reference,capture,grants,ownershipDigest(e.sourceBindings)]);
  if(s.legacyAccess==='PRESERVED')for(const session of sessions.filter(r=>sourceText(r,'employee_id')===s.employeeId))target.live.push([
   sourceText(session,'token_hash','char(64)'),s.workspaceId,s.employeeId,w.incarnation,s.initialPortalAccessVersion,sourceText(session,'created_at','timestamptz')]);
 }
 target.live.sort((a,b)=>order(a[0] as string,b[0] as string));
 const mapping=compiled.enrollment.rows.map(row=>[row.employeeId,row.workspaceId,row.employeeNumber,row.normalizedNumber]).sort((a,b)=>order(a[0],b[0]));
 const expected=detach({mapping,portal:target}) as CompletePortalTarget;
 const counts=Object.freeze({mappingRows:mapping.length,subjects:target.portal.length,administrativeSubjects:target.admin.length,capabilityRows:target.capabilities.length,
  locationRows:target.locations.length,liveRows:target.live.length,lineageRows:target.lineage.length});
 await catalog(client,ledger,identity);repeatLedger(ledger);await assertControlledEnrollmentInstallerExecution(client,witness,binding);
 const baselineCounts=Object.freeze({mappingRows:baseline.mapping.length,subjects:0,administrativeSubjects:0,capabilityRows:0,locationRows:0,liveRows:0,lineageRows:0});
 const handle=Object.freeze({});portalExpectations.set(handle,Object.freeze({originalClient:client,request,binding,ledger,policyText,baseline,expected,counts,baselineCounts}));
 return handle as PortalLegacyReconciliationExpectation;
}
async function compareRetainedCompleteTarget(client:Client,state:PortalExpectationState,witness:EmployeeNumberInstallerExecutionWitness){
 const identity=await assertControlledEnrollmentInstallerExecution(client,witness,state.binding);
 repeatLedger(state.ledger);await raw(client,PORTAL_LEGACY_ENROLLMENT_PRIVATE_LOCK_SQL.text);await catalog(client,state.ledger,identity);
 await assertTypedKeyComparatorsOnLockedInstallerSource(client,state.request.facts,state.request.captureRequest,state.request.plan,witness);
 if(await nativeJsonText(client,POLICY_STATE_SQL)!==state.policyText)reconciliationFail('PORTAL_ENROLLMENT_POLICY_SOURCE_DRIFT');
 const current=await completeTarget(client);
 // When an empty plan makes both states identical, report only the baseline.
 // Equality never establishes that a mutation/commit occurred.
 const observed=same(current,state.baseline)?'ORIGINAL_ENROLLMENT_BASELINE_PRESENT':same(current,state.expected)?'COMPLETE_ENROLLMENT_PRESENT':undefined;
 if(!observed)reconciliationFail('PORTAL_ENROLLMENT_TARGET_DRIFT');
 await catalog(client,state.ledger,identity);repeatLedger(state.ledger);await assertControlledEnrollmentInstallerExecution(client,witness,state.binding);
 return observed;
}
/** Exact before-COMMIT consistency with the privately retained intended target. */
export async function assertPortalLegacyEnrollmentCompleteTarget(client:Client,value:unknown,witness:EmployeeNumberInstallerExecutionWitness):Promise<void>{
 const state=expectation(value);if(client!==state.originalClient)fail('OWNED_INSTALLER_REQUIRED');
 if(await compareRetainedCompleteTarget(client,state,witness)!=='COMPLETE_ENROLLMENT_PRESENT'&&!same(state.baseline,state.expected))reconciliationFail('PORTAL_ENROLLMENT_TARGET_DRIFT');
}
/** Fresh same-custody installer observation only; never invokes the writer. */
export async function observePortalLegacyEnrollmentCompleteTarget(client:Client,value:unknown,witness:EmployeeNumberInstallerExecutionWitness){
 const state=expectation(value);if(client===state.originalClient)reconciliationFail('PORTAL_ENROLLMENT_FRESH_CLIENT_REQUIRED');
 const target=await compareRetainedCompleteTarget(client,state,witness);
 return Object.freeze({target,counts:target==='COMPLETE_ENROLLMENT_PRESENT'?state.counts:state.baselineCounts});
}
// PORTAL_LEGACY_RECONCILIATION_EXPECTATION_END
