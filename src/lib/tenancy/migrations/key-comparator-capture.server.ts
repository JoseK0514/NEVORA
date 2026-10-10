// CONTROLLED_INSTALLER_IMPORT_ADDITION_BEGIN
import {isIssuedTypedTenantBackfillPlan,type TypedTenantBackfillPlan} from './typed-backfill';
import {isIssuedTypedKeyComparatorObservations} from './typed-key-comparators';
import {isControlledEnrollmentInstallerExecution,assertControlledEnrollmentInstallerExecution,isEmployeeNumberEnrollmentBindingFailure,type EmployeeNumberInstallerExecutionWitness} from './employee-number-enrollment-binding.server';
// CONTROLLED_INSTALLER_IMPORT_ADDITION_END
import type {Client,QueryResult} from 'pg';
import {types as utilTypes} from 'node:util';
import {canonicalOwnershipJson as canonical,ownershipDigest as digest,getOwnershipRegistry,verifyOwnershipSource,OWNERSHIP_SOURCE,OWNERSHIP_SCHEMA_COMMIT,type JsonValue} from './ownership';
import {observeMigrationCatalog,type TypedMigrationCaptureFacts,type MigrationCaptureRequest} from './capture.server';
import {inspectTypedMigrationSnapshot} from './typed-snapshot';
import {isIssuedTypedMigrationWireValue} from './typed-wire';
import {getTypedKeyComparatorContracts,getTypedKeyComparatorStockDescriptors,type TypedKeyComparatorCapture,type TypedKeyComparatorCatalog,type TypedKeyComparatorContract,type TypedKeyComparatorComponent,type TypedKeyOperatorCapture,type TypedKeyOpclassCapture,type TypedKeyDatabaseCollationCapture,type TypedKeyCollationCapture,type TypedKeySupportCapture} from './typed-key-comparators';

export type KeyComparatorCaptureCode='KEY_COMPARATOR_TRANSACTION_REQUIRED'|'KEY_COMPARATOR_LOCKS_REQUIRED'|'KEY_COMPARATOR_CLIENT_IN_USE'|'KEY_COMPARATOR_INVALID_FACTS'|'KEY_COMPARATOR_REQUEST_DRIFT'|'KEY_COMPARATOR_IDENTITY_DRIFT'|'KEY_COMPARATOR_FENCE_DRIFT'|'KEY_COMPARATOR_SOURCE_DRIFT'|'KEY_COMPARATOR_CATALOG_DRIFT'|'KEY_COMPARATOR_DATABASE_COLLATION_DRIFT'|'KEY_COMPARATOR_CONSTRAINT_DRIFT'|'KEY_COMPARATOR_INDEX_DRIFT'|'KEY_COMPARATOR_TYPE_DRIFT'|'KEY_COMPARATOR_OPCLASS_DRIFT'|'KEY_COMPARATOR_OPERATOR_DRIFT'|'KEY_COMPARATOR_SUPPORT_DRIFT'|'KEY_COMPARATOR_COLLATION_DRIFT'|'KEY_COMPARATOR_ROW_DRIFT'|'KEY_COMPARATOR_READ_FAILED';
export type KeyComparatorCaptureFailure=Readonly<Error&{code:KeyComparatorCaptureCode}>;
const failures=new WeakSet<object>(),active=new WeakSet<Client>();
class ClosedFailure extends Error{constructor(readonly code:KeyComparatorCaptureCode){super(code);failures.add(this);Object.freeze(this);}}
/** Trap-free local error provenance. Untrusted messages/codes/clones never qualify. */
export function isKeyComparatorCaptureFailure(value:unknown):value is KeyComparatorCaptureFailure{return typeof value==='object'&&value!==null&&failures.has(value);}
function fail(code:KeyComparatorCaptureCode):never{throw new ClosedFailure(code);}
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
const order=(a:string,b:string)=>a<b?-1:a>b?1:0;
const identifier=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
const registry=getOwnershipRegistry(),contracts=getTypedKeyComparatorContracts(),stock=getTypedKeyComparatorStockDescriptors();
const SHA=/^[a-f0-9]{64}$/,UINT=/^(0|[1-9][0-9]*)$/,OID=/^[1-9][0-9]*$/;
const wireTypes={getTypeParser:()=>((value:string)=>value)};
const wireOids:Record<string,number>={text:25,date:1082,time:1083,smallint:21,timestamptz:1184,integer:23,jsonb:3802,boolean:16,uuid:2950,'text[]':1009,'char(64)':1042,'numeric(5,2)':1700,bigint:20,timestamp:1114,'char(32)':1042};
function freeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const d of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in d)freeze(d.value);Object.freeze(value);}return value;}
async function raw(client:Client,text:string,values:unknown[]=[]):Promise<QueryResult<(string|null)[]>>{if(client.getTransactionStatus()!=='T')fail('KEY_COMPARATOR_TRANSACTION_REQUIRED');const result=await client.query<(string|null)[]>({text,values,rowMode:'array',types:wireTypes});if(client.getTransactionStatus()!=='T')fail('KEY_COMPARATOR_TRANSACTION_REQUIRED');return result;}
function one(result:QueryResult<(string|null)[]>,length:number,code:KeyComparatorCaptureCode):(string|null)[]{if(result.rows.length!==1||result.rows[0].length!==length||result.rows[0].some(v=>v!==null&&typeof v!=='string'))fail(code);return result.rows[0];}
function strings(text:string|null,code:KeyComparatorCaptureCode):string[]{try{const v=JSON.parse(text!);if(!Array.isArray(v)||v.some(s=>typeof s!=='string'))fail(code);return v;}catch{fail(code);}}
function vector(text:string|null,count:number,code:KeyComparatorCaptureCode):string[]{const v=text?.split(' ')??[];if(v.length!==count||v.some(n=>!UINT.test(n)))fail(code);return v;}
function small(text:string|null,code:KeyComparatorCaptureCode):number{if(text===null||!/^(-1|0|[1-9][0-9]*)$/.test(text))fail(code);const n=Number(text);if(!Number.isSafeInteger(n))fail(code);return n;}

