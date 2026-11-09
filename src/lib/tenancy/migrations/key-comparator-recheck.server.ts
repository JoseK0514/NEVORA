// CONTROLLED_INSTALLER_IMPORT_ADDITION_BEGIN
import {isIssuedTypedTenantBackfillPlan,type TypedTenantBackfillPlan} from './typed-backfill';
import {isControlledEnrollmentInstallerExecution,type EmployeeNumberInstallerExecutionWitness} from './employee-number-enrollment-binding.server';
import {collectTypedKeyComparatorLockedInstallerRecheck,type TypedKeyComparatorLocalInstallerRecheck} from './key-comparator-capture.server';
// CONTROLLED_INSTALLER_IMPORT_ADDITION_END
import type {Client} from 'pg';
import {types as utilTypes} from 'node:util';
import type {TypedMigrationCaptureFacts,MigrationCaptureRequest} from './capture.server';
import {canonicalOwnershipJson as canonical,ownershipDigest as digest} from './ownership';
import {inspectTypedMigrationSnapshot} from './typed-snapshot';
import {isIssuedTypedMigrationWireValue} from './typed-wire';
import {isIssuedTypedKeyComparatorObservations,type TypedKeyComparatorObservations} from './typed-key-comparators';
import {collectTypedKeyComparatorLockedSourceRecheck,isKeyComparatorCaptureFailure,type KeyComparatorCaptureCode} from './key-comparator-capture.server';

export type KeyComparatorRecheckCode='KEY_RECHECK_UNISSUED_OBSERVATIONS'|'KEY_RECHECK_TRANSACTION_REQUIRED'|'KEY_RECHECK_LOCKS_REQUIRED'|'KEY_RECHECK_SOURCE_DRIFT'|'KEY_RECHECK_COMPARATOR_DRIFT'|'KEY_RECHECK_READ_FAILED';
export type KeyComparatorRecheckFailure=Readonly<Error&{code:KeyComparatorRecheckCode}>;
const failures=new WeakSet<object>();
class ClosedFailure extends Error{constructor(readonly code:KeyComparatorRecheckCode){super(code);failures.add(this);Object.freeze(this);}}
function fail(code:KeyComparatorRecheckCode):never{throw new ClosedFailure(code);}
/** Trap-free closed error provenance only. No message/code/getter inspection. */
export function isKeyComparatorRecheckFailure(value:unknown):value is KeyComparatorRecheckFailure{return typeof value==='object'&&value!==null&&failures.has(value);}
const same=(a:unknown,b:unknown)=>canonical(a)===canonical(b);
const SHA=/^[a-f0-9]{64}$/;
function detach(value:unknown,ancestors=new Set<object>()):unknown{
 if(isIssuedTypedMigrationWireValue(value))return value;
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'&&Number.isSafeInteger(value)&&!Object.is(value,-0))return value;
 if(typeof value!=='object'||value===null||utilTypes.isProxy(value)||ancestors.has(value))fail('KEY_RECHECK_SOURCE_DRIFT');
 const array=Array.isArray(value);if(Object.getPrototypeOf(value)!==(array?Array.prototype:Object.prototype))fail('KEY_RECHECK_SOURCE_DRIFT');
 const keys=Reflect.ownKeys(value),descriptors=Object.getOwnPropertyDescriptors(value);if(keys.some(k=>typeof k!=='string'))fail('KEY_RECHECK_SOURCE_DRIFT');ancestors.add(value);
 try{
  if(array){const length=descriptors.length;if(!length||!('value'in length)||!Number.isSafeInteger(length.value)||length.value<0||keys.length!==length.value+1)fail('KEY_RECHECK_SOURCE_DRIFT');const result:unknown[]=[];for(let i=0;i<length.value;i++){const d=descriptors[String(i)];if(!d||!('value'in d)||!d.enumerable)fail('KEY_RECHECK_SOURCE_DRIFT');result.push(detach(d.value,ancestors));}return result;}
  const result:Record<string,unknown>={};for(const k of keys as string[]){const d=descriptors[k];if(!d||!('value'in d)||!d.enumerable)fail('KEY_RECHECK_SOURCE_DRIFT');Object.defineProperty(result,k,{value:detach(d.value,ancestors),enumerable:true});}return result;
 }finally{ancestors.delete(value);}
}
function freeze<T>(value:T):T{if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const d of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in d)freeze(d.value);Object.freeze(value);}return value;}
function object(value:unknown):value is Record<string,unknown>{return typeof value==='object'&&value!==null&&!Array.isArray(value);}
function protocolValue(value:unknown,role:unknown):Readonly<{manifestDigest:string;actor:string|null}>|undefined{
 if(value===undefined)return undefined;
 const input=detach(value);
 if(!object(input)||Object.keys(input).length!==2||!Object.hasOwn(input,'manifestDigest')||!Object.hasOwn(input,'actor')||typeof input.manifestDigest!=='string'||!SHA.test(input.manifestDigest)||(input.actor!==null&&(typeof input.actor!=='string'||input.actor!==role)))fail('KEY_RECHECK_SOURCE_DRIFT');
 return Object.freeze({manifestDigest:input.manifestDigest,actor:input.actor as string|null});
}
function captureCode(code:KeyComparatorCaptureCode):KeyComparatorRecheckCode{
 if(code==='KEY_COMPARATOR_TRANSACTION_REQUIRED')return 'KEY_RECHECK_TRANSACTION_REQUIRED';
 if(code==='KEY_COMPARATOR_LOCKS_REQUIRED')return 'KEY_RECHECK_LOCKS_REQUIRED';
 if(['KEY_COMPARATOR_INVALID_FACTS','KEY_COMPARATOR_REQUEST_DRIFT','KEY_COMPARATOR_IDENTITY_DRIFT','KEY_COMPARATOR_FENCE_DRIFT','KEY_COMPARATOR_SOURCE_DRIFT','KEY_COMPARATOR_ROW_DRIFT'].includes(code))return 'KEY_RECHECK_SOURCE_DRIFT';
 if(code==='KEY_COMPARATOR_READ_FAILED'||code==='KEY_COMPARATOR_CLIENT_IN_USE')return 'KEY_RECHECK_READ_FAILED';
 return 'KEY_RECHECK_COMPARATOR_DRIFT';
}
/** Read-only recheck under already-held exact source/sidecar locks, never a
 * transaction owner, lock acquirer, source/reviewer approval or effects issuer.
 * The genuine original key observations are required before other input reads.
 * Ordinary request/facts/protocol data are detached before await while genuine
 * immutable wire cells retain private provenance. The original snapshot/facts
 * remain immutable; separately tagged fresh metadata uses SQL's current snapshot
 * and recomputed namespace/facts checksums, not a relabelled original capture.
 *
 * Existing collector checks direct original SCRAM login/owned identity, canonical
 * UTC/ISO, SERIALIZABLE context, all104 stock catalogs/classes, complete original
 * raw source wires, effective collations, full catalog and exact current protocol.
 * Its locked successor requires all70 granted ShareRowExclusive/AccessExclusive
 * source/sidecar locks held by this backend before those reads. Caller still owns
 * first-lock ordering, original lease/role/operator authority and every actual
 * effect/rollback/COMMIT/journal/recovery/cutover decision. Omitted protocol means
 * unarmed NULL/NULL only; supplied original manifest binds actor NULL or exactly
 * request.identity.role. Success is void, never a proof/effects/chunk receipt.
 */
