import type { TypedMigrationCellLineage, TypedMigrationLineageAddressSegment, TypedMigrationLineageNodeValue } from './typed-lineage';
import type { TypedMigrationSourceType } from './typed-wire';
import type { EvidenceLocation, ReferenceRule } from './ownership';

export type TypedReferenceLiteral =
 | Readonly<{kind:'TEXT';text:string}>
 | Readonly<{kind:'JSON_NUMBER';lexeme:string}>
 | Readonly<{kind:'JSON_BOOLEAN';value:boolean}>;
export type TypedReferenceColumnContract = Readonly<{
 table:string;column:string;sourceType:TypedMigrationSourceType;nullable:boolean;
 source:Readonly<{schemaCommit:string;schemaTree:string;schemaDigest:string;registryDigest:string;declaration:Readonly<EvidenceLocation>}>;
 contractId:string;payloadHistorical:boolean;typedField:boolean;
 declaredReferences:readonly Readonly<ReferenceRule>[];declaredGlobalFences:readonly string[];checksum:string;
}>;
export type TypedReferenceReviewBinding = Readonly<{
 schemaCommit:string;schemaTree:string;schemaDigest:string;registryDigest:string;
 table:string;column:string;contractChecksum:string;sourceChecksum:string;
}>;
export type TypedReferenceClassificationInput =
 | Readonly<{address:readonly TypedMigrationLineageAddressSegment[];kind:'DATA'|'ABSENCE'}>
 | Readonly<{address:readonly TypedMigrationLineageAddressSegment[];kind:'GLOBAL_FENCE';fence:string}>
 | Readonly<{address:readonly TypedMigrationLineageAddressSegment[];kind:'REFERENCE';target:string;targetColumns:readonly string[];key:readonly TypedReferenceLiteral[];historical:boolean}>
 | Readonly<{address:readonly TypedMigrationLineageAddressSegment[];kind:'UNRESOLVED';reason:string}>;
export type TypedReferenceReview = Readonly<{
 binding:TypedReferenceReviewBinding;reviewEvidenceDigest:string;
 classifications:readonly TypedReferenceClassificationInput[];
 unresolvedAddresses:readonly (readonly TypedMigrationLineageAddressSegment[])[];
}>;
export type TypedReferenceObservation = Readonly<{
 address:readonly TypedMigrationLineageAddressSegment[];target:string;targetColumns:readonly string[];
 key:readonly TypedReferenceLiteral[];literal:TypedReferenceLiteral;literalOrigin:'VALUE'|'JSON_MEMBER_NAME';
 historicalRequired:boolean;historicalRequested:boolean;retainedHistoryVerification:'NOT_PERFORMED';
}>;
export type ClassifiedTypedMigrationOccurrence = Readonly<{
 address:readonly TypedMigrationLineageAddressSegment[];value:TypedMigrationLineageNodeValue;
 classification:TypedReferenceClassificationInput;
}>;
export type TypedMigrationCellReferences = Readonly<{
 contract:TypedReferenceColumnContract;source:TypedMigrationCellLineage['source'];
 reviewEvidenceDigest:string;classifications:readonly ClassifiedTypedMigrationOccurrence[];
 references:readonly TypedReferenceObservation[];digest:string;
 verification:'PURE_EXPLICIT_REFERENCE_OBSERVATIONS_NOT_DATABASE_REVIEWER_OR_TENANT_VERIFICATION';
}>;
export type TypedReferenceContractOutcome=Readonly<{status:'CONTRACT';contract:TypedReferenceColumnContract}>|Readonly<{status:'BLOCKED';code:string}>;
export type TypedReferenceOutcome=Readonly<{status:'VALIDATED';classification:TypedMigrationCellReferences}>|Readonly<{status:'BLOCKED';code:string}>;

import { types as utilTypes } from 'node:util';
import { getOwnershipRegistry, ownershipDigest, canonicalOwnershipJson } from './ownership';
import { isIssuedTypedMigrationCellLineage } from './typed-lineage';
import { TYPED_MIGRATION_SOURCE_TYPES } from './typed-wire';