async function identity(client:Client,request:MigrationCaptureRequest,facts:TypedMigrationCaptureFacts){
 const r=one(await raw(client,`/* F10_KEY_IDENTITY */ SELECT pg_catalog.current_database(),(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()),pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()),'pg_database'),(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),pg_catalog.current_setting('data_directory'),session_user::text,current_user::text,pg_catalog.host(pg_catalog.inet_server_addr()),pg_catalog.inet_server_port()::text,pg_catalog.current_setting('server_version'),pg_catalog.current_setting('server_encoding'),pg_catalog.current_setting('session_replication_role'),pg_catalog.current_setting('search_path'),pg_catalog.current_setting('transaction_isolation'),pg_catalog.current_setting('row_security'),pg_catalog.current_setting('DateStyle'),pg_catalog.current_setting('TimeZone'),SYSTEM_USER::text,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()),(SELECT oid::text FROM pg_catalog.pg_roles WHERE rolname=session_user),pg_catalog.current_setting('role'),pg_catalog.pg_current_snapshot()::text`),22,'KEY_COMPARATOR_IDENTITY_DRIFT');
 const i=request.identity;
 if(!same(r.slice(0,9),[i.database,i.databaseOid,i.marker,i.systemIdentifier,i.dataDirectory,i.role,i.role,'127.0.0.1',String(i.port)])||!r[9]||!/^1[78]\./.test(r[9])||r[10]!=='UTF8'||!same(r.slice(11,18),['origin','pg_catalog','serializable','off','ISO, YMD','UTC','scram-sha-256:'+i.role])||!r[18]||!OID.test(r[18])||r[18]!==r[19]||r[20]!=='none'||r[21]!==facts.snapshot.id)fail('KEY_COMPARATOR_IDENTITY_DRIFT');
 return r[9];
}
async function fence(client:Client,facts:TypedMigrationCaptureFacts,expected:Readonly<{actor:string|null;manifest:string|null}>={actor:null,manifest:null}){const r=one(await raw(client,'/* F10_KEY_PROTOCOL */ SELECT phase,fence_generation::text,backfill_actor::text,capture_manifest_sha256,schema_source_commit,registry_sha256 FROM nevora_tenancy.expansion_protocol WHERE migration_id=26'),6,'KEY_COMPARATOR_FENCE_DRIFT');if(!same(r,['FENCED',facts.fence.generation,expected.actor,expected.manifest,OWNERSHIP_SCHEMA_COMMIT,registry.digest]))fail('KEY_COMPARATOR_FENCE_DRIFT');}
async function databaseCollation(client:Client,databaseOid:string):Promise<TypedKeyDatabaseCollationCapture>{
 const r=one(await raw(client,"/* F10_KEY_DATABASE_COLLATION */ SELECT datlocprovider::text,encoding::text,datcollate,datctype,datlocale,daticurules,datcollversion,pg_catalog.pg_database_collation_actual_version(oid) FROM pg_catalog.pg_database WHERE oid=$1::oid",[databaseOid]),8,'KEY_COMPARATOR_DATABASE_COLLATION_DRIFT');
 if(!['b','c','i'].includes(r[0]!)||r[1]!=='6'||!r[2]||!r[3]||r[6]!==r[7]||((r[0]==='b'||r[0]==='i')&&(!r[4]||r[2]===''||r[3]===''))||(r[0]!=='i'&&r[5]!==null)||(r[0]==='c'&&r[4]!==null))fail('KEY_COMPARATOR_DATABASE_COLLATION_DRIFT');
 return {provider:r[0] as TypedKeyDatabaseCollationCapture['provider'],encoding:6,lcCollate:r[2],lcCtype:r[3],locale:r[4],icuRules:r[5],version:r[6],actualVersion:r[7]};
}
async function collation(client:Client,oid:string):Promise<TypedKeyCollationCapture>{
 if(!OID.test(oid))fail('KEY_COMPARATOR_COLLATION_DRIFT');
 const r=one(await raw(client,"/* F10_KEY_COLLATION */ SELECT c.oid::text,n.nspname,c.collname,c.collprovider::text,c.collisdeterministic::text,c.collencoding::text,c.collcollate,c.collctype,c.colllocale,pg_catalog.to_jsonb(c)->>'collicurules',c.collversion,pg_catalog.pg_collation_actual_version(c.oid) FROM pg_catalog.pg_collation c JOIN pg_catalog.pg_namespace n ON n.oid=c.collnamespace WHERE c.oid=$1::oid",[oid]),12,'KEY_COMPARATOR_COLLATION_DRIFT');
 if(r[0]!==oid||!r[1]||!r[2]||!['b','c','d','i'].includes(r[3]!)||!['true','false'].includes(r[4]!)||!['-1','6'].includes(r[5]!)||r[10]!==r[11]||(r[3]!=='i'&&r[9]!==null))fail('KEY_COMPARATOR_COLLATION_DRIFT');
 return {oid,schema:r[1],name:r[2],provider:r[3]!,deterministic:r[4]==='true',encoding:small(r[5],'KEY_COMPARATOR_COLLATION_DRIFT'),lcCollate:r[6],lcCtype:r[7],locale:r[8],icuRules:r[9],version:r[10],actualVersion:r[11]};
}
async function operator(client:Client,family:string,type:string,strategy:1|3):Promise<TypedKeyOperatorCapture>{
 const r=one(await raw(client,`/* F10_KEY_OPERATOR */ SELECT o.oid::text,n.nspname,o.oprname,p.oid::text,pn.nspname,p.proname,l.lanname,p.provolatile::text,p.prosecdef::text,p.prosrc,o.oprleft::text,o.oprright::text,o.oprresult::text,p.proargtypes::text,p.prorettype::text,p.pronargs::text,p.prokind::text,p.proisstrict::text,o.oprkind::text,a.amoppurpose::text,a.amopmethod::text,a.amopsortfamily::text FROM pg_catalog.pg_amop a JOIN pg_catalog.pg_operator o ON o.oid=a.amopopr JOIN pg_catalog.pg_namespace n ON n.oid=o.oprnamespace JOIN pg_catalog.pg_proc p ON p.oid=o.oprcode JOIN pg_catalog.pg_namespace pn ON pn.oid=p.pronamespace JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE a.amopfamily=$1::oid AND a.amoplefttype=$2::oid AND a.amoprighttype=$2::oid AND a.amopstrategy=$3::smallint`,[family,type,strategy]),22,'KEY_COMPARATOR_OPERATOR_DRIFT');
 if(r.some(v=>typeof v!=='string')||r[8]!=='false')fail('KEY_COMPARATOR_OPERATOR_DRIFT');
 if(!same(r.slice(10,20),[type,type,'16',type+' '+type,'16','2','f','true','b','s'])||r[20]!=='403'||r[21]!=='0')fail('KEY_COMPARATOR_OPERATOR_DRIFT');
 return {operatorOid:r[0]!,operatorSchema:r[1]!,operatorName:r[2]!,functionOid:r[3]!,functionSchema:r[4]!,functionName:r[5]!,language:r[6]!,volatility:r[7]!,securityDefiner:false,source:r[9]!};
}
async function support(client:Client,family:string,type:string):Promise<TypedKeySupportCapture[]>{
 const result=await raw(client,`/* F10_KEY_SUPPORT */ SELECT a.amprocnum::text,p.oid::text,n.nspname,p.proname,l.lanname,p.provolatile::text,p.prosecdef::text,p.prosrc,p.proargtypes::text,p.prorettype::text,p.prokind::text FROM pg_catalog.pg_amproc a JOIN pg_catalog.pg_proc p ON p.oid=a.amproc JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace JOIN pg_catalog.pg_language l ON l.oid=p.prolang WHERE a.amprocfamily=$1::oid AND a.amproclefttype=$2::oid AND a.amprocrighttype=$2::oid AND a.amprocnum IN (1,2) ORDER BY a.amprocnum`,[family,type]);
 return result.rows.map(r=>{if(r.length!==11||r.some(v=>typeof v!=='string')||!['1','2'].includes(r[0]!)||r[6]!=='false'||r[10]!=='f')fail('KEY_COMPARATOR_SUPPORT_DRIFT');return {number:Number(r[0]) as 1|2,functionOid:r[1]!,functionSchema:r[2]!,functionName:r[3]!,language:r[4]!,volatility:r[5]!,securityDefiner:false,source:r[7]!,argumentTypeOids:r[8]!.split(' '),resultTypeOid:r[9]!,kind:'f' as const};});
}
async function opclass(client:Client,oid:string,type:string):Promise<TypedKeyOpclassCapture>{
 if(!OID.test(oid))fail('KEY_COMPARATOR_OPCLASS_DRIFT');const expected=stock.find(s=>s.type===type);if(!expected)fail('KEY_COMPARATOR_TYPE_DRIFT');
 const r=one(await raw(client,`/* F10_KEY_OPCLASS */ SELECT o.oid::text,n.nspname,o.opcname,m.amname,o.opcintype::text,t.typname,fn.nspname,f.opfname,o.opcdefault::text,o.opckeytype::text,o.opcmethod::text,f.opfmethod::text,o.opcfamily::text FROM pg_catalog.pg_opclass o JOIN pg_catalog.pg_namespace n ON n.oid=o.opcnamespace JOIN pg_catalog.pg_am m ON m.oid=o.opcmethod JOIN pg_catalog.pg_type t ON t.oid=o.opcintype JOIN pg_catalog.pg_opfamily f ON f.oid=o.opcfamily JOIN pg_catalog.pg_namespace fn ON fn.oid=f.opfnamespace WHERE o.oid=$1::oid`,[oid]),13,'KEY_COMPARATOR_OPCLASS_DRIFT');
 const e=expected.opclass;if(!same(r.slice(0,12),[oid,e.schema,e.name,e.method,e.inputTypeOid,e.inputTypeName,e.familySchema,e.familyName,'true','0','403','403'])||!r[12]||!OID.test(r[12]))fail('KEY_COMPARATOR_OPCLASS_DRIFT');
 const equality=await operator(client,r[12],e.inputTypeOid,3),ordering=await operator(client,r[12],e.inputTypeOid,1);
 const observedSupport=await support(client,r[12],e.inputTypeOid);if(!same(observedSupport,e.support))fail('KEY_COMPARATOR_SUPPORT_DRIFT');
 if(!same(equality,e.equality)||!same(ordering,e.ordering))fail('KEY_COMPARATOR_OPERATOR_DRIFT');
 return {oid,schema:r[1]!,name:r[2]!,method:r[3]!,inputTypeOid:r[4]!,inputTypeName:r[5]!,familySchema:r[6]!,familyName:r[7]!,default:true,equality,ordering,support:observedSupport};
}
async function catalog(client:Client,c:TypedKeyComparatorContract):Promise<TypedKeyComparatorCatalog>{
 let indexName=c.indexName;
 if(c.kind!=='CANDIDATE'){
  const r=one(await raw(client,`/* F10_KEY_CONSTRAINT */ SELECT p.conname,p.contype::text,pg_catalog.pg_get_constraintdef(p.oid,true),(SELECT pg_catalog.json_agg(a.attname ORDER BY k.ordinal)::text FROM pg_catalog.unnest(p.conkey) WITH ORDINALITY k(num,ordinal) JOIN pg_catalog.pg_attribute a ON a.attrelid=p.conrelid AND a.attnum=k.num),x.relname,p.convalidated::text,p.condeferrable::text,p.condeferred::text,CASE WHEN pg_catalog.current_setting('server_version_num')::int>=180000 THEN pg_catalog.to_jsonb(p)->>'conenforced' ELSE 'true' END FROM pg_catalog.pg_constraint p JOIN pg_catalog.pg_class t ON t.oid=p.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace JOIN pg_catalog.pg_class x ON x.oid=p.conindid WHERE n.nspname='public' AND t.relname=$1 AND p.contype=CASE WHEN $2::text='PRIMARY_KEY' THEN 'p'::pg_catalog."char" ELSE 'u'::pg_catalog."char" END AND (SELECT pg_catalog.array_agg(a.attname::text ORDER BY k.ordinal) FROM pg_catalog.unnest(p.conkey) WITH ORDINALITY k(num,ordinal) JOIN pg_catalog.pg_attribute a ON a.attrelid=p.conrelid AND a.attnum=k.num)=$3::text[] AND ($4::text IS NULL OR p.conname=$4::text)`,[c.table,c.kind,[...c.columns],c.indexName]),9,'KEY_COMPARATOR_CONSTRAINT_DRIFT');
  if(!r[0]||r[0]!==r[4]||r[1]!== (c.kind==='PRIMARY_KEY'?'p':'u')||r[2]!==c.kind.replace('_',' ')+' ('+c.columns.join(', ')+')'||!same(strings(r[3],'KEY_COMPARATOR_CONSTRAINT_DRIFT'),c.columns)||!same(r.slice(5),['true','false','false','true']))fail('KEY_COMPARATOR_CONSTRAINT_DRIFT');indexName=r[4];
 }
 if(!indexName)fail('KEY_COMPARATOR_INDEX_DRIFT');
 const r=one(await raw(client,`/* F10_KEY_INDEX */ SELECT x.relname,pg_catalog.pg_get_indexdef(i.indexrelid),pg_catalog.pg_get_expr(i.indpred,i.indrelid),m.amname,i.indisunique::text,i.indisvalid::text,i.indisready::text,i.indislive::text,i.indimmediate::text,i.indnullsnotdistinct::text,i.indnkeyatts::text,i.indnatts::text,(SELECT pg_catalog.json_agg(a.attname ORDER BY k.ordinal)::text FROM pg_catalog.unnest(i.indkey::smallint[]) WITH ORDINALITY k(num,ordinal) JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.num),i.indkey::text,i.indcollation::text,i.indclass::text,i.indoption::text FROM pg_catalog.pg_index i JOIN pg_catalog.pg_class t ON t.oid=i.indrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace JOIN pg_catalog.pg_class x ON x.oid=i.indexrelid JOIN pg_catalog.pg_am m ON m.oid=x.relam WHERE n.nspname='public' AND t.relname=$1 AND x.relname=$2 AND i.indexprs IS NULL`,[c.table,indexName]),17,'KEY_COMPARATOR_INDEX_DRIFT');
 const length=c.indexColumns.length,definition='CREATE UNIQUE INDEX '+indexName+' ON public.'+c.table+' USING btree ('+c.indexColumns.join(', ')+')'+(c.predicate?' WHERE '+c.predicate:'');
 if(r[0]!==indexName||r[1]!==definition||r[2]!==c.predicate||!same(r.slice(3,10),['btree','true','true','true','true','true','false'])||r[10]!==String(length)||r[11]!==String(length)||!same(strings(r[12],'KEY_COMPARATOR_INDEX_DRIFT'),c.indexColumns))fail('KEY_COMPARATOR_INDEX_DRIFT');
 const keys=vector(r[13],length,'KEY_COMPARATOR_INDEX_DRIFT'),collations=vector(r[14],length,'KEY_COMPARATOR_INDEX_DRIFT'),classes=vector(r[15],length,'KEY_COMPARATOR_INDEX_DRIFT'),options=vector(r[16],length,'KEY_COMPARATOR_INDEX_DRIFT');if(keys.some(v=>v==='0')||options.some(v=>v!=='0'))fail('KEY_COMPARATOR_INDEX_DRIFT');
 const components:TypedKeyComparatorComponent[]=[];
 for(let i=0;i<c.columns.length;i++){
  const column=c.columns[i],type=registry.tables.find(t=>t.table===c.table)!.columns.find(a=>a.name===column)!.type,expected=stock.find(s=>s.type===type);if(!expected)fail('KEY_COMPARATOR_TYPE_DRIFT');
  const a=one(await raw(client,"/* F10_KEY_ATTRIBUTE */ SELECT a.atttypid::text,pg_catalog.format_type(a.atttypid,a.atttypmod),a.attcollation::text FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class t ON t.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public' AND t.relname=$1 AND a.attname=$2 AND a.attnum>0 AND NOT a.attisdropped",[c.table,column]),3,'KEY_COMPARATOR_TYPE_DRIFT'),position=c.projectedPositions[i];
  if(a[0]!==expected.typeOid||a[1]!==expected.catalogType||collations[position]!==a[2]||(expected.collatable?collations[position]==='0':collations[position]!=='0'))fail('KEY_COMPARATOR_TYPE_DRIFT');
  components.push({column,type,typeOid:a[0],collation:expected.collatable?await collation(client,collations[position]):null,opclass:await opclass(client,classes[position],type)});
 }
 const body={contractId:c.contractId,table:c.table,label:c.label,kind:c.kind,columns:[...c.columns],source:{...c.source},indexColumns:[...c.indexColumns],projectedPositions:[...c.projectedPositions],indexName,indexDefinition:r[1]!,predicate:r[2],nullsNotDistinct:false as const,components};return {...body,checksum:digest(body)};
}
async function rows(client:Client,c:TypedKeyComparatorContract,observed:TypedKeyComparatorCatalog,facts:TypedMigrationCaptureFacts){
 const rule=registry.tables.find(t=>t.table===c.table)!,captured=facts.tables.find(t=>t.table===c.table)!;
 const included='('+ (c.predicate??'true')+') AND '+c.columns.map(name=>identifier(name)+' IS NOT NULL').join(' AND ');
 const compared=observed.components.map(component=>'(CASE WHEN '+included+' THEN '+identifier(component.column)+' END)'+(component.collation?' COLLATE '+identifier(component.collation.schema)+'.'+identifier(component.collation.name):'')+' USING OPERATOR(pg_catalog.<) NULLS LAST').join(',');
 const result=await raw(client,'/* F10_KEY_ROWS '+c.contractId+' */ SELECT '+rule.columns.map(col=>identifier(col.name)).join(',')+',('+included+')::text AS included,CASE WHEN '+included+' THEN pg_catalog.dense_rank() OVER (ORDER BY '+compared+')::text ELSE NULL END AS comparison_class FROM public.'+identifier(c.table));
 if(result.fields.length!==rule.columns.length+2||result.fields.some((f,i)=>f.format!=='text'||f.name!==(i<rule.columns.length?rule.columns[i].name:i===rule.columns.length?'included':'comparison_class')||f.dataTypeID!==(i<rule.columns.length?wireOids[rule.columns[i].type]:25))||result.rows.length!==captured.rows.length)fail('KEY_COMPARATOR_ROW_DRIFT');
 const sources=new Map(captured.rows.map(r=>[canonical(r.columns.map(col=>col.wire)),r])),seen=new Set<string>();
 return result.rows.map(values=>{
  if(values.length!==rule.columns.length+2||values.some(v=>v!==null&&typeof v!=='string'))fail('KEY_COMPARATOR_ROW_DRIFT');const id=canonical(values.slice(0,rule.columns.length)),original=sources.get(id);if(!original||seen.has(id))fail('KEY_COMPARATOR_ROW_DRIFT');seen.add(id);
  const include=c.columns.every(name=>original.columns.find(col=>col.name===name)!.wire!==null)&&(!c.predicate||original.columns.find(col=>col.name==='status')!.wire==='active');
  const actual=values[rule.columns.length],comparisonClass=values[rule.columns.length+1];if(actual!==(include?'true':'false')||(include?typeof comparisonClass!=='string'||!OID.test(comparisonClass):comparisonClass!==null))fail('KEY_COMPARATOR_ROW_DRIFT');
  return {contractId:c.contractId,key:[...original.key],rowChecksum:original.originalChecksum,included:include,comparisonClass};
 });
}
/** Reject proxies before reflection/accessors before reads; typed cells retain
 * their genuine private parser provenance rather than JSON-clone reissuance. */
