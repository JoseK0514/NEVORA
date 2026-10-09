import type { Client, QueryResult } from 'pg';
import { canonicalOwnershipJson, getOwnershipRegistry, ownershipDigest, OWNERSHIP_SCHEMA_COMMIT, OWNERSHIP_SOURCE, verifyOwnershipSource, type JsonValue, type MigrationSource } from './ownership';
import type { TableCapture, DatabaseNamespaceComparators, DatabaseCollationCapture, DatabaseComparatorCatalog, DatabaseComparatorRow } from './backfill';
import { lexSql } from '../inventory/sql-lexer';

export type OwnedCaptureIdentity = { database:string; databaseOid:string; marker:string; systemIdentifier:string; dataDirectory:string; role:string; port:number };
export type CaptureCatalogBaseline = { sourceDigest:string; expansionSha256:string; registryDigest:string; catalogDigest:string };
export type MigrationCaptureRequest = { identity:OwnedCaptureIdentity; migrations:MigrationSource[]; sourceDigest:string; catalogBaseline:CaptureCatalogBaseline; expectedFenceGeneration:string };
export type MigrationCaptureFacts = { sourceDigest:string; registryDigest:string; currentSchemaDigest:string; snapshot:{id:string;isolation:'SERIALIZABLE';includesInactive:true;includesHistory:true}; tables:TableCapture[]; namespaceComparators:DatabaseNamespaceComparators; wireRows:JsonValue[]; fence:{phase:'FENCED';generation:string;actor:null;manifest:null}; catalog:JsonValue; factsDigest:string; verification:'OWNED_LOCAL_DATABASE_FACTS_NOT_BACKFILL_AUTHORITY' };
export type MigrationCaptureOutcome = { status:'CAPTURED'; facts:MigrationCaptureFacts } | {status:'BLOCKED';code:string};
const expansionSha256='fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb';
const SHA=/^[a-f0-9]{64}$/, UINT=/^(0|[1-9][0-9]*)$/;
const active=new WeakSet<Client>();
const ident=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
const fail=(code:string):never=>{throw new CaptureFailure(code);};
class CaptureFailure extends Error { constructor(readonly code:string){super(code);} }
const order=(a:string,b:string)=>a<b?-1:a>b?1:0;
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
const wireTypes={getTypeParser:()=>((text:string)=>text)};
const wireOids:Record<string,number>={text:25,date:1082,time:1083,smallint:21,timestamptz:1184,integer:23,jsonb:3802,boolean:16,uuid:2950,'text[]':25,'char(64)':1042,'numeric(5,2)':1700,bigint:20,timestamp:1114,'char(32)':1042};

/** Do not use pg's default JSON/Date parsers. Raw wire text is retained separately.
 * The existing manifest JSON format cannot represent arbitrary-precision JSON
 * numbers. Such tokens explicitly block, including lexical scale/exponent loss;
 * scalar SQL numeric and bigint instead retain their exact decimal strings.
 * Top-level JSON literal null is retained by this pure decoder; complete row
 * capture blocks it because LegacyRow cannot distinguish it from SQL NULL. */
