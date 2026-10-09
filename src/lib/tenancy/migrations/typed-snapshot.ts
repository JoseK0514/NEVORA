import {canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,type JsonValue} from './ownership';
import type {TypedMigrationCaptureFacts} from './capture.server';
import {isIssuedTypedMigrationWireValue,projectTypedMigrationWireValueToLegacy} from './typed-wire';
import {traverseTypedMigrationWireValue} from './typed-lineage';
import type { TypedMigrationCellLineage } from './typed-lineage';
export type TypedSnapshotBoundary = Readonly<{sourceDigest:string;currentSchemaDigest:string;snapshotId:string;fenceGeneration:string;factsDigest:string}>;
export type InspectedTypedSnapshotColumn = Readonly<{name:string;type:string;wire:string|null;lineage:TypedMigrationCellLineage}>;
export type InspectedTypedSnapshotRow = Readonly<{key:readonly JsonValue[];originalChecksum:string;columns:readonly InspectedTypedSnapshotColumn[]}>;
export type InspectedTypedSnapshot = Readonly<{format:'TYPED_SNAPSHOT_INSPECTION_V1';registryDigest:string;sourceDigest:string;currentSchemaDigest:string;snapshotId:string;fenceGeneration:string;factsDigest:string;tables:readonly Readonly<{table:string;rows:readonly InspectedTypedSnapshotRow[];expectedCount:number;expectedChecksum:string}>[];verification:'PURE_TYPED_SNAPSHOT_INTEGRITY_NOT_OWNERSHIP_NAMESPACE_SEMANTICS_OPERATOR_OR_DATABASE_AUTHORITY'}>;
export type TypedSnapshotInspectionOutcome=Readonly<{status:'INSPECTED';snapshot:InspectedTypedSnapshot}>|Readonly<{status:'BLOCKED';code:string}>;

const issued=new WeakSet<object>();
const SHA=/^[a-f0-9]{64}$/;
const UINT=/^(0|[1-9][0-9]*)$/;
const blocked=(code:string):TypedSnapshotInspectionOutcome=>Object.freeze({status:'BLOCKED',code});
class InspectionFailure extends Error {constructor(readonly code:string){super(code);}}
function fail(code:string):never{throw new InspectionFailure(code);}
function keys(value:unknown,expected:string[]):boolean{
 return typeof value==='object'&&value!==null&&!Array.isArray(value)&&canonicalOwnershipJson(Object.keys(value).sort())===canonicalOwnershipJson([...expected].sort());
}
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value' in descriptor)freeze(descriptor.value);
  Object.freeze(value);
 }
 return value;
}
/** Complete supplied snapshot integrity only. The caller supplies its exact
 * independently retained source/schema/snapshot/fence/facts boundary; matching
 * values and digests bind observations, never authenticate a DB or operator.
 * No ownership assignment, retained-history proof, namespace comparison/index
 * semantics, fence coverage, source catalog approval or executable plan is
 * issued. All68tables, original column order, keys and separate raw wire rows
 * are checked before a detached immutable snapshot is returned.
 *
 * Issued cells are required; serialization cannot silently reissue them. Only
 * scalar source primary keys use the existing safe key representation; payload
 * JSON/arrays always retain typed lineage and are never projected to legacy.
 * The general ordinary-data ingestion check rejects accessors without calling
 * them; proxy meta traps may run and errors fail closed. No arbitrary size,
 * history-retention or performance policy is selected here.
 */
