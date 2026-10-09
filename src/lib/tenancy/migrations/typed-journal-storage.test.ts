import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {getOwnershipRegistry,canonicalOwnershipJson as canonical} from './ownership';
import {lexSql} from '../inventory/sql-lexer';
const source=readFileSync(resolve('src/lib/tenancy/migrations/typed-journal-storage.sql'),'utf8');
const registry=getOwnershipRegistry();
const statements=lexSql(source).parts.filter(p=>p.kind==='statement').map(p=>p.text);
// Inert source checks only: no PostgreSQL parser, installation or effect proof.
describe('typed durable journal source preparation',()=>{
 it('declares separate plan/chunk controls with no legacy acceptance',()=>{for(const name of ['typed_backfill_journal_plan','typed_backfill_journal_chunk'])expect(statements.some(s=>s.includes('CREATE TABLE nevora_tenancy.'+name))).toBe(true);expect(source).not.toContain('BACKFILL_CHUNK_JOURNAL_V1');});
 it('has lossless statement capture and explicit invoker/search-path closure',()=>{expect(lexSql(source).diagnostics).toEqual([]);const functions=statements.filter(s=>/\bCREATE FUNCTION nevora_tenancy\./.test(s));expect(functions.length).toBe(13);for(const f of functions){expect(f).toContain('SECURITY INVOKER');expect(f).toContain('SET search_path = pg_catalog');}expect(source).not.toMatch(/SECURITY DEFINER|^GRANT /m);});
 it('contains DML only for the two new global migration controls',()=>{const targets=[...source.matchAll(/(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE)\s+(nevora_tenancy\.[a-z_]+)/g)].map(m=>m[1]);expect(targets.length).toBeGreaterThan(0);expect([...new Set(targets)].sort()).toEqual(['nevora_tenancy.typed_backfill_journal_chunk','nevora_tenancy.typed_backfill_journal_plan']);expect(statements.some(s=>/^\s*(ALTER|DROP|GRANT)\b/.test(s))).toBe(false);});
 it('embeds all68 exact registry table identities, columns, mirrors and anchors',()=>{const m=source.match(/\$typed_journal_tables\$([\s\S]*?)\$typed_journal_tables\$/);expect(m).not.toBeNull();expect(JSON.parse(m![1])).toEqual(registry.tables.map(t=>({table:t.table,source:t.source,storage:t.storage,anchor:t.anchor,sidecar:t.sidecar,originalColumns:t.columns,primaryKey:t.primaryKey,mirroredIdentityColumns:t.mirroredIdentityColumns,globalFences:t.globalFences})));expect(source).toContain(registry.digest);});
 it('binds exact closed typed descriptor/observation tags and cannot claim effects',()=>{for(const s of ["'TYPED_BACKFILL_JOURNAL_V1'","'TYPED_BACKFILL_JOURNAL_CHUNK_V1'","'TYPED_BACKFILL_JOURNAL_OBSERVATION_V1'","'effectsVerified',false","'reconciliation',NULL",'PURE_TYPED_JOURNAL_STRUCTURE_NOT_EFFECTS_OR_DATABASE_VERIFICATION'])expect(source).toContain(s);});
 it('checks original full descriptor and chunk/row/checksum coverage before storage',()=>{for(const s of ['TYPED_JOURNAL_COVERAGE_DRIFT','TYPED_JOURNAL_ROW_CHECKSUM_DRIFT','TYPED_JOURNAL_TABLE_CHECKSUM_DRIFT','TYPED_JOURNAL_DESCRIPTOR_CHECKSUM_DRIFT','TYPED_JOURNAL_CHUNK_IDENTITY_DRIFT','sourceObservationChecksum','mirroredIdentityChecksum','keysChecksum','rowsChecksum'])expect(source).toContain(s);});
 it('preserves compiler retry identities rather than allocating a successor operation',()=>{expect(source).toContain("c->>'retryIdentity' IS DISTINCT FROM c->>'id'");expect(source).not.toContain('BACKFILL_ORIGINAL_PLAN_RETRY');expect(source).toContain('TYPED_JOURNAL_CHANGED_ORIGINAL_RETRY');});
 it('enforces immutable full descriptor and deferred complete physical chunk coverage',()=>{expect(source).toContain('DEFERRABLE INITIALLY DEFERRED');expect(source).toContain('TYPED_JOURNAL_IDENTITY_IMMUTABLE');expect(source).toContain('FOR UPDATE');expect(source).toContain('ON CONFLICT(plan_digest) DO NOTHING');expect(source).toContain('BEFORE TRUNCATE');});
 it('blocks completion, UNKNOWN downgrade and noninitial inserts',()=>{for(const s of ['TYPED_JOURNAL_COMPLETION_BLOCKED','TYPED_JOURNAL_UNKNOWN_REQUIRES_RECHECK','TYPED_JOURNAL_INITIAL_STATE_REQUIRED',"('NOT_STARTED','STARTED','UNKNOWN')"])expect(source).toContain(s);});
 it('revokes PUBLIC defaults and explicitly retains genuine original plan applicability',()=>{expect(source).toContain('REVOKE ALL ON TABLE');expect(source).toContain('REVOKE ALL ON FUNCTION');expect(source).toContain('FROM PUBLIC');expect(source).toContain('genuine original compiler-issued plan');expect(source).toContain('cannot reconstruct');expect(source).toContain('No implicit installation');});
 it('retains string generation from the exact genuine typed boundary',()=>{const f=description();expect(typeof f.descriptor.boundary.fenceGeneration).toBe('string');expect(source).toContain("pg_catalog.jsonb_typeof(b->'fenceGeneration') IS DISTINCT FROM 'string'");expect(source).toContain("b->>'fenceGeneration' !~ '^(0|[1-9][0-9]*)$'");});
 it('metadata canonicalization never normalizes unsafe source wire values into JSON numbers',()=>{expect(source).toContain('TYPED_JOURNAL_UNSUPPORTED_METADATA_NUMBER');expect(source).toContain('TYPED_JOURNAL_DUPLICATE_JSON_FIELD');expect(source).toContain('COLLATE pg_catalog."C"');expect(canonical({key:['9223372036854775807'],wireChecksum:'a'.repeat(64)})).toContain('9223372036854775807');});
});

import {compileTypedTenantBackfill,type TypedTenantBackfillPlan} from './typed-backfill';


