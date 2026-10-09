import {isIssuedInspectedTypedSnapshot,type InspectedTypedSnapshot,type InspectedTypedSnapshotColumn} from './typed-snapshot';
import {isIssuedTypedOwnershipSourceObservations,type TypedAssignedSourceRow,type TypedOwnershipBoundary} from './typed-ownership';
import {DATABASE_NAMESPACES,isIssuedTypedDatabaseNamespaceObservations} from './namespace-comparators';
import {canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,type JsonValue,type EvidenceLocation} from './ownership';

export type TypedConstraintDiagnostic=Readonly<{code:string;table?:string;label?:string;scope?:'GLOBAL'|'TENANT';keys?:readonly (readonly JsonValue[])[]}>;
export type TypedConstraintComponent=Readonly<{column:string;type:string;wire:string|null;sqlNull:boolean;lineageChecksum:string}>;
export type TypedConstraintComparison=
 | Readonly<{kind:'ORIGINAL_SQL_WIRE';components:readonly TypedConstraintComponent[]}>
 | Readonly<{kind:'APP_SELECTOR';original:string;normalized:string}>
 | Readonly<{kind:'DATABASE_EQUALITY_CLASS';contractId:string;expressionValue:string|null;comparisonClass:string|null;captureChecksum:string}>;
export type TypedConstraintRow=Readonly<{key:readonly JsonValue[];rowChecksum:string;workspaceId:string|null;included:boolean;components:readonly TypedConstraintComponent[];comparison:TypedConstraintComparison}>;
export type TypedOriginalKeyObservation=Readonly<{table:string;kind:string;name:string|null;columns:readonly string[];source:Readonly<EvidenceLocation>;contractChecksum:string;rows:readonly TypedConstraintRow[]}>;
export type TypedCandidateNamespaceObservation=Readonly<{table:string;label:string;scope:'GLOBAL'|'TENANT';source:Readonly<{path:string;contract:string}>;rows:readonly TypedConstraintRow[]}>;
export type TypedSourceConstraintObservations=Readonly<{
 format:'TYPED_SOURCE_CONSTRAINT_OBSERVATIONS_V1';boundary:Readonly<TypedOwnershipBoundary>;
 namespaceCaptureChecksum:string;ownershipDigest:string;namespaceDigest:string;
 tables:readonly Readonly<{table:string;count:number;checksum:string}>[];
 rows:readonly TypedAssignedSourceRow[];originalKeys:readonly TypedOriginalKeyObservation[];
 namespaces:readonly TypedCandidateNamespaceObservation[];digest:string;
 verification:'PURE_SOURCE_CONSTRAINT_OBSERVATIONS_NOT_DATABASE_UNIQUENESS_OPERATOR_OR_TENANT_AUTHORITY';remainingGates:readonly string[];
}>;
export type TypedSourceConstraintsOutcome=
 | Readonly<{status:'VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS';observations:TypedSourceConstraintObservations}>
 | Readonly<{status:'BLOCKED';diagnostics:readonly TypedConstraintDiagnostic[]}>;

const registry=getOwnershipRegistry();
const issued=new WeakSet<object>();
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
const identity=(table:string,key:readonly JsonValue[])=>canonicalOwnershipJson([table,key]);
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in descriptor)freeze(descriptor.value);
  Object.freeze(value);
 }return value;
}
const blocked=(diagnostics:TypedConstraintDiagnostic[]):TypedSourceConstraintsOutcome=>freeze({status:'BLOCKED' as const,diagnostics});
class ConstraintFailure extends Error{constructor(readonly code:string){super(code);}}
function fail(code:string):never{throw new ConstraintFailure(code);}
function column(row:TypedAssignedSourceRow,name:string):InspectedTypedSnapshotColumn{
 const c=row.columns.find(c=>c.name===name);if(!c)fail('UNSUPPORTED_SOURCE_COLUMN');return c;
}
function scalar(row:TypedAssignedSourceRow,name:string):string|null{
 const c=column(row,name),v=c.lineage.nodes[0].value;
 if(v.kind==='SQL_NULL'&&c.wire===null)return null;
 if(v.kind!=='SQL_SCALAR'||v.text!==c.wire)fail('UNSUPPORTED_SQL_COMPARATOR');
 return v.text;
}
function components(row:TypedAssignedSourceRow,names:readonly string[]):TypedConstraintComponent[]{
 return names.map(name=>{const c=column(row,name);return {column:name,type:c.type,wire:scalar(row,name),sqlNull:c.lineage.nodes[0].value.kind==='SQL_NULL',lineageChecksum:c.lineage.source.checksum};});
}
function wireRow(row:TypedAssignedSourceRow,names:readonly string[]):TypedConstraintRow{
 const values=components(row,names);return {key:row.key,rowChecksum:row.rowChecksum,workspaceId:row.workspaceId,included:!values.some(v=>v.sqlNull),components:values,comparison:{kind:'ORIGINAL_SQL_WIRE',components:values}};
}
type Equality='EQUAL'|'DIFFERENT'|'UNSUPPORTED';
/** Only validated canonical built-in integer/boolean wires have a local
 * non-identical SQL value comparison. No collation/opclass is present for the
 * other original key columns in this input API. Unequal text/char/UUID/temporal
 * spellings therefore cannot prove SQL inequality. Identical scalar spelling
 * does prove equal supplied value; a different supported component disproves
 * equality of a composite tuple without needing the unsupported component.
 * BigInt is internal comparison only: no Number rounding or output conversion.
 */
