import {types as utilTypes} from 'node:util';
import {canonicalOwnershipJson,ownershipDigest,type JsonValue} from './ownership';
import {isIssuedTypedTenantBackfillPlan,type TypedBackfillAction,type TypedBackfillTableManifest,type TypedTenantBackfillPlan} from './typed-backfill';
import type {TypedOwnershipBoundary} from './typed-ownership';

const VERIFICATION='PURE_TYPED_JOURNAL_STRUCTURE_NOT_EFFECTS_OR_DATABASE_VERIFICATION' as const;
const REQUIREMENT='FRESH_OWNED_ORIGINAL_TYPED_PLAN_SOURCE_TARGET_AND_ATOMIC_JOURNAL_RECONCILIATION' as const;
export type TypedBackfillJournalBoundary=Readonly<TypedOwnershipBoundary&{
 planDigest:string;manifestChecksum:string;namespaceCaptureChecksum:string;ownershipDigest:string;assignmentEvidenceDigest:string;
 namespaceDigest:string;constraintsDigest:string;keyCaptureChecksum:string;keyComparatorDigest:string;compilerOptionsChecksum:string;
}>;
export type TypedBackfillJournalSourceRow=Readonly<{
 key:readonly JsonValue[];sourceChecksum:string;wireChecksum:string;mirroredIdentityChecksum:string;sourceObservationChecksum:string;
 action:TypedBackfillAction;expectedMetadataChecksum:string;
}>;
export type TypedBackfillJournalChunk=Readonly<{
 format:'TYPED_BACKFILL_JOURNAL_CHUNK_V1';id:string;retryIdentity:string;planDigest:string;table:string;ordinal:number;count:number;
 firstKey:readonly JsonValue[];lastKey:readonly JsonValue[];keys:readonly (readonly JsonValue[])[];keysChecksum:string;
 sourceChecksum:string;expectedMetadataChecksum:string;rows:readonly TypedBackfillJournalSourceRow[];rowsChecksum:string;
}>;
export type TypedBackfillJournalDescriptor=Readonly<{
 format:'TYPED_BACKFILL_JOURNAL_V1';boundary:TypedBackfillJournalBoundary;tables:readonly TypedBackfillTableManifest[];
 chunks:readonly TypedBackfillJournalChunk[];descriptorChecksum:string;effectsVerified:false;verification:typeof VERIFICATION;remainingGates:readonly string[];
}>;
export type TypedBackfillJournalState='NOT_STARTED'|'STARTED'|'UNKNOWN';
/** Persisted observations are ordinary metadata. Matching them never reissues
 * a compiler plan or establishes a source, operator, transaction or effect. */
export type TypedBackfillJournalObservation=Readonly<{
 format:'TYPED_BACKFILL_JOURNAL_OBSERVATION_V1';boundary:TypedBackfillJournalBoundary;descriptorChecksum:string;
 rows:readonly Readonly<{chunk:TypedBackfillJournalChunk;state:TypedBackfillJournalState;retryIdentity:string}>[];
 effectsVerified:false;reconciliation:null;
}>;
export type TypedBackfillJournalAssessment=Readonly<{
 descriptorChecksum:string;boundary:TypedBackfillJournalBoundary;
 chunks:readonly Readonly<{chunk:TypedBackfillJournalChunk;observedState:TypedBackfillJournalState;retryIdentity:string;effectsObservation:'UNVERIFIED'}>[];
 effectsVerified:false;reconciliation:'NOT_PERFORMED';requirement:typeof REQUIREMENT;verification:typeof VERIFICATION;remainingGates:readonly string[];
}>;
export type TypedBackfillJournalFailureCode='UNISSUED_TYPED_PLAN'|'TYPED_JOURNAL_PLAN_DRIFT'|'UNSUPPORTED_TYPED_JOURNAL_VALUE'|
 'UNSUPPORTED_TYPED_JOURNAL_STRUCTURE'|'TYPED_JOURNAL_DESCRIPTOR_DRIFT'|'TYPED_JOURNAL_BOUNDARY_DRIFT'|
 'TYPED_JOURNAL_COVERAGE_DRIFT'|'TYPED_JOURNAL_CHUNK_DRIFT'|'TYPED_JOURNAL_RETRY_DRIFT'|'TYPED_JOURNAL_COMPLETION_UNAVAILABLE';