function detach(value:unknown,ancestors=new Set<object>()):unknown{
 if(isIssuedTypedMigrationWireValue(value))return value;
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'&&Number.isSafeInteger(value)&&!Object.is(value,-0))return value;
 if(typeof value!=='object'||value===null||utilTypes.isProxy(value)||ancestors.has(value))fail('KEY_COMPARATOR_INVALID_FACTS');
 const array=Array.isArray(value);if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))fail('KEY_COMPARATOR_INVALID_FACTS');
 const keys=Reflect.ownKeys(value),descriptors=Object.getOwnPropertyDescriptors(value);if(keys.some(k=>typeof k!=='string'))fail('KEY_COMPARATOR_INVALID_FACTS');ancestors.add(value);
 try{
  if(array){const length=descriptors.length;if(!length||!('value'in length)||!Number.isSafeInteger(length.value)||length.value<0||keys.length!==length.value+1)fail('KEY_COMPARATOR_INVALID_FACTS');const result:unknown[]=[];for(let i=0;i<length.value;i++){const d=descriptors[String(i)];if(!d||!('value'in d)||!d.enumerable)fail('KEY_COMPARATOR_INVALID_FACTS');result.push(detach(d.value,ancestors));}return result;}
  const result:Record<string,unknown>={};for(const k of keys as string[]){const d=descriptors[k];if(!d||!('value'in d)||!d.enumerable)fail('KEY_COMPARATOR_INVALID_FACTS');Object.defineProperty(result,k,{value:detach(d.value,ancestors),enumerable:true});}return result;
 }finally{ancestors.delete(value);}
}
function protocolExpectation(input:unknown,role:unknown):Readonly<{actor:string|null;manifest:string|null}>{
 if(input===undefined)return Object.freeze({actor:null,manifest:null});
 let p:unknown;try{p=detach(input);}catch{fail('KEY_COMPARATOR_REQUEST_DRIFT');}
 if(typeof p!=='object'||p===null||Array.isArray(p))fail('KEY_COMPARATOR_REQUEST_DRIFT');
 const v=p as Record<string,unknown>;if(Object.keys(v).length!==2||!Object.hasOwn(v,'manifestDigest')||!Object.hasOwn(v,'actor')||typeof v.manifestDigest!=='string'||!SHA.test(v.manifestDigest)||(v.actor!==null&&(typeof v.actor!=='string'||v.actor!==role)))fail('KEY_COMPARATOR_REQUEST_DRIFT');
 return Object.freeze({actor:v.actor as string|null,manifest:v.manifestDigest});
}
async function sourceLocks(client:Client){
 const names=[...registry.tables.map(t=>t.table),...registry.tables.flatMap(t=>t.sidecar?[t.sidecar]:[])].sort(order);
 const result=await raw(client,`/* F10_KEY_RECHECK_LOCKS */ SELECT c.relname::text,l.mode,l.granted::text,c.oid::text FROM pg_catalog.pg_locks l JOIN pg_catalog.pg_class c ON c.oid=l.relation JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE l.locktype='relation' AND l.pid=pg_catalog.pg_backend_pid() AND l.database=(SELECT oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()) AND n.nspname='public' AND c.relname=ANY($1::text[]) ORDER BY c.relname,l.mode`,[names]);
 const granted=new Set<string>(),oids=new Map<string,string>();
 for(const row of result.rows){if(row.length!==4||row.some(v=>typeof v!=='string')||!names.includes(row[0]!)||!['true','false'].includes(row[2]!)||!OID.test(row[3]!))fail('KEY_COMPARATOR_LOCKS_REQUIRED');if(oids.has(row[0]!)&&oids.get(row[0]!)!==row[3])fail('KEY_COMPARATOR_LOCKS_REQUIRED');oids.set(row[0]!,row[3]!);if(row[2]==='true'&&['ShareRowExclusiveLock','AccessExclusiveLock'].includes(row[1]!))granted.add(row[0]!);}
 if(granted.size!==names.length||names.some(name=>!granted.has(name)))fail('KEY_COMPARATOR_LOCKS_REQUIRED');
}
function deriveCurrentMetadata(original:TypedMigrationCaptureFacts,snapshotId:string):TypedMigrationCaptureFacts{
 const nsBody={binding:{...original.namespaceComparators.binding,snapshotId},catalogs:original.namespaceComparators.catalogs,rows:original.namespaceComparators.rows};
 const namespaceComparators={...nsBody,captureChecksum:digest(nsBody)};
 const {factsDigest:omitted,...body}=original;void omitted;
 const fresh={...body,snapshot:{...body.snapshot,id:snapshotId},namespaceComparators};
 return freeze({...fresh,factsDigest:digest(fresh)});
}
/** Privileged LOCAL source observations only, inside the caller's exclusively
 * owned original SERIALIZABLE capture transaction after core facts are sealed.
 * No BEGIN/COMMIT/ROLLBACK, write, grant, resource or operator authority is issued.
 * Root must install and verify source/catalog/roles and retain original evidence.
 */