function compareComponents(a:readonly TypedConstraintComponent[],b:readonly TypedConstraintComponent[]):Equality{
 if(a.length!==b.length)return 'UNSUPPORTED';
 let unresolved=false;
 for(let i=0;i<a.length;i++){
  const x=a[i],y=b[i];
  if(x.type!==y.type||x.column!==y.column||x.sqlNull||y.sqlNull)return 'UNSUPPORTED';
  if(x.wire===y.wire)continue;
  if(x.type==='boolean')return 'DIFFERENT';
  if(['smallint','integer','bigint'].includes(x.type)){
   if(BigInt(x.wire!)!==BigInt(y.wire!))return 'DIFFERENT';
  }else unresolved=true;
 }
 return unresolved?'UNSUPPORTED':'EQUAL';
}
function compare(a:TypedConstraintComparison,b:TypedConstraintComparison):Equality{
 if(a.kind!==b.kind)return 'UNSUPPORTED';
 if(a.kind==='ORIGINAL_SQL_WIRE'&&b.kind==='ORIGINAL_SQL_WIRE')return compareComponents(a.components,b.components);
 if(a.kind==='APP_SELECTOR'&&b.kind==='APP_SELECTOR')return a.normalized===b.normalized?'EQUAL':'DIFFERENT';
 if(a.kind==='DATABASE_EQUALITY_CLASS'&&b.kind==='DATABASE_EQUALITY_CLASS'){
  if(a.contractId!==b.contractId||a.captureChecksum!==b.captureChecksum||a.comparisonClass===null||b.comparisonClass===null)return 'UNSUPPORTED';
  return a.comparisonClass===b.comparisonClass?'EQUAL':'DIFFERENT';
 }
 return 'UNSUPPORTED';
}
function checkRows(table:string,label:string,scope:'GLOBAL'|'TENANT',rows:readonly TypedConstraintRow[],diagnostics:TypedConstraintDiagnostic[]){
 const included=rows.filter(r=>r.included);
 for(let i=0;i<included.length;i++)for(let j=i+1;j<included.length;j++){
  const a=included[i],b=included[j];
  if(scope==='TENANT'&&a.workspaceId!==b.workspaceId)continue;
  const equality=compare(a.comparison,b.comparison);
  if(equality!=='DIFFERENT')diagnostics.push({code:equality==='EQUAL'?'NAMESPACE_COLLISION':'UNSUPPORTED_SQL_COMPARATOR',table,label,scope,keys:[a.key,b.key]});
 }
}
const candidateSource=(contract:string)=>({path:'src/lib/tenancy/migrations/backfill.ts',contract});
const keyLabel=(kind:string,name:string|null,columns:readonly string[])=>name??kind+':'+canonicalOwnershipJson(columns);
function boundary(snapshot:InspectedTypedSnapshot):TypedOwnershipBoundary{return {registryDigest:snapshot.registryDigest,sourceDigest:snapshot.sourceDigest,currentSchemaDigest:snapshot.currentSchemaDigest,snapshotId:snapshot.snapshotId,fenceGeneration:snapshot.fenceGeneration,factsDigest:snapshot.factsDigest};}