type Blocked=Readonly<{status:'BLOCKED';code:TypedBackfillJournalFailureCode}>;
export type TypedBackfillJournalDescription=Readonly<{status:'DESCRIBED';descriptor:TypedBackfillJournalDescriptor}>|Blocked;
export type TypedBackfillJournalValidation=Readonly<{status:'STRUCTURAL_OBSERVATIONS_ONLY';assessment:TypedBackfillJournalAssessment}>|Blocked;
type DataObject={[key:string]:JsonValue};
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
const blocked=(code:TypedBackfillJournalFailureCode):Blocked=>Object.freeze({status:'BLOCKED',code});
function freeze<T>(value:T):T{
 if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in descriptor)freeze(descriptor.value);
  Object.freeze(value);
 }
 return value;
}
function fields(value:JsonValue,names:readonly string[]):value is DataObject{
 return value!==null&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===names.length&&names.every(name=>Object.hasOwn(value,name));
}
/** Copy only ordinary, dense, enumerable data. Proxy detection precedes all
 * reflection, even for revoked proxies; getters, iterators, toJSON/coercion
 * and inherited behavior are never invoked. Journal metadata has only exact
 * safe integer counts/ordinals/lines; native numeric wires stay checksum-bound
 * in the original typed plan and are never rounded into these observations. */
function copyData(value:unknown):JsonValue{
 const ancestors=new Set<object>();
 const unsupported=():never=>{throw new Error('UNSUPPORTED_TYPED_JOURNAL_VALUE');};
 function copy(current:unknown):JsonValue{
  if(current===null||typeof current==='string'||typeof current==='boolean')return current;
  if(typeof current==='number')return Number.isSafeInteger(current)&&!Object.is(current,-0)?current:unsupported();
  if(typeof current!=='object'||utilTypes.isProxy(current)||ancestors.has(current))return unsupported();
  const array=Array.isArray(current);
  if(Object.getPrototypeOf(current)!==(array?Array.prototype:Object.prototype))return unsupported();
  const keys=Reflect.ownKeys(current),descriptors=Object.getOwnPropertyDescriptors(current);
  if(keys.some(key=>typeof key!=='string'))return unsupported();
  ancestors.add(current);
  try{
   if(array){
    const length=descriptors.length;
    if(!length||!('value'in length)||!Number.isSafeInteger(length.value)||length.value<0||keys.length!==length.value+1)return unsupported();
    const result:JsonValue[]=[];
    for(let i=0;i<length.value;i++){
     const d=descriptors[String(i)];if(!d||!('value'in d)||!d.enumerable)return unsupported();
     result.push(copy(d.value));
    }
    return result;
   }
   const result:DataObject={};
   for(const key of keys as string[]){
    const d=descriptors[key];if(!d||!('value'in d)||!d.enumerable)return unsupported();
    Object.defineProperty(result,key,{value:copy(d.value),writable:true,enumerable:true,configurable:true});
   }
   return result;
  }finally{ancestors.delete(current);}
 }
 return copy(value);
}
function descriptorFor(plan:TypedTenantBackfillPlan):TypedBackfillJournalDescriptor{
 const m=plan.manifest;
 const boundary:TypedBackfillJournalBoundary={...m.boundary,planDigest:plan.digest,manifestChecksum:plan.digest,
  namespaceCaptureChecksum:m.namespaceCaptureChecksum,ownershipDigest:m.ownershipDigest,assignmentEvidenceDigest:m.assignmentEvidenceDigest,
  namespaceDigest:m.namespaceDigest,constraintsDigest:m.constraintsDigest,keyCaptureChecksum:m.keyCaptureChecksum,keyComparatorDigest:m.keyComparatorDigest,
  compilerOptionsChecksum:ownershipDigest({chunkSize:m.chunkSize})};
 const chunks:TypedBackfillJournalChunk[]=plan.chunks.map(c=>{
  const rows:TypedBackfillJournalSourceRow[]=c.entries.map(e=>({key:e.key,sourceChecksum:e.sourceChecksum,wireChecksum:e.wireChecksum,
   mirroredIdentityChecksum:e.mirroredIdentityChecksum,sourceObservationChecksum:ownershipDigest(e.source),action:e.action,expectedMetadataChecksum:e.expectedMetadataChecksum}));
  return {format:'TYPED_BACKFILL_JOURNAL_CHUNK_V1',id:c.id,retryIdentity:c.retryIdentity,planDigest:c.planDigest,table:c.table,ordinal:c.ordinal,count:c.count,
   firstKey:c.firstKey,lastKey:c.lastKey,keys:c.keys,keysChecksum:ownershipDigest(c.keys),sourceChecksum:c.sourceChecksum,
   expectedMetadataChecksum:c.expectedMetadataChecksum,rows,rowsChecksum:ownershipDigest(rows)};
 });
 const body={format:'TYPED_BACKFILL_JOURNAL_V1' as const,boundary,tables:m.tables,chunks,effectsVerified:false as const,verification:VERIFICATION,remainingGates:plan.remainingGates};
 return freeze({...body,descriptorChecksum:ownershipDigest(body)});
}
/** Describe the genuinely issued original typed plan only. This successor is
 * deliberately incompatible with BACKFILL_CHUNK_JOURNAL_V1 and its SQL store.
 * All 68 table manifests (including empties), exact original chunk/retry IDs,
 * raw typed wire/source/history/review/ownership evidence and expected effects
 * remain bound. Payloads, native numeric lexemes and array subscripts are not
 * projected into journal rows. No new operation/retry identity is generated.
 * Hashes bind observations, never reviewer/operator/database/effect authority. */
