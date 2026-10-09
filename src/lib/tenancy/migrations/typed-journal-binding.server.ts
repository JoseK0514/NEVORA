import {createHash} from 'node:crypto';
import {types as utilTypes} from 'node:util';
import type {Client} from 'pg';
import type {OwnedLocalBackfillIdentity} from './guarded-backfill.server';
import {canonicalOwnershipJson} from './ownership';

export const TYPED_JOURNAL_STORAGE_SHA256='fd9bdfb4f2b8c36fd8cc97917a97d1945164290a04978fa5d214a71eb27f8fb9';
const signatures=[
 '_typed_journal_canonical_json(json)','_typed_journal_fields(jsonb,text[])','_typed_journal_digest(jsonb)',
 '_typed_journal_key(jsonb,integer)','_typed_journal_validate_description(text)','_typed_journal_plan_identity()',
 '_typed_journal_chunk_identity()','_typed_journal_assert_coverage(text)','_typed_journal_coverage_trigger()',
 '_typed_journal_no_truncate()','read_typed_backfill_journal(text)','register_typed_backfill_journal(text)',
 'observe_typed_backfill_journal(text,text,text,text)',
].map(s=>Object.freeze({signature:'nevora_tenancy.'+s,name:s.slice(0,s.indexOf('('))}));
const triggers=['plan','chunk'].flatMap(kind=>[
 {name:'typed_journal_'+kind+'_identity',table:'typed_backfill_journal_'+kind,functionName:'_typed_journal_'+kind+'_identity',constraint:false,deferrable:false,initiallyDeferred:false},
 {name:'typed_journal_'+kind+'_coverage',table:'typed_backfill_journal_'+kind,functionName:'_typed_journal_coverage_trigger',constraint:true,deferrable:true,initiallyDeferred:true},
 {name:'typed_journal_'+kind+'_no_truncate',table:'typed_backfill_journal_'+kind,functionName:'_typed_journal_no_truncate',constraint:false,deferrable:false,initiallyDeferred:false},
].map(t=>Object.freeze({...t,enabled:'O' as const})));
const contracts=Object.freeze({format:'OWNED_TYPED_JOURNAL_INSTALLATION_V1' as const,sourceSHA256:TYPED_JOURNAL_STORAGE_SHA256,
 tables:Object.freeze(['typed_backfill_journal_chunk','typed_backfill_journal_plan']),functions:Object.freeze(signatures),triggers:Object.freeze(triggers),
 grants:Object.freeze({schema:Object.freeze(['USAGE']),tables:Object.freeze(['INSERT','SELECT','UPDATE']),functions:Object.freeze(['EXECUTE']),
  columns:Object.freeze([] as readonly Readonly<{table:string;column:string;privilege:'UPDATE'}>[])})});
/** Fixed source contracts and root-selected atomic-mode grants are observations, never
 * installation/DDL/operator approval. Only the guarded owned-local entrypoint
 * may use this read-only seam after its original lease/client/login checks.
 * Table UPDATE on exactly these two controls permits the required explicit
 * SHARE ROW EXCLUSIVE locks. The thirteen invoker functions and six verified
 * identity/coverage/truncate guards remain mandatory; no destructive or
 * maintenance grant follows. Standalone structural-store grants are unchanged. */
export function getTypedJournalInstallationContracts(){return contracts;}
export type TypedJournalInstallation=Readonly<{
 format:'OWNED_TYPED_JOURNAL_INSTALLATION_V1';sourceSHA256:string;database:string;databaseOid:string;marker:string;invocation:string;schemaOid:string;ownerRoleOid:string;
 tables:readonly Readonly<{name:string;oid:string}>[];
 functions:readonly Readonly<{signature:string;oid:string;definitionSHA256:string}>[];
 triggers:readonly Readonly<{name:string;table:string;oid:string;definitionSHA256:string;enabled:'O';constraint:boolean;deferrable:boolean;initiallyDeferred:boolean}>[];
 operators:readonly Readonly<{name:string;oid:string}>[];
}>;
export type TypedJournalBindingCode='TYPED_JOURNAL_INSTALLATION_REQUIRED'|'TYPED_JOURNAL_INSTALLATION_DRIFT';
const failures=new WeakSet<object>(),installations=new WeakSet<object>();
class BindingFailure extends Error{constructor(readonly code:TypedJournalBindingCode){super(code);failures.add(this);Object.freeze(this);}}
export function isTypedJournalBindingFailure(value:unknown):value is BindingFailure{return typeof value==='object'&&value!==null&&failures.has(value);}
function fail(code:TypedJournalBindingCode):never{throw new BindingFailure(code);}
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
const sha=(v:string)=>createHash('sha256').update(v,'utf8').digest('hex');
const oid=(v:unknown):v is string=>typeof v==='string'&&/^[1-9][0-9]*$/.test(v);
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&!/[\p{Cc}\p{Cf}]/u.test(v);
const digest=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
/** Fail before property reads on proxies/accessors/cycles, even if this
 * internal seam is called directly. The guarded executor supplies JSON data
 * from the independently checked exact private root-owned lease file. */