/** Complete supplied typed row/key/fence and candidate namespace observation,
 * not complete effective SQL constraint validation or an executable plan.
 *
 * All three private issuers are checked before any input property read. Exact
 * source/schema/facts/fence/table/row/column/capture boundaries must agree.
 * Original keys, raw wires, issued lineage, classifications and security fence
 * labels remain unchanged. Labels that describe operative state (revocation,
 * budgets, hash/version, generation) retain full original row evidence rather
 * than being invented as UNIQUE constraints. Existing ownership observes the
 * permanent device hash/version linkage; actual guards/indexes remain gates.
 *
 * Original declared PK/UNIQUE keys remain GLOBAL. Source0001–0025 declares no
 * NULLS NOT DISTINCT keys; SQLNULL means absent for UNIQUE comparisons, never
 * JSONNULL. Source-defined tenant candidates mirror the frozen backfill
 * contract: separate approved employee selector normalization, four supplied
 * DB expression equality classes (including excluded rows), clocker/week/
 * publication tuples, and global push installation/active endpoint tuples.
 * https://www.postgresql.org/docs/17/ddl-constraints.html
 * https://www.postgresql.org/docs/17/collation.html
 *
 * Raw wire inequality is not SQL inequality under unobserved collations or
 * type/operator semantics. Such required pair comparisons BLOCK explicitly.
 * Empty/single-row groups are vacuous. Pairwise work has no invented size or
 * timing policy; large captures need separate performance evidence. Hashes
 * and local issuance only bind supplied source observations, never authenticate
 * a DB, reviewer, operator, principal, retained history or current fence.
 */
