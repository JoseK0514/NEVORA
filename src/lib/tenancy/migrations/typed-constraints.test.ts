import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createTypedSnapshotFixture} from './typed-fixture.test-support';
import {inspectTypedMigrationSnapshot} from './typed-snapshot';
import {OWNERSHIP_SOURCE,canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,type JsonValue} from './ownership';
import {DATABASE_NAMESPACES,validateTypedDatabaseNamespaceComparators} from './namespace-comparators';
import {validateTypedSnapshotOwnership,type TypedOwnershipAssignments} from './typed-ownership';
import {getTypedReferenceColumnContract,validateTypedMigrationCellReferences,type TypedReferenceClassificationInput} from './typed-reference';
import {validateTypedSourceConstraints,isIssuedTypedSourceConstraintObservations,type TypedSourceConstraintWithKeysObservations} from './typed-constraints';
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
function result(f:ReturnType<typeof fixture>){return validateTypedSourceConstraints(f.snapshot,f.ownership,f.namespaces);}
function observed(f:ReturnType<typeof fixture>){const r=result(f);expect(r.status).toBe('VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS');if(r.status!=='VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS')throw Error(canonicalOwnershipJson(r));return r.observations;}
function diagnostics(f:ReturnType<typeof fixture>){const r=result(f);expect(r.status).toBe('BLOCKED');return r.status==='BLOCKED'?r.diagnostics:[];}
function collision(f:ReturnType<typeof fixture>,table:string,label:string){expect(diagnostics(f).some(d=>d.code==='NAMESPACE_COLLISION'&&d.table===table&&d.label===label)).toBe(true);}

