import {types as utilTypes} from 'node:util';
import {canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,type JsonValue,type TableOwnership} from './ownership';
import {isIssuedInspectedTypedSnapshot,type InspectedTypedSnapshot,type InspectedTypedSnapshotColumn} from './typed-snapshot';
import {isIssuedTypedOwnershipSourceObservations,type TypedAssignedSourceRow,type TypedOwnershipBoundary,type TypedOwnershipSourceObservations} from './typed-ownership';
import {isIssuedTypedSourceConstraintObservations,type TypedSourceConstraintWithKeysObservations} from './typed-constraints';
import {getTypedKeyComparatorContracts,isIssuedTypedKeyComparatorObservations} from './typed-key-comparators';

export type TypedBackfillAction='ASSIGN_ADDED_DIRECT_WORKSPACE'|'INSERT_TYPED_SIDECAR'|'PRESERVE_EXISTING_NO_WRITE'|'GLOBAL_NO_WRITE';
/** Native typed mirrors are values to be bound by a future guarded adapter,
 * never a JavaScript/JSON projection or a SQL statement. */
export type TypedBackfillEffect=
 Readonly<{kind:'ASSIGN_ADDED_DIRECT_WORKSPACE';schema:'public';table:string;key:readonly JsonValue[];column:'workspace_id';workspaceId:string;precondition:'PROVEN_NULL_ADDED_METADATA'}>|
 Readonly<{kind:'INSERT_TYPED_SIDECAR';schema:'public';table:string;identity:readonly InspectedTypedSnapshotColumn[];workspaceId:string;sourceChecksum:string;captureManifestBinding:'ORIGINAL_TYPED_PLAN_DIGEST';precondition:'EXACT_ABSENCE_REQUIRED'}>|
 Readonly<{kind:'PRESERVE_EXISTING_NO_WRITE'|'GLOBAL_NO_WRITE';schema:'public';table:string;key:readonly JsonValue[];workspaceId:string|null;sourceChecksum:string}>;
export type TypedBackfillEntry=Readonly<{
 table:string;key:readonly JsonValue[];sourceChecksum:string;source:TypedAssignedSourceRow;
 wireValues:readonly (string|null)[];wireChecksum:string;
 mirroredIdentity:readonly InspectedTypedSnapshotColumn[];mirroredIdentityChecksum:string;
 action:TypedBackfillAction;effect:TypedBackfillEffect;expectedMetadataChecksum:string;
}>;
export type TypedBackfillTableManifest=Readonly<{
 table:string;source:TableOwnership['source'];storage:TableOwnership['storage'];anchor:TableOwnership['anchor'];sidecar:string|null;
 originalColumns:readonly TableOwnership['columns'][number][];primaryKey:readonly string[];mirroredIdentityColumns:readonly string[];globalFences:readonly string[];
 count:number;sourceChecksum:string;wireChecksum:string;expectedMetadataChecksum:string;
}>;
export type TypedBackfillManifest=Readonly<{
 format:'TYPED_TENANT_BACKFILL_MANIFEST_V1';boundary:Readonly<TypedOwnershipBoundary>;
 namespaceCaptureChecksum:string;ownershipDigest:string;assignmentEvidenceDigest:string;namespaceDigest:string;constraintsDigest:string;keyCaptureChecksum:string;keyComparatorDigest:string;
 chunkSize:number;tables:readonly TypedBackfillTableManifest[];entries:readonly TypedBackfillEntry[];
 observations:Readonly<{snapshot:InspectedTypedSnapshot;ownership:TypedOwnershipSourceObservations;constraints:TypedSourceConstraintWithKeysObservations}>;
}>;
export type TypedBackfillChunk=Readonly<{
 format:'TYPED_TENANT_BACKFILL_CHUNK_V1';id:string;retryIdentity:string;planDigest:string;ordinal:number;table:string;count:number;
 firstKey:readonly JsonValue[];lastKey:readonly JsonValue[];keys:readonly (readonly JsonValue[])[];
 sourceChecksum:string;expectedMetadataChecksum:string;entries:readonly TypedBackfillEntry[];
 verification:'PURE_NOT_DATABASE_OPERATOR_OR_EFFECT_AUTHORITY';
}>;
export type TypedTenantBackfillPlan=Readonly<{
 format:'TYPED_TENANT_BACKFILL_PLAN_V1';status:'PLANNED';digest:string;manifest:TypedBackfillManifest;entries:readonly TypedBackfillEntry[];chunks:readonly TypedBackfillChunk[];
 verification:'PURE_NOT_DATABASE_OPERATOR_OR_EFFECT_AUTHORITY';remainingGates:readonly string[];
}>;
export type TypedTenantBackfillCompileOutcome=Readonly<{status:'PLANNED';plan:TypedTenantBackfillPlan}>|Readonly<{status:'BLOCKED';code:string}>;
const registry=getOwnershipRegistry();
const keyContracts=getTypedKeyComparatorContracts();
const issued=new WeakSet<object>();
const order=(a:string,b:string)=>a<b?-1:a>b?1:0;
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
const identity=(table:string,key:readonly JsonValue[])=>canonicalOwnershipJson([table,key]);
class CompileFailure extends Error{constructor(readonly code:string){super(code);}}
function fail(code:string):never{throw new CompileFailure(code);}
const blocked=(code:string):TypedTenantBackfillCompileOutcome=>Object.freeze({status:'BLOCKED',code});
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in descriptor)freeze(descriptor.value);
  Object.freeze(value);
 }
 return value;
}
/** Closed supplied technical option only. Reject proxies before reflection and
 * descriptors before reading values; neither coercion nor defaults apply. */