function parseLosslessJson(raw:string):JsonValue {
 let i=0;
 while(i<raw.length){
  if(raw[i]==='"'){
   i++;
   while(i<raw.length){if(raw[i]==='\\'){i+=2;continue;}if(raw[i++]==='"')break;}
  }else if(raw[i]==='-'||/[0-9]/.test(raw[i])){
   const token=/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?/.exec(raw.slice(i))?.[0] ?? fail("INVALID_JSON_WIRE");
   if(!token)fail('INVALID_JSON_WIRE');
   const value=Number(token);
   if(!Number.isFinite(value)||JSON.stringify(value)!==token||(Number.isInteger(value)&&!Number.isSafeInteger(value)))fail('LOSSLESS_JSON_NUMBER_UNSUPPORTED');
   i+=token.length;
  }else i++;
 }
 let parsed:JsonValue;
 try{parsed=JSON.parse(raw) as JsonValue;canonicalOwnershipJson(parsed);}catch{fail('INVALID_JSON_WIRE');}
 return parsed!;
}
export function decodeMigrationWireValue(type:string,raw:string|null):JsonValue {
 const allowed=['text','date','time','smallint','timestamptz','integer','jsonb','boolean','uuid','text[]','char(64)','numeric(5,2)','bigint','timestamp','char(32)'];
 if(!allowed.includes(type))fail('UNSUPPORTED_SOURCE_TYPE');
 if(raw===null)return null;
 if(typeof raw!=='string')fail('INVALID_WIRE_FORMAT');
 if(type==='smallint'||type==='integer'){
  if(!/^-?(0|[1-9][0-9]*)$/.test(raw))fail('INVALID_INTEGER_WIRE');
  const value=Number(raw),limit=type==='smallint'?32768:2147483648;
  if(!Number.isSafeInteger(value)||value < -limit||value>=limit)fail('INVALID_INTEGER_WIRE');
  return value;
 }
 if(type==='bigint'){
  if(!/^-?(0|[1-9][0-9]*)$/.test(raw)||raw==='-0')fail('INVALID_BIGINT_WIRE');
  const negative=raw[0]==='-',digits=negative?raw.slice(1):raw,limit=negative?'9223372036854775808':'9223372036854775807';
  if(digits.length>limit.length||(digits.length===limit.length&&digits>limit))fail('INVALID_BIGINT_WIRE');
  return raw;
 }
 if(type==='numeric(5,2)'){
  if(!/^-?[0-9]+\.[0-9]{2}$/.test(raw))fail('UNSUPPORTED_NUMERIC_WIRE');
  return raw;
 }
 if(type==='boolean'){if(raw!=='t'&&raw!=='f')fail('INVALID_BOOLEAN_WIRE');return raw==='t';}
 if(type==='jsonb')return parseLosslessJson(raw);
 if(type==='text[]'){
  const value=parseLosslessJson(raw);
  if(!Array.isArray(value)||value.some(v=>v!==null&&typeof v!=='string'))fail('UNSUPPORTED_ARRAY_VALUE');
  return value;
 }
 return raw;
}
async function raw(client:Client,text:string,values:unknown[]=[]):Promise<QueryResult<string[]>>{
 return client.query<string[]>({text,values,rowMode:'array',types:wireTypes});
}
async function jsonQuery(client:Client,query:string):Promise<JsonValue>{
 const result=await raw(client,"SELECT COALESCE(jsonb_agg(to_jsonb(q)),'[]'::jsonb)::text FROM ("+query+") q");
 if(result.rows.length!==1||result.rows[0].length!==1||result.rows[0][0]===null)fail('INCOMPLETE_CATALOG');
 return parseLosslessJson(result.rows[0][0]);
}
const scope="n.nspname IN('public','nevora_tenancy')";
const enforced="CASE WHEN current_setting('server_version_num')::int>=180000 THEN (to_jsonb(p)->>'conenforced')::boolean WHEN current_setting('server_version_num')::int BETWEEN 170000 AND 179999 THEN true ELSE NULL END";
const catalogQueries={
 relations:"SELECT n.nspname schema,c.relname name,c.relkind kind,c.relrowsecurity rls,c.relforcerowsecurity force_rls,c.relreplident replica_identity,c.relacl::text acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE "+scope+" AND c.relkind IN('r','p','v','m','f','S') ORDER BY n.nspname,c.relname",
 columns:"SELECT n.nspname schema,c.relname table_name,a.attname name,a.attnum ordinal,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,pg_get_expr(d.adbin,d.adrelid) default_value,a.attidentity identity,a.attgenerated generated,a.attcollation::text collation_oid,a.attacl::text acl FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE "+scope+" AND c.relkind IN('r','p','v','m','f') AND a.attnum>0 AND NOT a.attisdropped ORDER BY n.nspname,c.relname,a.attnum",
 constraints:"SELECT n.nspname schema,c.relname table_name,p.conname name,p.contype type,pg_get_constraintdef(p.oid,true) definition,p.convalidated validated,p.condeferrable deferrable,p.condeferred deferred,"+enforced+" enforced FROM pg_constraint p JOIN pg_class c ON c.oid=p.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE "+scope+" AND p.contype<>'n' ORDER BY n.nspname,c.relname,p.conname",
 not_null:"SELECT n.nspname schema,c.relname table_name,a.attname name,CASE WHEN current_setting('server_version_num')::int>=180000 THEN p.convalidated ELSE true END validated,"+enforced+" enforced,CASE WHEN current_setting('server_version_num')::int>=180000 THEN p.condeferrable ELSE false END deferrable,CASE WHEN current_setting('server_version_num')::int>=180000 THEN p.condeferred ELSE false END deferred FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_constraint p ON p.conrelid=c.oid AND p.contype='n' AND p.conkey=ARRAY[a.attnum]::smallint[] WHERE "+scope+" AND c.relkind IN('r','p') AND a.attnum>0 AND NOT a.attisdropped AND a.attnotnull ORDER BY n.nspname,c.relname,a.attnum",
 indexes:"SELECT n.nspname schema,c.relname table_name,x.relname name,pg_get_indexdef(i.indexrelid) definition,i.indisunique unique,i.indisvalid valid,i.indisready ready,i.indislive live,i.indimmediate immediate,i.indnullsnotdistinct nulls_not_distinct,i.indcollation::text collations,i.indclass::text opclasses FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE "+scope+" ORDER BY n.nspname,c.relname,x.relname",
 triggers:"SELECT n.nspname schema,c.relname table_name,t.tgname name,t.tgenabled enabled,t.tgisinternal internal,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE "+scope+" ORDER BY n.nspname,c.relname,t.tgname",
 functions:"SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition,p.prosecdef security_definer,p.proconfig::text configuration,p.proacl::text acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE "+scope+" AND p.prokind IN('f','p') ORDER BY n.nspname,p.proname,arguments",
 views:"SELECT schemaname schema,viewname name,definition FROM pg_views WHERE schemaname IN('public','nevora_tenancy') ORDER BY schemaname,viewname",
 schemas:"SELECT n.nspname name,n.nspacl::text acl FROM pg_namespace n WHERE "+scope+" ORDER BY n.nspname",
};
/** Observation only: root must bind/approve the exact source-generated expanded
 * catalog baseline externally under exactly search_path=pg_catalog. Calling
 * this does not approve that baseline,
 * authenticate an operator, or make PG18 rendering portable to PG17. */
