import {describe,it,expect,vi} from 'vitest';
import {describeTypedBackfillJournal,validateTypedBackfillJournalObservation,type TypedBackfillJournalDescriptor} from './typed-journal-contract';
import {compileTypedTenantBackfill,type TypedTenantBackfillPlan} from './typed-backfill';
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


function described(plan:TypedTenantBackfillPlan):TypedBackfillJournalDescriptor{const r=describeTypedBackfillJournal(plan);expect(r.status).toBe('DESCRIBED');if(r.status!=='DESCRIBED')throw Error(canonicalOwnershipJson(r));return r.descriptor;}
const clone=<T,>(value:T):T=>JSON.parse(canonicalOwnershipJson(value));
function observed(d:TypedBackfillJournalDescriptor,state='NOT_STARTED'){return {format:'TYPED_BACKFILL_JOURNAL_OBSERVATION_V1',boundary:clone(d.boundary),descriptorChecksum:d.descriptorChecksum,rows:d.chunks.map(c=>({chunk:clone(c),state,retryIdentity:c.retryIdentity})),effectsVerified:false,reconciliation:null};}
const nonempty=()=>planned(withKeys([...base(),pin(),{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775807'}}]),1);
function validated(p:TypedTenantBackfillPlan,d=described(p),o:unknown=observed(d)){const r=validateTypedBackfillJournalObservation(p,d,o);expect(r.status).toBe('STRUCTURAL_OBSERVATIONS_ONLY');return r.status==='STRUCTURAL_OBSERVATIONS_ONLY'?r.assessment:neverResult(r);}
function neverResult(r:unknown):never{throw Error(canonicalOwnershipJson(r));}

describe('pure explicitly separate typed journal descriptor and structural observation contract',()=>{
 it('describes all68 empty tables and full typed original boundary without database/effects claims',()=>{const p=planned(withKeys()),d=described(p);expect(d.format).toBe('TYPED_BACKFILL_JOURNAL_V1');expect(d.tables).toEqual(p.manifest.tables);expect(d.tables).toHaveLength(68);expect(d.chunks).toEqual([]);expect(d.boundary).toMatchObject({...p.manifest.boundary,planDigest:p.digest,manifestChecksum:p.digest,namespaceCaptureChecksum:p.manifest.namespaceCaptureChecksum,ownershipDigest:p.manifest.ownershipDigest,assignmentEvidenceDigest:p.manifest.assignmentEvidenceDigest,namespaceDigest:p.manifest.namespaceDigest,constraintsDigest:p.manifest.constraintsDigest,keyCaptureChecksum:p.manifest.keyCaptureChecksum,keyComparatorDigest:p.manifest.keyComparatorDigest});expect(d.effectsVerified).toBe(false);expect(d.verification).toBe('PURE_TYPED_JOURNAL_STRUCTURE_NOT_EFFECTS_OR_DATABASE_VERIFICATION');const {descriptorChecksum,...body}=d;expect(descriptorChecksum).toBe(ownershipDigest(body));expect(validated(p,d).chunks).toEqual([]);});
 it('retains exact original typed chunk/key/count/retry and per-entry source/wire/mirror/ownership/effect checksums',()=>{const p=nonempty(),d=described(p);expect(d.chunks.map(c=>c.id)).toEqual(p.chunks.map(c=>c.id));for(let i=0;i<p.chunks.length;i++){const c=p.chunks[i],j=d.chunks[i];expect(j).toMatchObject({format:'TYPED_BACKFILL_JOURNAL_CHUNK_V1',id:c.id,retryIdentity:c.retryIdentity,planDigest:p.digest,table:c.table,ordinal:c.ordinal,count:c.count,firstKey:c.firstKey,lastKey:c.lastKey,keys:c.keys,sourceChecksum:c.sourceChecksum,expectedMetadataChecksum:c.expectedMetadataChecksum});expect(j.keysChecksum).toBe(ownershipDigest(c.keys));expect(j.rows).toEqual(c.entries.map(e=>({key:e.key,sourceChecksum:e.sourceChecksum,wireChecksum:e.wireChecksum,mirroredIdentityChecksum:e.mirroredIdentityChecksum,sourceObservationChecksum:ownershipDigest(e.source),action:e.action,expectedMetadataChecksum:e.expectedMetadataChecksum})));expect(j.rowsChecksum).toBe(ownershipDigest(j.rows));}expect(new Set(d.chunks.map(c=>c.retryIdentity)).size).toBe(p.chunks.length);expect(Object.hasOwn(d,'originalOperationId')).toBe(false);});
 it.each(['NOT_STARTED','STARTED','UNKNOWN'])('represents only structural observed state%s with no automatic transition or target claim',state=>{const p=nonempty(),d=described(p),a=validated(p,d,observed(d,state));expect(a.effectsVerified).toBe(false);expect(a.reconciliation).toBe('NOT_PERFORMED');expect(a.requirement).toBe('FRESH_OWNED_ORIGINAL_TYPED_PLAN_SOURCE_TARGET_AND_ATOMIC_JOURNAL_RECONCILIATION');expect(a.chunks.map(c=>c.observedState)).toEqual(d.chunks.map(()=>state));expect(a.chunks.every(c=>c.effectsObservation==='UNVERIFIED')).toBe(true);expect(Object.hasOwn(a,'resume')).toBe(false);expect(Object.hasOwn(a,'operationId')).toBe(false);});
 it('canonicalizes complete state rows to original ordinal order without altering retry identities',()=>{const p=nonempty(),d=described(p),o=observed(d);o.rows.reverse();const a=validated(p,d,o);expect(a.chunks.map(c=>c.chunk.id)).toEqual(d.chunks.map(c=>c.id));expect(a.chunks.map(c=>c.retryIdentity)).toEqual(d.chunks.map(c=>c.retryIdentity));});
 it('accepts exact serialized structural descriptor/state only alongside the genuine original compiler plan',()=>{const p=nonempty(),d=described(p),a=validateTypedBackfillJournalObservation(p,clone(d),clone(observed(d)));expect(a.status).toBe('STRUCTURAL_OBSERVATIONS_ONLY');expect(validateTypedBackfillJournalObservation(clone(p),d,observed(d))).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_PLAN'});});
 it.each(['COMPLETE','COMMITTED'])('always blocks completion state%s even with matching hashes/false flag',state=>{const p=nonempty(),d=described(p);expect(validateTypedBackfillJournalObservation(p,d,observed(d,state))).toEqual({status:'BLOCKED',code:'TYPED_JOURNAL_COMPLETION_UNAVAILABLE'});});
 it('blocks effectsVerifiedtrue, caller fresh/committed markers and fake reconciliation even on empty plans',()=>{const p=planned(withKeys()),d=described(p),o=observed(d);expect(validateTypedBackfillJournalObservation(p,d,{...o,effectsVerified:true})).toEqual({status:'BLOCKED',code:'TYPED_JOURNAL_COMPLETION_UNAVAILABLE'});expect(validateTypedBackfillJournalObservation(p,d,{...o,reconciliation:{readMode:'FRESH_OWNED_ORIGINAL_PLAN_RECHECK',transaction:'COMMITTED',effectsVerified:true}})).toEqual({status:'BLOCKED',code:'TYPED_JOURNAL_COMPLETION_UNAVAILABLE'});expect(validateTypedBackfillJournalObservation(p,d,{...o,transaction:'COMMITTED'}).status).toBe('BLOCKED');});
 it('never accepts legacy journal/plan formats or bridges into existing SQL store',()=>{const p=nonempty(),d=described(p),o=observed(d);expect(validateTypedBackfillJournalObservation(p,{...d,format:'BACKFILL_CHUNK_JOURNAL_V1'},o).status).toBe('BLOCKED');expect(validateTypedBackfillJournalObservation(p,d,{...o,format:'BACKFILL_CHUNK_JOURNAL_V1'}).status).toBe('BLOCKED');expect(describeTypedBackfillJournal({status:'READY_FOR_GUARDED_EXECUTION',digest:p.digest})).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_PLAN'});});
 for(const field of ['registryDigest','sourceDigest','currentSchemaDigest','snapshotId','fenceGeneration','factsDigest','planDigest','manifestChecksum','namespaceCaptureChecksum','ownershipDigest','assignmentEvidenceDigest','namespaceDigest','constraintsDigest','keyCaptureChecksum','keyComparatorDigest','compilerOptionsChecksum'] as const)it(`rejects changed original ${field} boundary without partial observations`,()=>{const p=nonempty(),d=described(p),changed=clone(d);(changed.boundary as unknown as Record<string,unknown>)[field]='changed';const r=validateTypedBackfillJournalObservation(p,changed,observed(d));expect(r.status).toBe('BLOCKED');expect(Object.hasOwn(r,'assessment')).toBe(false);const o=observed(d);(o.boundary as unknown as Record<string,unknown>)[field]='changed';expect(validateTypedBackfillJournalObservation(p,d,o).status).toBe('BLOCKED');});
 it.each(['missing','extra','duplicate','changed','empty'])('rejects descriptor complete68table%s drift',kind=>{const p=nonempty(),d=described(p),c=clone(d) as unknown as {tables:unknown[]};if(kind==='missing')c.tables.pop();if(kind==='extra')c.tables.push(d.tables[0]);if(kind==='duplicate')c.tables[1]=c.tables[0];if(kind==='changed')(c.tables[0]as{sourceChecksum:string}).sourceChecksum='b'.repeat(64);if(kind==='empty')c.tables=[];expect(validateTypedBackfillJournalObservation(p,c,observed(d)).status).toBe('BLOCKED');});
 it.each(['missing','extra','duplicate'])('rejects journal state row%s coverage',kind=>{const p=nonempty(),d=described(p),o=observed(d);if(kind==='missing')o.rows.pop();if(kind==='extra')o.rows.push(o.rows[0]);if(kind==='duplicate')o.rows[1]=o.rows[0];expect(validateTypedBackfillJournalObservation(p,d,o)).toEqual({status:'BLOCKED',code:'TYPED_JOURNAL_COVERAGE_DRIFT'});});
 for(const field of ['id','retryIdentity','table','ordinal','count','firstKey','lastKey','keys','keysChecksum','sourceChecksum','expectedMetadataChecksum','rowsChecksum','planDigest'] as const)it(`rejects changed observed chunk${field}`,()=>{const p=nonempty(),d=described(p),o=observed(d);(o.rows[0].chunk as unknown as Record<string,unknown>)[field]=field==='count'||field==='ordinal'?99:field==='keys'||field==='firstKey'||field==='lastKey'?['changed']:'changed';expect(validateTypedBackfillJournalObservation(p,d,o).status).toBe('BLOCKED');});
 it('rejects any per-row source/wire/mirror/review ownership/effect checksum substitution',()=>{const p=nonempty(),d=described(p);for(const field of ['sourceChecksum','wireChecksum','mirroredIdentityChecksum','sourceObservationChecksum','expectedMetadataChecksum','key','action']){const o=observed(d);(o.rows[0].chunk.rows[0] as unknown as Record<string,unknown>)[field]=field==='key'?['changed']:'changed';expect(validateTypedBackfillJournalObservation(p,d,o).status).toBe('BLOCKED');}});
 it('blocks rehashed changed descriptor and retry identity rather than authorizing from hash coherence',()=>{const p=nonempty(),d=clone(described(p));(d.chunks[0]as{retryIdentity:string}).retryIdentity='b'.repeat(64);const {descriptorChecksum:unused,...body}=d;void unused;(d as{descriptorChecksum:string}).descriptorChecksum=ownershipDigest(body);expect(validateTypedBackfillJournalObservation(p,d,observed(d)).status).toBe('BLOCKED');});
 it('rejects changed state retry identities independently of chunkdescriptor',()=>{const p=nonempty(),d=described(p),o=observed(d);o.rows[0].retryIdentity='b'.repeat(64);expect(validateTypedBackfillJournalObservation(p,d,o)).toEqual({status:'BLOCKED',code:'TYPED_JOURNAL_RETRY_DRIFT'});});
 it.each(['boundary','rows','descriptorChecksum','effectsVerified','reconciliation','format'])('rejects missing/extra observation%s fields',field=>{const p=nonempty(),d=described(p),o=observed(d)as unknown as Record<string,unknown>;delete o[field];expect(validateTypedBackfillJournalObservation(p,d,o).status).toBe('BLOCKED');expect(validateTypedBackfillJournalObservation(p,d,{...observed(d),extra:true}).status).toBe('BLOCKED');});
 it('requires genuinely compiler-issued plan before descriptor/state getters or proxy traps',()=>{const get=vi.fn(()=>{throw Error('trap');}),proxy=new Proxy({},{get,ownKeys:get,getPrototypeOf:get});for(const p of [proxy,null,{},'digest']){expect(describeTypedBackfillJournal(p)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_PLAN'});expect(validateTypedBackfillJournalObservation(p,proxy,proxy)).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_PLAN'});}expect(get).not.toHaveBeenCalled();});
 it('rejects plan clones/proxies/accessor/revoked envelopes without reissuing authority',()=>{const p=nonempty(),d=described(p),get=vi.fn(()=>{throw Error('trap');}),revoked=Proxy.revocable(p,{});revoked.revoke();for(const value of [clone(p),{...p},new Proxy(p,{get,ownKeys:get}),revoked.proxy,{get digest(){return get();}}])expect(validateTypedBackfillJournalObservation(value,d,observed(d))).toEqual({status:'BLOCKED',code:'UNISSUED_TYPED_PLAN'});expect(get).not.toHaveBeenCalled();});
 it('rejects nested descriptor/state proxy/accessor/cycles without reading behavior or coercion',()=>{const p=nonempty(),d=described(p),get=vi.fn(()=>{throw Error('trap');}),proxy=new Proxy({},{get,ownKeys:get,getPrototypeOf:get}),cycle:{self?:unknown}={};cycle.self=cycle;for(const v of [proxy,{get rows(){return get();}},cycle]){expect(validateTypedBackfillJournalObservation(p,v,observed(d)).status).toBe('BLOCKED');expect(validateTypedBackfillJournalObservation(p,d,v).status).toBe('BLOCKED');}const o=observed(d);(o.rows as unknown[])[0]=proxy;expect(validateTypedBackfillJournalObservation(p,d,o).status).toBe('BLOCKED');expect(get).not.toHaveBeenCalled();});
 it('rejects sparse/accessor/extra/prototype arrays, unsafe numbers and nonJSON input',()=>{const p=nonempty(),d=described(p),get=vi.fn(()=>{throw Error('trap');}),sparse=new Array(1),accessor:unknown[]=[];Object.defineProperty(accessor,'0',{get,enumerable:true});const extra:Object[]=[];Object.defineProperty(extra,'extra',{value:1,enumerable:true});for(const rows of [sparse,accessor,extra,Object.create(Array.prototype),[NaN],[Infinity],[9007199254740992],[1.5],[-0],[BigInt(1)],[undefined]])expect(validateTypedBackfillJournalObservation(p,d,{...observed(d),rows}).status).toBe('BLOCKED');expect(get).not.toHaveBeenCalled();});
 it('preserves padded/long keys, SQLNULLvsJSONNULL/numeric lexemes/nativearray bounds solely through exact source/wire identity',()=>{const owner=' '+('A'.repeat(250))+' ',specs:RowSpec[]=[root(owner),location(' L ',owner),employee(' E ',owner,' L '),{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000001',workspace_id:owner,employee_id:' E ',digest:sha('b'),generation:'00000000-0000-4000-8000-000000000002',allowed_location_ids:'[-1:0]={" L ",NULL}'}},{table:'clocker_pin_events',wire:{id:' PIN ',employee_id:' E ',actor_employee_id:' E ',pin_version:'1'}}],p=planned(withKeys(specs)),d=described(p);expect(d.chunks.find(c=>c.table==='employees')!.keys).toEqual([[' E ']]);for(const c of p.chunks)expect(d.chunks.find(j=>j.id===c.id)!.rows.map(r=>r.wireChecksum)).toEqual(c.entries.map(e=>e.wireChecksum));const a=described(planned(withKeys([{table:'workspaces',wire:{id:'A',shift_change_policy:null}}]))),b=described(planned(withKeys([{table:'workspaces',wire:{id:'A',shift_change_policy:'null'}}]))),c=described(planned(withKeys([{table:'workspaces',wire:{id:'A',shift_change_policy:'{"unsafe":9007199254740993,"scale":1.00}'}}])));expect(new Set([a.descriptorChecksum,b.descriptorChecksum,c.descriptorChecksum]).size).toBe(3);expect(canonicalOwnershipJson(d)).not.toContain('allowed_location_ids\":\"[-1:0]');});
 it('changes exact descriptor/retry binding for altered original source/options while refusing old observation reuse',()=>{const f=withKeys(base()),a=planned(f,1),b=planned(f,2),da=described(a),db=described(b);expect(da.descriptorChecksum).not.toBe(db.descriptorChecksum);expect(validateTypedBackfillJournalObservation(b,da,observed(da)).status).toBe('BLOCKED');expect(validateTypedBackfillJournalObservation(b,db,observed(da)).status).toBe('BLOCKED');});
 it('deeply freezes deterministic descriptions and detached assessments without mutating inputs or retaining mutable state aliases',()=>{const p=nonempty(),before=canonicalOwnershipJson(p),d=described(p),o=observed(d),a=validated(p,d,o);expect(described(p)).toEqual(d);expect(Object.isFrozen(d)).toBe(true);expect(Object.isFrozen(d.chunks[0].rows)).toBe(true);expect(Object.isFrozen(a)).toBe(true);expect(Object.isFrozen(a.chunks)).toBe(true);expect(()=>{(d.chunks[0].keys as unknown[])[0]='changed';}).toThrow();o.rows[0].state='UNKNOWN';expect(a.chunks[0].observedState).toBe('NOT_STARTED');expect(canonicalOwnershipJson(p)).toBe(before);});
});
