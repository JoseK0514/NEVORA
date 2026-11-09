import {compileLegacyEmployeeNumberEnrollment,compareLegacyEmployeeNumberEnrollmentTarget,isIssuedLegacyEmployeeNumberEnrollment} from './employee-number-enrollment';
import {describe,it,expect,vi} from 'vitest';
import {compileTypedTenantBackfill,isIssuedTypedTenantBackfillPlan,type TypedTenantBackfillPlan} from './typed-backfill';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createTypedSnapshotFixture} from './typed-fixture.test-support';
import {inspectTypedMigrationSnapshot} from './typed-snapshot';
import {OWNERSHIP_SOURCE,canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,type JsonValue} from './ownership';
import {DATABASE_NAMESPACES,validateTypedDatabaseNamespaceComparators} from './namespace-comparators';
import {validateTypedSnapshotOwnership,type TypedOwnershipAssignments} from './typed-ownership';
import {getTypedReferenceColumnContract,validateTypedMigrationCellReferences,type TypedReferenceClassificationInput} from './typed-reference';
import {validateTypedSourceConstraints,type TypedSourceConstraintWithKeysObservations} from './typed-constraints';
import {getTypedKeyComparatorContracts,getTypedKeyComparatorStockDescriptors,validateTypedKeyComparators,type TypedKeyComparatorCapture,type TypedKeyComparatorComponent} from './typed-key-comparators';

const registry=getOwnershipRegistry();
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
const keyContract=(table:string,label:string)=>keyContracts.find(c=>c.table===table&&c.label===label)!;
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