function chunkOption(value:unknown):number{
 if(typeof value!=='object'||value===null||utilTypes.isProxy(value)||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)fail('INVALID_TYPED_BACKFILL_OPTIONS');
 const keys=Reflect.ownKeys(value),d=Object.getOwnPropertyDescriptor(value,'chunkSize');
 if(keys.length!==1||keys[0]!=='chunkSize'||!d||!('value'in d)||!d.enumerable||typeof d.value!=='number'||!Number.isSafeInteger(d.value)||d.value<1||d.value>1000)fail('INVALID_TYPED_BACKFILL_OPTIONS');
 return d.value;
}
function boundary(snapshot:InspectedTypedSnapshot):TypedOwnershipBoundary{
 return {registryDigest:snapshot.registryDigest,sourceDigest:snapshot.sourceDigest,currentSchemaDigest:snapshot.currentSchemaDigest,snapshotId:snapshot.snapshotId,fenceGeneration:snapshot.fenceGeneration,factsDigest:snapshot.factsDigest};
}
function digestMatches(value:{digest:string}):boolean{const {digest,...body}=value;return digest===ownershipDigest(body);}
function validateBindings(snapshot:InspectedTypedSnapshot,ownership:TypedOwnershipSourceObservations,constraints:TypedSourceConstraintWithKeysObservations){
 const b=boundary(snapshot),keys=constraints.keyComparators;
 if(!isIssuedTypedKeyComparatorObservations(keys))fail('UNISSUED_TYPED_KEY_COMPARATORS');
 if(b.registryDigest!==registry.digest||!same(b,ownership.boundary)||!same(b,constraints.boundary)||!same(b,keys.binding))fail('TYPED_BACKFILL_BOUNDARY_DRIFT');
 if(snapshot.namespaceCaptureChecksum!==ownership.namespaceCaptureChecksum||snapshot.namespaceCaptureChecksum!==constraints.namespaceCaptureChecksum||constraints.ownershipDigest!==ownership.digest||constraints.keyCaptureChecksum!==keys.captureChecksum||constraints.keyComparatorDigest!==keys.digest)fail('TYPED_BACKFILL_EVIDENCE_DRIFT');
 if(!digestMatches(ownership)||!digestMatches(constraints)||!digestMatches(keys))fail('TYPED_BACKFILL_DIGEST_DRIFT');
 const tables=snapshot.tables.map(t=>({table:t.table,count:t.expectedCount,checksum:t.expectedChecksum}));
 if(snapshot.tables.length!==registry.tables.length||snapshot.tables.some((t,i)=>t.table!==registry.tables[i].table)||!same(tables,ownership.tables)||!same(tables,constraints.tables)||!same(ownership.rows,constraints.rows))fail('TYPED_BACKFILL_COVERAGE_DRIFT');
 const sourceRows=snapshot.tables.flatMap(t=>t.rows.map(row=>({table:t.table,row}))),seen=new Set<string>();
 if(sourceRows.length!==ownership.rows.length)fail('TYPED_BACKFILL_COVERAGE_DRIFT');
 for(let i=0;i<sourceRows.length;i++){
  const {table,row}=sourceRows[i],assigned=ownership.rows[i],rule=registry.tables.find(t=>t.table===table)!;
  const id=identity(table,row.key);if(seen.has(id))fail('TYPED_BACKFILL_COVERAGE_DRIFT');seen.add(id);
  if(assigned.table!==table||!same(assigned.key,row.key)||assigned.rowChecksum!==row.originalChecksum||!same(assigned.columns,row.columns)||assigned.storage!==rule.storage||assigned.sidecar!==rule.sidecar||!same(assigned.globalFences,rule.globalFences))fail('TYPED_BACKFILL_SOURCE_ROW_DRIFT');
  if(row.columns.length!==rule.columns.length||row.columns.some((c,j)=>c.name!==rule.columns[j].name||c.type!==rule.columns[j].type))fail('TYPED_BACKFILL_SOURCE_COLUMN_DRIFT');
  if(rule.storage==='GLOBAL_SECURITY_CONTROL'?assigned.workspaceId!==null:typeof assigned.workspaceId!=='string')fail('TYPED_BACKFILL_OWNER_DRIFT');
 }
 // V2 must retain complete original SQL key metadata even for empty tables.
 if(!same(keys.catalogs.map(c=>c.contractId),keyContracts.map(c=>c.contractId)))fail('TYPED_BACKFILL_KEY_COVERAGE_DRIFT');
 const expected=keyContracts.flatMap(c=>snapshot.tables.find(t=>t.table===c.table)!.rows.map(r=>({contractId:c.contractId,key:r.key,rowChecksum:r.originalChecksum}))).sort((a,b)=>order(canonicalOwnershipJson([a.contractId,a.key]),canonicalOwnershipJson([b.contractId,b.key])));
 if(!same(keys.rows.map(r=>({contractId:r.contractId,key:r.key,rowChecksum:r.rowChecksum})),expected))fail('TYPED_BACKFILL_KEY_COVERAGE_DRIFT');
 const originals=registry.tables.flatMap(t=>t.declaredKeys.map(k=>({table:t.table,...k,source:t.source})));
 if(constraints.originalKeys.length!==originals.length||constraints.originalKeys.some((k,i)=>!same({table:k.table,kind:k.kind,name:k.name,columns:k.columns,source:k.source},originals[i])))fail('TYPED_BACKFILL_CONSTRAINT_COVERAGE_DRIFT');
 for(const k of constraints.originalKeys){
  const label=k.name??k.kind+':'+canonicalOwnershipJson(k.columns),contract=keyContracts.find(c=>c.table===k.table&&c.kind===k.kind&&c.label===label)!;
  const catalog=keys.catalogs.find(c=>c.contractId===contract.contractId)!;
  const rows=keys.rows.filter(r=>r.contractId===contract.contractId);
  if(k.rows.length!==rows.length||k.rows.some((r,i)=>!same(r.key,rows[i].key)||r.rowChecksum!==rows[i].rowChecksum||r.included!==rows[i].included||r.comparison.kind!=='DATABASE_KEY_EQUALITY_CLASS'||r.comparison.contractId!==contract.contractId||r.comparison.captureChecksum!==keys.captureChecksum||r.comparison.observationsDigest!==keys.digest||r.comparison.catalogChecksum!==catalog.checksum||r.comparison.comparisonClass!==rows[i].comparisonClass))fail('TYPED_BACKFILL_CONSTRAINT_KEY_DRIFT');
 }
}
function entryFor(rule:TableOwnership,source:TypedAssignedSourceRow):TypedBackfillEntry{
 const mirroredIdentity=[...new Set([...rule.primaryKey,...rule.mirroredIdentityColumns])].sort(order).map(name=>source.columns.find(c=>c.name===name)!);
 if(mirroredIdentity.some(c=>!c))fail('TYPED_BACKFILL_MIRROR_DRIFT');
 let effect:TypedBackfillEffect;
 if(rule.storage==='GLOBAL_SECURITY_CONTROL')effect={kind:'GLOBAL_NO_WRITE',schema:'public',table:rule.table,key:source.key,workspaceId:null,sourceChecksum:source.rowChecksum};
 else if(rule.sidecar){
  if(rule.storage!=='TYPED_HISTORICAL_SIDECAR'||typeof source.workspaceId!=='string')fail('TYPED_BACKFILL_ACTION_DRIFT');
  effect={kind:'INSERT_TYPED_SIDECAR',schema:'public',table:rule.sidecar,identity:mirroredIdentity,workspaceId:source.workspaceId,sourceChecksum:source.rowChecksum,captureManifestBinding:'ORIGINAL_TYPED_PLAN_DIGEST',precondition:'EXACT_ABSENCE_REQUIRED'};
 }else if(rule.storage==='DIRECT_IMMUTABLE'&&rule.anchor.kind!=='ROOT'&&!rule.columns.some(c=>c.name==='workspace_id')){
  if(typeof source.workspaceId!=='string')fail('TYPED_BACKFILL_ACTION_DRIFT');
  effect={kind:'ASSIGN_ADDED_DIRECT_WORKSPACE',schema:'public',table:rule.table,key:source.key,column:'workspace_id',workspaceId:source.workspaceId,precondition:'PROVEN_NULL_ADDED_METADATA'};
 }else effect={kind:'PRESERVE_EXISTING_NO_WRITE',schema:'public',table:rule.table,key:source.key,workspaceId:source.workspaceId,sourceChecksum:source.rowChecksum};
 const wireValues=source.columns.map(c=>c.wire);
 return {table:rule.table,key:source.key,sourceChecksum:source.rowChecksum,source,wireValues,wireChecksum:ownershipDigest(wireValues),mirroredIdentity,mirroredIdentityChecksum:ownershipDigest(mirroredIdentity),action:effect.kind,effect,expectedMetadataChecksum:ownershipDigest(effect)};
}
function chunksFor(entries:readonly TypedBackfillEntry[],planDigest:string,chunkSize:number):TypedBackfillChunk[]{
 const chunks:TypedBackfillChunk[]=[];
 for(const rule of registry.tables){
  const rows=entries.filter(e=>e.table===rule.table);
  for(let start=0;start<rows.length;start+=chunkSize){
   const part=rows.slice(start,start+chunkSize),count=part.length,keys=part.map(e=>e.key),ordinal=chunks.length;
   const sourceChecksum=ownershipDigest(part.map(e=>({key:e.key,sourceChecksum:e.sourceChecksum,wireChecksum:e.wireChecksum})));
   const expectedMetadataChecksum=ownershipDigest(part.map(e=>({key:e.key,action:e.action,checksum:e.expectedMetadataChecksum})));
   const descriptor={format:'TYPED_TENANT_BACKFILL_CHUNK_V1' as const,planDigest,ordinal,table:rule.table,count,firstKey:keys[0],lastKey:keys[count-1],keys,sourceChecksum,expectedMetadataChecksum};
   const id=ownershipDigest(descriptor);
   chunks.push({...descriptor,id,retryIdentity:id,entries:part,verification:'PURE_NOT_DATABASE_OPERATOR_OR_EFFECT_AUTHORITY'});
  }
 }
 return chunks;
}
/** Pure typed successor, deliberately incompatible with legacy BackfillPlan
 * and BACKFILL_CHUNK_JOURNAL_V1. Private local issuers are checked before input
 * reads. Hashes bind supplied source/review/SQL-class observations; they do not
 * approve reviewers, operators, a database, a fence or effects. All original
 * cells, inactive/history rows, raw native wires, security fences and retained
 * history observations survive without legacy payload/Date/Number conversion.
 *
 * Only added NULL workspace metadata and exact registry sidecars are proposed
 * write effects. A future rooted adapter must recheck source/current SQL key
 * classes/catalog/roles/locks/fence and target preconditions atomically, using
 * the same canonical UTC/ISO wire session as capture. The symbolic sidecar
 * captureManifestBinding must resolve only to this original typed plan digest;
 * it avoids a circular manifest checksum and is not a completed DB value.
 * Explicit chunkSize1–1000 is a pure compiler option, not workload approval.
 * No SQL, filesystem, network, resource, clock, journal or application consumer
 * operation is performed here. No retry/COMPLETE claim follows from this plan.
 */