export function inspectTypedMigrationSnapshot(input:unknown,expected:unknown):TypedSnapshotInspectionOutcome{
 try{canonicalOwnershipJson(input);canonicalOwnershipJson(expected);}catch{return blocked('UNSUPPORTED_TYPED_SNAPSHOT_VALUE');}
 try{
  if(!keys(expected,['sourceDigest','currentSchemaDigest','snapshotId','fenceGeneration','factsDigest']))fail('INVALID_TYPED_SNAPSHOT_BOUNDARY');
  const boundary=expected as TypedSnapshotBoundary;
  if(![boundary.sourceDigest,boundary.currentSchemaDigest,boundary.factsDigest].every(v=>typeof v==='string'&&SHA.test(v))||typeof boundary.snapshotId!=='string'||!boundary.snapshotId||typeof boundary.fenceGeneration!=='string'||!UINT.test(boundary.fenceGeneration))fail('INVALID_TYPED_SNAPSHOT_BOUNDARY');
  if(!keys(input,['format','sourceDigest','registryDigest','currentSchemaDigest','snapshot','tables','namespaceComparators','wireRows','fence','catalog','factsDigest','verification']))fail('TYPED_SNAPSHOT_SHAPE_DRIFT');
  const facts=input as TypedMigrationCaptureFacts;
  if(facts.format!=='TYPED_SQL_WIRE_V1'||facts.verification!=='OWNED_LOCAL_TYPED_DATABASE_FACTS_NOT_BACKFILL_AUTHORITY')fail('TYPED_SNAPSHOT_SHAPE_DRIFT');
  const registry=getOwnershipRegistry();
  if(facts.registryDigest!==registry.digest)fail('TYPED_SNAPSHOT_REGISTRY_DRIFT');
  if(!keys(facts.snapshot,['id','isolation','includesInactive','includesHistory'])||typeof facts.snapshot.id!=='string'||!facts.snapshot.id||facts.snapshot.isolation!=='SERIALIZABLE'||facts.snapshot.includesInactive!==true||facts.snapshot.includesHistory!==true)fail('TYPED_SNAPSHOT_SNAPSHOT_DRIFT');
  if(!keys(facts.fence,['phase','generation','actor','manifest'])||facts.fence.phase!=='FENCED'||typeof facts.fence.generation!=='string'||!UINT.test(facts.fence.generation)||facts.fence.actor!==null||facts.fence.manifest!==null)fail('TYPED_SNAPSHOT_FENCE_DRIFT');
  if(!same(boundary,{sourceDigest:facts.sourceDigest,currentSchemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot.id,fenceGeneration:facts.fence.generation,factsDigest:facts.factsDigest}))fail('TYPED_SNAPSHOT_BOUNDARY_DRIFT');
  if(!Array.isArray(facts.tables)||facts.tables.length!==registry.tables.length||new Set(facts.tables.map(t=>t?.table)).size!==registry.tables.length||facts.tables.some((t,i)=>!keys(t,['table','rows','expectedCount','expectedChecksum'])||t.table!==registry.tables[i].table||!Array.isArray(t.rows)))fail('TYPED_SNAPSHOT_TABLE_DRIFT');
  const tables:InspectedTypedSnapshot['tables'][number][]=[];
  const expectedWire:{table:string;key:JsonValue[];values:(string|null)[];originalChecksum:string;wireChecksum:string}[]=[];
  for(let index=0;index<facts.tables.length;index++){
   const table=facts.tables[index],rule=registry.tables[index];
   if(!Number.isSafeInteger(table.expectedCount)||table.expectedCount<0||table.expectedCount!==table.rows.length)fail('TYPED_SNAPSHOT_COUNT_DRIFT');
   const rows:InspectedTypedSnapshotRow[]=[],seen=new Set<string>();let previous:string|undefined;
   for(const row of table.rows){
    if(!keys(row,['key','columns','originalChecksum'])||!Array.isArray(row.key)||!Array.isArray(row.columns)||row.columns.length!==rule.columns.length)fail('TYPED_SNAPSHOT_COLUMN_DRIFT');
    const columns:InspectedTypedSnapshotColumn[]=[];
    for(let ordinal=0;ordinal<rule.columns.length;ordinal++){
     const column=row.columns[ordinal],contract=rule.columns[ordinal];
     if(!keys(column,['name','type','wire','value'])||column.name!==contract.name||column.type!==contract.type)fail('TYPED_SNAPSHOT_COLUMN_DRIFT');
     if(!isIssuedTypedMigrationWireValue(column.value))fail('TYPED_SNAPSHOT_UNISSUED_CELL');
     if(column.value.sourceType!==column.type||column.wire!==(column.value.wire===null?null:column.value.wire.text))fail('TYPED_SNAPSHOT_CELL_DRIFT');
     if(column.value.kind==='SQL_NULL'&&!contract.nullable)fail('TYPED_SNAPSHOT_REQUIRED_COLUMN_NULL');
     const traversed=traverseTypedMigrationWireValue(column.value);if(traversed.status!=='TRAVERSED')fail(traversed.code);
     columns.push({name:column.name,type:column.type,wire:column.wire,lineage:traversed.lineage});
    }
    const key=rule.primaryKey.map(name=>{
     const cell=row.columns.find(c=>c.name===name)!.value;
     if(cell.kind!=='SCALAR')return fail('TYPED_SNAPSHOT_KEY_DRIFT');
     const projection=projectTypedMigrationWireValueToLegacy(cell);
     if(projection.status!=='CONVERTED'||projection.value===null||typeof projection.value==='object')return fail('TYPED_SNAPSHOT_KEY_DRIFT');
     return projection.value;
    });
    if(!same(key,row.key))fail('TYPED_SNAPSHOT_KEY_DRIFT');
    const identity=canonicalOwnershipJson(key);if(seen.has(identity))fail('TYPED_SNAPSHOT_DUPLICATE_KEY');seen.add(identity);
    if(previous!==undefined&&previous>identity)fail('TYPED_SNAPSHOT_KEY_ORDER_DRIFT');previous=identity;
    if(typeof row.originalChecksum!=='string'||!SHA.test(row.originalChecksum)||row.originalChecksum!==ownershipDigest({format:'TYPED_SQL_WIRE_V1',columns:row.columns}))fail('TYPED_SNAPSHOT_ROW_CHECKSUM_DRIFT');
    rows.push({key:[...key],originalChecksum:row.originalChecksum,columns});
    const values=row.columns.map(c=>c.wire);expectedWire.push({table:table.table,key,values,originalChecksum:row.originalChecksum,wireChecksum:ownershipDigest(values)});
   }
   if(typeof table.expectedChecksum!=='string'||!SHA.test(table.expectedChecksum)||table.expectedChecksum!==ownershipDigest(table.rows.map(r=>({key:r.key,checksum:r.originalChecksum}))))fail('TYPED_SNAPSHOT_TABLE_CHECKSUM_DRIFT');
   tables.push({table:table.table,rows,expectedCount:table.expectedCount,expectedChecksum:table.expectedChecksum});
  }
  expectedWire.sort((a,b)=>{const x=canonicalOwnershipJson([a.table,a.key]),y=canonicalOwnershipJson([b.table,b.key]);return x<y?-1:x>y?1:0;});
  if(!same(facts.wireRows,expectedWire))fail('TYPED_SNAPSHOT_WIRE_DRIFT');
  if(ownershipDigest(facts.catalog)!==facts.currentSchemaDigest)fail('TYPED_SNAPSHOT_CATALOG_DRIFT');
  const namespace=facts.namespaceComparators;
  if(!keys(namespace,['binding','catalogs','rows','captureChecksum'])||!Array.isArray(namespace.catalogs)||!Array.isArray(namespace.rows)||!same(namespace.binding,{registryDigest:registry.digest,sourceDigest:facts.sourceDigest,schemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot.id,rowSetChecksum:ownershipDigest(facts.tables.map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum})))}))fail('TYPED_SNAPSHOT_NAMESPACE_BINDING_DRIFT');
  if(typeof namespace.captureChecksum!=='string'||!SHA.test(namespace.captureChecksum)||namespace.captureChecksum!==ownershipDigest({binding:namespace.binding,catalogs:namespace.catalogs,rows:namespace.rows}))fail('TYPED_SNAPSHOT_NAMESPACE_CHECKSUM_DRIFT');
  const {factsDigest,...factsValue}=facts;
  if(typeof factsDigest!=='string'||!SHA.test(factsDigest)||factsDigest!==ownershipDigest(factsValue))fail('TYPED_SNAPSHOT_FACTS_CHECKSUM_DRIFT');
  const snapshot:InspectedTypedSnapshot=freeze({format:'TYPED_SNAPSHOT_INSPECTION_V1',registryDigest:registry.digest,sourceDigest:facts.sourceDigest,currentSchemaDigest:facts.currentSchemaDigest,snapshotId:facts.snapshot.id,fenceGeneration:facts.fence.generation,factsDigest,tables,verification:'PURE_TYPED_SNAPSHOT_INTEGRITY_NOT_OWNERSHIP_NAMESPACE_SEMANTICS_OPERATOR_OR_DATABASE_AUTHORITY'});
  issued.add(snapshot);return Object.freeze({status:'INSPECTED',snapshot});
 }catch(error){return blocked(error instanceof InspectionFailure?error.code:'INVALID_TYPED_SNAPSHOT_STRUCTURE');}
}
/** Trap-free local inspection provenance only; no DB/operator/tenant authority. */
export function isIssuedInspectedTypedSnapshot(input:unknown):input is InspectedTypedSnapshot{
 return typeof input==='object'&&input!==null&&issued.has(input);
}