describe('pure typed tenant backfill compilation',()=>{
 it('includes all68 empty source tables, complete SQL metadata and no effects claim',()=>{
  const f=withKeys(),p=planned(f);expect(p.format).toBe('TYPED_TENANT_BACKFILL_PLAN_V1');expect(p.status).toBe('PLANNED');expect(p.verification).toBe('PURE_NOT_DATABASE_OPERATOR_OR_EFFECT_AUTHORITY');
  expect(p.manifest.tables.map(t=>t.table)).toEqual(registry.tables.map(t=>t.table));expect(p.manifest.tables).toHaveLength(68);expect(p.entries).toEqual([]);expect(p.chunks).toEqual([]);expect(p.manifest.tables.every(t=>t.count===0&&t.sourceChecksum===ownershipDigest([])&&t.wireChecksum===ownershipDigest([])&&t.expectedMetadataChecksum===ownershipDigest([]))).toBe(true);
  expect(p.manifest.observations.constraints.keyComparators.catalogs).toHaveLength(104);expect(p.manifest.keyCaptureChecksum).toBe(f.keyObservations.captureChecksum);expect(p.manifest.constraintsDigest).toBe(constraints(f).digest);expect(p.remainingGates).toContain('ATOMIC_TYPED_EFFECTS_AND_DURABLE_JOURNAL_RECONCILIATION');
 });
 it('derives only exact0026 actions and preserves all original columns/ownership ancestry',()=>{
  const f=withKeys([...base(),pin(),{table:'password_recovery_proofs',wire:{token_hash:sha('a'),employee_id:'E'}},{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775807'}}]),p=planned(f);
  const action=(table:string)=>p.entries.find(e=>e.table===table)!.action;expect(action('employees')).toBe('ASSIGN_ADDED_DIRECT_WORKSPACE');expect(action('clocker_pin_events')).toBe('INSERT_TYPED_SIDECAR');expect(action('workspaces')).toBe('PRESERVE_EXISTING_NO_WRITE');expect(action('locations')).toBe('PRESERVE_EXISTING_NO_WRITE');expect(action('password_recovery_proofs')).toBe('PRESERVE_EXISTING_NO_WRITE');expect(action('password_recovery_limits')).toBe('GLOBAL_NO_WRITE');
  expect(p.entries.map(e=>e.source)).toEqual(f.ownership.rows);expect(p.manifest.observations.snapshot).toEqual(f.snapshot);expect(p.manifest.observations.ownership).toEqual(f.ownership);expect(p.entries.find(e=>e.table==='password_recovery_limits')!.source.workspaceId).toBeNull();
 });
 it('binds source ordered native wires separately from the typed metadata effect',()=>{
  const f=withKeys([...base(),pin()]),p=planned(f);for(const e of p.entries){const raw=f.facts.wireRows.find(r=>(r as Record<string,JsonValue>).table===e.table&&canonicalOwnershipJson((r as Record<string,JsonValue>).key)===canonicalOwnershipJson(e.key)) as Record<string,JsonValue>;expect(e.wireValues).toEqual(raw.values);expect(e.wireChecksum).toBe(raw.wireChecksum);expect(e.sourceChecksum).toBe(raw.originalChecksum);expect(e.expectedMetadataChecksum).toBe(ownershipDigest(e.effect));}
  const direct=p.entries.find(e=>e.table==='employees')!;expect(direct.effect).toMatchObject({kind:'ASSIGN_ADDED_DIRECT_WORKSPACE',table:'employees',column:'workspace_id',workspaceId:'A',precondition:'PROVEN_NULL_ADDED_METADATA'});expect(Object.hasOwn(direct.effect,'businessValues')).toBe(false);
  const sidecar=p.entries.find(e=>e.table==='clocker_pin_events')!;expect(sidecar.effect).toMatchObject({kind:'INSERT_TYPED_SIDECAR',table:'clocker_pin_events_tenant_ownership',workspaceId:'A',sourceChecksum:sidecar.sourceChecksum,captureManifestBinding:'ORIGINAL_TYPED_PLAN_DIGEST',precondition:'EXACT_ABSENCE_REQUIRED'});
 });
 it('retains exactly sorted registry mirrors with original SQL types, wires and lineages',()=>{const p=planned(withKeys([...base(),pin()])),e=p.entries.find(e=>e.table==='clocker_pin_events')!,rule=registry.tables.find(t=>t.table===e.table)!;expect(e.mirroredIdentity.map(c=>c.name)).toEqual([...new Set([...rule.primaryKey,...rule.mirroredIdentityColumns])].sort());expect(e.mirroredIdentity).toEqual(e.mirroredIdentity.map(c=>e.source.columns.find(s=>s.name===c.name)!));expect(e.mirroredIdentityChecksum).toBe(ownershipDigest(e.mirroredIdentity));if(e.effect.kind==='INSERT_TYPED_SIDECAR')expect(e.effect.identity).toEqual(e.mirroredIdentity);});
 it('preserves padded/long root, employee and sidecar keys without normalization',()=>{const owner=' '+('A'.repeat(250))+' ',emp=' E ',f=withKeys([root(owner),location(' L ',owner),employee(emp,owner,' L '),{table:'clocker_pin_events',wire:{id:' PIN ',employee_id:emp,actor_employee_id:emp,pin_version:'1'}}]),p=planned(f);expect(p.entries.find(e=>e.table==='employees')!.key).toEqual([emp]);expect(p.entries.find(e=>e.table==='employees')!.source.workspaceId).toBe(owner);expect(p.entries.find(e=>e.table==='clocker_pin_events')!.mirroredIdentity.find(c=>c.name==='actor_employee_id')!.wire).toBe(emp);});
 it('preserves exact unsafe JSON numeric lexemes, SQLNULL and JSONNULL distinctly',()=>{const wire='{"unsafe":9007199254740993,"scale":1.00,"fraction":0.123456789012345678901,"none":null}',a=planned(withKeys([{table:'workspaces',wire:{id:'A',shift_change_policy:wire}}])),b=planned(withKeys([{table:'workspaces',wire:{id:'A',shift_change_policy:null}}])),c=planned(withKeys([{table:'workspaces',wire:{id:'A',shift_change_policy:'null'}}]));const cell=a.entries[0].source.columns.find(c=>c.name==='shift_change_policy')!;expect(cell.wire).toBe(wire);expect(cell.lineage.nodes.filter(n=>n.value.kind==='JSON_NUMBER').map(n=>n.value.kind==='JSON_NUMBER'?n.value.lexeme:'')).toEqual(['9007199254740993','1.00','0.123456789012345678901']);expect(b.entries[0].source.columns.find(c=>c.name==='shift_change_policy')!.lineage.nodes[0].value.kind).toBe('SQL_NULL');expect(c.entries[0].source.columns.find(c=>c.name==='shift_change_policy')!.lineage.nodes[0].value.kind).toBe('JSON_NULL');expect(new Set([a.digest,b.digest,c.digest]).size).toBe(3);});
 it('retains native array lower bounds, SQL-null elements and every calendar credential fence',()=>{const f=withKeys([...base(),{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000001',workspace_id:'A',employee_id:'E',digest:sha('b'),generation:'00000000-0000-4000-8000-000000000002',allowed_location_ids:'[-1:0]={L,NULL}'}}]),p=planned(f),e=p.entries.find(e=>e.table==='calendar_subscriptions')!,c=e.source.columns.find(c=>c.name==='allowed_location_ids')!;expect(c.wire).toBe('[-1:0]={L,NULL}');expect(c.lineage.nodes[0].value).toMatchObject({kind:'SQL_ARRAY',dimensions:[{lowerBound:-1,length:2}]});expect(c.lineage.nodes[2]).toMatchObject({address:[{subscripts:[0]}],value:{kind:'SQL_ARRAY_NULL'}});expect(e.source.globalFences).toEqual(registry.tables.find(t=>t.table===e.table)!.globalFences);expect(e.action).toBe('PRESERVE_EXISTING_NO_WRITE');});
 it('retains inactive and historical source rows, full reviews and retained-history witnesses',()=>{const f=withKeys([...base(),{table:'schedule_templates',wire:{id:'T',name:'Retained',created_by:'E',active:'f'}},{table:'schedule_generation_exclusions',wire:{id:'X',workspace_id:'A',location_id:'L',created_by:'E',deleted_source_shift_id:'deleted-old-shift'}}]),p=planned(f),e=p.entries.find(e=>e.table==='schedule_generation_exclusions')!;expect(e.source.references.some(r=>r.historical&&r.evidenceDigest===sha('f')&&r.targetRowChecksum===null)).toBe(true);expect(e.source.evidenceDigests).toContain(sha('f'));expect(p.entries.find(e=>e.table==='schedule_templates')!.source.columns.find(c=>c.name==='active')!.wire).toBe('f');expect(e.source.columnReviews).toEqual(f.ownership.rows.find(r=>r.table===e.table)!.columnReviews);});
 it('orders rows canonically and chunks deterministically per table with original-plan retry identity',()=>{const f=withKeys([root(),location(),employee('E3'),employee('E1'),employee('E2')]),p=planned(f,2),again=planned(f,2);expect(p).toEqual(again);expect(p.digest).toBe(ownershipDigest(p.manifest));expect(p.entries.map(e=>[e.table,e.key])).toEqual([...p.entries].sort((a,b)=>canonicalOwnershipJson([a.table,a.key])<canonicalOwnershipJson([b.table,b.key])?-1:1).map(e=>[e.table,e.key]));const chunks=p.chunks.filter(c=>c.table==='employees');expect(chunks.map(c=>c.count)).toEqual([2,1]);expect(chunks.flatMap(c=>c.entries.map(e=>e.key))).toEqual([['E1'],['E2'],['E3']]);for(const c of p.chunks){expect(c.planDigest).toBe(p.digest);expect(c.retryIdentity).toBe(c.id);expect(c.firstKey).toEqual(c.entries[0].key);expect(c.lastKey).toEqual(c.entries[c.count-1].key);expect(c.sourceChecksum).toBe(ownershipDigest(c.entries.map(e=>({key:e.key,sourceChecksum:e.sourceChecksum,wireChecksum:e.wireChecksum}))));expect(c.expectedMetadataChecksum).toBe(ownershipDigest(c.entries.map(e=>({key:e.key,action:e.action,checksum:e.expectedMetadataChecksum}))));}expect(p.chunks.map(c=>c.ordinal)).toEqual(p.chunks.map((_,i)=>i));expect(new Set(p.chunks.map(c=>c.id)).size).toBe(p.chunks.length);});
 it('changes original retry identities for source/evidence/chunk boundaries, never suggests new operation on uncertainty',()=>{const a=planned(withKeys(base()),1),b=planned(withKeys(base()),2),c=planned(withKeys([root(),location(),employee('E', 'A','L','Changed')]),1);expect(a.digest).not.toBe(b.digest);expect(a.digest).not.toBe(c.digest);expect(a.chunks[0].id).not.toBe(b.chunks[0].id);expect(a.chunks[0].id).not.toBe(c.chunks[0].id);expect(a.remainingGates).toContain('UNKNOWN_COMMIT_ORIGINAL_PLAN_FRESH_OWNED_RECONCILIATION');expect(Object.hasOwn(a,'effectsVerified')).toBe(false);});
 it('preserves explicit singleton installation coverage while proposing only added metadata',()=>{const f=withKeys([root(),{table:'calendar_clock',wire:{singleton:'t'}}]),p=planned(f),e=p.entries.find(e=>e.table==='calendar_clock')!;expect(e.action).toBe('ASSIGN_ADDED_DIRECT_WORKSPACE');expect(e.source.workspaceId).toBe('A');expect(e.source.evidenceDigests).toContain(sha('e'));expect(e.mirroredIdentity.map(c=>[c.name,c.type,c.wire])).toEqual([['singleton','boolean','t']]);expect(p.manifest.assignmentEvidenceDigest).toBe(f.ownership.assignmentEvidenceDigest);});
 it('retains exact empty root identity rather than inventing a tenant fallback',()=>{const p=planned(withKeys([root(''),location('L','')])),e=p.entries.find(e=>e.table==='locations')!;expect(e.source.workspaceId).toBe('');expect(e.action).toBe('PRESERVE_EXISTING_NO_WRITE');expect(e.source.columns.find(c=>c.name==='workspace_id')!.wire).toBe('');});
 it('binds alternate genuinely supplied SQL classes into distinct plans/retries, not source authority',()=>{const specs=base(),a=withKeys(specs),b=withKeys(specs,{[canonicalOwnershipJson([keyContract('employees','PRIMARY_KEY:["id"]').contractId,['E']])]:'77'}),pa=planned(a),pb=planned(b);expect(a.snapshot).toEqual(b.snapshot);expect(a.ownership).toEqual(b.ownership);expect(pa.manifest.keyCaptureChecksum).not.toBe(pb.manifest.keyCaptureChecksum);expect(pa.digest).not.toBe(pb.digest);expect(pa.chunks.map(c=>c.id)).not.toEqual(pb.chunks.map(c=>c.id));expect(pa.entries.map(e=>e.wireChecksum)).toEqual(pb.entries.map(e=>e.wireChecksum));});
 it('cannot grant plan provenance to an accessor envelope or a revoked proxy without traps',()=>{const p=planned(withKeys()),get=vi.fn(()=>{throw Error('getter');}),v={get digest(){return get();}},revoked=Proxy.revocable(p,{});revoked.revoke();expect(isIssuedTypedTenantBackfillPlan(v)).toBe(false);expect(isIssuedTypedTenantBackfillPlan(revoked.proxy)).toBe(false);expect(get).not.toHaveBeenCalled();});
 it('accepts independently genuine equivalent supplied observations by exact value, not object identity',()=>{const a=withKeys(base()),b=withKeys(base()),r=compileTypedTenantBackfill(a.snapshot,b.ownership,constraints(b),{chunkSize:1});expect(r.status).toBe('PLANNED');});
 for(const kind of ['source','schema','snapshot','fence','rows'] as const)it(`blocks independent genuine ${kind} boundary drift with no partial plan`,()=>{const a=withKeys(base()),b=withKeys(base(),{}, {},f=>{if(kind==='source'){f.facts.sourceDigest=sha('b');f.facts.namespaceComparators.binding.sourceDigest=sha('b');}if(kind==='schema'){(f.facts.catalog as KeyFixtureCatalog).schemas.push({name:'extra',acl:null});f.facts.currentSchemaDigest=ownershipDigest(f.facts.catalog);f.facts.namespaceComparators.binding.schemaDigest=f.facts.currentSchemaDigest;}if(kind==='snapshot'){f.facts.snapshot.id='13:20:';f.facts.namespaceComparators.binding.snapshotId='13:20:';}if(kind==='fence')f.facts.fence.generation='2';if(kind==='rows')f.row('locations',{id:'L2',workspace_id:'A',clocker_key:'K2'});}),r=compileTypedTenantBackfill(a.snapshot,b.ownership,constraints(b),{chunkSize:2});expect(r.status).toBe('BLOCKED');expect(Object.hasOwn(r,'plan')).toBe(false);});
 it('blocks independently genuine alternative namespace witnesses',()=>{const specs=[root(),location(),employee('E','A','L','Email')],a=withKeys(specs),b=withKeys(specs,{}, {[canonicalOwnershipJson(['employees.email_ci',['E']])]:'ALTERNATE'});expect(compileTypedTenantBackfill(a.snapshot,b.ownership,constraints(b),{chunkSize:2}).status).toBe('BLOCKED');});
 it('rejects genuinely issued V1 rather than silently upgrade incomplete key observations',()=>{const f=withKeys(),v=validateTypedSourceConstraints(f.snapshot,f.ownership,f.namespaces);if(v.status!=='VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS')throw Error('V1 fixture');expect(compileTypedTenantBackfill(f.snapshot,f.ownership,v.observations,{chunkSize:1})).toEqual({status:'BLOCKED',code:'TYPED_CONSTRAINTS_V2_REQUIRED'});});
 for(const index of [0,1,2])it(`rejects unissued input${index} before proxy/accessor traps`,()=>{const f=withKeys(),get=vi.fn(()=>{throw Error('trap');}),values:unknown[]=[f.snapshot,f.ownership,constraints(f)];values[index]=new Proxy({},{get,ownKeys:get,getPrototypeOf:get});const r=compileTypedTenantBackfill(...values as [unknown,unknown,unknown],{chunkSize:1});expect(r).toEqual({status:'BLOCKED',code:['UNISSUED_TYPED_SNAPSHOT','UNISSUED_TYPED_OWNERSHIP','UNISSUED_TYPED_CONSTRAINTS'][index]});expect(get).not.toHaveBeenCalled();});
 it('rejects serialized/shape/digest clones and revoked proxies without private reissuance',()=>{const f=withKeys(),inputs=[f.snapshot,f.ownership,constraints(f)];for(let i=0;i<3;i++)for(const v of [{...inputs[i]},JSON.parse(canonicalOwnershipJson(inputs[i])),{digest:'a'.repeat(64)},null]){const args:unknown[]=[...inputs];args[i]=v;expect(compileTypedTenantBackfill(...args as [unknown,unknown,unknown],{chunkSize:1}).status).toBe('BLOCKED');}const p=Proxy.revocable(f.snapshot,{});p.revoke();expect(compileTypedTenantBackfill(p.proxy,f.ownership,inputs[2],{chunkSize:1}).status).toBe('BLOCKED');});
 it.each([0,1001,-1,1.5,NaN,Infinity,'2',null,undefined])('requires explicit technical integer chunkSize1–1000: %j',chunkSize=>{const f=withKeys();expect(compileTypedTenantBackfill(f.snapshot,f.ownership,constraints(f),{chunkSize})).toEqual({status:'BLOCKED',code:'INVALID_TYPED_BACKFILL_OPTIONS'});});
 it('accepts explicit technical range endpoints without inventing workload policy',()=>{const f=withKeys();expect(compile(f,1).status).toBe('PLANNED');expect(compile(f,1000).status).toBe('PLANNED');expect(planned(f,1000).manifest.chunkSize).toBe(1000);});
 it('rejects hostile options proxy, accessor, prototype, extra/non-enumerable fields without reads',()=>{const f=withKeys(),get=vi.fn(()=>{throw Error('must not execute');}),options=[new Proxy({},{get,ownKeys:get,getPrototypeOf:get}),{get chunkSize(){return get();}},{chunkSize:1,extra:true},Object.create({chunkSize:1}),Object.defineProperty({chunkSize:1},'hidden',{value:1}),[],null];for(const v of options)expect(compileTypedTenantBackfill(f.snapshot,f.ownership,constraints(f),v).status).toBe('BLOCKED');expect(get).not.toHaveBeenCalled();});
 it('deeply freezes a deterministic plan without freezing/mutating input or accepting output copies',()=>{const f=withKeys(base()),before=canonicalOwnershipJson(f.snapshot),p=planned(f);expect(Object.isFrozen(p)).toBe(true);expect(Object.isFrozen(p.entries[0].wireValues)).toBe(true);expect(Object.isFrozen(p.manifest.tables)).toBe(true);expect(()=>{(p.entries[0].wireValues as (string|null)[])[0]='changed';}).toThrow();expect(canonicalOwnershipJson(f.snapshot)).toBe(before);expect(isIssuedTypedTenantBackfillPlan(p)).toBe(true);const get=vi.fn(()=>{throw Error('trap');});for(const v of [{...p},JSON.parse(canonicalOwnershipJson(p)),null,new Proxy(p,{get,ownKeys:get,getPrototypeOf:get})])expect(isIssuedTypedTenantBackfillPlan(v)).toBe(false);expect(get).not.toHaveBeenCalled();});
});

// Additive compiler regressions using the original typed-backfill fixtures.
// Reuse its withKeys/planned/root/location/employee fixtures, which call actual
// inspection/reference/ownership/namespace/key/constraint/compiler APIs. No
// private issuer mock or helper test-module import. Fictional SQL observations
// remain fictional and prove no DB/operator authority.
// Add imports from './employee-number-enrollment': compileLegacyEmployeeNumberEnrollment,
// compareLegacyEmployeeNumberEnrollmentTarget, isIssuedLegacyEmployeeNumberEnrollment.
describe('complete legacy employee-number enrollment compiler',()=>{
 it('retains complete original plan, inactive employments, raw identities and actual JS Unicode preimages',()=>{
  const ids=['\u00a0straße-2\u00a0','e\u0301','é','00002'];
  const p=planned(withKeys([root(),location(),...ids.map(id=>employee(id))]));
  const outcome=compileLegacyEmployeeNumberEnrollment(p);expect(outcome.status).toBe('COMPILED');
  if(outcome.status!=='COMPILED')throw Error('Genuine pure enrollment required');
  const e=outcome.enrollment;expect(e.originalPlan).toBe(p);expect(e.originalPlanDigest).toBe(p.digest);
  expect(e.originalPlan.manifest.tables).toHaveLength(68);expect(e.originalPlan.manifest.observations.constraints.keyComparators.catalogs).toHaveLength(104);
  expect(e.rows).toHaveLength(ids.length);
  for(const id of ids){const row=e.rows.find(r=>r.employeeId===id)!;
   expect(row.employeeNumber).toBe(id);expect(row.normalizedNumber).toBe(id.trim().toUpperCase());
   expect(row.originalKey).toEqual([id]);expect(row.source).toBe(p.entries.find(r=>r.table==='employees'&&r.key[0]===id)!.source);
   expect(Object.isFrozen(row)).toBe(true);
  }
  expect(e.rows.find(r=>r.employeeId===ids[0])!.normalizedNumber).toBe('STRASSE-2');
  expect(Object.isFrozen(e)).toBe(true);expect(Object.isFrozen(e.rows)).toBe(true);
  expect(isIssuedLegacyEmployeeNumberEnrollment(e)).toBe(true);
  expect(isIssuedLegacyEmployeeNumberEnrollment({...e})).toBe(false);
 });
 it('supports a complete genuinely issued empty capture without inventing empty expression namespace rows',()=>{
  const p=planned(withKeys()),outcome=compileLegacyEmployeeNumberEnrollment(p);
  expect(outcome.status).toBe('COMPILED');if(outcome.status!=='COMPILED')throw Error('Empty genuine source');
  expect(outcome.enrollment.rows).toEqual([]);
  expect(compareLegacyEmployeeNumberEnrollmentTarget(outcome.enrollment,[]).status).toBe('COMPLETE_IDENTICAL');
 });
 it('rejects raw format characters permitted by the older narrow selector without rewriting them',()=>{
  const p=planned(withKeys([root(),location(),employee('ab\u200dcd')]));
  expect(compileLegacyEmployeeNumberEnrollment(p)).toEqual({status:'BLOCKED',code:'LEGACY_NAMESPACE_PREFLIGHT_BLOCKED'});
 });
 it('rejects plan clones, serialization and revoked/hostile proxies before any traps',()=>{
  const p=planned(withKeys([root(),location(),employee()])),trap=vi.fn(()=>{throw Error('trap');});
  const revoked=Proxy.revocable(p,{});revoked.revoke();
  for(const input of [{...p},JSON.parse(canonicalOwnershipJson(p)),null,new Proxy(p,{get:trap,ownKeys:trap,getPrototypeOf:trap}),revoked.proxy])
   expect(compileLegacyEmployeeNumberEnrollment(input)).toEqual({status:'BLOCKED',code:'GENUINE_ORIGINAL_TYPED_PLAN_REQUIRED'});
  expect(trap).not.toHaveBeenCalled();
 });
 it('distinguishes empty from exact full identical and rejects every partial/foreign/renormalized tuple',()=>{
  const p=planned(withKeys([root(),location(),employee(' e '),employee('Ω')])),outcome=compileLegacyEmployeeNumberEnrollment(p);
  if(outcome.status!=='COMPILED')throw Error('Genuine fixture required');const e=outcome.enrollment;
  const tuples=e.rows.map(r=>[r.employeeId,r.workspaceId,r.employeeNumber,r.normalizedNumber]);
  expect(compareLegacyEmployeeNumberEnrollmentTarget(e,[]).status).toBe('EMPTY');
  expect(compareLegacyEmployeeNumberEnrollmentTarget(e,[...tuples].reverse()).status).toBe('COMPLETE_IDENTICAL');
  for(const bad of [tuples.slice(1),[...tuples,tuples[0]],tuples.map((r,i)=>i===0?[r[0],'foreign',r[2],r[3]]:r),tuples.map((r,i)=>i===0?[r[0],r[1],r[2].trim(),r[3]]:r)])
   expect(compareLegacyEmployeeNumberEnrollmentTarget(e,bad)).toEqual({status:'BLOCKED',code:'MAPPING_TARGET_PARTIAL_OR_CONFLICTING'});
 });
 it('rejects hostile target envelopes/UTF8 data without property invocation or structural reissuance',()=>{
  const p=planned(withKeys([root(),location(),employee()])),outcome=compileLegacyEmployeeNumberEnrollment(p);
  if(outcome.status!=='COMPILED')throw Error('Genuine fixture required');const e=outcome.enrollment,trap=vi.fn(()=>{throw Error('trap');});
  const array=Object.defineProperty([],'0',{get:trap,enumerable:true}),sparse=new Array(1);
  const revoked=Proxy.revocable([],{});revoked.revoke();
  for(const value of [new Proxy([],{get:trap,ownKeys:trap,getPrototypeOf:trap}),array,sparse,revoked.proxy,[['E','A','E','\ud800']],Object.assign([],{extra:true})])
   expect(compareLegacyEmployeeNumberEnrollmentTarget(e,value)).toEqual({status:'BLOCKED',code:'MAPPING_TARGET_SHAPE_DRIFT'});
  expect(trap).not.toHaveBeenCalled();
  expect(compareLegacyEmployeeNumberEnrollmentTarget({...e},[])).toEqual({status:'BLOCKED',code:'GENUINE_LEGACY_ENROLLMENT_REQUIRED'});
 });
});