async function collect(client:Client,facts:TypedMigrationCaptureFacts,value:MigrationCaptureRequest,locked?:Readonly<{protocol:unknown}>):Promise<TypedKeyComparatorCapture|TypedKeyComparatorLockedRecheck>{
 if(active.has(client))fail('KEY_COMPARATOR_CLIENT_IN_USE');active.add(client);
 try{
  if(client.getTransactionStatus()!=='T')fail('KEY_COMPARATOR_TRANSACTION_REQUIRED');
  let request:MigrationCaptureRequest;
  try{facts=freeze(detach(facts) as TypedMigrationCaptureFacts);request=freeze(detach(value) as MigrationCaptureRequest);}catch{fail('KEY_COMPARATOR_INVALID_FACTS');}
  const inspected=inspectTypedMigrationSnapshot(facts,{sourceDigest:facts.sourceDigest,currentSchemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot?.id,fenceGeneration:facts.fence?.generation,factsDigest:facts.factsDigest});if(inspected.status!=='INSPECTED')fail('KEY_COMPARATOR_INVALID_FACTS');
  const originalBinding={registryDigest:facts.registryDigest,sourceDigest:facts.sourceDigest,currentSchemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot.id,fenceGeneration:facts.fence.generation,factsDigest:facts.factsDigest};
  // Preserve issued immutable wire cells in the private detached original facts.
  // Fresh metadata below is distinctly tagged, never exported as original facts.
  const expected=locked?protocolExpectation(locked.protocol,request.identity?.role):{actor:null,manifest:null};
  const r=request!,b=r.catalogBaseline,i=r.identity;
  if(!b||!i||verifyOwnershipSource(r.migrations).length||!SHA.test(r.sourceDigest)||r.sourceDigest!==facts.sourceDigest||b.sourceDigest!==r.sourceDigest||b.registryDigest!==registry.digest||b.expansionSha256!=='fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb'||b.catalogDigest!==facts.currentSchemaDigest||!UINT.test(r.expectedFenceGeneration)||BigInt(r.expectedFenceGeneration)+BigInt(1)!==BigInt(facts.fence.generation)||typeof i.marker!=='string'||!i.marker.startsWith('f10-owned:')||!OID.test(i.databaseOid)||!Number.isSafeInteger(i.port)||i.port<1024||i.port>65535)fail('KEY_COMPARATOR_REQUEST_DRIFT');
  if(locked){await sourceLocks(client);const snapshotId=one(await raw(client,'/* F10_KEY_RECHECK_SNAPSHOT */ SELECT pg_catalog.pg_current_snapshot()::text'),1,'KEY_COMPARATOR_IDENTITY_DRIFT')[0];if(!snapshotId||!/^(0|[1-9][0-9]*):(0|[1-9][0-9]*):(?:(0|[1-9][0-9]*)(?:,(0|[1-9][0-9]*))*)?$/.test(snapshotId))fail('KEY_COMPARATOR_IDENTITY_DRIFT');facts=deriveCurrentMetadata(facts,snapshotId);}
  const serverVersion=await identity(client,r,facts);await fence(client,facts,expected);
  if(!same((await raw(client,'/* F10_KEY_INSTALLED_SOURCE */ SELECT path,source_sha256 FROM nevora_tenancy.source_migration_contract ORDER BY path')).rows,OWNERSHIP_SOURCE.map(s=>[s.path,s.sha256])))fail('KEY_COMPARATOR_SOURCE_DRIFT');
  const before=await observeMigrationCatalog(client);if(before.digest!==facts.currentSchemaDigest||!same(before.catalog,facts.catalog))fail('KEY_COMPARATOR_CATALOG_DRIFT');
  const effective=await databaseCollation(client,i.databaseOid),catalogs:TypedKeyComparatorCatalog[]=[],allRows:TypedKeyComparatorCapture['rows']=[];
  for(const c of contracts){const observed=await catalog(client,c);catalogs.push(observed);allRows.push(...await rows(client,c,observed,facts));}
  const after=await observeMigrationCatalog(client);if(after.digest!==before.digest||!same(after.catalog,before.catalog))fail('KEY_COMPARATOR_CATALOG_DRIFT');await fence(client,facts,expected);
  if(await identity(client,r,facts)!==serverVersion||!same(await databaseCollation(client,i.databaseOid),effective))fail('KEY_COMPARATOR_IDENTITY_DRIFT');
  const body={format:'TYPED_KEY_COMPARATOR_CAPTURE_V1' as const,binding:{registryDigest:registry.digest,sourceDigest:facts.sourceDigest,currentSchemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot.id,fenceGeneration:facts.fence.generation,factsDigest:facts.factsDigest},serverVersion,serverEncoding:'UTF8' as const,databaseCollation:effective,catalog:JSON.parse(canonical(before.catalog)) as JsonValue,catalogs:catalogs.sort((a,b)=>order(a.contractId,b.contractId)),rows:allRows.sort((a,b)=>order(canonical([a.contractId,a.key]),canonical([b.contractId,b.key])))};
  if(locked){const fresh={...body,format:'TYPED_KEY_COMPARATOR_LOCKED_RECHECK_V1' as const,originalBinding,derivedNamespaceCaptureChecksum:facts.namespaceComparators.captureChecksum,protocol:expected,verification:'READ_ONLY_SOURCE_RECHECK_NOT_OPERATOR_OR_EFFECT_AUTHORITY' as const};return freeze({...fresh,captureChecksum:digest(fresh)});}
  return freeze({...body,captureChecksum:digest(body)});
 }catch(error){if(isKeyComparatorCaptureFailure(error))throw error;fail('KEY_COMPARATOR_READ_FAILED');}finally{active.delete(client);}
}