export function describeTypedBackfillJournal(plan:unknown):TypedBackfillJournalDescription{
 if(!isIssuedTypedTenantBackfillPlan(plan))return blocked('UNISSUED_TYPED_PLAN');
 try{return Object.freeze({status:'DESCRIBED',descriptor:descriptorFor(plan)});}
 catch{return blocked('TYPED_JOURNAL_PLAN_DRIFT');}
}
/** Require the original private compiler plan before touching untrusted inputs.
 * Serialized descriptor equality is structural only, never plan reissuance.
 * STARTED/UNKNOWN cannot become COMPLETE from hashes or caller assertions; no
 * effects/reconciliation/target matching is claimed. Fresh owned original-plan
 * source+target rechecks and actual atomic journal integration remain required.
 * State rows may arrive in any order but must cover every exact original chunk
 * once. Output is detached, immutable and ordered by original compiler ordinal.
 * No DB/SQL, resources, clocks, operations, execution/resume or policies occur. */
export function validateTypedBackfillJournalObservation(plan:unknown,descriptor:unknown,observation:unknown):TypedBackfillJournalValidation{
 if(!isIssuedTypedTenantBackfillPlan(plan))return blocked('UNISSUED_TYPED_PLAN');
 let expected:TypedBackfillJournalDescriptor;
 try{expected=descriptorFor(plan);}catch{return blocked('TYPED_JOURNAL_PLAN_DRIFT');}
 let supplied:JsonValue,data:JsonValue;
 try{supplied=copyData(descriptor);data=copyData(observation);}catch{return blocked('UNSUPPORTED_TYPED_JOURNAL_VALUE');}
 if(!same(supplied,expected))return blocked('TYPED_JOURNAL_DESCRIPTOR_DRIFT');
 if(!fields(data,['format','boundary','descriptorChecksum','rows','effectsVerified','reconciliation']))return blocked('UNSUPPORTED_TYPED_JOURNAL_STRUCTURE');
 if(data.effectsVerified===true||data.reconciliation!==null)return blocked('TYPED_JOURNAL_COMPLETION_UNAVAILABLE');
 if(data.format!=='TYPED_BACKFILL_JOURNAL_OBSERVATION_V1'||data.effectsVerified!==false||!Array.isArray(data.rows))return blocked('UNSUPPORTED_TYPED_JOURNAL_STRUCTURE');
 if(!same(data.boundary,expected.boundary)||data.descriptorChecksum!==expected.descriptorChecksum)return blocked('TYPED_JOURNAL_BOUNDARY_DRIFT');
 if(data.rows.length!==expected.chunks.length)return blocked('TYPED_JOURNAL_COVERAGE_DRIFT');
 const states=new Map<string,TypedBackfillJournalState>(),chunksById=new Map(expected.chunks.map(c=>[c.id,c]));
 for(const row of data.rows){
  if(!fields(row,['chunk','state','retryIdentity']))return blocked('UNSUPPORTED_TYPED_JOURNAL_STRUCTURE');
  if(row.state==='COMPLETE'||row.state==='COMMITTED')return blocked('TYPED_JOURNAL_COMPLETION_UNAVAILABLE');
  if(row.state!=='NOT_STARTED'&&row.state!=='STARTED'&&row.state!=='UNKNOWN')return blocked('UNSUPPORTED_TYPED_JOURNAL_STRUCTURE');
  if(row.chunk===null||typeof row.chunk!=='object'||Array.isArray(row.chunk)||typeof row.chunk.id!=='string')return blocked('TYPED_JOURNAL_CHUNK_DRIFT');
  const chunk=chunksById.get(row.chunk.id);if(!chunk||!same(row.chunk,chunk))return blocked('TYPED_JOURNAL_CHUNK_DRIFT');
  if(states.has(chunk.id))return blocked('TYPED_JOURNAL_COVERAGE_DRIFT');
  if(row.retryIdentity!==chunk.retryIdentity)return blocked('TYPED_JOURNAL_RETRY_DRIFT');
  states.set(chunk.id,row.state);
 }
 const assessment:TypedBackfillJournalAssessment=freeze({descriptorChecksum:expected.descriptorChecksum,boundary:expected.boundary,
  chunks:expected.chunks.map(chunk=>({chunk,observedState:states.get(chunk.id)!,retryIdentity:chunk.retryIdentity,effectsObservation:'UNVERIFIED' as const})),
  effectsVerified:false,reconciliation:'NOT_PERFORMED',requirement:REQUIREMENT,verification:VERIFICATION,remainingGates:expected.remainingGates});
 return Object.freeze({status:'STRUCTURAL_OBSERVATIONS_ONLY',assessment});
}