import {createTypedSnapshotFixture} from './typed-fixture.test-support';
import {inspectTypedMigrationSnapshot} from './typed-snapshot';
import {OWNERSHIP_SOURCE,canonicalOwnershipJson,ownershipDigest,type JsonValue} from './ownership';
import {DATABASE_NAMESPACES,validateTypedDatabaseNamespaceComparators} from './namespace-comparators';
import {validateTypedSnapshotOwnership,type TypedOwnershipAssignments} from './typed-ownership';
import {getTypedReferenceColumnContract,validateTypedMigrationCellReferences,type TypedReferenceClassificationInput} from './typed-reference';
import {validateTypedSourceConstraints,type TypedSourceConstraintWithKeysObservations} from './typed-constraints';
import {getTypedKeyComparatorContracts,getTypedKeyComparatorStockDescriptors,validateTypedKeyComparators,type TypedKeyComparatorCapture,type TypedKeyComparatorComponent} from './typed-key-comparators';


const sha=(v:string)=>v.repeat(64);
type RowSpec={table:string;wire:Record<string,string|null>;owner?:string};
const root=(id='A'):RowSpec=>({table:'workspaces',wire:{id,singleton:'t'}});
const location=(id='L',owner='A',clockerKey=id):RowSpec=>({table:'locations',wire:{id,workspace_id:owner,clocker_key:clockerKey}});
const employee=(id='E',owner='A',loc='L',email:string|null=null):RowSpec=>({table:'employees',wire:{id,primary_location_id:loc,email},owner});
const base=()=>[root(),location(),employee()];

/** Complete fictional supplied facts only. Catalog/classes are labelled
 * fictional, immutable assignments/reviews explicit, no database is contacted.
 * These fixtures may intentionally conflict with original keys; no fixture
 * claims PostgreSQL accepted two workspaces under the retained singleton guard.
 */
function fixture(specs:RowSpec[]=[],classes:Record<string,string>={},change?:(f:ReturnType<typeof createTypedSnapshotFixture>)=>void){
 const f=createTypedSnapshotFixture();for(const s of specs)f.row(s.table,s.wire);
 const migrations=OWNERSHIP_SOURCE.map(s=>({path:s.path,text:readFileSync(resolve(s.path),'utf8')}));
 const collation={oid:'100',schema:'pg_catalog',name:'default',provider:'d',deterministic:true,encoding:-1,lcCollate:'C',lcCtype:'C',locale:null,version:null,actualVersion:null};
 f.facts.namespaceComparators.catalogs=DATABASE_NAMESPACES.map(c=>{
  const source=migrations.find(m=>m.path===c.source.path)!.text.split('\n').slice(c.source.line-1).join('\n').split(';')[0]+';';
  const value={contractId:c.contractId,source:c.source,sourceStatementChecksum:ownershipDigest(source),definition:{indexDefinition:c.indexDefinition,expression:c.expression,predicate:c.predicate,expressionCollation:collation,indexCollation:collation,serverVersion:'18.4 FICTIONAL_OBSERVATION',serverEncoding:'UTF8'}};
  return {...value,checksum:ownershipDigest(value)};
 }).sort((a,b)=>a.contractId<b.contractId?-1:1);
 f.facts.namespaceComparators.rows=DATABASE_NAMESPACES.flatMap(c=>f.facts.tables.find(t=>t.table===c.table)!.rows.map(r=>{
  const wire=r.columns.find(x=>x.name===c.column)!.wire;
  const included=c.table==='employees'?wire!==null:c.table==='schedule_templates'?r.columns.find(x=>x.name==='active')!.wire==='t':true;
  return {contractId:c.contractId,key:r.key,rowChecksum:r.originalChecksum,included,expressionValue:wire===null?null:'FICTIONAL_DB_EXPRESSION_'+wire,comparisonClass:included?(classes[canonicalOwnershipJson([c.contractId,r.key])]??'OPAQUE_CLASS_'+wire):null};
 })).sort((a,b)=>canonicalOwnershipJson([a.contractId,a.key])<canonicalOwnershipJson([b.contractId,b.key])?-1:1);
 change?.(f);
 const boundary=f.seal(),i=inspectTypedMigrationSnapshot(f.facts,boundary);if(i.status!=='INSPECTED')throw Error('Fictional snapshot:'+i.code);
 const snapshot=i.snapshot;
 const assignments:TypedOwnershipAssignments={boundary:{registryDigest:snapshot.registryDigest,...boundary},mappings:[],historicalReferences:[],installation:null,columns:[]};
 for(const t of snapshot.tables)for(const r of t.rows){
  const rule=registry.tables.find(x=>x.table===t.table)!;
  const spec=specs.find(s=>s.table===t.table&&rule.primaryKey.every((c,k)=>s.wire[c]===String(r.key[k])));
  if(rule.anchor.kind==='CAPTURED_IMMUTABLE')assignments.mappings.push({table:t.table,key:[...r.key],rowChecksum:r.originalChecksum,workspaceId:spec?.owner??'A',evidenceDigest:sha('d')});
  if(rule.anchor.kind==='INSTALLATION_PROVENANCE'){
   assignments.installation??={workspaceId:spec?.owner??'A',evidenceDigest:sha('e'),coveredRows:[]};
   assignments.installation.coveredRows.push({table:t.table,key:[...r.key],rowChecksum:r.originalChecksum});
  }
  for(const ref of rule.references.filter(ref=>ref.historical)){
   const wires=ref.columns.map(name=>r.columns.find(c=>c.name===name)!.wire);
   if(wires.every(w=>w!==null))assignments.historicalReferences.push({target:ref.target,targetColumns:[...ref.targetColumns],key:wires.map(w=>({kind:'TEXT' as const,text:w!})),workspaceId:spec?.owner??'A',sourceRowChecksum:r.originalChecksum,evidenceDigest:sha('f')});
  }
  for(const column of new Set([...rule.payloads.map(p=>p.column),...rule.typedFields])){
   const c=r.columns.find(c=>c.name===column)!,contract=getTypedReferenceColumnContract(t.table,column);if(contract.status!=='CONTRACT')throw Error('Fictional contract');
   const classifications:TypedReferenceClassificationInput[]=c.lineage.nodes.filter(n=>!((n.value.kind==='JSON_ARRAY'&&n.value.length>0)||(n.value.kind==='JSON_OBJECT'&&n.value.memberCount>0)||(n.value.kind==='SQL_ARRAY'&&n.value.elementCount>0))).map(n=>{
    if(t.table==='calendar_subscriptions'&&column==='allowed_location_ids'&&n.value.kind==='SQL_ARRAY_TEXT')return {address:n.address,kind:'REFERENCE',target:'locations',targetColumns:['id'],key:[{kind:'TEXT',text:n.value.text}],historical:false};
    return {address:n.address,kind:n.value.kind==='SQL_NULL'||n.value.kind==='JSON_NULL'||n.value.kind==='SQL_ARRAY_NULL'?'ABSENCE':'DATA'};
   });
   const v=validateTypedMigrationCellReferences(c.lineage,{binding:{schemaCommit:contract.contract.source.schemaCommit,schemaTree:contract.contract.source.schemaTree,schemaDigest:contract.contract.source.schemaDigest,registryDigest:contract.contract.source.registryDigest,table:t.table,column,contractChecksum:contract.contract.checksum,sourceChecksum:c.lineage.source.checksum},reviewEvidenceDigest:sha('c'),classifications,unresolvedAddresses:[]});
   if(v.status!=='VALIDATED')throw Error('Fictional review:'+t.table+'.'+column+':'+v.code);
   assignments.columns.push({table:t.table,key:[...r.key],rowChecksum:r.originalChecksum,column,classification:v.classification});
  }
 }
 const o=validateTypedSnapshotOwnership(snapshot,assignments);if(o.status!=='RESOLVED_SOURCE_OBSERVATIONS')throw Error('Fictional ownership:'+o.code);
 const n=validateTypedDatabaseNamespaceComparators(snapshot,f.facts.namespaceComparators,migrations);if(n.status!=='VALIDATED')throw Error('Fictional namespace:'+n.diagnostics.map(d=>d.code).join(','));
 return {snapshot,ownership:o.observations,namespaces:n.observations,facts:f.facts};
}
const keyContracts=getTypedKeyComparatorContracts(),stockDescriptors=getTypedKeyComparatorStockDescriptors();