export type TypedKeyComparatorLockedRecheck=Readonly<Omit<TypedKeyComparatorCapture,'format'>&{
 format:'TYPED_KEY_COMPARATOR_LOCKED_RECHECK_V1';originalBinding:Readonly<TypedKeyComparatorCapture['binding']>;
 derivedNamespaceCaptureChecksum:string;protocol:Readonly<{actor:string|null;manifest:string|null}>;
 verification:'READ_ONLY_SOURCE_RECHECK_NOT_OPERATOR_OR_EFFECT_AUTHORITY';
}>;
/** Existing capture stays in its original, unarmed NULL/NULL protocol only. */
export async function collectTypedKeyComparatorCapture(client:Client,facts:TypedMigrationCaptureFacts,request:MigrationCaptureRequest):Promise<TypedKeyComparatorCapture>{return await collect(client,facts,request) as TypedKeyComparatorCapture;}
/** Distinct read-only current metadata, never reissued original capture/proof.
 * All70 exact locks must already be held by this backend. This cannot establish
 * first-lock ordering, operator authority, effects, chunks or journal completion.
 * Source/catalog/SCRAM/UTC/ISO/fence/all104 SQL comparisons retain the original
 * checks; only the explicitly checked original manifest/actor expectation and
 * fresh SQL snapshot metadata differ. No lock/transaction/resource is acquired.
 */