export function validateTypedSourceConstraints(snapshot:unknown,ownership:unknown,namespaces:unknown):TypedSourceConstraintsOutcome{
 if(!isIssuedInspectedTypedSnapshot(snapshot))return blocked([{code:'UNISSUED_TYPED_SNAPSHOT'}]);
 if(!isIssuedTypedOwnershipSourceObservations(ownership))return blocked([{code:'UNISSUED_TYPED_OWNERSHIP'}]);
 if(!isIssuedTypedDatabaseNamespaceObservations(namespaces))return blocked([{code:'UNISSUED_TYPED_NAMESPACES'}]);
 try{
  const sourceBoundary=boundary(snapshot);
  if(snapshot.registryDigest!==registry.digest)fail('REGISTRY_DRIFT');
  if(!same(sourceBoundary,ownership.boundary)||snapshot.namespaceCaptureChecksum!==ownership.namespaceCaptureChecksum)fail('OWNERSHIP_BOUNDARY_DRIFT');
  const tables=snapshot.tables.map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum}));
  if(!same(tables,ownership.tables))fail('OWNERSHIP_TABLE_DRIFT');
  const expectedRows=snapshot.tables.flatMap(t=>t.rows.map(r=>({table:t.table,key:r.key,rowChecksum:r.originalChecksum,columns:r.columns})));
  if(expectedRows.length!==ownership.rows.length)fail('OWNERSHIP_ROW_DRIFT');
  const owned=new Map(ownership.rows.map(r=>[identity(r.table,r.key),r]));
  if(owned.size!==expectedRows.length)fail('OWNERSHIP_ROW_DRIFT');
  for(const r of expectedRows){
   const o=owned.get(identity(r.table,r.key)),rule=registry.tables.find(t=>t.table===r.table)!;
   if(!o||o.rowChecksum!==r.rowChecksum||!same(o.columns,r.columns)||o.storage!==rule.storage||o.sidecar!==rule.sidecar||!same(o.globalFences,rule.globalFences))fail('OWNERSHIP_ROW_OR_COLUMN_DRIFT');
  }
  if(!same(namespaces.binding,{registryDigest:snapshot.registryDigest,sourceDigest:snapshot.sourceDigest,schemaDigest:snapshot.currentSchemaDigest,snapshotId:snapshot.snapshotId,rowSetChecksum:ownershipDigest(tables)})||namespaces.factsDigest!==snapshot.factsDigest||namespaces.fenceGeneration!==snapshot.fenceGeneration||namespaces.captureChecksum!==snapshot.namespaceCaptureChecksum)fail('NAMESPACE_BOUNDARY_DRIFT');
  const diagnostics:TypedConstraintDiagnostic[]=[],originalKeys:TypedOriginalKeyObservation[]=[],candidates:TypedCandidateNamespaceObservation[]=[];
  const byTable=new Map(registry.tables.map(rule=>[rule.table,ownership.rows.filter(r=>r.table===rule.table)]));
  for(const rule of registry.tables)for(const key of rule.declaredKeys){
   if(key.kind!=='PRIMARY_KEY'&&key.kind!=='UNIQUE')fail('UNSUPPORTED_SOURCE_KEY_CONTRACT');
   const rows=byTable.get(rule.table)!.map(r=>wireRow(r,key.columns));
   if(key.kind==='PRIMARY_KEY'&&rows.some(r=>!r.included))fail('ORIGINAL_PRIMARY_KEY_SQL_NULL');
   originalKeys.push({table:rule.table,kind:key.kind,name:key.name,columns:[...key.columns],source:rule.source,contractChecksum:ownershipDigest({registryDigest:registry.digest,table:rule.table,source:rule.source,key}),rows});
   checkRows(rule.table,keyLabel(key.kind,key.name,key.columns),'GLOBAL',rows,diagnostics);
  }
  function add(table:string,label:string,scope:'GLOBAL'|'TENANT',rows:TypedConstraintRow[],contract:string){
   if(!rows.length)return;
   if(scope==='TENANT'&&rows.some(r=>r.workspaceId===null))fail('TENANT_NAMESPACE_OWNER_REQUIRED');
   candidates.push({table,label,scope,source:candidateSource(contract),rows});checkRows(table,label,scope,rows,diagnostics);
  }
  const employees=byTable.get('employees')!;
  add('employees','normalized_number','TENANT',employees.map(row=>{
   const original=scalar(row,'id');if(original===null)fail('ORIGINAL_PRIMARY_KEY_SQL_NULL');
   const normalized=original.trim().toUpperCase(),readable=!!normalized&&!/[\u0000-\u001f\u007f]/.test(normalized);
   if(!readable)diagnostics.push({code:'LEGACY_SELECTOR_UNREADABLE',table:'employees',label:'normalized_number',scope:'TENANT',keys:[row.key]});
   return {...wireRow(row,['id']),included:readable,comparison:{kind:'APP_SELECTOR',original,normalized}};
  }),'employees: separate id.trim().toUpperCase() selector; preserve original id');
  const namespaceRows=new Map(namespaces.rows.map(r=>[canonicalOwnershipJson([r.contractId,r.key]),r]));
  for(const contract of DATABASE_NAMESPACES){
   add(contract.table,contract.label,'TENANT',byTable.get(contract.table)!.map(row=>{
    const observed=namespaceRows.get(canonicalOwnershipJson([contract.contractId,row.key]));
    if(!observed||observed.rowChecksum!==row.rowChecksum)fail('NAMESPACE_ROW_DRIFT');
    return {...wireRow(row,[contract.column]),included:observed.included,comparison:{kind:'DATABASE_EQUALITY_CLASS',contractId:contract.contractId,expressionValue:observed.expressionValue,comparisonClass:observed.comparisonClass,captureChecksum:namespaces.captureChecksum}};
   }),'issued captured predicate/expression/collation equality class: '+contract.contractId);
  }
  for(const [table,label,columns]of [['locations','clocker_key',['clocker_key']],['schedule_week_settings','week',['week_start']],['schedule_publication_revisions','publication_number',['week_start','revision_number']]]as const){
   add(table,label,'TENANT',byTable.get(table)!.map(row=>wireRow(row,columns)),'source original scalar tuple: '+canonicalOwnershipJson(columns));
  }
  const pushes=byTable.get('push_subscriptions')!;
  add('push_subscriptions','installation_global','GLOBAL',pushes.map(row=>wireRow(row,['installation_hash','environment'])),'preserved global installation_hash+environment');
  add('push_subscriptions','active_endpoint_global','GLOBAL',pushes.map(row=>({...wireRow(row,['endpoint_fingerprint','environment']),included:scalar(row,'status')==='active'})),'global endpoint_fingerprint+environment, source status exactly active');
  if(diagnostics.length)return blocked(diagnostics);
  const body={format:'TYPED_SOURCE_CONSTRAINT_OBSERVATIONS_V1' as const,boundary:sourceBoundary,namespaceCaptureChecksum:snapshot.namespaceCaptureChecksum,ownershipDigest:ownership.digest,namespaceDigest:namespaces.digest,tables,rows:ownership.rows,originalKeys,namespaces:candidates,verification:'PURE_SOURCE_CONSTRAINT_OBSERVATIONS_NOT_DATABASE_UNIQUENESS_OPERATOR_OR_TENANT_AUTHORITY' as const,remainingGates:['LIVE_SOURCE_SQL_INDEX_COLLATION_OPCLASS_AND_GUARD_VERIFICATION','FRESH_DATABASE_SOURCE_FENCE_AND_OPERATOR_AUTHORITY','REVIEWER_AND_RETAINED_HISTORY_EVIDENCE_APPROVAL','TYPED_EXECUTABLE_PLAN_AND_ATOMIC_EFFECT_VERIFICATION','ACTUAL_TARGET_POSTGRESQL_NEON_AND_LARGE_CAPTURE_PERFORMANCE_EVIDENCE']};
  const observations:TypedSourceConstraintObservations=freeze({...body,digest:ownershipDigest(body)});
  issued.add(observations);return Object.freeze({status:'VALIDATED_SOURCE_CONSTRAINT_OBSERVATIONS',observations});
 }catch(error){return blocked([{code:error instanceof ConstraintFailure?error.code:'INVALID_TYPED_CONSTRAINT_STRUCTURE'}]);}
}
/** Trap-free local provenance only. Serialization/digest never reissues output. */
export function isIssuedTypedSourceConstraintObservations(input:unknown):input is TypedSourceConstraintObservations{return typeof input==='object'&&input!==null&&issued.has(input);}