const stockDescriptor=(type:string)=>stockDescriptors.find(s=>s.type===type)!;
const fakeOpclassOid=(type:string)=>String(20000+stockDescriptors.findIndex(s=>s.type===type));
const fakeColumnCollation=(type:string)=>type==='text'||type.startsWith('char(')||type==='text[]'?'100':'0';
const catalogType=(type:string)=>stockDescriptor(type)?.catalogType??({'char(32)':'character(32)',timestamp:'timestamp without time zone',timestamptz:'timestamp with time zone'}as Record<string,string>)[type]??type;
type KeyFixtureCatalog={[section:string]:Record<string,JsonValue>[]};
function fictionalKeyCatalog():KeyFixtureCatalog{
 const c:KeyFixtureCatalog={relations:[],columns:[],constraints:[],not_null:[],indexes:[],triggers:[],functions:[],views:[],schemas:[{name:'public',acl:null},{name:'nevora_tenancy',acl:null}]};
 for(const table of registry.tables){
  c.relations.push({schema:'public',name:table.table,kind:'r',rls:false,force_rls:false,replica_identity:'d',acl:null});
  table.columns.forEach((column,i)=>c.columns.push({schema:'public',table_name:table.table,name:column.name,ordinal:i+1,type:catalogType(column.type),not_null:!column.nullable,default_value:null,identity:'',generated:'',collation_oid:fakeColumnCollation(column.type),acl:null}));
  for(const column of table.columns.filter(x=>!x.nullable))c.not_null.push({schema:'public',table_name:table.table,name:column.name,validated:true,enforced:true,deferrable:false,deferred:false});
  for(const key of table.declaredKeys){
   const name=key.name??(key.kind==='PRIMARY_KEY'?table.table+'_pkey':table.table+'_'+key.columns.join('_')+'_key');
   c.constraints.push({schema:'public',table_name:table.table,name,type:key.kind==='PRIMARY_KEY'?'p':'u',definition:(key.kind==='PRIMARY_KEY'?'PRIMARY KEY':'UNIQUE')+' ('+key.columns.join(', ')+')',validated:true,enforced:true,deferrable:false,deferred:false});
   c.indexes.push({schema:'public',table_name:table.table,name,definition:'CREATE UNIQUE INDEX '+name+' ON public.'+table.table+' USING btree ('+key.columns.join(', ')+')',unique:true,valid:true,ready:true,live:true,immediate:true,nulls_not_distinct:false,collations:key.columns.map(n=>fakeColumnCollation(table.columns.find(x=>x.name===n)!.type)).join(' '),opclasses:key.columns.map(n=>fakeOpclassOid(table.columns.find(x=>x.name===n)!.type)).join(' ')});
  }
 }
 c.indexes.push({schema:'public',table_name:'push_subscriptions',name:'push_active_endpoint_unique',definition:"CREATE UNIQUE INDEX push_active_endpoint_unique ON public.push_subscriptions USING btree (endpoint_fingerprint, environment) WHERE (status = 'active'::text)",unique:true,valid:true,ready:true,live:true,immediate:true,nulls_not_distinct:false,collations:'100 100',opclasses:fakeOpclassOid('text')+' '+fakeOpclassOid('text')});
 return c;
}
/** Complete explicit FICTIONAL supplied metadata/classes only. Neither source
 * tuple spellings nor ordinal fixture labels claim SQL comparison results.
 * Identical literal tuples reuse a fixture label only to keep the real pure
 * adapter's required identical-input consistency; custom maps explicitly supply
 * alternative opaque classes. No issuer is mocked and no DB is contacted.
 */