export async function collectTypedKeyComparatorLockedSourceRecheck(client:Client,facts:TypedMigrationCaptureFacts,request:MigrationCaptureRequest,protocol?:Readonly<{manifestDigest:string;actor:string|null}>):Promise<TypedKeyComparatorLockedRecheck>{return await collect(client,facts,request,{protocol}) as TypedKeyComparatorLockedRecheck;}
// CONTROLLED_INSTALLER_COLLECTOR_ADDITION_BEGIN
export type TypedKeyComparatorLocalInstallerRecheck=Readonly<{
 format:'TYPED_KEY_COMPARATOR_LOCAL_INSTALLER_RC_RECHECK_V1';
 originalBinding:Readonly<TypedKeyComparatorCapture['binding']>;
 planDigest:string;captureRequestDigest:string;keyCaptureChecksum:string;
 installerIdentity:Readonly<Omit<Awaited<ReturnType<typeof assertControlledEnrollmentInstallerExecution>>,'snapshotId'>>;
 snapshotObservations:readonly Readonly<{stage:'ADMISSION_INITIAL'|'IDENTITY_START'|'IDENTITY_END'|'ADMISSION_FINAL';snapshotId:string}>[];
 snapshotCoverage:'ONLY_TAGGED_START_END_OBSERVATIONS_NOT_A_STABLE_WHOLE_BATCH_SNAPSHOT';
 protocol:Readonly<{actor:null;manifest:string}>;
 serverVersion:string;serverEncoding:'UTF8';databaseCollation:TypedKeyDatabaseCollationCapture;
 catalog:JsonValue;catalogs:TypedKeyComparatorCatalog[];rows:TypedKeyComparatorCapture['rows'];captureChecksum:string;
 verification:'LOCAL_LOCKED_READ_COMMITTED_RECHECK_NOT_CAPTURE_OR_OPERATOR_OR_EFFECT_AUTHORITY';
}>;
const INSTALLER_SNAPSHOT=/^(0|[1-9][0-9]*):(0|[1-9][0-9]*):(?:(0|[1-9][0-9]*)(?:,(0|[1-9][0-9]*))*)?$/;
type InstallerIdentity=Awaited<ReturnType<typeof assertControlledEnrollmentInstallerExecution>>;
type InstallerExpectedBinding=Readonly<{
 originalBinding:Readonly<TypedKeyComparatorCapture['binding']>;
 captureRequestDigest:string;keyCaptureChecksum:string;planDigest:string;
}>;
function withoutInstallerSnapshot(value:InstallerIdentity):Omit<InstallerIdentity,'snapshotId'>{const {snapshotId,...identity}=value;void snapshotId;return identity;}
async function installerAdmission(client:Client,witness:EmployeeNumberInstallerExecutionWitness,expected:InstallerExpectedBinding):Promise<InstallerIdentity>{
 try{const identity=await assertControlledEnrollmentInstallerExecution(client,witness,expected);if(!INSTALLER_SNAPSHOT.test(identity.snapshotId))fail('KEY_COMPARATOR_IDENTITY_DRIFT');return identity;}
 catch(error){
  // Only the independent module's private fixed failure issuer permits reads.
  if(isEmployeeNumberEnrollmentBindingFailure(error)){
   if(error.code==='ENROLLMENT_LOCKS_REQUIRED')fail('KEY_COMPARATOR_LOCKS_REQUIRED');
   if(error.code==='ENROLLMENT_EXECUTION_REQUIRED')fail('KEY_COMPARATOR_TRANSACTION_REQUIRED');
   if(error.code==='ENROLLMENT_REQUEST_DRIFT')fail('KEY_COMPARATOR_REQUEST_DRIFT');
   if(error.code==='ENROLLMENT_INSTALLATION_DRIFT')fail('KEY_COMPARATOR_SOURCE_DRIFT');
   if(error.code==='ENROLLMENT_NATIVE_READ_FAILED')fail('KEY_COMPARATOR_READ_FAILED');
  }
  fail('KEY_COMPARATOR_IDENTITY_DRIFT');
 }
}
/** Separate native execution identity. Never pass the installer role to the
 * original SERIALIZABLE identity() or mutate original captureRequest/facts. */