export async function assertTypedKeyComparatorsOnLockedSource(client:Client,facts:TypedMigrationCaptureFacts,captureRequest:MigrationCaptureRequest,observations:TypedKeyComparatorObservations,protocol?:Readonly<{manifestDigest:string;actor:string|null}>):Promise<void>{
 if(!isIssuedTypedKeyComparatorObservations(observations))fail('KEY_RECHECK_UNISSUED_OBSERVATIONS');
 try{
  const f=detach(facts),r=detach(captureRequest);
  if(!object(f)||!object(r)||!object(f.snapshot)||!object(f.fence)||!object(r.identity))fail('KEY_RECHECK_SOURCE_DRIFT');
  const original=freeze(f as unknown as TypedMigrationCaptureFacts),request=freeze(r as unknown as MigrationCaptureRequest),expected=protocolValue(protocol,request.identity.role);
  const inspected=inspectTypedMigrationSnapshot(original,{sourceDigest:original.sourceDigest,currentSchemaDigest:original.currentSchemaDigest,snapshotId:original.snapshot.id,fenceGeneration:original.fence.generation,factsDigest:original.factsDigest});
  if(inspected.status!=='INSPECTED')fail('KEY_RECHECK_SOURCE_DRIFT');
  const originalBinding={registryDigest:original.registryDigest,sourceDigest:original.sourceDigest,currentSchemaDigest:original.currentSchemaDigest,snapshotId:original.snapshot.id,fenceGeneration:original.fence.generation,factsDigest:original.factsDigest};
  if(!same(originalBinding,observations.binding)||!same(original.catalog,observations.catalog))fail('KEY_RECHECK_SOURCE_DRIFT');
  if(client.getTransactionStatus()!=='T')fail('KEY_RECHECK_TRANSACTION_REQUIRED');
  const current=await collectTypedKeyComparatorLockedSourceRecheck(client,original,request,expected);
  // Independently bind the successor's fresh metadata to this detached original.
  // This checksum check remains evidence integrity, not database/operator approval.
  const nsBody={binding:{...original.namespaceComparators.binding,snapshotId:current.binding.snapshotId},catalogs:original.namespaceComparators.catalogs,rows:original.namespaceComparators.rows};
  const freshBody={...original,snapshot:{...original.snapshot,id:current.binding.snapshotId},namespaceComparators:{...nsBody,captureChecksum:digest(nsBody)}};
  const {factsDigest:omitted,...derivedBody}=freshBody;void omitted;
  const derivedBinding={...originalBinding,snapshotId:current.binding.snapshotId,factsDigest:digest(derivedBody)};
  const {captureChecksum,...currentBody}=current;
  if(current.format!=='TYPED_KEY_COMPARATOR_LOCKED_RECHECK_V1'||!same(current.originalBinding,originalBinding)||!same(current.binding,derivedBinding)||current.derivedNamespaceCaptureChecksum!==digest(nsBody)||!same(current.protocol,{actor:expected?.actor??null,manifest:expected?.manifestDigest??null})||captureChecksum!==digest(currentBody))fail('KEY_RECHECK_SOURCE_DRIFT');
  if(!same(current.catalogs,observations.catalogs)||!same(current.rows,observations.rows)||!same(current.databaseCollation,observations.databaseCollation)||!same(current.catalog,observations.catalog)||current.serverVersion!==observations.serverVersion||current.serverEncoding!==observations.serverEncoding)fail('KEY_RECHECK_COMPARATOR_DRIFT');
 }catch(error){
  if(isKeyComparatorRecheckFailure(error))throw error;
  if(isKeyComparatorCaptureFailure(error))fail(captureCode(error.code));
  fail('KEY_RECHECK_READ_FAILED');
 }
}
// CONTROLLED_INSTALLER_RECHECK_ADDITION_BEGIN
/** Fixed installer successor, original plan/facts/operator remain unchanged.
 * No protocol argument is accepted: this lane is APPLIED/null-actor enrollment.
 * Returned immutable data are bounded recheck observations only; neither source
 * approval, effects, metadata enrollment nor a stable RC batch snapshot follows.
 * The root-owned admission module and controlled native QA remain prerequisites.
 */