function withKeys(specs:RowSpec[]=[],classes:Record<string,string>={},expressions:Record<string,string>={},change?:(f:ReturnType<typeof createTypedSnapshotFixture>)=>void){
 const f=fixture(specs,expressions,source=>{
  source.facts.catalog=fictionalKeyCatalog();source.facts.currentSchemaDigest=ownershipDigest(source.facts.catalog);source.facts.namespaceComparators.binding.schemaDigest=source.facts.currentSchemaDigest;change?.(source);
 });
 const full=f.facts.catalog as KeyFixtureCatalog;
 const raw:TypedKeyComparatorCapture={format:'TYPED_KEY_COMPARATOR_CAPTURE_V1',binding:{...f.ownership.boundary},serverVersion:'18.4 FICTIONAL_OBSERVATION',serverEncoding:'UTF8',databaseCollation:{provider:'c',encoding:6,lcCollate:'C',lcCtype:'C',locale:null,icuRules:null,version:null,actualVersion:null},catalog:full,catalogs:[],rows:[],captureChecksum:''};
 for(const c of keyContracts){
  const constraint=full.constraints.find(k=>k.table_name===c.table&&k.type===(c.kind==='PRIMARY_KEY'?'p':'u')&&k.definition===(c.kind==='PRIMARY_KEY'?'PRIMARY KEY':'UNIQUE')+' ('+c.columns.join(', ')+')');
  const indexName=c.indexName??constraint?.name;if(typeof indexName!=='string')throw Error('Fictional key backing index');
  const index=full.indexes.find(k=>k.table_name===c.table&&k.name===indexName)!;
  const parts:TypedKeyComparatorComponent[]=c.columns.map(column=>{const type=registry.tables.find(t=>t.table===c.table)!.columns.find(x=>x.name===column)!.type,stock=stockDescriptor(type);return {column,type,typeOid:stock.typeOid,collation:stock.collatable?{oid:'100',schema:'pg_catalog',name:'default',provider:'d',deterministic:true,encoding:-1,lcCollate:null,lcCtype:null,locale:null,icuRules:null,version:null,actualVersion:null}:null,opclass:{oid:fakeOpclassOid(type),...JSON.parse(canonicalOwnershipJson(stock.opclass))}};});
  const body={contractId:c.contractId,table:c.table,label:c.label,kind:c.kind,columns:[...c.columns],source:{...c.source},indexColumns:[...c.indexColumns],projectedPositions:[...c.projectedPositions],indexName,indexDefinition:String(index.definition),predicate:c.predicate,nullsNotDistinct:false as const,components:parts};raw.catalogs.push({...body,checksum:ownershipDigest(body)});
  const labels=new Map<string,string>();
  for(const row of f.snapshot.tables.find(t=>t.table===c.table)!.rows){
   const tuple=canonicalOwnershipJson(c.columns.map(n=>row.columns.find(x=>x.name===n)!.wire));
   if(!labels.has(tuple))labels.set(tuple,String(labels.size+1));
   const included=c.columns.every(n=>row.columns.find(x=>x.name===n)!.lineage.source.kind!=='SQL_NULL')&&(c.label!=='active_endpoint_global'||row.columns.find(x=>x.name==='status')!.wire==='active');
   raw.rows.push({contractId:c.contractId,key:[...row.key],rowChecksum:row.originalChecksum,included,comparisonClass:included?(classes[canonicalOwnershipJson([c.contractId,row.key])]??labels.get(tuple)!):null});
  }
 }
 raw.rows.sort((a,b)=>canonicalOwnershipJson([a.contractId,a.key])<canonicalOwnershipJson([b.contractId,b.key])?-1:1);
 const {captureChecksum:ignored,...body}=raw;void ignored;raw.captureChecksum=ownershipDigest(body);
 const k=validateTypedKeyComparators(f.snapshot,raw,raw.captureChecksum);if(k.status!=='VALIDATED')throw Error('Fictional key observations:'+k.code);
 return {...f,keyObservations:k.observations,rawKeyCapture:raw};
}

function constraints(f:ReturnType<typeof withKeys>):TypedSourceConstraintWithKeysObservations{
 const r=validateTypedSourceConstraints(f.snapshot,f.ownership,f.namespaces,f.keyObservations);
 if(r.status!=='VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS')throw Error('Fictional V2 constraints:'+canonicalOwnershipJson(r));
 return r.observations;
}
function compile(f:ReturnType<typeof withKeys>,chunkSize=2){return compileTypedTenantBackfill(f.snapshot,f.ownership,constraints(f),{chunkSize});}
function planned(f:ReturnType<typeof withKeys>,chunkSize=2):TypedTenantBackfillPlan{const r=compile(f,chunkSize);expect(r.status).toBe('PLANNED');if(r.status!=='PLANNED')throw Error(canonicalOwnershipJson(r));return r.plan;}
const pin=(id='PIN'):RowSpec=>({table:'clocker_pin_events',wire:{id,employee_id:'E',actor_employee_id:'E',pin_version:'1'}});