export function compileTypedTenantBackfill(snapshot:unknown,ownership:unknown,constraintsV2:unknown,options:unknown):TypedTenantBackfillCompileOutcome{
 if(!isIssuedInspectedTypedSnapshot(snapshot))return blocked('UNISSUED_TYPED_SNAPSHOT');
 if(!isIssuedTypedOwnershipSourceObservations(ownership))return blocked('UNISSUED_TYPED_OWNERSHIP');
 if(!isIssuedTypedSourceConstraintObservations(constraintsV2))return blocked('UNISSUED_TYPED_CONSTRAINTS');
 if(constraintsV2.format!=='TYPED_SOURCE_CONSTRAINT_OBSERVATIONS_V2')return blocked('TYPED_CONSTRAINTS_V2_REQUIRED');
 try{
  const chunkSize=chunkOption(options);validateBindings(snapshot,ownership,constraintsV2);
  const entries=ownership.rows.map(source=>entryFor(registry.tables.find(r=>r.table===source.table)!,source)).sort((a,b)=>order(identity(a.table,a.key),identity(b.table,b.key)));
  const tables:TypedBackfillTableManifest[]=registry.tables.map((rule,i)=>{
   const rows=entries.filter(e=>e.table===rule.table);
   return {table:rule.table,source:rule.source,storage:rule.storage,anchor:rule.anchor,sidecar:rule.sidecar,originalColumns:rule.columns,primaryKey:rule.primaryKey,mirroredIdentityColumns:rule.mirroredIdentityColumns,globalFences:rule.globalFences,count:rows.length,sourceChecksum:snapshot.tables[i].expectedChecksum,wireChecksum:ownershipDigest(rows.map(e=>({key:e.key,wireChecksum:e.wireChecksum}))),expectedMetadataChecksum:ownershipDigest(rows.map(e=>({key:e.key,action:e.action,checksum:e.expectedMetadataChecksum})))};
  });
  const manifest:TypedBackfillManifest={format:'TYPED_TENANT_BACKFILL_MANIFEST_V1',boundary:boundary(snapshot),namespaceCaptureChecksum:snapshot.namespaceCaptureChecksum,ownershipDigest:ownership.digest,assignmentEvidenceDigest:ownership.assignmentEvidenceDigest,namespaceDigest:constraintsV2.namespaceDigest,constraintsDigest:constraintsV2.digest,keyCaptureChecksum:constraintsV2.keyCaptureChecksum,keyComparatorDigest:constraintsV2.keyComparatorDigest,chunkSize,tables,entries,observations:{snapshot,ownership,constraints:constraintsV2}};
  const digest=ownershipDigest(manifest);
  const plan:TypedTenantBackfillPlan=freeze({format:'TYPED_TENANT_BACKFILL_PLAN_V1',status:'PLANNED',digest,manifest,entries,chunks:chunksFor(entries,digest,chunkSize),verification:'PURE_NOT_DATABASE_OPERATOR_OR_EFFECT_AUTHORITY',remainingGates:['FRESH_OWNED_DATABASE_OPERATOR_ROLE_AND_SOURCE_FENCE_VERIFICATION','LIVE_SOURCE_SQL_KEY_CLASSES_CATALOG_AND_TARGET_PRECONDITIONS','DETERMINISTIC_SOURCE_AND_TARGET_LOCKS','ATOMIC_TYPED_EFFECTS_AND_DURABLE_JOURNAL_RECONCILIATION','UNKNOWN_COMMIT_ORIGINAL_PLAN_FRESH_OWNED_RECONCILIATION','REVIEWER_AND_RETAINED_HISTORY_EVIDENCE_APPROVAL','VALIDATION_CUTOVER_RUNTIME_RLS_AND_ACTUAL_NEON_TRANSPORT','LARGE_CAPTURE_AND_TYPED_PLAN_PERFORMANCE_EVIDENCE']});
  issued.add(plan);return Object.freeze({status:'PLANNED',plan});
 }catch(error){return blocked(error instanceof CompileFailure?error.code:'INVALID_TYPED_BACKFILL_STRUCTURE');}
}
/** Trap-free local compiler provenance only; no SQL/operator/effects authority. */
export function isIssuedTypedTenantBackfillPlan(input:unknown):input is TypedTenantBackfillPlan{return typeof input==='object'&&input!==null&&issued.has(input);}