async function installerIdentity(client:Client,request:MigrationCaptureRequest,admitted:InstallerIdentity):Promise<Readonly<{serverVersion:string;snapshotId:string}>>{
 const r=one(await raw(client,`/* F10_KEY_INSTALLER_IDENTITY */ SELECT pg_catalog.current_database(),(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()),pg_catalog.shobj_description((SELECT oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()),'pg_database'),(SELECT system_identifier::text FROM pg_catalog.pg_control_system()),pg_catalog.current_setting('data_directory'),session_user::text,current_user::text,pg_catalog.host(pg_catalog.inet_server_addr()),pg_catalog.inet_server_port()::text,pg_catalog.current_setting('server_version'),pg_catalog.current_setting('server_encoding'),pg_catalog.current_setting('session_replication_role'),pg_catalog.current_setting('search_path'),pg_catalog.current_setting('transaction_isolation'),pg_catalog.current_setting('row_security'),pg_catalog.current_setting('DateStyle'),pg_catalog.current_setting('TimeZone'),SYSTEM_USER::text,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()),(SELECT oid::text FROM pg_catalog.pg_roles WHERE rolname=session_user),pg_catalog.current_setting('role'),pg_catalog.pg_current_snapshot()::text`),22,'KEY_COMPARATOR_IDENTITY_DRIFT');
 const i=request.identity;
 if(!same([admitted.database,admitted.databaseOid,admitted.marker,admitted.systemIdentifier,admitted.dataDirectory,admitted.port],[i.database,i.databaseOid,i.marker,i.systemIdentifier,i.dataDirectory,i.port])||!same(r.slice(0,9),[i.database,i.databaseOid,i.marker,i.systemIdentifier,i.dataDirectory,admitted.role,admitted.role,'127.0.0.1',String(i.port)])||r[9]!==admitted.serverVersion||!/^18\.4(?:\s|$)/.test(r[9]!)||r[10]!=='UTF8'||!same(r.slice(11,18),['origin','pg_catalog','read committed','off','ISO, YMD','UTC','scram-sha-256:'+admitted.role])||!OID.test(admitted.roleOid)||r[18]!==admitted.roleOid||r[19]!==admitted.roleOid||r[20]!=='none'||!r[21]||!INSTALLER_SNAPSHOT.test(r[21]))fail('KEY_COMPARATOR_IDENTITY_DRIFT');
 return Object.freeze({serverVersion:r[9]!,snapshotId:r[21]});
}
/** Distinct LOCAL-only read-only installer recheck. Source preparation only;
 * native admission/lease/controller implementation and actual QA are mandatory.
 * The genuine original compiler plan is tested before every property/client
 * read. Admission provenance is then checked trap-free for this exact Client.
 * Neither a plan, coherent digest, nor private witness authenticates a database:
 * initial/final fixed admission repeats native original maintenance LOGIN,
 * SCRAM/backend/OID/role/lease/child/mapping/source and exact own transaction
 * custody, including the already-held exclusive catalog fence and 70 locks.
 *
 * All existing catalog/row/native comparator routines are reused unchanged.
 * Original facts/request/typed cells, original operator role and snapshot remain
 * intact. Only separately tagged native start/end snapshots are observed: SQL
 * statements between them are NOT sampled and do NOT share an asserted snapshot.
 * RC source/DDL stability instead requires the caller's accepted source70 locks,
 * root-controlled exclusive catalog fence and initial/final full comparisons.
 * Exact APPLIED protocol is original plan manifest with NULL actor. No arming,
 * clearing, DML, resource, transaction ownership or installed authority is issued.
 */