import {describeTypedBackfillJournal,validateTypedBackfillJournalObservation,type TypedBackfillJournalDescriptor} from './typed-journal-contract';
type Mutable<T>=T extends readonly (infer U)[]?Mutable<U>[]:T extends object?{-readonly[K in keyof T]:Mutable<T[K]>}:T;
const clone=<T>(v:T):Mutable<T>=>JSON.parse(canonical(v));
function description(snapshotId='12:19:',specs:RowSpec[]=[...base(),pin(),{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775807'}}],chunkSize=2){
 const f=withKeys(specs,{}, {},s=>{s.facts.snapshot.id=snapshotId;s.facts.namespaceComparators.binding.snapshotId=snapshotId;});
 const plan=planned(f,chunkSize),d=describeTypedBackfillJournal(plan);if(d.status!=='DESCRIBED')throw Error('GENUINE_TYPED_DESCRIPTION_'+d.code);
 return {plan,descriptor:d.descriptor,text:canonical(d.descriptor)};
}
const rehash=(d:TypedBackfillJournalDescriptor)=>{const {descriptorChecksum:ignored,...body}=d;void ignored;return {...body,descriptorChecksum:ownershipDigest(body)};};
describe('genuine typed journal descriptor prerequisite, pure only',()=>{
 it('preserves all68 tables, original chunks/rows, native wire hashes and gates',()=>{const f=description();expect(f.descriptor.tables).toEqual(f.plan.manifest.tables);expect(f.descriptor.boundary.planDigest).toBe(f.plan.digest);expect(f.descriptor.boundary.keyCaptureChecksum).toBe(f.plan.manifest.keyCaptureChecksum);expect(f.descriptor.remainingGates).toEqual(f.plan.remainingGates);for(const [i,c] of f.descriptor.chunks.entries()){expect(c.id).toBe(f.plan.chunks[i].id);expect(c.retryIdentity).toBe(c.id);expect(c.rows.map(r=>r.sourceChecksum)).toEqual(f.plan.chunks[i].entries.map(e=>e.sourceChecksum));expect(c.rows.map(r=>r.wireChecksum)).toEqual(f.plan.chunks[i].entries.map(e=>e.wireChecksum));expect(c.rowsChecksum).toBe(ownershipDigest(c.rows));}});
 it('requires genuine original plan beside every serialized structural observation',()=>{const f=description(),o={format:'TYPED_BACKFILL_JOURNAL_OBSERVATION_V1',boundary:f.descriptor.boundary,descriptorChecksum:f.descriptor.descriptorChecksum,rows:f.descriptor.chunks.map(chunk=>({chunk,state:'UNKNOWN',retryIdentity:chunk.retryIdentity})),effectsVerified:false,reconciliation:null};expect(validateTypedBackfillJournalObservation(f.plan,clone(f.descriptor),clone(o)).status).toBe('STRUCTURAL_OBSERVATIONS_ONLY');expect(validateTypedBackfillJournalObservation(clone(f.plan),f.descriptor,o).status).toBe('BLOCKED');expect(validateTypedBackfillJournalObservation(f.plan,rehash({...f.descriptor,chunks:[]}),o).status).toBe('BLOCKED');});
 it('binds unsafe JSON/native array/SQLNULL wire digests without legacy projection',()=>{const a=description('unsafe',[{table:'workspaces',wire:{id:'A',singleton:'t',shift_change_policy:'{"n":9007199254740993,"s":1.00,"z":null}'}}]),b=description('sql-null',[{table:'workspaces',wire:{id:'A',singleton:'t',shift_change_policy:null}}]);expect(a.descriptor.chunks[0].rows[0].wireChecksum).not.toBe(b.descriptor.chunks[0].rows[0].wireChecksum);expect(a.descriptor.chunks[0].rows[0].wireChecksum).toBe(a.plan.entries[0].wireChecksum);expect(Object.hasOwn(a.descriptor.chunks[0].rows[0],'wireValues')).toBe(false);});
});

import {Client} from 'pg';
import {beforeAll,afterAll} from 'vitest';
import {realpathSync,lstatSync,statSync,appendFileSync,writeFileSync} from 'node:fs';
import {join,isAbsolute,sep} from 'node:path';
import {createHash} from 'node:crypto';
const testPath=resolve('src/lib/tenancy/migrations/typed-journal-storage.test.ts');
const hash=(b:string|Buffer)=>createHash('sha256').update(b).digest('hex');
type Lease={scope:'OWNED_LOCAL_F10';closed:false;invocation:string;root:string;data:string;pid:number;pidStart:string;port:number;systemIdentifier:string;database:string;databaseOid:string;marker:string;user:string;credentialFile:string};
type FixtureManifest={sourceSHA256:string;testSHA256:string;registryDigest:string;databaseOid:string;schemaOid:string;ownerRoleOid:string;planTableOid:string;chunkTableOid:string;functions:{signature:string;oid:string;definitionSHA256:string}[];operators:{name:string;oid:string;systemUser:string}[];outsider:{name:string;oid:string;systemUser:string}};
const leasePath=process.env.F_TYPED_JOURNAL_OWNED_LEASE,runPath=process.env.F_TYPED_JOURNAL_RUN_DIR;
// Root alone installs SQL/grants on a fresh separately owned lease. No setup,
// schema/role creation, lease discovery, server startup or DB cleanup runs here.
describe.skipIf(!leasePath&&!runPath)('root-installed owned PostgreSQL durable observation storage',()=>{
 let lease:Lease,manifest:FixtureManifest,admin:Client,first:Client,second:Client,outsider:Client;const clients=new Set<Client>(),records:unknown[]=[];let caseNumber=0;
 const code=(e:unknown)=>{const c=(e as {code?:unknown})?.code;return typeof c==='string'&&/^[A-Z0-9]{5}$/.test(c)?c:'UNKNOWN';};
 async function query(c:Client,text:string,values:unknown[]=[]){try{return await c.query(text,values);}catch(e){throw Error('OWNED_TYPED_JOURNAL_SQL_'+code(e));}}
 async function denied(c:Client,text:string,values:unknown[]=[]){try{await c.query(text,values);return 'NO_ERROR';}catch(e){return code(e);}}
 function record(value:unknown){records.push(value);appendFileSync(join(runPath!,'observations.jsonl'),JSON.stringify(value)+'\n',{mode:0o600});}
 async function connect(name:string){const password=readFileSync(lease.credentialFile,'utf8');expect(password.length>0).toBe(true);const c=new Client({host:'127.0.0.1',port:lease.port,database:lease.database,user:name,password,connectionTimeoutMillis:3000,statement_timeout:15000});clients.add(c);try{await c.connect();}catch{throw Error('OWNED_TYPED_JOURNAL_CONNECT_FAILED');}await query(c,'SET search_path=pg_catalog');return c;}
 async function identity(c:Client,role:{name:string;oid:string;systemUser:string}){const r=(await query(c,"SELECT session_user::text role,current_user::text current_role,SYSTEM_USER::text original_auth,(SELECT usesysid::text FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid()) original_oid,pg_catalog.current_setting('role') set_role,pg_catalog.host(pg_catalog.inet_server_addr()) host,pg_catalog.inet_server_port() port,(SELECT oid::text FROM pg_catalog.pg_database WHERE datname=current_database()) db_oid")).rows[0];expect(r).toEqual({role:role.name,current_role:role.name,original_auth:role.systemUser,original_oid:role.oid,set_role:'none',host:'127.0.0.1',port:lease.port,db_oid:lease.databaseOid});expect(role.systemUser).toBe('scram-sha-256:'+role.name);expect(c.getTransactionStatus()).toBe('I');}
 function input(specs?:RowSpec[],chunkSize=2){return description(lease.marker+':fictional:'+ ++caseNumber,specs,chunkSize);}
 const register=(c:Client,text:string)=>query(c,'SELECT nevora_tenancy.register_typed_backfill_journal($1::text) observation',[text]).then(r=>r.rows[0].observation);
 const read=(c:Client,text:string)=>query(c,'SELECT nevora_tenancy.read_typed_backfill_journal($1::text) observation',[text]).then(r=>r.rows[0].observation);
 async function observe(c:Client,f:ReturnType<typeof input>,chunk:TypedBackfillJournalDescriptor['chunks'][number],state:string,retryIdentity=chunk.retryIdentity){return (await query(c,'SELECT nevora_tenancy.observe_typed_backfill_journal($1::text,$2::text,$3::text,$4::text) observation',[f.text,chunk.id,retryIdentity,state])).rows[0].observation;}
 function assess(f:ReturnType<typeof input>,o:unknown){expect(validateTypedBackfillJournalObservation(f.plan,f.descriptor,o).status).toBe('STRUCTURAL_OBSERVATIONS_ONLY');}
 async function rejected(text:string,expected:string){try{await first.query('SELECT nevora_tenancy.register_typed_backfill_journal($1::text)',[text]);throw Error('EXPECTED_TYPED_STORE_REJECTION');}catch(e){const error=e as {code?:string;message?:string};expect(error.code).toBe('P0001');expect(error.message).toBe(expected);record({kind:'EXPECTED_STRUCTURAL_REJECTION',code:expected});}}
 beforeAll(async()=>{
  expect(leasePath!==undefined&&runPath!==undefined).toBe(true);expect(process.env.DATABASE_URL===undefined&&process.env.FUEL_TEST_DATABASE_URL===undefined).toBe(true);expect(isAbsolute(leasePath!)&&isAbsolute(runPath!)).toBe(true);expect(realpathSync(runPath!)).toBe(runPath);
  lease=JSON.parse(readFileSync(leasePath!,'utf8'));expect(lease.scope).toBe('OWNED_LOCAL_F10');expect(lease.closed).toBe(false);expect(lease.invocation).toMatch(/^[a-z][a-z0-9_]{7,30}$/);expect(Number.isSafeInteger(lease.port)&&lease.port>1024&&lease.port<65536).toBe(true);expect(realpathSync(lease.root)).toBe(lease.root);expect(realpathSync(lease.data)).toBe(join(lease.root,'data'));const pid=readFileSync(join(lease.data,'postmaster.pid'),'utf8').split('\n');expect(Number(pid[0])).toBe(lease.pid);expect(realpathSync(pid[1])).toBe(lease.data);expect(pid[2]).toBe(lease.pidStart);expect(Number(pid[3])).toBe(lease.port);
  const st=lstatSync(lease.credentialFile);expect(st.isFile()&&!st.isSymbolicLink()).toBe(true);expect(realpathSync(lease.credentialFile)).toBe(lease.credentialFile);expect(lease.credentialFile.startsWith(lease.root+sep)).toBe(true);expect(statSync(lease.credentialFile).mode&0o777).toBe(0o600);
  manifest=JSON.parse(readFileSync(join(runPath!,'installed-typed-journal-custody.json'),'utf8'));expect(manifest.sourceSHA256).toBe(hash(source));expect(manifest.testSHA256).toBe(hash(readFileSync(testPath)));expect(manifest.registryDigest).toBe(registry.digest);expect(manifest.databaseOid).toBe(lease.databaseOid);expect(manifest.operators).toHaveLength(2);expect(new Set([lease.user,...manifest.operators.map(r=>r.name),manifest.outsider.name]).size).toBe(4);
  admin=await connect(lease.user);await identity(admin,{name:lease.user,oid:manifest.ownerRoleOid,systemUser:'scram-sha-256:'+lease.user});const base=(await query(admin,"SELECT pg_catalog.current_setting('data_directory') data,(SELECT system_identifier::text FROM pg_catalog.pg_control_system()) system_id,pg_catalog.shobj_description($1::oid,'pg_database') marker,pg_catalog.current_setting('server_version') version,pg_catalog.current_setting('server_encoding') encoding",[lease.databaseOid])).rows[0];expect(base).toMatchObject({data:lease.data,system_id:lease.systemIdentifier,marker:lease.marker,encoding:'UTF8'});expect(base.version).toMatch(/^18\.4(?:\s|$)/);
  const own=(await query(admin,"SELECT (SELECT nspowner::text FROM pg_catalog.pg_namespace WHERE oid=$1::oid) schema_owner,(SELECT relowner::text FROM pg_catalog.pg_class WHERE oid=$2::oid) plan_owner,(SELECT relowner::text FROM pg_catalog.pg_class WHERE oid=$3::oid) chunk_owner,pg_catalog.to_regclass('nevora_tenancy.typed_backfill_journal_plan')::oid::text plan_oid,pg_catalog.to_regclass('nevora_tenancy.typed_backfill_journal_chunk')::oid::text chunk_oid",[manifest.schemaOid,manifest.planTableOid,manifest.chunkTableOid])).rows[0];expect(own).toEqual({schema_owner:manifest.ownerRoleOid,plan_owner:manifest.ownerRoleOid,chunk_owner:manifest.ownerRoleOid,plan_oid:manifest.planTableOid,chunk_oid:manifest.chunkTableOid});
  expect(manifest.functions).toHaveLength(13);expect(new Set(manifest.functions.map(f=>f.oid)).size).toBe(13);expect((await query(admin,'SELECT count(*)::int n FROM pg_catalog.pg_proc WHERE pronamespace=$1::oid',[manifest.schemaOid])).rows[0].n).toBe(13);
  for(const f of manifest.functions){const row=(await query(admin,'SELECT oid::text oid,proowner::text owner,prosecdef definer,proconfig,pg_catalog.pg_get_functiondef(oid) definition FROM pg_catalog.pg_proc WHERE oid=pg_catalog.to_regprocedure($1)',[f.signature])).rows[0];expect(row.oid).toBe(f.oid);expect(row.owner).toBe(manifest.ownerRoleOid);expect(row.definer).toBe(false);expect(row.proconfig).toContain('search_path=pg_catalog');expect(hash(row.definition)).toBe(f.definitionSHA256);}
  expect((await query(admin,"SELECT count(*)::int n FROM pg_catalog.pg_class c CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a WHERE c.oid=ANY($1::oid[]) AND a.grantee=0",[[manifest.planTableOid,manifest.chunkTableOid]])).rows[0].n).toBe(0);
  expect((await query(admin,"SELECT count(*)::int n FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a WHERE p.oid=ANY($1::oid[]) AND a.grantee=0",[manifest.functions.map(f=>f.oid)])).rows[0].n).toBe(0);
  first=await connect(manifest.operators[0].name);second=await connect(manifest.operators[1].name);outsider=await connect(manifest.outsider.name);
  for(const [c,r] of [[first,manifest.operators[0]],[second,manifest.operators[1]],[outsider,manifest.outsider]] as const){await identity(c,r);const role=(await query(c,'SELECT oid::text oid,rolcanlogin login,rolsuper super,rolbypassrls bypass,rolcreaterole create_role,rolcreatedb create_db,rolreplication replication,rolinherit inherit FROM pg_catalog.pg_roles WHERE rolname=session_user')).rows[0];expect(role).toEqual({oid:r.oid,login:true,super:false,bypass:false,create_role:false,create_db:false,replication:false,inherit:false});expect((await query(c,'SELECT count(*)::int n FROM pg_catalog.pg_auth_members WHERE member=$1::oid',[r.oid])).rows[0].n).toBe(0);expect((await query(c,"SELECT pg_catalog.has_schema_privilege(session_user,$1::oid,'CREATE') ddl,pg_catalog.has_table_privilege(session_user,$2::oid,'TRUNCATE') trunc,pg_catalog.has_table_privilege(session_user,$3::oid,'TRIGGER') trigger",[manifest.schemaOid,manifest.planTableOid,manifest.chunkTableOid])).rows[0]).toEqual({ddl:false,trunc:false,trigger:false});expect((await query(c,"SELECT pg_catalog.has_schema_privilege(session_user,$1::oid,'USAGE') allowed",[manifest.schemaOid])).rows[0].allowed).toBe(r.name!==manifest.outsider.name);}
  record({kind:'VERIFIED_FICTIONAL_STORE_CUSTODY',sourceSHA256:hash(source),testSHA256:hash(readFileSync(testPath)),databaseOid:lease.databaseOid,claim:'DURABLE_OBSERVATIONS_ONLY_NO_SOURCE_TARGET_EXECUTION'});
 });
 afterAll(async()=>{for(const c of clients){try{if(['T','E'].includes(c.getTransactionStatus()??''))await query(c,'ROLLBACK');await c.end();}catch{record({kind:'OWN_CLIENT_CLOSE_FAILED'});throw Error('OWNED_TYPED_JOURNAL_CLIENT_CLEANUP_FAILED');}}if(runPath&&clients.size)writeFileSync(join(runPath,'typed-journal-test-receipt.json'),JSON.stringify({records,ownClientsClosed:true,resourceCleanup:'ROOT_REQUIRED_NO_RESOURCE_CREATE_OR_DROP_BY_TEST',claim:'OBSERVATION_STORAGE_ONLY_NOT_EFFECTS'},null,2),{flag:'wx',mode:0o600});});

 it('stores all original chunks and descriptors durably across a fresh own connection',async()=>{const f=input(),o=await register(first,f.text);assess(f,o);expect(o.rows.map((r:{state:string})=>r.state)).toEqual(f.descriptor.chunks.map(()=>'NOT_STARTED'));const fresh=await connect(manifest.operators[0].name);expect(await read(fresh,f.text)).toEqual(o);expect(o.effectsVerified).toBe(false);expect(o.reconciliation).toBeNull();});
 it('registers complete empty68 table descriptor with zero physical chunks',async()=>{const f=input([]),o=await register(first,f.text);expect(o.rows).toEqual([]);assess(f,o);expect((await query(first,'SELECT chunk_count::text count FROM nevora_tenancy.typed_backfill_journal_plan WHERE plan_digest=$1',[f.plan.digest])).rows[0].count).toBe('0');});
 it('makes exact same-plan two-operator registration idempotent under concurrency',async()=>{const f=input(),results=await Promise.all([register(first,f.text),register(second,f.text)]);expect(results[0]).toEqual(results[1]);assess(f,results[0]);expect((await query(first,'SELECT count(*)::text n FROM nevora_tenancy.typed_backfill_journal_chunk WHERE plan_digest=$1',[f.plan.digest])).rows[0].n).toBe(String(f.descriptor.chunks.length));});
 it('serializes concurrent STARTED/UNKNOWN with terminal UNKNOWN',async()=>{const f=input();await register(first,f.text);const c=f.descriptor.chunks[0],results=await Promise.allSettled([observe(first,f,c,'STARTED'),observe(second,f,c,'UNKNOWN')]);expect(results.filter(r=>r.status==='fulfilled').length).toBeGreaterThanOrEqual(1);const o=await read(first,f.text);expect(o.rows[0].state).toBe('UNKNOWN');assess(f,o);record({kind:'CONCURRENT_TERMINAL_UNKNOWN',statuses:results.map(r=>r.status)});});
 it.each(['NOT_STARTED','STARTED','UNKNOWN'] as const)('idempotently retains exact state %s',async state=>{const f=input();await register(first,f.text);const c=f.descriptor.chunks[0];if(state!=='NOT_STARTED')await observe(first,f,c,state);expect(await observe(first,f,c,state)).toEqual(await read(second,f.text));});
 it('permits NOT_STARTED→STARTED→UNKNOWN and refuses UNKNOWN downgrade',async()=>{const f=input();await register(first,f.text);const c=f.descriptor.chunks[0];await observe(first,f,c,'STARTED');await observe(first,f,c,'UNKNOWN');for(const s of ['NOT_STARTED','STARTED'])await expect(observe(first,f,c,s)).rejects.toThrow('OWNED_TYPED_JOURNAL_SQL_P0001');expect((await read(first,f.text)).rows[0].state).toBe('UNKNOWN');});
 it('refuses STARTED→NOT_STARTED and completion states without changes',async()=>{const f=input();await register(first,f.text);const c=f.descriptor.chunks[0];await observe(first,f,c,'STARTED');for(const s of ['NOT_STARTED','COMPLETE','COMMITTED','UNKNOWN_NEW'])await expect(observe(first,f,c,s)).rejects.toThrow('OWNED_TYPED_JOURNAL_SQL_P0001');expect((await read(first,f.text)).rows[0].state).toBe('STARTED');});
 it('rejects wrong/missing retry/chunk identities before state mutation',async()=>{const f=input();await register(first,f.text);const c=f.descriptor.chunks[0];await expect(observe(first,f,c,'STARTED',sha('d'))).rejects.toThrow('P0001');expect(await denied(first,'SELECT nevora_tenancy.observe_typed_backfill_journal($1,$2,$3,$4)',[f.text,sha('e'),c.retryIdentity,'STARTED'])).toBe('P0001');expect((await read(first,f.text)).rows.every((r:{state:string})=>r.state==='NOT_STARTED')).toBe(true);});
 it('refuses a changed boundary under the original plan digest despite coherent descriptor rehash',async()=>{const f=input();await register(first,f.text);const changed=rehash({...f.descriptor,boundary:{...f.descriptor.boundary,snapshotId:'changed retained boundary'}});await expect(register(first,canonical(changed))).rejects.toThrow('P0001');assess(f,await read(first,f.text));});
 it('rejects original68 coverage gaps/extras/reorder without storing a parent',async()=>{for(const change of [(d:TypedBackfillJournalDescriptor)=>({...d,tables:d.tables.slice(1)}),(d:TypedBackfillJournalDescriptor)=>({...d,tables:[...d.tables,d.tables[0]]}),(d:TypedBackfillJournalDescriptor)=>({...d,tables:[...d.tables].reverse()})]){const f=input();await rejected(canonical(rehash(change(f.descriptor))),'TYPED_JOURNAL_COVERAGE_DRIFT');expect((await query(first,'SELECT count(*)::text n FROM nevora_tenancy.typed_backfill_journal_plan WHERE plan_digest=$1',[f.plan.digest])).rows[0].n).toBe('0');}});
 it('rejects chunk omission/duplication and original row checksum drift',async()=>{const f=input();await rejected(canonical(rehash({...f.descriptor,chunks:f.descriptor.chunks.slice(1)})),'TYPED_JOURNAL_INVALID_CHUNK');await rejected(canonical(rehash({...f.descriptor,chunks:[...f.descriptor.chunks,f.descriptor.chunks[0]]})),'TYPED_JOURNAL_INVALID_CHUNK');const d=clone(f.descriptor);d.chunks[0].rows[0].wireChecksum=sha('e');await rejected(canonical(rehash(d)),'TYPED_JOURNAL_ROW_CHECKSUM_DRIFT');});
 it('rejects table checksum mismatch without claiming original plan authority',async()=>{const f=input(),d=clone(f.descriptor);d.tables[0].sourceChecksum=sha('e');await rejected(canonical(rehash(d)),'TYPED_JOURNAL_TABLE_CHECKSUM_DRIFT');});
 it('rejects changed original registry/source column/mirror/fence contracts',async()=>{const f=input(),d=clone(f.descriptor);d.tables[0].globalFences=['UNDECLARED_FENCE'];await rejected(canonical(rehash(d)),'TYPED_JOURNAL_COVERAGE_DRIFT');const other=clone(f.descriptor);other.boundary.registryDigest=sha('a');await rejected(canonical(rehash(other)),'TYPED_JOURNAL_SOURCE_REGISTRY_DRIFT');});
 it('rejects descriptor/keys/rows digest changes and noncanonical/duplicate metadata',async()=>{const f=input();await rejected(canonical({...f.descriptor,descriptorChecksum:sha('a')}),'TYPED_JOURNAL_DESCRIPTOR_CHECKSUM_DRIFT');await rejected(' '+f.text,'TYPED_JOURNAL_NONCANONICAL_DESCRIPTION');await rejected('{"format":"x","format":"y"}','TYPED_JOURNAL_DUPLICATE_JSON_FIELD');for(const field of ['keysChecksum','rowsChecksum'] as const){const d=clone(f.descriptor);d.chunks[0][field]=sha('a');await rejected(canonical(rehash(d)),'TYPED_JOURNAL_ROW_CHECKSUM_DRIFT');}});
 it('rejects missing/null/unknown top fields and false completion/effects claims',async()=>{const f=input();for(const d of [{...f.descriptor,format:null},{...f.descriptor,effectsVerified:true},{...f.descriptor,reconciliation:null},{...f.descriptor,remainingGates:[]},{...f.descriptor,format:'BACKFILL_CHUNK_JOURNAL_V1'}])await rejected(canonical({...d,descriptorChecksum:ownershipDigest(Object.fromEntries(Object.entries(d).filter(([k])=>k!=='descriptorChecksum')))}),'TYPED_JOURNAL_INVALID_DESCRIPTION');});
 it('preserves padded/bigint/boolean/text keys and opaque typed wire hashes',async()=>{const f=input([{table:'workspaces',wire:{id:' A ',singleton:'t',shift_change_policy:'{"unsafe":9007199254740993,"scale":1.00,"null":null}'}},{table:'password_recovery_limits',wire:{scope:' preserved global ',bucket:'9223372036854775807'}}]),o=await register(first,f.text);assess(f,o);expect(o.rows.map((r:{chunk:unknown})=>r.chunk)).toEqual(f.descriptor.chunks);expect(f.descriptor.chunks.some(c=>c.keys.some(k=>k.includes('9223372036854775807')))).toBe(true);});
 it('retains actual source-shaped boolean keys and native array mirror digests',async()=>{const f=input([...base(),{table:'calendar_clock',wire:{singleton:'t'}},{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000001',workspace_id:'A',employee_id:'E',digest:sha('b'),generation:'00000000-0000-4000-8000-000000000002',allowed_location_ids:'[-1:0]={L,NULL}'}}]),o=await register(first,f.text);assess(f,o);expect(f.descriptor.chunks.find(c=>c.table==='calendar_clock')!.keys).toEqual([[true]]);const row=f.plan.entries.find(e=>e.table==='calendar_subscriptions')!;expect(row.source.columns.find(c=>c.name==='allowed_location_ids')!.wire).toBe('[-1:0]={L,NULL}');expect(o.rows.find((r:{chunk:{table:string}})=>r.chunk.table==='calendar_subscriptions').chunk.rows[0].wireChecksum).toBe(row.wireChecksum);});
 it('enforces immutable physical plan/chunk identity and denies deletes/truncate',async()=>{const f=input();await register(first,f.text);for(const text of ["UPDATE nevora_tenancy.typed_backfill_journal_plan SET descriptor_canonical=descriptor_canonical||' ' WHERE plan_digest=$1",'DELETE FROM nevora_tenancy.typed_backfill_journal_plan WHERE plan_digest=$1','UPDATE nevora_tenancy.typed_backfill_journal_chunk SET retry_identity=$2 WHERE plan_digest=$1','DELETE FROM nevora_tenancy.typed_backfill_journal_chunk WHERE plan_digest=$1'])expect(await denied(admin,text,[f.plan.digest,...(text.includes('$2')?[sha('c')]:[])])).toBe('P0001');expect(await denied(admin,'TRUNCATE nevora_tenancy.typed_backfill_journal_plan')).toBe('0A000');for(const text of ['TRUNCATE nevora_tenancy.typed_backfill_journal_plan,nevora_tenancy.typed_backfill_journal_chunk','TRUNCATE nevora_tenancy.typed_backfill_journal_chunk'])expect(await denied(admin,text)).toBe('P0001');assess(f,await read(first,f.text));});
 it('deferred incomplete parent coverage refuses COMMIT and rolls back every control write',async()=>{const f=input();await query(admin,'BEGIN');await query(admin,'INSERT INTO nevora_tenancy.typed_backfill_journal_plan(plan_digest,descriptor_canonical,boundary,chunk_count) VALUES($1,$2,$3::jsonb,$4)',[f.plan.digest,f.text,canonical(f.descriptor.boundary),f.descriptor.chunks.length]);expect(await denied(admin,'COMMIT')).toBe('P0001');if(admin.getTransactionStatus()!=='I')await query(admin,'ROLLBACK');expect((await query(first,'SELECT count(*)::text n FROM nevora_tenancy.typed_backfill_journal_plan WHERE plan_digest=$1',[f.plan.digest])).rows[0].n).toBe('0');});
 it('rolls back complete registration and state changes on an own aborted transaction',async()=>{const f=input();await query(first,'BEGIN');await register(first,f.text);await observe(first,f,f.descriptor.chunks[0],'UNKNOWN');await query(first,'ROLLBACK');expect((await query(second,'SELECT count(*)::text n FROM nevora_tenancy.typed_backfill_journal_chunk WHERE plan_digest=$1',[f.plan.digest])).rows[0].n).toBe('0');expect((await query(second,'SELECT count(*)::text n FROM nevora_tenancy.typed_backfill_journal_plan WHERE plan_digest=$1',[f.plan.digest])).rows[0].n).toBe('0');});
 it('nonowner/outsider cannot change immutable metadata, controls or DDL',async()=>{const f=input();await register(first,f.text);expect(await denied(first,'UPDATE nevora_tenancy.typed_backfill_journal_plan SET descriptor_canonical=$2 WHERE plan_digest=$1',[f.plan.digest,f.text])).toBe('42501');expect(await denied(first,'ALTER TABLE nevora_tenancy.typed_backfill_journal_chunk DISABLE TRIGGER ALL')).toBe('42501');expect(await denied(outsider,'SELECT nevora_tenancy.register_typed_backfill_journal($1)',[f.text])).toBe('42501');expect(await denied(outsider,'SELECT * FROM nevora_tenancy.typed_backfill_journal_plan')).toBe('42501');});
});