function data(v:unknown,ancestors=new Set<object>()):unknown{
 if(v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v))return v;
 if(typeof v!=='object'||utilTypes.isProxy(v)||ancestors.has(v))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 const array=Array.isArray(v);if(Object.getPrototypeOf(v)!==(array?Array.prototype:Object.prototype))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 const d=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(v);if(keys.some(k=>typeof k!=='string'))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');ancestors.add(v);
 try{if(array){const n=d.length?.value;if(!Number.isSafeInteger(n)||n<0||keys.length!==n+1)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');const result:unknown[]=[];for(let i=0;i<n;i++){const x=d[String(i)];if(!x||!('value'in x)||!x.enumerable)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');result.push(data(x.value,ancestors));}return Object.freeze(result);}
  const result:Record<string,unknown>={};for(const k of keys as string[]){const x=d[k];if(!('value'in x)||!x.enumerable)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');Object.defineProperty(result,k,{value:data(x.value,ancestors),enumerable:true});}return Object.freeze(result);
 }finally{ancestors.delete(v);}
}
function fields(v:unknown,names:string[]):v is Record<string,unknown>{return v!==null&&typeof v==='object'&&!Array.isArray(v)&&same(Object.keys(v).sort(),[...names].sort());}
export function bindOwnedTypedJournalInstallation(leaseValue:unknown,identityValue:unknown):TypedJournalInstallation{
 const copiedIdentity=data(identityValue);
 if(!fields(copiedIdentity,['database','databaseOid','marker','systemIdentifier','dataDirectory','role','port','clusterRoot','leasePath','postmasterPid','postmasterStart','roleOid']))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 const identity=copiedIdentity as unknown as OwnedLocalBackfillIdentity;
 const lease=data(leaseValue) as {invocation?:unknown;marker?:unknown;authorizationReference?:unknown;operatorRoles?:{name:string;catalog:string[]}[];typedJournalInstallations?:unknown};
 if(!lease||!Array.isArray(lease.typedJournalInstallations))fail('TYPED_JOURNAL_INSTALLATION_REQUIRED');
 if(typeof lease.invocation!=='string'||!/^[a-f0-9]{16}$/.test(lease.invocation)||lease.marker!=='f10-owned:'+lease.invocation||lease.authorizationReference!=='F-DEV-COMPLETE-001:typed-capture:'+lease.invocation||!Array.isArray(lease.operatorRoles)||!lease.operatorRoles.length)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 if(lease.typedJournalInstallations.some(x=>!fields(x,['format','sourceSHA256','database','databaseOid','marker','invocation','schemaOid','ownerRoleOid','tables','functions','triggers','operators'])))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 const matching=lease.typedJournalInstallations.filter(x=>(x as Record<string,unknown>).database===identity.database);
 if(matching.length!==1)fail(matching.length?'TYPED_JOURNAL_INSTALLATION_DRIFT':'TYPED_JOURNAL_INSTALLATION_REQUIRED');
 const c=matching[0] as unknown as TypedJournalInstallation;
 if(c.format!==contracts.format||c.sourceSHA256!==TYPED_JOURNAL_STORAGE_SHA256||c.databaseOid!==identity.databaseOid||c.marker!==identity.marker||c.invocation!==lease.invocation||!oid(c.schemaOid)||!oid(c.ownerRoleOid)||!Array.isArray(c.tables)||!Array.isArray(c.functions)||!Array.isArray(c.triggers)||!Array.isArray(c.operators))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 if(lease.operatorRoles.some(r=>!fields(r,['name','catalog'])||!text(r.name)||!Array.isArray(r.catalog)||!r.catalog.length||!oid(r.catalog[0])||r.catalog.some(v=>typeof v!=='string')))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 if(c.operators.some(r=>!fields(r,['name','oid'])||!text(r.name)||!oid(r.oid))||
  c.tables.some(r=>!fields(r,['name','oid'])||!text(r.name)||!oid(r.oid))||
  c.functions.some(r=>!fields(r,['signature','oid','definitionSHA256'])||!text(r.signature)||!oid(r.oid)||!digest(r.definitionSHA256))||
  c.triggers.some(r=>!fields(r,['name','table','oid','definitionSHA256','enabled','constraint','deferrable','initiallyDeferred'])||!text(r.name)||!text(r.table)||!oid(r.oid)||!digest(r.definitionSHA256)||r.enabled!=='O'||typeof r.constraint!=='boolean'||typeof r.deferrable!=='boolean'||typeof r.initiallyDeferred!=='boolean'))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 const operators=lease.operatorRoles.map(r=>({name:r.name,oid:r.catalog?.[0]})).sort((a,b)=>a.name<b.name?-1:1);
 if(operators.some(r=>!text(r.name)||!oid(r.oid)||r.oid===c.ownerRoleOid)||!operators.some(r=>r.name===identity.role&&r.oid===identity.roleOid)||!same([...c.operators].sort((a,b)=>a.name<b.name?-1:1),operators))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 if(c.tables.length!==2||c.functions.length!==13||c.triggers.length!==6)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 for(const n of contracts.tables){const rows=c.tables.filter(t=>t.name===n);if(rows.length!==1||!fields(rows[0],['name','oid'])||!oid(rows[0].oid))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');}
 for(const f of contracts.functions){const rows=c.functions.filter(t=>t.signature===f.signature);if(rows.length!==1||!fields(rows[0],['signature','oid','definitionSHA256'])||!oid(rows[0].oid)||!digest(rows[0].definitionSHA256))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');}
 for(const t of contracts.triggers){const rows=c.triggers.filter(x=>x.name===t.name&&x.table===t.table);
  if(rows.length!==1||!fields(rows[0],['name','table','oid','definitionSHA256','enabled','constraint','deferrable','initiallyDeferred'])||!oid(rows[0].oid)||!digest(rows[0].definitionSHA256))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
  if(rows[0].enabled!==t.enabled||rows[0].constraint!==t.constraint||rows[0].deferrable!==t.deferrable||rows[0].initiallyDeferred!==t.initiallyDeferred)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 }
 for(const rows of [c.tables,c.functions,c.triggers])if(new Set(rows.map(r=>r.oid)).size!==rows.length)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 installations.add(c);return c;
}
const wireTypes={getTypeParser:()=>((v:string)=>v)};
async function read(client:Client,text:string,values:unknown[]=[]):(Promise<(string|null)[][]>){return (await client.query<(string|null)[]>({text,values,rowMode:'array',types:wireTypes})).rows;}
/** No BEGIN/COMMIT/DML/DDL/grants or resource action. Exact current objects and
 * ACLs must match independently retained root custody; the caller separately
 * binds this installation to the original captured complete catalog. */
export async function assertOwnedTypedJournalInstallation(client:Client,value:unknown):Promise<void>{
 if(typeof value!=='object'||value===null||!installations.has(value))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 const c=value as TypedJournalInstallation;
 try{
  const schema=await read(client,"/* F10_TYPED_JOURNAL_INSTALLATION_SCHEMA */ SELECT oid::text,nspowner::text FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy'");
  if(!same(schema,[[c.schemaOid,c.ownerRoleOid]]))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
  const tables=await read(client,"/* F10_TYPED_JOURNAL_INSTALLATION_TABLES */ SELECT c.relname,c.oid::text,c.relowner::text,c.relkind,c.relpersistence,c.relrowsecurity::text,c.relforcerowsecurity::text,c.relispartition::text FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='nevora_tenancy' AND c.relname=ANY($1::text[]) ORDER BY c.relname COLLATE pg_catalog.\"C\"",[[...contracts.tables]]);
  if(!same(tables,contracts.tables.map(n=>[n,c.tables.find(t=>t.name===n)!.oid,c.ownerRoleOid,'r','p','false','false','false'])))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
  for(const f of contracts.functions){const expected=c.functions.find(x=>x.signature===f.signature)!;const rows=await read(client,"/* F10_TYPED_JOURNAL_INSTALLATION_FUNCTION */ SELECT p.oid::text,p.proowner::text,p.prosecdef::text,pg_catalog.array_to_json(p.proconfig)::text,pg_catalog.pg_get_functiondef(p.oid) FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure($1)",[f.signature]);
   if(rows.length!==1||!same(rows[0].slice(0,4),[expected.oid,c.ownerRoleOid,'false','["search_path=pg_catalog"]'])||typeof rows[0][4]!=='string'||sha(rows[0][4])!==expected.definitionSHA256)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
  }
  const actual=await read(client,"/* F10_TYPED_JOURNAL_INSTALLATION_TRIGGERS */ SELECT t.tgname,c.relname,t.oid::text,t.tgfoid::text,t.tgenabled,(t.tgconstraint<>0)::text,t.tgdeferrable::text,t.tginitdeferred::text,pg_catalog.pg_get_triggerdef(t.oid) FROM pg_catalog.pg_trigger t JOIN pg_catalog.pg_class c ON c.oid=t.tgrelid WHERE c.oid=ANY($1::oid[]) AND NOT t.tgisinternal ORDER BY t.tgname COLLATE pg_catalog.\"C\"",[c.tables.map(t=>t.oid)]);
  if(actual.length!==6)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
  for(const t of contracts.triggers){const expected=c.triggers.find(x=>x.name===t.name&&x.table===t.table)!,rows=actual.filter(r=>r[0]===t.name&&r[1]===t.table),f=c.functions.find(x=>x.signature.startsWith('nevora_tenancy.'+t.functionName+'('))!;
   if(rows.length!==1||!same(rows[0].slice(2,8),[expected.oid,f.oid,'O',String(t.constraint),String(t.deferrable),String(t.initiallyDeferred)])||typeof rows[0][8]!=='string'||sha(rows[0][8])!==expected.definitionSHA256)fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
  }
  const acls=await read(client,"/* F10_TYPED_JOURNAL_INSTALLATION_ACLS */ SELECT 'TABLE',c.relname,'',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable::text FROM pg_catalog.pg_class c CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a WHERE c.oid=ANY($1::oid[]) AND a.grantee<>$3::oid UNION ALL SELECT 'COLUMN',c.relname,v.attname,a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable::text FROM pg_catalog.pg_class c JOIN pg_catalog.pg_attribute v ON v.attrelid=c.oid CROSS JOIN LATERAL pg_catalog.aclexplode(v.attacl) a WHERE c.oid=ANY($1::oid[]) AND a.grantee<>$3::oid UNION ALL SELECT 'FUNCTION',p.proname,'',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable::text FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE p.oid=ANY($2::oid[]) AND a.grantee<>$3::oid UNION ALL SELECT 'SCHEMA','nevora_tenancy','',a.grantee::text,a.grantor::text,a.privilege_type,a.is_grantable::text FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a WHERE n.oid=$4::oid AND a.grantee<>$3::oid",[c.tables.map(t=>t.oid),c.functions.map(f=>f.oid),c.ownerRoleOid,c.schemaOid]);
  const expected:string[][]=[];for(const op of c.operators){const grant=(kind:string,name:string,column:string,privilege:string)=>expected.push([kind,name,column,op.oid,c.ownerRoleOid,privilege,'false']);for(const n of contracts.tables)for(const p of contracts.grants.tables)grant('TABLE',n,'',p);for(const x of contracts.grants.columns)grant('COLUMN',x.table,x.column,x.privilege);for(const f of contracts.functions)grant('FUNCTION',f.name,'','EXECUTE');grant('SCHEMA','nevora_tenancy','','USAGE');}
  const sorted=(rows:(string|null)[][])=>rows.map(r=>canonicalOwnershipJson(r)).sort();if(!same(sorted(acls),sorted(expected)))fail('TYPED_JOURNAL_INSTALLATION_DRIFT');
 }catch(error){if(isTypedJournalBindingFailure(error))throw error;fail('TYPED_JOURNAL_INSTALLATION_DRIFT');}
}