export async function collectTypedKeyComparatorLockedInstallerRecheck(client:Client,input:TypedMigrationCaptureFacts,value:MigrationCaptureRequest,plan:TypedTenantBackfillPlan,witness:EmployeeNumberInstallerExecutionWitness):Promise<TypedKeyComparatorLocalInstallerRecheck>{
 if(!isIssuedTypedTenantBackfillPlan(plan))fail('KEY_COMPARATOR_INVALID_FACTS');
 if(!isControlledEnrollmentInstallerExecution(witness,client))fail('KEY_COMPARATOR_IDENTITY_DRIFT');
 if(active.has(client))fail('KEY_COMPARATOR_CLIENT_IN_USE');active.add(client);
 try{
  // Detach ordinary inputs before await while preserving privately issued cells.
  const facts=freeze(detach(input) as TypedMigrationCaptureFacts),r=freeze(detach(value) as MigrationCaptureRequest);
  const inspected=inspectTypedMigrationSnapshot(facts,{sourceDigest:facts.sourceDigest,currentSchemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot?.id,fenceGeneration:facts.fence?.generation,factsDigest:facts.factsDigest});
  if(inspected.status!=='INSPECTED')fail('KEY_COMPARATOR_INVALID_FACTS');
  const originalBinding={registryDigest:facts.registryDigest,sourceDigest:facts.sourceDigest,currentSchemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot.id,fenceGeneration:facts.fence.generation,factsDigest:facts.factsDigest};
  const observations=plan.manifest.observations.constraints.keyComparators;
  if(!isIssuedTypedKeyComparatorObservations(observations)||!same(originalBinding,plan.manifest.boundary)||!same(originalBinding,observations.binding)||!same(facts.catalog,observations.catalog)||plan.manifest.keyCaptureChecksum!==observations.captureChecksum)fail('KEY_COMPARATOR_INVALID_FACTS');
  const b=r.catalogBaseline,i=r.identity;
  if(!b||!i||verifyOwnershipSource(r.migrations).length||!SHA.test(r.sourceDigest)||r.sourceDigest!==facts.sourceDigest||b.sourceDigest!==r.sourceDigest||b.registryDigest!==registry.digest||b.expansionSha256!=='fb5fd364f2e355c059a501422dd016d4284f9bac0287fb3d69548d52caaf43cb'||b.catalogDigest!==facts.currentSchemaDigest||!UINT.test(r.expectedFenceGeneration)||BigInt(r.expectedFenceGeneration)+BigInt(1)!==BigInt(facts.fence.generation)||typeof i.marker!=='string'||!i.marker.startsWith('f10-owned:')||!OID.test(i.databaseOid)||!Number.isSafeInteger(i.port)||i.port<1024||i.port>65535)fail('KEY_COMPARATOR_REQUEST_DRIFT');
  const expectedBinding=freeze({originalBinding,captureRequestDigest:digest(r),keyCaptureChecksum:observations.captureChecksum,planDigest:plan.digest}),expected=Object.freeze({actor:null,manifest:plan.digest});
  // Native admission validates current exact Client/custody and its already-held
  // source70/mapping/exclusive fence before this module's repeated SELECTs.
  const initial=await installerAdmission(client,witness,expectedBinding);
  if(client.getTransactionStatus()!=='T')fail('KEY_COMPARATOR_TRANSACTION_REQUIRED');
  await sourceLocks(client);
  const start=await installerIdentity(client,r,initial);
  await fence(client,facts,expected);
  if(!same((await raw(client,'/* F10_KEY_INSTALLED_SOURCE */ SELECT path,source_sha256 FROM nevora_tenancy.source_migration_contract ORDER BY path')).rows,OWNERSHIP_SOURCE.map(s=>[s.path,s.sha256])))fail('KEY_COMPARATOR_SOURCE_DRIFT');
  const before=await observeMigrationCatalog(client);if(before.digest!==facts.currentSchemaDigest||!same(before.catalog,facts.catalog))fail('KEY_COMPARATOR_CATALOG_DRIFT');
  const effective=await databaseCollation(client,i.databaseOid),catalogs:TypedKeyComparatorCatalog[]=[],allRows:TypedKeyComparatorCapture['rows']=[];
  for(const c of contracts){const observed=await catalog(client,c);catalogs.push(observed);allRows.push(...await rows(client,c,observed,facts));}
  const after=await observeMigrationCatalog(client);if(after.digest!==before.digest||!same(after.catalog,before.catalog))fail('KEY_COMPARATOR_CATALOG_DRIFT');
  await fence(client,facts,expected);
  if(!same(await databaseCollation(client,i.databaseOid),effective))fail('KEY_COMPARATOR_DATABASE_COLLATION_DRIFT');
  const end=await installerIdentity(client,r,initial),final=await installerAdmission(client,witness,expectedBinding);
  if(end.serverVersion!==start.serverVersion||!same(withoutInstallerSnapshot(final),withoutInstallerSnapshot(initial)))fail('KEY_COMPARATOR_IDENTITY_DRIFT');
  const body={format:'TYPED_KEY_COMPARATOR_LOCAL_INSTALLER_RC_RECHECK_V1' as const,originalBinding,planDigest:plan.digest,captureRequestDigest:expectedBinding.captureRequestDigest,keyCaptureChecksum:observations.captureChecksum,installerIdentity:withoutInstallerSnapshot(initial),snapshotObservations:[{stage:'ADMISSION_INITIAL' as const,snapshotId:initial.snapshotId},{stage:'IDENTITY_START' as const,snapshotId:start.snapshotId},{stage:'IDENTITY_END' as const,snapshotId:end.snapshotId},{stage:'ADMISSION_FINAL' as const,snapshotId:final.snapshotId}],snapshotCoverage:'ONLY_TAGGED_START_END_OBSERVATIONS_NOT_A_STABLE_WHOLE_BATCH_SNAPSHOT' as const,protocol:expected,serverVersion:start.serverVersion,serverEncoding:'UTF8' as const,databaseCollation:effective,catalog:JSON.parse(canonical(before.catalog)) as JsonValue,catalogs:catalogs.sort((a,b)=>order(a.contractId,b.contractId)),rows:allRows.sort((a,b)=>order(canonical([a.contractId,a.key]),canonical([b.contractId,b.key]))),verification:'LOCAL_LOCKED_READ_COMMITTED_RECHECK_NOT_CAPTURE_OR_OPERATOR_OR_EFFECT_AUTHORITY' as const};
  return freeze({...body,captureChecksum:digest(body)});
 }catch(error){if(isKeyComparatorCaptureFailure(error))throw error;fail('KEY_COMPARATOR_READ_FAILED');}finally{active.delete(client);}
}
// CONTROLLED_INSTALLER_COLLECTOR_ADDITION_END