const registry = getOwnershipRegistry();
const contracts = new Map<string, TypedReferenceColumnContract>();
const issued = new WeakSet<object>();
const SHA = /^[a-f0-9]{64}$/;
class ReferenceInputError extends Error {
 constructor(readonly code: string) { super(code); }
}
function fail(code: string): never { throw new ReferenceInputError(code); }
function blocked(code: string): Readonly<{status:'BLOCKED';code:string}> { return Object.freeze({status:'BLOCKED', code}); }
function freezeData<T>(value: T): T {
 if (value && typeof value === 'object') {
  for (const child of Object.values(value)) freezeData(child);
  Object.freeze(value);
 }
 return value;
}

/** Detach only closed own data. Reject proxies before reflective operations and
 * accessors before reads. No caller serialization, toJSON or coercion runs.
 * Repeated objects are copied; cycles, ignored fields and sparse arrays block.
 */
function detach(input: unknown, ancestors = new Set<object>()): unknown {
 if (input === null || typeof input === 'string' || typeof input === 'boolean') return input;
 if (typeof input === 'number' && Number.isFinite(input)) return input;
 if (typeof input !== 'object' || input === null || utilTypes.isProxy(input) || ancestors.has(input)) fail('INVALID_REVIEW_STRUCTURE');
 const array = Array.isArray(input);
 if (Object.getPrototypeOf(input) !== (array ? Array.prototype : Object.prototype)) fail('INVALID_REVIEW_STRUCTURE');
 const keys = Reflect.ownKeys(input), descriptors = Object.getOwnPropertyDescriptors(input);
 if (keys.some(key => typeof key !== 'string')) fail('INVALID_REVIEW_STRUCTURE');
 ancestors.add(input);
 try {
  if (array) {
   const length = descriptors.length;
   if (!length || !('value' in length) || !Number.isSafeInteger(length.value) || length.value < 0 || keys.length !== length.value + 1) fail('INVALID_REVIEW_STRUCTURE');
   const result: unknown[] = [];
   for (let i = 0; i < length.value; i++) {
    const item = descriptors[String(i)];
    if (!item || !('value' in item) || !item.enumerable) fail('INVALID_REVIEW_STRUCTURE');
    result.push(detach(item.value, ancestors));
   }
   return Object.freeze(result);
  }
  const result: Record<string, unknown> = {};
  for (const key of keys as string[]) {
   const item = descriptors[key];
   if (!item || !('value' in item) || !item.enumerable) fail('INVALID_REVIEW_STRUCTURE');
   Object.defineProperty(result, key, {value: detach(item.value, ancestors), enumerable: true});
  }
  return Object.freeze(result);
 } finally { ancestors.delete(input); }
}
function record(value: unknown): value is Record<string, unknown> {
 return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function exact(value: unknown, fields: readonly string[]): value is Record<string, unknown> {
 return record(value) && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
}
function same(a: unknown, b: unknown): boolean { return canonicalOwnershipJson(a) === canonicalOwnershipJson(b); }
function addressValid(value: unknown): value is readonly TypedMigrationLineageAddressSegment[] {
 if (!Array.isArray(value)) return false;
 return value.every(segment => {
  if (!record(segment)) return false;
  if (segment.kind === 'JSON_MEMBER') return exact(segment, ['kind','entryIndex','name','nameLexeme']) && Number.isSafeInteger(segment.entryIndex) && (segment.entryIndex as number) >= 0 && typeof segment.name === 'string' && typeof segment.nameLexeme === 'string';
  if (segment.kind === 'JSON_INDEX') return exact(segment, ['kind','index']) && Number.isSafeInteger(segment.index) && (segment.index as number) >= 0;
  if (segment.kind === 'SQL_ARRAY_ELEMENT') return exact(segment, ['kind','ordinal','subscripts']) && Number.isSafeInteger(segment.ordinal) && (segment.ordinal as number) >= 0 && Array.isArray(segment.subscripts) && segment.subscripts.every(value => Number.isSafeInteger(value));
  return false;
 });
}
function literalValid(value: unknown): value is TypedReferenceLiteral {
 if (!record(value)) return false;
 if (value.kind === 'TEXT') return exact(value, ['kind','text']) && typeof value.text === 'string';
 if (value.kind === 'JSON_BOOLEAN') return exact(value, ['kind','value']) && typeof value.value === 'boolean';
 if (value.kind === 'JSON_NUMBER') return exact(value, ['kind','lexeme']) && typeof value.lexeme === 'string' && /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?$/.test(value.lexeme);
 return false;
}
function classificationValid(value: unknown): value is TypedReferenceClassificationInput {
 if (!record(value) || !addressValid(value.address)) return false;
 if (value.kind === 'DATA' || value.kind === 'ABSENCE') return exact(value, ['address','kind']);
 if (value.kind === 'GLOBAL_FENCE') return exact(value, ['address','kind','fence']) && typeof value.fence === 'string';
 if (value.kind === 'UNRESOLVED') return exact(value, ['address','kind','reason']) && typeof value.reason === 'string';
 if (value.kind === 'REFERENCE') return exact(value, ['address','kind','target','targetColumns','key','historical']) && typeof value.target === 'string' && Array.isArray(value.targetColumns) && value.targetColumns.every(column => typeof column === 'string') && Array.isArray(value.key) && value.key.every(literalValid) && typeof value.historical === 'boolean';
 return false;
}
function leaf(value: TypedMigrationLineageNodeValue): boolean {
 if (value.kind === 'JSON_ARRAY') return value.length === 0;
 if (value.kind === 'JSON_OBJECT') return value.memberCount === 0;
 if (value.kind === 'SQL_ARRAY') return value.elementCount === 0;
 return true;
}
function absence(value: TypedMigrationLineageNodeValue): boolean {
 return value.kind === 'SQL_NULL' || value.kind === 'JSON_NULL' || value.kind === 'SQL_ARRAY_NULL';
}
function observedLiteral(value: TypedMigrationLineageNodeValue): TypedReferenceLiteral | null {
 if (value.kind === 'SQL_SCALAR' || value.kind === 'JSON_STRING' || value.kind === 'SQL_ARRAY_TEXT') return Object.freeze({kind: 'TEXT', text: value.text});
 if (value.kind === 'JSON_NUMBER') return Object.freeze({kind: 'JSON_NUMBER', lexeme: value.lexeme});
 if (value.kind === 'JSON_BOOLEAN') return Object.freeze({kind: 'JSON_BOOLEAN', value: value.value});
 return null;
}

// These aliases are copied from the frozen declaredPayloadIdentity contract,
// not guessed from employee/location names or a current mutable row.
const ALIASES: Readonly<Record<string, readonly [string,string]>> = Object.freeze({
 employeeId:['employees','id'],employee_id:['employees','id'],requesterEmployeeId:['employees','id'],targetEmployeeId:['employees','id'],
 actorEmployeeId:['employees','id'],reviewedBy:['employees','id'],createdBy:['employees','id'],locationId:['locations','id'],location_id:['locations','id'],
 workspaceId:['workspaces','id'],workspace_id:['workspaces','id'],positionId:['positions','id'],position_id:['positions','id'],
 scheduleId:['schedules','id'],schedule_id:['schedules','id'],shiftId:['shifts','id'],shift_id:['shifts','id'],sourceShiftId:['shifts','id'],
 source_shift_id:['shifts','id'],publishedShiftId:['schedule_publication_revision_shifts','id'],revisionId:['schedule_publication_revisions','id'],
 timeEntryId:['time_entries','id'],breakEntryId:['break_entries','id'],deviceId:['clocker_devices','id'],breakTypeId:['clocker_break_types','id'],
 requestId:['time_correction_requests','id'],targetRequestId:['time_correction_requests','id'],adjustmentId:['time_correction_adjustments','id'],
 targetAdjustmentId:['time_correction_adjustments','id'],finalizationOperationId:['timecard_revisions','operation_id'],
});
type Obligation = {target?: string;column?: string;literal: TypedReferenceLiteral | null;origin:'VALUE'|'JSON_MEMBER_NAME';historical:boolean};
function declaredIdentity(contract: TypedReferenceColumnContract, address: readonly TypedMigrationLineageAddressSegment[], value: TypedMigrationLineageNodeValue): Obligation | null {
 const literal = observedLiteral(value);
 const historical = contract.payloadHistorical || contract.typedField;
 const base = {literal, origin: 'VALUE' as const, historical};
 if (contract.table === 'calendar_subscriptions' && contract.column === 'allowed_location_ids' && value.kind === 'SQL_ARRAY_TEXT') return {...base, target:'locations', column:'id'};
 if (contract.column === 'participants' && address[0]?.kind === 'JSON_MEMBER' && address[0].name === 'decisionVersions' && address.length >= 2) {
  const employee = address[1];
  // A nested alias can carry a second identity as well as the retained member
  // key. The current closed one-reference claim cannot express that paired
  // mapping. Block it instead of silently keeping only one ancestry fact.
  for (let index = 2; index < address.length; index++) {
   const segment = address[index];
   if (segment.kind === 'JSON_MEMBER' && (segment.name === 'id' || Object.hasOwn(ALIASES,segment.name)) && (!absence(value) || index < address.length - 1)) return {...base,literal:null,origin:'JSON_MEMBER_NAME'};
  }
  // Array positions are never invented as employee member keys.
  return employee.kind === 'JSON_MEMBER' ? {...base, target:'employees', column:'id', literal:Object.freeze({kind:'TEXT' as const,text:employee.name}), origin:'JSON_MEMBER_NAME'} : {...base, literal:null};
 }
 // A declared identity whose observed value is a nonempty container has no
 // supported scalar key. Descendants must not hide it as DATA, nor be guessed
 // into IDs. A future exact reviewed container mapping needs its own contract.
 for (let index = 0; index < address.length - 1; index++) {
  const segment = address[index];
  if (segment.kind === 'JSON_MEMBER' && (segment.name === 'id' || Object.hasOwn(ALIASES,segment.name))) return {...base,literal:null};
 }
 // Value absence does not erase a retained decisionVersions member key or a
 // non-null identity container. Ordinary nullable scalar identity values have
 // no referenced ID; those remain ABSENCE without manufacturing a key.
 if (absence(value)) return null;
 const last = address[address.length - 1];
 if (last?.kind === 'JSON_MEMBER') {
  if (contract.column === 'break_type_snapshot' && last.name === 'id') return {...base,target:'clocker_break_types',column:'id'};
  const alias = Object.hasOwn(ALIASES, last.name) ? ALIASES[last.name] : undefined;
  if (alias) return {...base,target:alias[0],column:alias[1]};
  if (last.name === 'id') return base;
 }
 if (contract.typedField) return base;
 if (address.length === 0 && value.kind === 'SQL_SCALAR') {
  const references = contract.declaredReferences;
  if (references.length === 1) {
   const rule = references[0], component = rule.columns.indexOf(contract.column);
   return {...base,target:rule.target,column:rule.targetColumns[component],historical:historical || rule.historical};
  }
  if (references.length > 1) return {...base,literal:null}; // explicit whole-row reconciliation still required
 }
 return null;
}

/** Source-bound column facts only, not deployed catalog or row provenance.
 * The checksum also binds the full frozen table rule, so physical references,
 * payload/typed-field/history/global-fence declarations cannot silently drift.
 */
export function getTypedReferenceColumnContract(table: unknown, column: unknown): TypedReferenceContractOutcome {
 try {
  if (typeof table !== 'string' || typeof column !== 'string') return blocked('UNKNOWN_SOURCE_COLUMN');
  const key = JSON.stringify([table,column]);
  const cached = contracts.get(key);
  if (cached) return Object.freeze({status:'CONTRACT',contract:cached});
  const rule = registry.tables.find(value => value.table === table);
  const field = rule?.columns.find(value => value.name === column);
  if (!rule || !field) return blocked('UNKNOWN_SOURCE_COLUMN');
  if (!TYPED_MIGRATION_SOURCE_TYPES.some(type => type === field.type)) return blocked('UNSUPPORTED_SOURCE_COLUMN_TYPE');
  const payload = rule.payloads.find(value => value.column === column);
  const typedField = rule.typedFields.includes(column);
  const descriptor = {
   table,column,sourceType:field.type as TypedMigrationSourceType,nullable:field.nullable,
   source:{schemaCommit:registry.schemaCommit,schemaTree:registry.schemaTree,schemaDigest:registry.schemaDigest,registryDigest:registry.digest,declaration:{...rule.source}},
   contractId:payload?.contractId ?? (typedField ? table+'.'+column+':typed-source-v1' : table+'.'+column+':column-source-v1:'+registry.schemaDigest),
   payloadHistorical:payload?.historical ?? false,typedField,
   declaredReferences:rule.references.filter(reference => reference.columns.includes(column)).map(reference => ({...reference,columns:[...reference.columns],targetColumns:[...reference.targetColumns],source:{...reference.source}})),
   declaredGlobalFences:[...rule.globalFences],
  };
  const contract = freezeData({...descriptor,checksum:ownershipDigest({format:'TYPED_REFERENCE_COLUMN_CONTRACT_V1',descriptor,tableRule:rule})});
  contracts.set(key,contract);
  return Object.freeze({status:'CONTRACT',contract});
 } catch { return blocked('SOURCE_CONTRACT_UNSUPPORTED'); }
}

/** Validate COMPLETE explicit claims against one genuinely issued lineage.
 * SHA bindings never authenticate reviewer approval, a database, operator or
 * target row. No DATA default, row ownership, target existence, same-tenant
 * resolution, legacy projection or retained-history assertion is performed.
 * Nonempty structural containers are retained by source lineage; only leaves
 * and empty containers receive classifications, each exactly once.
 */
export function validateTypedMigrationCellReferences(lineage: unknown, review: unknown): TypedReferenceOutcome {
 try {
  if (!isIssuedTypedMigrationCellLineage(lineage)) return blocked('UNISSUED_TYPED_LINEAGE');
  const detached = detach(review);
  if (!exact(detached,['binding','reviewEvidenceDigest','classifications','unresolvedAddresses']) ||
      !exact(detached.binding,['schemaCommit','schemaTree','schemaDigest','registryDigest','table','column','contractChecksum','sourceChecksum']) ||
      !Object.values(detached.binding).every(value => typeof value === 'string') ||
      !Array.isArray(detached.classifications) || !Array.isArray(detached.unresolvedAddresses) ||
      !detached.unresolvedAddresses.every(addressValid)) return blocked('INVALID_REVIEW_STRUCTURE');
  if (typeof detached.reviewEvidenceDigest !== 'string' || !SHA.test(detached.reviewEvidenceDigest)) return blocked('REVIEW_EVIDENCE_REQUIRED');
  if (detached.unresolvedAddresses.length) return blocked('UNRESOLVED_CLASSIFICATION');
  const binding = detached.binding;
  const outcome = getTypedReferenceColumnContract(binding.table,binding.column);
  if (outcome.status === 'BLOCKED') return outcome;
  const contract = outcome.contract;
  if (binding.schemaCommit !== contract.source.schemaCommit || binding.schemaTree !== contract.source.schemaTree ||
      binding.schemaDigest !== contract.source.schemaDigest || binding.registryDigest !== contract.source.registryDigest ||
      binding.contractChecksum !== contract.checksum || binding.sourceChecksum !== lineage.source.checksum) return blocked('SOURCE_CONTRACT_DRIFT');
  if (lineage.source.type !== contract.sourceType) return blocked('SOURCE_COLUMN_TYPE_DRIFT');
  if (lineage.source.kind === 'SQL_NULL' && !contract.nullable) return blocked('NONNULL_COLUMN_SQL_NULL');
  const leaves = lineage.nodes.filter(node => leaf(node.value));
  const byAddress = new Map(leaves.map(node => [canonicalOwnershipJson(node.address),node]));
  const claims = new Map<string,TypedReferenceClassificationInput>();
  for (const candidate of detached.classifications) {
   if (!classificationValid(candidate)) return blocked('INVALID_CLASSIFICATION');
   if (candidate.kind === 'UNRESOLVED') return blocked('UNRESOLVED_CLASSIFICATION');
   const address = canonicalOwnershipJson(candidate.address);
   if (claims.has(address)) return blocked('DUPLICATE_OCCURRENCE');
   if (!byAddress.has(address)) return blocked('UNKNOWN_OCCURRENCE');
   claims.set(address,candidate);
  }
  if (claims.size !== leaves.length) return blocked('CLASSIFICATION_COVERAGE_GAP');
  const references: TypedReferenceObservation[] = [],classifications: ClassifiedTypedMigrationOccurrence[] = [];
  for (const node of leaves) {
   const claim = claims.get(canonicalOwnershipJson(node.address))!;
   const isNull = absence(node.value);
   const declared = declaredIdentity(contract,node.address,node.value);
   const retainedMemberKey = declared?.origin === 'JSON_MEMBER_NAME';
   if (isNull && !retainedMemberKey && claim.kind !== 'ABSENCE') return blocked('NULL_REQUIRES_ABSENCE');
   if (!isNull && claim.kind === 'ABSENCE') return blocked('ABSENCE_LITERAL_CONFLICT');
   if (declared && (claim.kind !== 'REFERENCE' || (declared.target && claim.target !== declared.target) || (declared.column && !claim.targetColumns.includes(declared.column)))) return blocked('DECLARED_IDENTITY_CONFLICT');
   if (claim.kind === 'GLOBAL_FENCE') {
    if (!contract.declaredGlobalFences.includes(claim.fence)) return blocked('GLOBAL_FENCE_CONTRACT_REQUIRED');
    // Composite/semantic fence labels do not specify a cell mapping. Do not
    // guess one from substrings; future whole-row mapping must be explicit.
    if (claim.fence !== contract.column || node.address.length !== 0) return blocked('UNSUPPORTED_GLOBAL_FENCE_SCOPE');
   }
   if (claim.kind === 'REFERENCE') {
    const target = registry.tables.find(table => table.table === claim.target);
    if (!target || !claim.targetColumns.length || claim.targetColumns.length !== claim.key.length ||
        new Set(claim.targetColumns).size !== claim.targetColumns.length ||
        claim.targetColumns.some(column => !target.columns.some(field => field.name === column))) return blocked('REFERENCE_TARGET_INVALID');
    const literal = declared ? declared.literal : observedLiteral(node.value);
    if (!literal) return blocked('UNSUPPORTED_REFERENCE_LITERAL');
    const columnIndex = declared?.column ? claim.targetColumns.indexOf(declared.column) : -1;
    if (columnIndex >= 0 ? !same(claim.key[columnIndex],literal) : !claim.key.some(value => same(value,literal))) return blocked('REFERENCE_LITERAL_DRIFT');
    if (contract.table === 'calendar_subscriptions' && contract.column === 'allowed_location_ids' && (claim.historical || !same(claim.targetColumns,['id']))) return blocked('CALENDAR_HISTORY_CONFLICT');
    references.push(freezeData({address:node.address,target:claim.target,targetColumns:[...claim.targetColumns],key:[...claim.key],
     literal,literalOrigin:declared?.origin ?? 'VALUE',historicalRequired:declared?.historical ?? (contract.payloadHistorical || contract.typedField),
     historicalRequested:claim.historical,retainedHistoryVerification:'NOT_PERFORMED' as const}));
   }
   classifications.push(Object.freeze({address:node.address,value:node.value,classification:freezeData({...claim,address:node.address})}));
  }
  const descriptor = {contract,source:lineage.source,reviewEvidenceDigest:detached.reviewEvidenceDigest,classifications:Object.freeze(classifications),references:Object.freeze(references),
   verification:'PURE_EXPLICIT_REFERENCE_OBSERVATIONS_NOT_DATABASE_REVIEWER_OR_TENANT_VERIFICATION' as const};
  const classification = Object.freeze({...descriptor,digest:ownershipDigest({format:'TYPED_REFERENCE_OBSERVATIONS_V1',...descriptor})});
  issued.add(classification);
  return Object.freeze({status:'VALIDATED',classification});
 } catch (error) { return blocked(error instanceof ReferenceInputError ? error.code : 'TYPED_REFERENCE_VALIDATION_FAILED'); }
}

/** Local pure-validation provenance. Serialized descriptors grant no authority. */
export function isIssuedTypedMigrationCellReferences(input: unknown): input is TypedMigrationCellReferences {
 return typeof input === 'object' && input !== null && issued.has(input);
}