describe('pure complete typed source constraint observations',()=>{
 it('observes every original declared key and every complete empty table, with no implied DB approval',()=>{
  const f=fixture(),o=observed(f);expect(o.tables).toEqual(f.ownership.tables);expect(o.originalKeys.map(k=>({table:k.table,kind:k.kind,name:k.name,columns:k.columns,rows:k.rows}))).toEqual(registry.tables.flatMap(t=>t.declaredKeys.map(k=>({table:t.table,...k,rows:[]}))));
  expect(o.rows).toEqual([]);expect(o.verification).toBe('PURE_SOURCE_CONSTRAINT_OBSERVATIONS_NOT_DATABASE_UNIQUENESS_OPERATOR_OR_TENANT_AUTHORITY');expect(o.remainingGates).toContain('LIVE_SOURCE_SQL_INDEX_COLLATION_OPCLASS_AND_GUARD_VERIFICATION');expect(isIssuedTypedSourceConstraintObservations(o)).toBe(true);
 });
 it('preserves a singleton source row, SQLNULL JSON policy and the original singleton UNIQUE constraint',()=>{
  const f=fixture([root('')]),o=observed(f);expect(o.rows[0].workspaceId).toBe('');expect(o.rows[0].key).toEqual(['']);expect(o.rows[0].columns.find(c=>c.name==='shift_change_policy')!.lineage.nodes[0].value.kind).toBe('SQL_NULL');
  expect(o.originalKeys.find(k=>k.table==='workspaces'&&k.kind==='UNIQUE')!.rows[0].components[0]).toMatchObject({column:'singleton',type:'boolean',wire:'t',sqlNull:false});
 });
 it('preserves original source id/wires while using only approved separate employee selector normalization',()=>{
  const f=fixture([root(),location(),employee(' e01 ', 'A','L','Ω@Example.invalid')]),o=observed(f);
  const row=o.rows.find(r=>r.table==='employees')!;expect(row.key).toEqual([' e01 ']);expect(row.columns.find(c=>c.name==='id')!.wire).toBe(' e01 ');
  expect(o.namespaces.find(n=>n.table==='employees'&&n.label==='normalized_number')!.rows[0].comparison).toEqual({kind:'APP_SELECTOR',original:' e01 ',normalized:'E01'});
  expect(o.namespaces.find(n=>n.label==='email_ci')!.rows[0].comparison).toMatchObject({kind:'DATABASE_EQUALITY_CLASS',comparisonClass:'OPAQUE_CLASS_Ω@Example.invalid',expressionValue:'FICTIONAL_DB_EXPRESSION_Ω@Example.invalid'});
 });
 it('never JavaScript-lowercases expression namespaces',()=>{const f=fixture([root(),location(),employee('E','A','L','Ω@Example.invalid')]),spy=vi.spyOn(String.prototype,'toLowerCase').mockImplementation(()=>{throw Error('unexpected casing');});let r;try{r=result(f);}finally{spy.mockRestore();}expect(r!.status).toBe('VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS');});
 it('preserves complete exact JSON numeric/null/member wires without legacy projection',()=>{
  const wire='{"unsafe":9007199254740993,"scale":1.00,"fraction":0.123456789012345678901,"none":null,"empty":[]}';
  const f=fixture([{table:'workspaces',wire:{id:'A',shift_change_policy:wire}}]),before=canonicalOwnershipJson(f.snapshot),o=observed(f),c=o.rows[0].columns.find(c=>c.name==='shift_change_policy')!;
  expect(c.wire).toBe(wire);expect(c.lineage.nodes.filter(n=>n.value.kind==='JSON_NUMBER').map(n=>n.value.kind==='JSON_NUMBER'?n.value.lexeme:'')).toEqual(['9007199254740993','1.00','0.123456789012345678901']);expect(c.lineage.nodes.some(n=>n.value.kind==='JSON_NULL')).toBe(true);expect(c.lineage.nodes.some(n=>n.value.kind==='JSON_ARRAY'&&n.value.length===0)).toBe(true);expect(canonicalOwnershipJson(f.snapshot)).toBe(before);
 });
 it('retains native array dimensions, SQL-null elements and original calendar security literals',()=>{
  const f=fixture([...base(),{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000001',workspace_id:'A',employee_id:'E',digest:sha('b'),generation:'00000000-0000-4000-8000-000000000002',allowed_location_ids:'[-1:0]={L,NULL}'}}]),o=observed(f),r=o.rows.find(r=>r.table==='calendar_subscriptions')!,c=r.columns.find(c=>c.name==='allowed_location_ids')!;
  expect(r.globalFences).toEqual(registry.tables.find(t=>t.table==='calendar_subscriptions')!.globalFences);expect(c.wire).toBe('[-1:0]={L,NULL}');expect(c.lineage.nodes[0].value).toMatchObject({kind:'SQL_ARRAY',dimensions:[{lowerBound:-1,length:2}]});expect(c.lineage.nodes[2].value.kind).toBe('SQL_ARRAY_NULL');expect(c.lineage.nodes[2].address[0]).toMatchObject({subscripts:[0]});expect(r.rowChecksum).toBe(f.ownership.rows.find(r=>r.table==='calendar_subscriptions')!.rowChecksum);
 });
 it('preserves global-security rows and compares distinct bigint buckets losslessly',()=>{
  const f=fixture([{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775806'}},{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775807'}}]),o=observed(f);
  expect(o.rows.every(r=>r.workspaceId===null)).toBe(true);expect(o.rows.map(r=>r.columns.find(c=>c.name==='bucket')!.wire)).toEqual(['9223372036854775806','9223372036854775807']);expect(o.rows[0].globalFences).toContain('scope+bucket');
 });
 it('retains original token/hash/session/installation/endpoint fences as exact complete row facts',()=>{
  const f=fixture([...base(),{table:'push_subscriptions',wire:{id:'P',employee_id:'E',installation_hash:'Original-Install',environment:'preview',endpoint_fingerprint:'Original-Endpoint',session_hash:'Exact-Session',status:'active'}}]),o=observed(f),r=o.rows.find(r=>r.table==='push_subscriptions')!;
  expect(r.columns.map(c=>[c.name,c.wire,c.lineage.source.checksum])).toEqual(f.ownership.rows.find(r=>r.table==='push_subscriptions')!.columns.map(c=>[c.name,c.wire,c.lineage.source.checksum]));expect(r.globalFences).toEqual(registry.tables.find(t=>t.table==='push_subscriptions')!.globalFences);expect(o.namespaces.filter(n=>n.table==='push_subscriptions').map(n=>[n.label,n.scope])).toEqual([['installation_global','GLOBAL'],['active_endpoint_global','GLOBAL']]);
 });
 it('binds every row/column checksum and accepts independently issued identical supplied facts',()=>{const a=fixture(base()),b=fixture(base()),r=validateTypedSourceConstraints(a.snapshot,b.ownership,b.namespaces);expect(r.status).toBe('VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS');const o=observed(a);expect(o.rows.map(r=>r.rowChecksum)).toEqual(a.ownership.rows.map(r=>r.rowChecksum));expect(o.namespaceCaptureChecksum).toBe(a.snapshot.namespaceCaptureChecksum);expect(o.ownershipDigest).toBe(a.ownership.digest);expect(o.namespaceDigest).toBe(a.namespaces.digest);});
 it('is deterministic and deeply frozen without issuing serializations, clones or digests as authority',()=>{
  const a=observed(fixture(base())),b=observed(fixture(base()));expect(a.digest).toBe(b.digest);expect(Object.isFrozen(a)).toBe(true);expect(Object.isFrozen(a.rows[0].columns)).toBe(true);expect(()=>{(a.rows[0].key as string[])[0]='changed';}).toThrow();for(const v of [{...a},JSON.parse(canonicalOwnershipJson(a)),{digest:a.digest},null])expect(isIssuedTypedSourceConstraintObservations(v)).toBe(false);
 });
 it('retains the legacy singleton fence globally rather than treating two supplied workspaces as SQL-ready',()=>collision(fixture([root('A'),root('B')]),'workspaces','UNIQUE:["singleton"]'));
 it('diagnoses approved normalized employee-number collision while retaining exact different original IDs',()=>{const f=fixture([root(),location(),employee(' e01 '),employee('E01')]);collision(f,'employees','normalized_number');expect(f.snapshot.tables.find(t=>t.table==='employees')!.rows.map(r=>r.key[0])).toEqual([' e01 ','E01']);});
 it.each(['',' \t ','E\u0001','E\u007f'])('blocks unreadable legacy selectors %j without changing original wires',id=>{const f=fixture([root(),location(),employee(id)]);expect(diagnostics(f).some(d=>d.code==='LEGACY_SELECTOR_UNREADABLE')).toBe(true);expect(f.snapshot.tables.find(t=>t.table==='employees')!.rows[0].columns.find(c=>c.name==='id')!.wire).toBe(id);});
 it.each(['employees.email_ci','positions.name_ci','clocker_break_types.name_ci','schedule_templates.active_name_ci'])('uses opaque supplied database equality classes for %s collisions',id=>{
  const c=DATABASE_NAMESPACES.find(c=>c.contractId===id)!;let specs:RowSpec[];
  if(c.table==='employees')specs=[root(),location(),employee('E1','A','L','Literal1'),employee('E2','A','L','Literal2')];
  else specs=[...base(),{table:c.table,wire:{id:'X1',name:'Literal1',...(c.table==='schedule_templates'?{created_by:'E',active:'t'}:c.table==='positions'?{workspace_id:'A'}:{workspace_id:'A',created_by:'E',updated_by:'E'})}},{table:c.table,wire:{id:'X2',name:'Literal2',...(c.table==='schedule_templates'?{created_by:'E',active:'t'}:c.table==='positions'?{workspace_id:'A'}:{workspace_id:'A',created_by:'E',updated_by:'E'})}}];
  const keys=c.table==='employees'?['E1','E2']:['X1','X2'];const classes=Object.fromEntries(keys.map(k=>[canonicalOwnershipJson([id,[k]]),'OPAQUE_SAME_DB_CLASS']));collision(fixture(specs,classes),c.table,c.label);
 });
 it('keeps excluded SQLNULL emails and inactive template witnesses distinct from included equality classes',()=>{
  const f=fixture([...base(),employee('E2'),{table:'schedule_templates',wire:{id:'T1',name:'Same',created_by:'E',active:'f'}},{table:'schedule_templates',wire:{id:'T2',name:'Same',created_by:'E',active:'f'}}]),ds=diagnostics(f);
  expect(ds.some(d=>d.code==='NAMESPACE_COLLISION'&&['email_ci','active_name_ci'].includes(d.label??''))).toBe(false);expect(f.namespaces.rows.filter(r=>r.contractId==='employees.email_ci').every(r=>r.included===false&&r.comparisonClass===null&&r.expressionValue===null)).toBe(true);expect(f.namespaces.rows.filter(r=>r.contractId==='schedule_templates.active_name_ci').every(r=>r.included===false&&r.comparisonClass===null&&r.expressionValue!==null)).toBe(true);
 });
 it('includes excluded witnesses in successfully issued observations without losing SQLNULL or inactive original rows',()=>{
  const f=fixture([...base(),{table:'schedule_templates',wire:{id:'T',name:'Retained inactive',created_by:'E',active:'f'}}]),o=observed(f),email=o.namespaces.find(n=>n.label==='email_ci')!.rows[0],template=o.namespaces.find(n=>n.label==='active_name_ci')!.rows[0];
  expect(email).toMatchObject({included:false,components:[{column:'email',wire:null,sqlNull:true}],comparison:{kind:'DATABASE_EQUALITY_CLASS',expressionValue:null,comparisonClass:null}});
  expect(template).toMatchObject({included:false,components:[{column:'name',wire:'Retained inactive',sqlNull:false}],comparison:{kind:'DATABASE_EQUALITY_CLASS',expressionValue:'FICTIONAL_DB_EXPRESSION_Retained inactive',comparisonClass:null}});
  expect(o.rows.find(r=>r.table==='schedule_templates')!.rowChecksum).toBe(f.ownership.rows.find(r=>r.table==='schedule_templates')!.rowChecksum);
 });
 it('scopes expression candidates by resolved owner, while refusing unproved global key collations',()=>{
  const f=fixture([root('A'),{table:'workspaces',wire:{id:'B',singleton:'f'}},location('L1','A'),location('L2','B'),employee('E1','A','L1','Same'),employee('E2','B','L2','Same')]),ds=diagnostics(f);
  expect(ds.some(d=>d.code==='NAMESPACE_COLLISION'&&d.label==='email_ci')).toBe(false);expect(ds.some(d=>d.code==='UNSUPPORTED_SQL_COMPARATOR'&&d.table==='workspaces')).toBe(true);
 });
 it('diagnoses global installation collisions across resolved workspaces',()=>{
  const f=fixture([root('A'),{table:'workspaces',wire:{id:'B',singleton:'f'}},location('L1','A'),location('L2','B'),employee('E1','A','L1'),employee('E2','B','L2'),{table:'push_subscriptions',wire:{id:'P1',employee_id:'E1',installation_hash:'SAME',environment:'preview',endpoint_fingerprint:'F1',status:'detached'}},{table:'push_subscriptions',wire:{id:'P2',employee_id:'E2',installation_hash:'SAME',environment:'preview',endpoint_fingerprint:'F2',status:'invalid'}}]);collision(f,'push_subscriptions','installation_global');collision(f,'push_subscriptions','UNIQUE:["installation_hash","environment"]');expect(diagnostics(f).filter(d=>d.table==='push_subscriptions'&&d.label==='installation_global').every(d=>d.scope==='GLOBAL')).toBe(true);
 });
 it('enforces active global endpoint candidates without imposing uniqueness on detached endpoints',()=>{
  const rows=(status:string):RowSpec[]=>[...base(),{table:'push_subscriptions',wire:{id:'P1',employee_id:'E',installation_hash:'I1',environment:'preview',endpoint_fingerprint:'SAME',status}},{table:'push_subscriptions',wire:{id:'P2',employee_id:'E',installation_hash:'I2',environment:'preview',endpoint_fingerprint:'SAME',status}}];
  collision(fixture(rows('active')),'push_subscriptions','active_endpoint_global');expect(diagnostics(fixture(rows('detached'))).some(d=>d.code==='NAMESPACE_COLLISION'&&d.label==='active_endpoint_global')).toBe(false);
 });
 it('checks source clocker keys and publication/week candidates without making date equality guesses',()=>{
  collision(fixture([root(),location('L1','A','SAME'),location('L2','A','SAME')]),'locations','clocker_key');
  collision(fixture([...base(),{table:'schedule_publication_revisions',wire:{id:'R1',week_start:'2026-10-05',revision_number:'2',created_by:'E'}},{table:'schedule_publication_revisions',wire:{id:'R2',week_start:'2026-10-05',revision_number:'2',created_by:'E'}}]),'schedule_publication_revisions','publication_number');
  const f=fixture([root(),{table:'schedule_week_settings',wire:{week_start:'2026-10-05'},owner:'A'},{table:'schedule_week_settings',wire:{week_start:'2026-10-12'},owner:'A'}]);expect(diagnostics(f).some(d=>d.table==='schedule_week_settings'&&d.label==='week'&&d.code==='UNSUPPORTED_SQL_COMPARATOR')).toBe(true);
 });
 it('blocks differing collatable original text keys instead of treating wire inequality as SQL inequality',()=>{const f=fixture([root(),location(),employee('E1'),employee('E2')]);expect(diagnostics(f).some(d=>d.table==='employees'&&d.label==='PRIMARY_KEY:["id"]'&&d.code==='UNSUPPORTED_SQL_COMPARATOR')).toBe(true);expect(isIssuedTypedSourceConstraintObservations(result(f))).toBe(false);});
 it('does not treat different exact char or UUID wires as a proven SQL comparator',()=>{
  const f=fixture([...base(),{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000001',workspace_id:'A',employee_id:'E',digest:sha('b'),generation:'00000000-0000-4000-8000-000000000003',allowed_location_ids:'{L}'}},{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000002',workspace_id:'A',employee_id:'E',digest:sha('c'),generation:'00000000-0000-4000-8000-000000000004',allowed_location_ids:'{L}'}}]);expect(diagnostics(f).some(d=>d.table==='calendar_subscriptions'&&d.code==='UNSUPPORTED_SQL_COMPARATOR')).toBe(true);
 });
 it.each(['source','schema','snapshot','fence','rows'] as const)('blocks independently genuine ownership from a different %s boundary',kind=>{
  const a=fixture(base()),b=fixture(base(),{},f=>{if(kind==='source'){f.facts.sourceDigest=sha('b');f.facts.namespaceComparators.binding.sourceDigest=sha('b');}if(kind==='schema'){f.facts.catalog={relations:[{fictional:true}],columns:[],constraints:[]};f.facts.currentSchemaDigest=ownershipDigest(f.facts.catalog);f.facts.namespaceComparators.binding.schemaDigest=f.facts.currentSchemaDigest;}if(kind==='snapshot'){f.facts.snapshot.id='13:20:';f.facts.namespaceComparators.binding.snapshotId='13:20:';}if(kind==='fence')f.facts.fence.generation='2';if(kind==='rows')f.row('locations',{id:'L2',workspace_id:'A',clocker_key:'K2'});});
  const r=validateTypedSourceConstraints(a.snapshot,b.ownership,a.namespaces);expect(r.status).toBe('BLOCKED');if(r.status==='BLOCKED')expect(r.diagnostics[0].code).toBe('OWNERSHIP_BOUNDARY_DRIFT');
 });
 it('blocks genuine namespace observations belonging to a different captured equality witness',()=>{const a=fixture([root(),location(),employee('E','A','L','Email')]),b=fixture([root(),location(),employee('E','A','L','Email')],{[canonicalOwnershipJson(['employees.email_ci',['E']])]:'ALTERNATE'}),r=validateTypedSourceConstraints(a.snapshot,a.ownership,b.namespaces);expect(r.status).toBe('BLOCKED');if(r.status==='BLOCKED')expect(r.diagnostics[0].code).toBe('NAMESPACE_BOUNDARY_DRIFT');});
 for(const index of [0,1,2] as const)it(`rejects unissued input ${index} before hostile input getters/proxy traps`,()=>{
  const f=fixture(),spy=vi.fn(()=>{throw Error('must not read');}),values:unknown[]=[f.snapshot,f.ownership,f.namespaces];values[index]=new Proxy({},{get:spy,ownKeys:spy,getPrototypeOf:spy});const r=validateTypedSourceConstraints(...values as [unknown,unknown,unknown]);expect(r.status).toBe('BLOCKED');if(r.status==='BLOCKED')expect(r.diagnostics).toEqual([{code:['UNISSUED_TYPED_SNAPSHOT','UNISSUED_TYPED_OWNERSHIP','UNISSUED_TYPED_NAMESPACES'][index]}]);expect(spy).not.toHaveBeenCalled();
 });
 it.each(['snapshot','ownership','namespace'] as const)('rejects clones and serialized %s observations without reissuing source authority',kind=>{const f=fixture(),index=kind==='snapshot'?0:kind==='ownership'?1:2;for(const clone of [{...[f.snapshot,f.ownership,f.namespaces][index]},JSON.parse(canonicalOwnershipJson([f.snapshot,f.ownership,f.namespaces][index]))]){const values:unknown[]=[f.snapshot,f.ownership,f.namespaces];values[index]=clone;expect(validateTypedSourceConstraints(...values as [unknown,unknown,unknown]).status).toBe('BLOCKED');}});
 it('rejects revoked proxies and accessors before reads, including its own issuance predicate',()=>{
  const f=fixture(),get=vi.fn(()=>{throw Error('must not read');}),value={get tables(){return get();}},revoked=Proxy.revocable(f.snapshot,{});revoked.revoke();for(const v of [value,revoked.proxy])expect(validateTypedSourceConstraints(v,f.ownership,f.namespaces).status).toBe('BLOCKED');const o=observed(f),p=new Proxy(o,{get,ownKeys:get,getPrototypeOf:get});expect(isIssuedTypedSourceConstraintObservations(p)).toBe(false);expect(isIssuedTypedSourceConstraintObservations(revoked.proxy)).toBe(false);expect(get).not.toHaveBeenCalled();
 });
});

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
const keyResult=(f:ReturnType<typeof withKeys>,keys:unknown=f.keyObservations)=>validateTypedSourceConstraints(f.snapshot,f.ownership,f.namespaces,keys);
function keyObserved(f:ReturnType<typeof withKeys>):TypedSourceConstraintWithKeysObservations{
 const r=validateTypedSourceConstraints(f.snapshot,f.ownership,f.namespaces,f.keyObservations);expect(r.status).toBe('VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS');if(r.status!=='VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS')throw Error(canonicalOwnershipJson(r));expect(r.observations.format).toBe('TYPED_SOURCE_CONSTRAINT_OBSERVATIONS_V2');return r.observations;
}
function keyDiagnostics(f:ReturnType<typeof withKeys>){const r=keyResult(f);expect(r.status).toBe('BLOCKED');return r.status==='BLOCKED'?r.diagnostics:[];}
const suppliedClass=(table:string,label:string,keys:string[],value:string)=>Object.fromEntries(keys.map(key=>[canonicalOwnershipJson([keyContract(table,label).contractId,[key]]),value]));

describe('genuine supplied SQL key-class successor',()=>{
 it('keeps all existing three-input V1 behavior and unsupported pair blocks, including explicit undefined',()=>{const f=withKeys([root(),location(),employee('E1'),employee('E2')]),old=result(f),again=validateTypedSourceConstraints(f.snapshot,f.ownership,f.namespaces,undefined);expect(old.status).toBe('BLOCKED');expect(old).toEqual(again);if(old.status==='BLOCKED')expect(old.diagnostics.some(d=>d.code==='UNSUPPORTED_SQL_COMPARATOR'&&d.table==='employees')).toBe(true);const empty=withKeys();expect(observed(empty).format).toBe('TYPED_SOURCE_CONSTRAINT_OBSERVATIONS_V1');expect(Object.hasOwn(observed(empty),'keyComparators')).toBe(false);});
 it('issues explicit V2 complete metadata for every original GLOBAL key and all five candidate contracts even without rows',()=>{const f=withKeys(),o=keyObserved(f);expect(o.originalKeys).toHaveLength(registry.tables.reduce((n,t)=>n+t.declaredKeys.length,0));expect(o.keyComparators.catalogs.map(c=>c.contractId)).toEqual(keyContracts.map(c=>c.contractId));expect(o.keyCaptureChecksum).toBe(f.keyObservations.captureChecksum);expect(o.keyComparatorDigest).toBe(f.keyObservations.digest);expect(o.keyComparators).toBe(f.keyObservations);expect(o.tables).toEqual(f.ownership.tables);expect(o.rows).toEqual([]);expect(o.namespaces.filter(n=>['clocker_key','week','publication_number','installation_global','active_endpoint_global'].includes(n.label)).map(n=>[n.table,n.label,n.rows]).sort()).toEqual(keyContracts.filter(c=>c.kind==='CANDIDATE').map(c=>[c.table,c.label,[]]).sort());expect(isIssuedTypedSourceConstraintObservations(o)).toBe(true);expect(o.verification).toBe('PURE_SOURCE_CONSTRAINT_OBSERVATIONS_NOT_DATABASE_UNIQUENESS_OPERATOR_OR_TENANT_AUTHORITY');});
 it('uses issued SQL key classes to resolve required text-key comparisons while retaining every original component',()=>{const f=withKeys([root(),location(),employee('E1'),employee('E2')]),o=keyObserved(f),keys=o.originalKeys.find(k=>k.table==='employees'&&k.kind==='PRIMARY_KEY')!;expect(keys.rows.map(r=>r.comparison)).toEqual(['E1','E2'].map((id,i)=>({kind:'DATABASE_KEY_EQUALITY_CLASS',contractId:keyContract('employees','PRIMARY_KEY:["id"]').contractId,comparisonClass:String(i+1),captureChecksum:f.keyObservations.captureChecksum,observationsDigest:f.keyObservations.digest,catalogChecksum:f.keyObservations.catalogs.find(c=>c.contractId===keyContract('employees','PRIMARY_KEY:["id"]').contractId)!.checksum})));expect(keys.rows.map(r=>r.components[0].wire)).toEqual(['E1','E2']);expect(o.rows).toEqual(f.ownership.rows);expect(o.namespaceCaptureChecksum).toBe(f.namespaces.captureChecksum);});
 it('honors opaque equality for unequal wires instead of JS wire, casing or coercion inequality',()=>{const f=withKeys([root(),location(),employee('E1'),employee('E2')],suppliedClass('employees','PRIMARY_KEY:["id"]',['E1','E2'],'777'));expect(keyDiagnostics(f)).toContainEqual({code:'NAMESPACE_COLLISION',table:'employees',label:'PRIMARY_KEY:["id"]',scope:'GLOBAL',keys:[['E1'],['E2']]});});
 it('retains source GLOBAL singleton uniqueness across fictional resolved workspaces',()=>{const f=withKeys([root('A'),root('B')]);expect(keyDiagnostics(f).some(d=>d.code==='NAMESPACE_COLLISION'&&d.table==='workspaces'&&d.label==='UNIQUE:["singleton"]'&&d.scope==='GLOBAL')).toBe(true);});
 it('applies global original key classes across different owners while candidate tenant classes remain owner-scoped',()=>{const specs=[root('A'),{table:'workspaces',wire:{id:'B',singleton:'f'}},location('L1','A','K1'),location('L2','B','K2'),employee('E1','A','L1'),employee('E2','B','L2')],f=withKeys(specs,suppliedClass('locations','clocker_key',['L1','L2'],'99'));const o=keyObserved(f);expect(o.namespaces.find(n=>n.label==='clocker_key')!.rows.map(r=>r.workspaceId)).toEqual(['A','B']);const global=withKeys(specs,suppliedClass('employees','PRIMARY_KEY:["id"]',['E1','E2'],'99'));expect(keyDiagnostics(global).some(d=>d.table==='employees'&&d.scope==='GLOBAL'&&d.code==='NAMESPACE_COLLISION')).toBe(true);});
 it.each(['clocker_key','week','publication_number'] as const)('uses supplied SQL classes for %s candidate collisions, never temporal/key wire inequality',label=>{let specs:RowSpec[],table:string,keys:string[];if(label==='clocker_key'){table='locations';keys=['L1','L2'];specs=[root(),location('L1','A','K1'),location('L2','A','K2')];}else if(label==='week'){table='schedule_week_settings';keys=['2026-10-05','2026-10-12'];specs=[root(),{table,wire:{week_start:keys[0]},owner:'A'},{table,wire:{week_start:keys[1]},owner:'A'}];}else{table='schedule_publication_revisions';keys=['R1','R2'];specs=[...base(),{table,wire:{id:'R1',week_start:'2026-10-05',revision_number:'1',created_by:'E'}},{table,wire:{id:'R2',week_start:'2026-10-12',revision_number:'2',created_by:'E'}}];}const f=withKeys(specs,suppliedClass(table,label,keys,'17'));expect(keyDiagnostics(f).some(d=>d.table===table&&d.label===label&&d.scope==='TENANT'&&d.code==='NAMESPACE_COLLISION')).toBe(true);});
 it('keeps active endpoint and installation tuples GLOBAL across resolved tenants',()=>{const specs=[root(),location(),employee(),{table:'push_subscriptions',wire:{id:'P1',employee_id:'E',installation_hash:'I1',environment:'preview',endpoint_fingerprint:'F1',status:'active'}},{table:'push_subscriptions',wire:{id:'P2',employee_id:'E',installation_hash:'I2',environment:'preview',endpoint_fingerprint:'F2',status:'active'}}];for(const label of ['installation_global','active_endpoint_global']){const f=withKeys(specs,suppliedClass('push_subscriptions',label,['P1','P2'],'1'));expect(keyDiagnostics(f).some(d=>d.label===label&&d.scope==='GLOBAL'&&d.code==='NAMESPACE_COLLISION')).toBe(true);}});
 it('preserves excluded inactive witnesses, NULL expression cells, raw security fences and every row checksum',()=>{const specs=[...base(),{table:'push_subscriptions',wire:{id:'P',employee_id:'E',installation_hash:'I',environment:'preview',endpoint_fingerprint:'F',session_hash:'Exact-Session',status:'detached'}}],f=withKeys(specs),o=keyObserved(f),p=o.namespaces.find(n=>n.label==='active_endpoint_global')!.rows[0];expect(p.included).toBe(false);expect(p.comparison).toMatchObject({kind:'DATABASE_KEY_EQUALITY_CLASS',comparisonClass:null});expect(p.components.map(c=>c.wire)).toEqual(['F','preview']);const email=o.namespaces.find(n=>n.label==='email_ci')!.rows[0];expect(email.components[0]).toMatchObject({wire:null,sqlNull:true});expect(email.comparison).toMatchObject({kind:'DATABASE_EQUALITY_CLASS',expressionValue:null,comparisonClass:null});expect(o.rows).toEqual(f.ownership.rows);expect(o.rows.find(r=>r.table==='push_subscriptions')!.globalFences).toEqual(registry.tables.find(r=>r.table==='push_subscriptions')!.globalFences);});
 it('preserves independent expression namespaces and separate approved employee selector normalization',()=>{const specs=[root(),location(),employee(' e1 ','A','L','Email1'),employee('E1','A','L','Email2')],f=withKeys(specs);expect(keyDiagnostics(f).some(d=>d.label==='normalized_number'&&d.code==='NAMESPACE_COLLISION')).toBe(true);for(const c of DATABASE_NAMESPACES){const row=c.table==='employees'?employee('E2','A','L','Email2'):undefined;void row;expect(f.keyObservations.catalogs.some(k=>k.contractId===c.contractId)).toBe(false);}});
 it('does not bypass genuine lower-expression collisions even when original key classes differ',()=>{const id='employees.email_ci',classes=Object.fromEntries(['E1','E2'].map(key=>[canonicalOwnershipJson([id,[key]]),'same-expression-class'])),f=withKeys([root(),location(),employee('E1','A','L','Email1'),employee('E2','A','L','Email2')],{},classes);expect(keyDiagnostics(f).some(d=>d.label==='email_ci'&&d.code==='NAMESPACE_COLLISION')).toBe(true);});
 it('preserves JSON exact numbers/null, SQL NULL and array native lower bounds without legacy conversion',()=>{const wire='{"n":9007199254740993,"s":1.00,"x":null,"empty":[]}',f=withKeys([{table:'workspaces',wire:{id:'A',shift_change_policy:wire}},location(),employee(),{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000001',workspace_id:'A',employee_id:'E',digest:sha('b'),generation:'00000000-0000-4000-8000-000000000002',allowed_location_ids:'[-1:0]={L,NULL}'}}]),o=keyObserved(f);expect(o.rows).toEqual(f.ownership.rows);const json=o.rows.find(r=>r.table==='workspaces')!.columns.find(c=>c.name==='shift_change_policy')!;expect(json.wire).toBe(wire);expect(json.lineage.nodes.filter(n=>n.value.kind==='JSON_NUMBER').map(n=>n.value.kind==='JSON_NUMBER'?n.value.lexeme:'')).toEqual(['9007199254740993','1.00']);const array=o.rows.find(r=>r.table==='calendar_subscriptions')!.columns.find(c=>c.name==='allowed_location_ids')!;expect(array.lineage.nodes[0].value).toMatchObject({kind:'SQL_ARRAY',dimensions:[{lowerBound:-1,length:2}]});expect(array.lineage.nodes[2].value.kind).toBe('SQL_ARRAY_NULL');});
 it('uses opaque classes even for differing exact bigint/security-bucket wires',()=>{const f=withKeys([{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775806'}},{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775807'}}],{[canonicalOwnershipJson([keyContract('password_recovery_limits','PRIMARY_KEY:["scope","bucket"]').contractId,['global','9223372036854775806']])]:'9',[canonicalOwnershipJson([keyContract('password_recovery_limits','PRIMARY_KEY:["scope","bucket"]').contractId,['global','9223372036854775807']])]:'9'});expect(keyDiagnostics(f).some(d=>d.table==='password_recovery_limits'&&d.scope==='GLOBAL'&&d.code==='NAMESPACE_COLLISION')).toBe(true);});
 it.each(['source','schema','snapshot','fence','rows'] as const)('blocks genuine key observations from a different %s boundary',kind=>{const a=withKeys(base()),b=withKeys(base(),{},{},f=>{if(kind==='source'){f.facts.sourceDigest=sha('b');f.facts.namespaceComparators.binding.sourceDigest=sha('b');}if(kind==='schema'){(f.facts.catalog as KeyFixtureCatalog).schemas.push({name:'FICTIONAL_SCHEMA_CHANGE',acl:null});f.facts.currentSchemaDigest=ownershipDigest(f.facts.catalog);f.facts.namespaceComparators.binding.schemaDigest=f.facts.currentSchemaDigest;}if(kind==='snapshot'){f.facts.snapshot.id='13:20:';f.facts.namespaceComparators.binding.snapshotId='13:20:';}if(kind==='fence')f.facts.fence.generation='2';if(kind==='rows')f.row('locations',{id:'L2',workspace_id:'A',clocker_key:'K2'});});expect(keyResult(a,b.keyObservations)).toEqual({status:'BLOCKED',diagnostics:[{code:'KEY_COMPARATOR_BOUNDARY_DRIFT'}]});});
 it('rejects serialized, shallow and revoked key observations without reading getters/proxy traps',()=>{const f=withKeys(),spy=vi.fn(()=>{throw Error('must not read');}),revoked=Proxy.revocable(f.keyObservations,{});revoked.revoke();for(const keys of [{...f.keyObservations},JSON.parse(canonicalOwnershipJson(f.keyObservations)),new Proxy(f.keyObservations,{get:spy,ownKeys:spy,getPrototypeOf:spy}),revoked.proxy,{get binding(){return spy();}},null])expect(keyResult(f,keys)).toEqual({status:'BLOCKED',diagnostics:[{code:'UNISSUED_TYPED_KEY_COMPARATORS'}]});expect(spy).not.toHaveBeenCalled();});
 it.each([0,1,2,3])('checks all four issuers before any input property read, hostile slot%s',slot=>{const f=withKeys(),spy=vi.fn(()=>{throw Error('must not read');}),inputs:unknown[]=[f.snapshot,f.ownership,f.namespaces,f.keyObservations];inputs[slot]=new Proxy({},{get:spy,ownKeys:spy,getPrototypeOf:spy});const r=validateTypedSourceConstraints(...inputs as [unknown,unknown,unknown,unknown]);expect(r).toEqual({status:'BLOCKED',diagnostics:[{code:['UNISSUED_TYPED_SNAPSHOT','UNISSUED_TYPED_OWNERSHIP','UNISSUED_TYPED_NAMESPACES','UNISSUED_TYPED_KEY_COMPARATORS'][slot]}]});expect(spy).not.toHaveBeenCalled();});
 it('accepts independently genuinely issued identical source facts and never reissues cloned V2 output',()=>{const a=withKeys(base()),b=withKeys(base()),r=validateTypedSourceConstraints(a.snapshot,b.ownership,b.namespaces,b.keyObservations);expect(r.status).toBe('VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS');const o=keyObserved(a);expect(o.digest).toBe(keyObserved(b).digest);expect(Object.isFrozen(o.originalKeys[0].rows)).toBe(true);expect(()=>{(o.keyComparators.rows as unknown[]).push({});}).toThrow();expect(()=>{(o.rows[0].columns[0]as {wire:string}).wire='changed';}).toThrow();for(const c of [{...o},JSON.parse(canonicalOwnershipJson(o)),{digest:o.digest},new Proxy(o,{get(){throw Error('must not read');}})])expect(isIssuedTypedSourceConstraintObservations(c)).toBe(false);});
 it('blocks malformed/unknown/incomplete key captures before any successor comparison without mutating original observations',()=>{const f=withKeys(base()),before=canonicalOwnershipJson(f.snapshot),capture=JSON.parse(canonicalOwnershipJson(f.rawKeyCapture))as TypedKeyComparatorCapture;capture.catalogs.pop();const {captureChecksum:ignored,...body}=capture;void ignored;capture.captureChecksum=ownershipDigest(body);const invalid=validateTypedKeyComparators(f.snapshot,capture,capture.captureChecksum);expect(invalid.status).toBe('BLOCKED');expect(keyResult(f,invalid)).toEqual({status:'BLOCKED',diagnostics:[{code:'UNISSUED_TYPED_KEY_COMPARATORS'}]});expect(canonicalOwnershipJson(f.snapshot)).toBe(before);});
});

describe('successor preserved evidence boundaries',()=>{
 it('never applies local bigint, casing or raw comparator inequality when issued key observations are supplied',()=>{const f=withKeys([{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775806'}},{table:'password_recovery_limits',wire:{scope:'global',bucket:'9223372036854775807'}}]),big=vi.spyOn(globalThis,'BigInt').mockImplementation(()=>{throw Error('no local SQL key numeric comparator');}),lower=vi.spyOn(String.prototype,'toLowerCase').mockImplementation(()=>{throw Error('no local SQL key collation');});let r;try{r=keyResult(f);}finally{big.mockRestore();lower.mockRestore();}expect(r!.status).toBe('VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS');});
 it('retains UUID, char digest and temporal components while resolving only through explicit SQL classes',()=>{const f=withKeys([...base(),{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000001',workspace_id:'A',employee_id:'E',digest:sha('b'),generation:'00000000-0000-4000-8000-000000000003',allowed_location_ids:'{L}'}},{table:'calendar_subscriptions',wire:{id:'00000000-0000-4000-8000-000000000002',workspace_id:'A',employee_id:'E',digest:sha('c'),generation:'00000000-0000-4000-8000-000000000004',allowed_location_ids:'{L}'}},{table:'schedule_week_settings',wire:{week_start:'2026-10-05'},owner:'A'},{table:'schedule_week_settings',wire:{week_start:'2026-10-12'},owner:'A'}]),o=keyObserved(f);expect(result(f).status).toBe('BLOCKED');for(const k of o.originalKeys.filter(k=>['calendar_subscriptions','schedule_week_settings'].includes(k.table)))for(const r of k.rows){expect(r.comparison.kind).toBe('DATABASE_KEY_EQUALITY_CLASS');expect(r.components.map(c=>[c.type,c.wire,c.lineageChecksum])).toEqual(k.columns.map(name=>{const c=f.ownership.rows.find(row=>row.table===k.table&&canonicalOwnershipJson(row.key)===canonicalOwnershipJson(r.key))!.columns.find(c=>c.name===name)!;return[c.type,c.wire,c.lineage.source.checksum];}));}});
 it('binds V2 digest to exact independently issued key witness checksum and retained source metadata',()=>{const specs=[root(),location(),employee('E1'),employee('E2')],a=withKeys(specs),b=withKeys(specs,suppliedClass('employees','PRIMARY_KEY:["id"]',['E1'],'999999999999999999999999999999')),x=keyObserved(a),y=keyObserved(b);expect(x.boundary).toEqual(y.boundary);expect(x.rows).toEqual(y.rows);expect(x.namespaceDigest).toBe(y.namespaceDigest);expect(x.keyCaptureChecksum).not.toBe(y.keyCaptureChecksum);expect(x.keyComparatorDigest).not.toBe(y.keyComparatorDigest);expect(x.digest).not.toBe(y.digest);const {digest,...body}=x;expect(digest).toBe(ownershipDigest(body));expect(x.originalKeys.find(k=>k.table==='employees'&&k.kind==='PRIMARY_KEY')!.contractChecksum).toBe(y.originalKeys.find(k=>k.table==='employees'&&k.kind==='PRIMARY_KEY')!.contractChecksum);});
});