export async function observeMigrationCatalog(client:Client):Promise<{catalog:JsonValue;digest:string}>{
 if((await raw(client,"SELECT current_setting('search_path')")).rows[0]?.[0]!=='pg_catalog')fail('CATALOG_RENDERING_CONTEXT_REQUIRED');
 const catalog:Record<string,JsonValue>={};
 const version=(await raw(client,"SELECT current_setting('server_version_num')")).rows[0]?.[0];
 if(!version||!/^1[78][0-9]{4}$/.test(version))fail('UNSUPPORTED_DATABASE_VERSION');
 for(const[key,query]of Object.entries(catalogQueries))catalog[key]=await jsonQuery(client,query);
 return {catalog,digest:ownershipDigest(catalog)};
}
const contracts=[
 {id:'employees.email_ci',table:'employees',column:'email',index:'employees_email_unique',path:'db/migrations/0001_initial.sql',line:31,expression:'lower(email)',predicate:'(email IS NOT NULL)',definition:'CREATE UNIQUE INDEX employees_email_unique ON public.employees USING btree (lower(email)) WHERE (email IS NOT NULL)'},
 {id:'positions.name_ci',table:'positions',column:'name',index:'positions_workspace_name_unique',path:'db/migrations/0008_workspace_positions.sql',line:42,expression:'lower(name)',predicate:null,definition:'CREATE UNIQUE INDEX positions_workspace_name_unique ON public.positions USING btree (workspace_id, lower(name))'},
 {id:'clocker_break_types.name_ci',table:'clocker_break_types',column:'name',index:'clocker_break_type_name',path:'db/migrations/0014_clocker_breaks.sql',line:16,expression:'lower(name)',predicate:null,definition:'CREATE UNIQUE INDEX clocker_break_type_name ON public.clocker_break_types USING btree (workspace_id, lower(name))'},
 {id:'schedule_templates.active_name_ci',table:'schedule_templates',column:'name',index:'schedule_templates_name_unique',path:'db/migrations/0003_schedule_assistance.sql',line:91,expression:'lower(name)',predicate:'(active = true)',definition:'CREATE UNIQUE INDEX schedule_templates_name_unique ON public.schedule_templates USING btree (lower(name)) WHERE (active = true)'},
] as const;
async function collation(client:Client,oid:string):Promise<DatabaseCollationCapture>{
 if(!/^[1-9][0-9]*$/.test(oid))fail('UNSUPPORTED_COLLATION');
 const r=await raw(client,"SELECT c.oid::text,n.nspname,c.collname,c.collprovider,c.collisdeterministic::text,c.collencoding::text,c.collcollate,c.collctype,COALESCE(to_jsonb(c)->>'colllocale',to_jsonb(c)->>'colliculocale'),c.collversion,pg_collation_actual_version(c.oid) FROM pg_collation c JOIN pg_namespace n ON n.oid=c.collnamespace WHERE c.oid=$1::oid",[oid]);
 if(r.rows.length!==1)fail('INCOMPLETE_COLLATION');
 const [id,schema,name,provider,deterministic,encoding,lcCollate,lcCtype,locale,version,actualVersion]=r.rows[0];
 if(deterministic!=='true'&&deterministic!=='false')fail('INCOMPLETE_COLLATION');
 if(!['d','c','i','b'].includes(provider)||!Number.isSafeInteger(Number(encoding)))fail('UNSUPPORTED_COLLATION');
 if(version!==actualVersion)fail('COLLATION_VERSION_DRIFT');
 return {oid:id,schema,name,provider,deterministic:deterministic==='true',encoding:Number(encoding),lcCollate,lcCtype,locale,version,actualVersion};
}
async function namespaces(client:Client,request:MigrationCaptureRequest,tables:TableCapture[],schemaDigest:string,snapshotId:string,serverVersion:string,serverEncoding:string):Promise<DatabaseNamespaceComparators>{
 const catalogs:DatabaseComparatorCatalog[]=[],rows:DatabaseComparatorRow[]=[];
 for(const contract of contracts){
  const r=await raw(client,"SELECT pg_get_indexdef(i.indexrelid),pg_get_expr(i.indexprs,i.indrelid),pg_get_expr(i.indpred,i.indrelid),a.attcollation::text,i.indcollation[(i.indnkeyatts-1)]::text,i.indisunique::text,i.indisvalid::text,i.indisready::text,i.indislive::text,am.amname FROM pg_index i JOIN pg_class x ON x.oid=i.indexrelid JOIN pg_namespace n ON n.oid=x.relnamespace JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attname=$2 JOIN pg_am am ON am.oid=x.relam WHERE n.nspname='public' AND x.relname=$1 AND i.indrelid=$3::regclass",[contract.index,contract.column,'public.'+contract.table]);
  if(r.rows.length!==1)fail('NAMESPACE_CATALOG_DRIFT');
  const [indexDefinition,expression,predicate,inputOid,indexOid,...flags]=r.rows[0];
  if(indexDefinition!==contract.definition||expression!==contract.expression||predicate!==contract.predicate||!same(flags,['true','true','true','true','btree']))fail('NAMESPACE_CATALOG_DRIFT');
  const expressionCollation=await collation(client,inputOid),indexCollation=await collation(client,indexOid);
  const source=request.migrations.find(s=>s.path===contract.path)!.text.split('\n').slice(contract.line-1).join('\n');
  const part=lexSql(source).parts.find(p=>p.kind==='statement');
  if(!part?.terminated||part.leadingKeyword!=='CREATE')fail('SOURCE_STATEMENT_DRIFT');
  const catalogValue={contractId:contract.id,source:{path:contract.path,line:contract.line},sourceStatementChecksum:ownershipDigest(part!.text),definition:{indexDefinition,expression,predicate,expressionCollation,indexCollation,serverVersion,serverEncoding}};
  catalogs.push({...catalogValue,checksum:ownershipDigest(catalogValue)});
  // Equality/rank is calculated by PostgreSQL using the actual index collation,
  // over the complete namespace; never JS lowercase, locale or tenant grouping.
  const predicateSql=contract.predicate??'true';
  const rule=getOwnershipRegistry().tables.find(t=>t.table===contract.table)!;
  const keys=rule.primaryKey.map(ident).join(',');
  const compared=expression+' COLLATE '+ident(indexCollation.schema)+'.'+ident(indexCollation.name);
  const results=await raw(client,'SELECT '+keys+',('+predicateSql+')::text,'+expression+',CASE WHEN '+predicateSql+' THEN dense_rank() OVER (ORDER BY CASE WHEN '+predicateSql+' THEN '+compared+' END)::text ELSE NULL END FROM public.'+ident(contract.table));
  const captured=tables.find(t=>t.table===contract.table)!;
  if(results.rows.length!==captured.rows.length)fail('INCOMPLETE_NAMESPACE_ROWS');
  const seen=new Set<string>();
  for(const result of results.rows){
   const key=rule.primaryKey.map((k,i)=>decodeMigrationWireValue(rule.columns.find(c=>c.name===k)!.type,result[i]));
   const identity=canonicalOwnershipJson(key),legacy=captured.rows.find(row=>same(rule.primaryKey.map(k=>row.values[k]),key));
   if(seen.has(identity)||!legacy)fail('NAMESPACE_ROW_DRIFT');
   seen.add(identity);
   const [included,expressionValue,comparisonClass]=result.slice(key.length);
   if(included!=='true'&&included!=='false')fail('NAMESPACE_ROW_DRIFT');
   rows.push({contractId:contract.id,key,rowChecksum:legacy!.originalChecksum,included:included==='true',expressionValue,comparisonClass});
  }
 }
 catalogs.sort((a,b)=>order(a.contractId,b.contractId));
 rows.sort((a,b)=>order(canonicalOwnershipJson([a.contractId,a.key]),canonicalOwnershipJson([b.contractId,b.key])));
 const binding={registryDigest:getOwnershipRegistry().digest,sourceDigest:request.sourceDigest,schemaDigest,snapshotId,rowSetChecksum:ownershipDigest(tables.map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum})))};
 return {binding,catalogs,rows,captureChecksum:ownershipDigest({binding,catalogs,rows})};
}
function checkCatalog(catalog:JsonValue):void{
 const value=catalog as Record<string,JsonValue>;
 const columns=value.columns as Array<Record<string,JsonValue>>,triggers=value.triggers as Array<Record<string,JsonValue>>;
 const relations=value.relations as Array<Record<string,JsonValue>>;
 const alias:Record<string,string>={timestamptz:'timestamp with time zone',timestamp:'timestamp without time zone',time:'time without time zone','char(64)':'character(64)','char(32)':'character(32)'};
 for(const table of getOwnershipRegistry().tables){
  const relation=relations.find(r=>r.schema==='public'&&r.name===table.table);
  // Expanded baseline has no RLS yet. Reject even forced/bypassed source RLS;
  // later cutover requires a separately reviewed capture contract.
  if(!relation||relation.kind!=='r'||relation.rls!==false||relation.force_rls!==false)fail('SOURCE_RELATION_DRIFT');
  for(const column of table.columns){
   const actual=columns.find(c=>c.schema==='public'&&c.table_name===table.table&&c.name===column.name);
   if(!actual||actual.type!==(alias[column.type]??column.type)||actual.not_null!==!column.nullable)fail('SOURCE_COLUMN_DRIFT');
  }
  for(const name of ['f10_write_fence','f10_identity_guard']){
   const trigger=triggers.find(t=>t.schema==='public'&&t.table_name===table.table&&t.name===name);
   if(!trigger||trigger.enabled!=='O')fail('SOURCE_FENCE_DRIFT');
  }
 }
 for(const state of value.not_null as Array<Record<string,JsonValue>>)if(state.validated!==true||state.enforced!==true||state.deferrable!==false||state.deferred!==false)fail('NOT_NULL_SECURITY_DRIFT');
}
/** Privileged, explicitly owned LOCAL client only; never getDb/runtime executor.
 * The source-generated catalog baseline is separately controlled root evidence,
 * not proof of operator authorization. Caller exclusively owns the idle Client.
 * On success COMMIT leaves FENCED with actor/manifest NULL. No row attribution,
 * payload lineage, installation mapping or backfill execution is performed. */