export async function assertTypedKeyComparatorsOnLockedInstallerSource(client:Client,facts:TypedMigrationCaptureFacts,captureRequest:MigrationCaptureRequest,plan:TypedTenantBackfillPlan,witness:EmployeeNumberInstallerExecutionWitness):Promise<TypedKeyComparatorLocalInstallerRecheck>{
 if(!isIssuedTypedTenantBackfillPlan(plan))fail('KEY_RECHECK_SOURCE_DRIFT');
 if(!isControlledEnrollmentInstallerExecution(witness,client))fail('KEY_RECHECK_SOURCE_DRIFT');
 try{
  const f=detach(facts),r=detach(captureRequest);
  if(!object(f)||!object(r)||!object(f.snapshot)||!object(f.fence)||!object(r.identity))fail('KEY_RECHECK_SOURCE_DRIFT');
  const original=freeze(f as unknown as TypedMigrationCaptureFacts),request=freeze(r as unknown as MigrationCaptureRequest),observations=plan.manifest.observations.constraints.keyComparators;
  if(!isIssuedTypedKeyComparatorObservations(observations))fail('KEY_RECHECK_UNISSUED_OBSERVATIONS');
  const inspected=inspectTypedMigrationSnapshot(original,{sourceDigest:original.sourceDigest,currentSchemaDigest:original.currentSchemaDigest,snapshotId:original.snapshot.id,fenceGeneration:original.fence.generation,factsDigest:original.factsDigest});
  if(inspected.status!=='INSPECTED')fail('KEY_RECHECK_SOURCE_DRIFT');
  const originalBinding={registryDigest:original.registryDigest,sourceDigest:original.sourceDigest,currentSchemaDigest:original.currentSchemaDigest,snapshotId:original.snapshot.id,fenceGeneration:original.fence.generation,factsDigest:original.factsDigest};
  if(!same(originalBinding,plan.manifest.boundary)||!same(originalBinding,observations.binding)||!same(original.catalog,observations.catalog)||plan.manifest.keyCaptureChecksum!==observations.captureChecksum)fail('KEY_RECHECK_SOURCE_DRIFT');
  const current=await collectTypedKeyComparatorLockedInstallerRecheck(client,original,request,plan,witness),{captureChecksum,...body}=current;
  if(current.format!=='TYPED_KEY_COMPARATOR_LOCAL_INSTALLER_RC_RECHECK_V1'||!same(current.originalBinding,originalBinding)||current.planDigest!==plan.digest||current.captureRequestDigest!==digest(request)||current.keyCaptureChecksum!==observations.captureChecksum||!same(current.protocol,{actor:null,manifest:plan.digest})||captureChecksum!==digest(body))fail('KEY_RECHECK_SOURCE_DRIFT');
  if(!same(current.catalogs,observations.catalogs)||!same(current.rows,observations.rows)||!same(current.databaseCollation,observations.databaseCollation)||!same(current.catalog,observations.catalog)||current.serverVersion!==observations.serverVersion||current.serverEncoding!==observations.serverEncoding)fail('KEY_RECHECK_COMPARATOR_DRIFT');
  return current;
 }catch(error){
  if(isKeyComparatorRecheckFailure(error))throw error;
  if(isKeyComparatorCaptureFailure(error))fail(captureCode(error.code));
  fail('KEY_RECHECK_READ_FAILED');
 }
}
// CONTROLLED_INSTALLER_RECHECK_ADDITION_END
