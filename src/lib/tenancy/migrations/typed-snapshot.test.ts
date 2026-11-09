import {describe,it,expect,vi} from 'vitest';
import {inspectTypedMigrationSnapshot,isIssuedInspectedTypedSnapshot} from './typed-snapshot';
import {decodeTypedMigrationWireValue} from './typed-wire';
import {canonicalOwnershipJson,type JsonValue} from './ownership';
import {createTypedSnapshotFixture as fixture} from './typed-fixture.test-support';

const sha=(v:string)=>v.repeat(64);

function good(){const f=fixture();f.row('employee_scheduling_settings',{employee_id:'employee-1',operational_rule_profile:'{"n":9007199254740993,"scale":1.00,"null":null,"empty":[],"obj":{}}'});f.row('calendar_subscriptions',{id:'00000000-0000-4000-8000-000000000002',allowed_location_ids:'[0:1]={location-1,NULL}'});return {...f,boundary:f.seal()};}
function blocked(facts:unknown,boundary:unknown,code:string){expect(inspectTypedMigrationSnapshot(facts,boundary)).toEqual({status:'BLOCKED',code});}
describe('complete typed snapshot integrity, separate from ownership and namespace semantics',()=>{
 it('accepts the complete68-table empty source with an independently supplied exact boundary',()=>{const f=fixture();const result=inspectTypedMigrationSnapshot(f.facts,f.seal());expect(result.status).toBe('INSPECTED');if(result.status==='INSPECTED'){expect(result.snapshot.tables).toHaveLength(68);expect(isIssuedInspectedTypedSnapshot(result.snapshot)).toBe(true);}});
 it('retains exact precision/null/array bounds in every complete issued cell',()=>{const f=good(),r=inspectTypedMigrationSnapshot(f.facts,f.boundary);expect(r.status).toBe('INSPECTED');if(r.status!=='INSPECTED')return;const json=r.snapshot.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].columns.find(c=>c.name==='operational_rule_profile')!.lineage;expect(json.nodes.filter(n=>n.value.kind==='JSON_NUMBER').map(n=>n.value)).toEqual([{kind:'JSON_NUMBER',lexeme:'9007199254740993'},{kind:'JSON_NUMBER',lexeme:'1.00'}]);const array=r.snapshot.tables.find(t=>t.table==='calendar_subscriptions')!.rows[0].columns.find(c=>c.name==='allowed_location_ids')!.lineage;expect(array.nodes[0].value).toMatchObject({kind:'SQL_ARRAY',dimensions:[{lowerBound:0,length:2}]});expect(array.nodes[2].value.kind).toBe('SQL_ARRAY_NULL');expect(r.snapshot.verification).toContain('NOT_OWNERSHIP_NAMESPACE_SEMANTICS_OPERATOR_OR_DATABASE_AUTHORITY');});
 it('detaches all mutable metadata without changing or authorizing the input',()=>{const f=good(),before=canonicalOwnershipJson(f.facts),r=inspectTypedMigrationSnapshot(f.facts,f.boundary);expect(r.status).toBe('INSPECTED');if(r.status!=='INSPECTED')return;expect(canonicalOwnershipJson(f.facts)).toBe(before);expect(Object.isFrozen(r.snapshot)).toBe(true);expect(Object.isFrozen(r.snapshot.tables[0].rows)).toBe(true);const old=r.snapshot.tables[0].table;f.facts.tables[0].table='changed';expect(r.snapshot.tables[0].table).toBe(old);});
 it.each(['sourceDigest','currentSchemaDigest','snapshotId','fenceGeneration','factsDigest'] as const)('blocks caller boundary drift in%s',key=>{const f=good();blocked(f.facts,{...f.boundary,[key]:key==='fenceGeneration'?'2':key==='snapshotId'?'other':sha('c')},'TYPED_SNAPSHOT_BOUNDARY_DRIFT');});
 it('rejects an incomplete/unknown boundary',()=>{const f=good();blocked(f.facts,{...f.boundary,other:true},'INVALID_TYPED_SNAPSHOT_BOUNDARY');});
 it('rejects source/schema/facts digest malformed values',()=>{const f=good();blocked(f.facts,{...f.boundary,sourceDigest:'bad'},'INVALID_TYPED_SNAPSHOT_BOUNDARY');});
 const mutations:{name:string;code:string;mutate:(f:ReturnType<typeof good>)=>void}[]=[
  {name:'wrong format',code:'TYPED_SNAPSHOT_SHAPE_DRIFT',mutate:f=>{Object.assign(f.facts,{format:'LEGACY'});}},
  {name:'foreign registry',code:'TYPED_SNAPSHOT_REGISTRY_DRIFT',mutate:f=>{f.facts.registryDigest=sha('c');}},
  {name:'missing table',code:'TYPED_SNAPSHOT_TABLE_DRIFT',mutate:f=>{f.facts.tables.pop();}},
  {name:'duplicate table',code:'TYPED_SNAPSHOT_TABLE_DRIFT',mutate:f=>{f.facts.tables[1]=f.facts.tables[0];}},
  {name:'unknown table',code:'TYPED_SNAPSHOT_TABLE_DRIFT',mutate:f=>{f.facts.tables[0].table='foreign';}},
  {name:'count mismatch',code:'TYPED_SNAPSHOT_COUNT_DRIFT',mutate:f=>{f.facts.tables[0].expectedCount=1;}},
  {name:'table checksum mismatch',code:'TYPED_SNAPSHOT_TABLE_CHECKSUM_DRIFT',mutate:f=>{f.facts.tables[0].expectedChecksum=sha('c');}},
  {name:'row checksum mismatch',code:'TYPED_SNAPSHOT_ROW_CHECKSUM_DRIFT',mutate:f=>{f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].originalChecksum=sha('c');}},
  {name:'missing column',code:'TYPED_SNAPSHOT_COLUMN_DRIFT',mutate:f=>{f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].columns.pop();}},
  {name:'reordered columns',code:'TYPED_SNAPSHOT_COLUMN_DRIFT',mutate:f=>{f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].columns.reverse();}},
  {name:'column type drift',code:'TYPED_SNAPSHOT_COLUMN_DRIFT',mutate:f=>{f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].columns[0].type='integer';}},
  {name:'column wire drift',code:'TYPED_SNAPSHOT_CELL_DRIFT',mutate:f=>{f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].columns[0].wire='other';}},
  {name:'cloned value envelope',code:'TYPED_SNAPSHOT_UNISSUED_CELL',mutate:f=>{const c=f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].columns[0];c.value={...c.value};}},
  {name:'row key drift',code:'TYPED_SNAPSHOT_KEY_DRIFT',mutate:f=>{f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].key=['other'];}},
  {name:'duplicate row',code:'TYPED_SNAPSHOT_DUPLICATE_KEY',mutate:f=>{const t=f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!;t.rows.push(t.rows[0]);t.expectedCount=2;}},
  {name:'missing wire row',code:'TYPED_SNAPSHOT_WIRE_DRIFT',mutate:f=>{f.facts.wireRows.pop();}},
  {name:'wire checksum drift',code:'TYPED_SNAPSHOT_WIRE_DRIFT',mutate:f=>{(f.facts.wireRows[0] as Record<string,JsonValue>).wireChecksum=sha('c');}},
  {name:'catalog drift',code:'TYPED_SNAPSHOT_CATALOG_DRIFT',mutate:f=>{f.facts.catalog={other:true};}},
  {name:'namespace binding drift',code:'TYPED_SNAPSHOT_NAMESPACE_BINDING_DRIFT',mutate:f=>{f.facts.namespaceComparators.binding.snapshotId='other';}},
  {name:'namespace checksum drift',code:'TYPED_SNAPSHOT_NAMESPACE_CHECKSUM_DRIFT',mutate:f=>{f.facts.namespaceComparators.captureChecksum=sha('c');}},
  {name:'wrong isolation',code:'TYPED_SNAPSHOT_SNAPSHOT_DRIFT',mutate:f=>{Object.assign(f.facts.snapshot,{isolation:'READ COMMITTED'});}},
  {name:'history omitted',code:'TYPED_SNAPSHOT_SNAPSHOT_DRIFT',mutate:f=>{Object.assign(f.facts.snapshot,{includesHistory:false});}},
  {name:'fence not closed',code:'TYPED_SNAPSHOT_FENCE_DRIFT',mutate:f=>{Object.assign(f.facts.fence,{phase:'EXPANDED_LEGACY'});}},
  {name:'pretend assigned manifest',code:'TYPED_SNAPSHOT_FENCE_DRIFT',mutate:f=>{Object.assign(f.facts.fence,{manifest:sha('c')});}},
 ];
 it.each(mutations)('blocks $name without trusting a recomputed full facts hash',fcase=>{const f=good();fcase.mutate(f);const b=f.seal(fcase.code!=='TYPED_SNAPSHOT_NAMESPACE_CHECKSUM_DRIFT');blocked(f.facts,b,fcase.code);});
 it('blocks actual full digest drift against a fixed separately supplied value',()=>{const f=good();f.facts.factsDigest=sha('c');blocked(f.facts,{...f.boundary,factsDigest:sha('c')},'TYPED_SNAPSHOT_FACTS_CHECKSUM_DRIFT');});
 it('blocks nullable versus nonnullable source cell drift',()=>{const f=fixture();f.row('employee_scheduling_settings',{employee_id:'e'});const c=f.facts.tables.find(t=>t.table==='employee_scheduling_settings')!.rows[0].columns[0],x=decodeTypedMigrationWireValue(c.type,null);if(x.status!=='DECODED')throw Error('Bad root fixture');Object.assign(c,{wire:null,value:x.value});blocked(f.facts,f.seal(),'TYPED_SNAPSHOT_REQUIRED_COLUMN_NULL');});
 it('blocks invalid native array syntax before emitting any snapshot',()=>{const f=fixture();f.row('calendar_subscriptions',{allowed_location_ids:'[0:2]={a,b}'});blocked(f.facts,f.seal(),'INVALID_ARRAY_WIRE');});
 it('rejects deserialized envelopes without reissuing provenance',()=>{const f=good();blocked(JSON.parse(canonicalOwnershipJson(f.facts)),f.boundary,'TYPED_SNAPSHOT_UNISSUED_CELL');});
 it('does not invoke capture accessors',()=>{const f=good(),get=vi.fn(()=>f.facts.tables);Object.defineProperty(f.facts,'tables',{enumerable:true,get});blocked(f.facts,f.boundary,'UNSUPPORTED_TYPED_SNAPSHOT_VALUE');expect(get).not.toHaveBeenCalled();});
 it.each([undefined,null,1,NaN,Infinity,()=>1,new Date(),Object.create(null)])('rejects unsupported capture input%p',input=>{const f=good();expect(inspectTypedMigrationSnapshot(input,f.boundary).status).toBe('BLOCKED');});
 it('does not let a clone or revoked proxy acquire inspected provenance',()=>{const f=good(),r=inspectTypedMigrationSnapshot(f.facts,f.boundary);expect(r.status).toBe('INSPECTED');if(r.status!=='INSPECTED')return;expect(isIssuedInspectedTypedSnapshot({...r.snapshot})).toBe(false);const proxy=Proxy.revocable(r.snapshot,{});proxy.revoke();expect(isIssuedInspectedTypedSnapshot(proxy.proxy)).toBe(false);});
});