export async function captureTenantMigrationFacts(client:Client,request:MigrationCaptureRequest):Promise<MigrationCaptureOutcome>{
 let began=false;
 if(active.has(client))return {status:'BLOCKED',code:'CLIENT_ALREADY_IN_USE'};
 active.add(client);
 try{
  canonicalOwnershipJson(request);
  const registry=getOwnershipRegistry(),b=request.catalogBaseline,i=request.identity;
  if(verifyOwnershipSource(request.migrations).length||!SHA.test(request.sourceDigest)||b.sourceDigest!==request.sourceDigest||b.registryDigest!==registry.digest||b.expansionSha256!==expansionSha256||!SHA.test(b.catalogDigest)||!UINT.test(request.expectedFenceGeneration))fail('SOURCE_BINDING_DRIFT');
  if(client.getTransactionStatus()!=='I')fail('CLIENT_NOT_IDLE');
  const outside=await raw(client,"SELECT current_database(),(SELECT oid::text FROM pg_database WHERE datname=current_database()),shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database'),(SELECT system_identifier::text FROM pg_control_system()),current_setting('data_directory'),session_user::text,current_user::text,host(inet_server_addr()),inet_server_port()::text,current_setting('server_version'),current_setting('server_encoding'),current_setting('session_replication_role')");
  const observation=outside.rows[0];
  if(outside.rows.length!==1||!same(observation.slice(0,6),[i.database,i.databaseOid,i.marker,i.systemIdentifier,i.dataDirectory,i.role])||observation[6]!==i.role||observation[7]!=='127.0.0.1'||observation[8]!==String(i.port)||observation[11]!=='origin'||!i.marker.startsWith('f10-owned:'))fail('OWNED_DATABASE_IDENTITY_DRIFT');
  if(client.getTransactionStatus()!=='I')fail('CLIENT_NOT_IDLE');
  await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');began=true;
  await client.query("SET LOCAL search_path=pg_catalog; SET LOCAL row_security=off; SET LOCAL DateStyle='ISO, YMD'; SET LOCAL TimeZone='UTC'; SET LOCAL lock_timeout='5000ms'; SET LOCAL statement_timeout='15000ms'");
  const locked=[...registry.tables.map(t=>t.table),...registry.tables.filter(t=>t.sidecar).map(t=>t.sidecar!)].sort(order);
  // Source table locks FIRST. A legacy statement already holds ROW EXCLUSIVE
  // before its protocol FOR SHARE trigger. Protocol-first would deadlock it.
  // No MVCC SELECT is issued inside SERIALIZABLE until these locks complete.
  await client.query('LOCK TABLE '+locked.map(t=>'public.'+ident(t)).join(',')+' IN SHARE MODE');
  const protocol=(await raw(client,"SELECT phase,fence_generation::text,backfill_actor::text,capture_manifest_sha256,schema_source_commit,registry_sha256 FROM nevora_tenancy.expansion_protocol WHERE migration_id=26 FOR UPDATE")).rows;
  if(protocol.length!==1||!['EXPANDED_LEGACY','FENCED'].includes(protocol[0][0])||protocol[0][1]!==request.expectedFenceGeneration||protocol[0][2]!==null||protocol[0][3]!==null||protocol[0][4]!==OWNERSHIP_SCHEMA_COMMIT||protocol[0][5]!==registry.digest)fail('FENCE_PROTOCOL_DRIFT');
  const installed=(await raw(client,'SELECT path,source_sha256 FROM nevora_tenancy.source_migration_contract ORDER BY path')).rows;
  if(!same(installed,OWNERSHIP_SOURCE.map(s=>[s.path,s.sha256])))fail('INSTALLED_SOURCE_DRIFT');
  const owned=await jsonQuery(client,'SELECT table_name,storage,anchor,primary_key_columns,sidecar_name,mirror_columns,original_columns,source_path,source_line FROM nevora_tenancy.owned_table_contract ORDER BY table_name');
  const expected=registry.tables.map(t=>({table_name:t.table,storage:t.storage,anchor:t.anchor,primary_key_columns:t.primaryKey,sidecar_name:t.sidecar,mirror_columns:t.mirroredIdentityColumns,original_columns:t.columns.map(c=>c.name),source_path:t.source.path,source_line:t.source.line}));
  if(!same(owned,expected))fail('INSTALLED_REGISTRY_DRIFT');
  const observed=await observeMigrationCatalog(client);
  checkCatalog(observed.catalog);
  if(observed.digest!==b.catalogDigest)fail('CATALOG_BASELINE_DRIFT');
  const transition=(await raw(client,"UPDATE nevora_tenancy.expansion_protocol SET phase='FENCED',fence_generation=fence_generation+1 WHERE migration_id=26 RETURNING fence_generation::text")).rows;
  if(transition.length!==1)fail('FENCE_PROTOCOL_DRIFT');
  const snapshotId=(await raw(client,'SELECT pg_current_snapshot()::text')).rows[0]?.[0];
  if(!snapshotId)fail('SNAPSHOT_REQUIRED');
  const tables:TableCapture[]=[],wireRows:JsonValue[]=[];
  const catalogColumns=(observed.catalog as Record<string,JsonValue>).columns as Array<Record<string,JsonValue>>;
  for(const table of registry.tables){
   const arrays=table.columns.filter(c=>c.type==='text[]');
   if(arrays.length){
    const invalid=arrays.map(c=>'('+ident(c.name)+' IS NOT NULL AND COALESCE(array_ndims('+ident(c.name)+'),1)<>1 OR COALESCE(array_lower('+ident(c.name)+',1),1)<>1)').join(' OR ');
    if((await raw(client,'SELECT 1 FROM public.'+ident(table.table)+' WHERE '+invalid+' LIMIT 1')).rowCount)fail('UNSUPPORTED_ARRAY_DIMENSIONS');
   }
   const columns=table.columns.map(c=>c.type==='text[]'?'to_jsonb('+ident(c.name)+')::text AS '+ident(c.name):ident(c.name)).join(',');
   const result=await raw(client,'SELECT '+columns+' FROM public.'+ident(table.table));
   if(result.fields.length!==table.columns.length||result.fields.some((f,index)=>f.name!==table.columns[index].name||f.format!=='text'||f.dataTypeID!==wireOids[table.columns[index].type]))fail('INCOMPLETE_ROW_FIELDS');
   const rows=result.rows.map(values=>{
    if(values.length!==table.columns.length)fail('INCOMPLETE_ROW_FIELDS');
    const row:Record<string,JsonValue>={};
    table.columns.forEach((column,index)=>{
     if(values[index]===null&&!column.nullable)fail('SOURCE_NULLABILITY_DRIFT');
     if(column.type==='jsonb'&&values[index]==='null')fail('SQL_JSON_NULL_REPRESENTATION_UNSUPPORTED');
     const actual=catalogColumns.find(c=>c.schema==='public'&&c.table_name===table.table&&c.name===column.name);
     if(!actual)fail('SOURCE_COLUMN_DRIFT');
     row[column.name]=decodeMigrationWireValue(column.type,values[index]);
    });
    const originalChecksum=ownershipDigest(row),key=table.primaryKey.map(k=>row[k]);
    wireRows.push({table:table.table,key,values,originalChecksum,wireChecksum:ownershipDigest(values)});
    return {values:row,originalChecksum};
   });
   rows.sort((a,b)=>order(canonicalOwnershipJson(table.primaryKey.map(k=>a.values[k])),canonicalOwnershipJson(table.primaryKey.map(k=>b.values[k]))));
   const keys=rows.map(r=>canonicalOwnershipJson(table.primaryKey.map(k=>r.values[k])));
   if(new Set(keys).size!==keys.length)fail('DUPLICATE_CAPTURE_KEY');
   tables.push({table:table.table,rows,expectedCount:rows.length,expectedChecksum:ownershipDigest(rows.map(r=>({key:table.primaryKey.map(k=>r.values[k]),checksum:r.originalChecksum})))});
  }
  wireRows.sort((a,b)=>order(canonicalOwnershipJson([(a as Record<string,JsonValue>).table,(a as Record<string,JsonValue>).key]),canonicalOwnershipJson([(b as Record<string,JsonValue>).table,(b as Record<string,JsonValue>).key])));
  const namespaceComparators=await namespaces(client,request,tables,observed.digest,snapshotId,observation[9],observation[10]);
  if((await observeMigrationCatalog(client)).digest!==observed.digest)fail('CATALOG_CHANGED_DURING_CAPTURE');
  const facts={sourceDigest:request.sourceDigest,registryDigest:registry.digest,currentSchemaDigest:observed.digest,snapshot:{id:snapshotId,isolation:'SERIALIZABLE' as const,includesInactive:true as const,includesHistory:true as const},tables,namespaceComparators,wireRows,fence:{phase:'FENCED' as const,generation:transition[0][0],actor:null,manifest:null},catalog:observed.catalog,verification:'OWNED_LOCAL_DATABASE_FACTS_NOT_BACKFILL_AUTHORITY' as const};
  const factsDigest=ownershipDigest(facts);
  await client.query('COMMIT');began=false;
  return {status:'CAPTURED',facts:{...facts,factsDigest}};
 }catch(error){
  if(began){try{await client.query('ROLLBACK');}catch{return {status:'BLOCKED',code:'CAPTURE_ROLLBACK_UNCONFIRMED'};}}
  return {status:'BLOCKED',code:error instanceof CaptureFailure?error.code:'CAPTURE_FAILED'};
 }finally{active.delete(client);}
}
