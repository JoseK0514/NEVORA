import {types as utilTypes} from 'node:util';
import {bindLegacyEmployment,preflightEmploymentNamespaces,type EmploymentIdentity,type NamespaceRow} from '../identity';
import {canonicalOwnershipJson,getOwnershipRegistry,ownershipDigest,type JsonValue} from './ownership';
import {decodeTypedMigrationWireValue} from './typed-wire';
import {isIssuedTypedTenantBackfillPlan,type TypedTenantBackfillPlan,type TypedBackfillEntry} from './typed-backfill';

// Genuine pure compilation is neither an operator
// capability nor a current database/source/target/cutover/normalizer-build proof.
export type LegacyEmployeeNumberEnrollmentRow=Readonly<{
 employeeId:string;workspaceId:string;employeeNumber:string;normalizedNumber:string;
 originalKey:readonly JsonValue[];sourceChecksum:string;wireChecksum:string;
 source:TypedBackfillEntry['source'];
}>;
export type LegacyEmployeeNumberEnrollment=Readonly<{
 format:'CONTROLLED_LEGACY_EMPLOYEE_NUMBER_ENROLLMENT_V1';
 originalPlan:TypedTenantBackfillPlan;originalPlanDigest:string;
 boundary:TypedTenantBackfillPlan['manifest']['boundary'];
 namespaceCaptureChecksum:string;keyCaptureChecksum:string;keyComparatorDigest:string;
 rows:readonly LegacyEmployeeNumberEnrollmentRow[];
 legacyExceptions:readonly EmploymentIdentity[];digest:string;
 verification:'PURE_COMPLETE_SOURCE_MAPPING_NOT_OPERATOR_OR_DATABASE_AUTHORITY';
}>;
export type LegacyEnrollmentCode='GENUINE_ORIGINAL_TYPED_PLAN_REQUIRED'|
 'COMPLETE_EMPLOYEE_SOURCE_REQUIRED'|'EMPLOYEE_SOURCE_WIRE_DRIFT'|
 'EMPLOYEE_EMAIL_COMPARATOR_DRIFT'|'LEGACY_NAMESPACE_PREFLIGHT_BLOCKED'|
 'GENUINE_LEGACY_ENROLLMENT_REQUIRED'|'MAPPING_TARGET_SHAPE_DRIFT'|
 'MAPPING_TARGET_PARTIAL_OR_CONFLICTING'|'INVALID_LEGACY_ENROLLMENT_STRUCTURE';
export type LegacyEnrollmentCompileOutcome=
 Readonly<{status:'COMPILED';enrollment:LegacyEmployeeNumberEnrollment}>|
 Readonly<{status:'BLOCKED';code:LegacyEnrollmentCode}>;
export type LegacyEnrollmentTargetOutcome=
 Readonly<{status:'EMPTY'|'COMPLETE_IDENTICAL';verification:'SUPPLIED_ROWS_NOT_NATIVE_VISIBILITY_OR_ATOMICITY'}>|
 Readonly<{status:'BLOCKED';code:LegacyEnrollmentCode}>;

const issued=new WeakSet<object>();
const same=(a:unknown,b:unknown)=>canonicalOwnershipJson(a)===canonicalOwnershipJson(b);
class EnrollmentFailure extends Error{constructor(readonly code:LegacyEnrollmentCode){super(code);}}
function fail(code:LegacyEnrollmentCode):never{throw new EnrollmentFailure(code);}
function frozen<T>(value:T):T{
 if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){
  for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))
   if(Object.hasOwn(descriptor,'value'))frozen(descriptor.value);
  Object.freeze(value);
 }
 return value;
}
function wire(entry:TypedBackfillEntry,column:string,type:string):string|null{
 const cell=entry.source.columns.find(c=>c.name===column);
 if(!cell||cell.type!==type||decodeTypedMigrationWireValue(type,cell.wire).status!=='DECODED')fail('EMPLOYEE_SOURCE_WIRE_DRIFT');
 return cell.wire;
}
function sourceText(entry:TypedBackfillEntry,column:string):string{
 const text=wire(entry,column,'text');if(text===null)fail('EMPLOYEE_SOURCE_WIRE_DRIFT');return text;
}

/** No ordinary source/normalized row, row subset, options or ready flag enters
 * compilation. WeakSet provenance is tested before property reads/reflection.
 * The entire accepted original plan remains retained, including every table,
 * inactive/current/history cell, assignment, SQL class and typed wire. */
export function compileLegacyEmployeeNumberEnrollment(input:unknown):LegacyEnrollmentCompileOutcome{
 if(!isIssuedTypedTenantBackfillPlan(input))return Object.freeze({status:'BLOCKED',code:'GENUINE_ORIGINAL_TYPED_PLAN_REQUIRED'});
 try{
  const plan=input,registry=getOwnershipRegistry(),manifest=plan.manifest;
  if(manifest.tables.length!==registry.tables.length||manifest.tables.some((t,i)=>t.table!==registry.tables[i].table)||
   !same(manifest.entries,plan.entries)||plan.digest!==ownershipDigest(manifest))fail('COMPLETE_EMPLOYEE_SOURCE_REQUIRED');
  const captured=manifest.observations.snapshot.tables.find(t=>t.table==='employees');
  const rows=plan.entries.filter(e=>e.table==='employees');
  const table=manifest.tables.find(t=>t.table==='employees');
  if(!captured||!table||rows.length!==captured.expectedCount||table.count!==rows.length||
   table.sourceChecksum!==captured.expectedChecksum||
   !same(rows.map(e=>({key:e.key,checksum:e.sourceChecksum})),captured.rows.map(r=>({key:r.key,checksum:r.originalChecksum}))))fail('COMPLETE_EMPLOYEE_SOURCE_REQUIRED');
  const email=manifest.observations.constraints.namespaces.filter(n=>n.table==='employees'&&n.label==='email_ci');
  // Accepted V2 omits an empty expression namespace; its catalog and full
  // capture checksum still remain in the retained original plan.
  if(rows.length===0?email.length!==0:email.length!==1||email[0].rows.length!==rows.length)fail('EMPLOYEE_EMAIL_COMPARATOR_DRIFT');
  const mapping:LegacyEmployeeNumberEnrollmentRow[]=[],preflight:NamespaceRow[]=[];
  for(const entry of rows){
   const employeeId=sourceText(entry,'id'),workspaceId=entry.source.workspaceId;
   if(typeof workspaceId!=='string'||decodeTypedMigrationWireValue('text',workspaceId).status!=='DECODED'||
    !same(entry.key,[employeeId])||entry.sourceChecksum!==entry.source.rowChecksum||
    !same(entry.wireValues,entry.source.columns.map(c=>c.wire))||entry.wireChecksum!==ownershipDigest(entry.wireValues))fail('EMPLOYEE_SOURCE_WIRE_DRIFT');
   const rawActive=wire(entry,'active','boolean');if(rawActive!=='t'&&rawActive!=='f')fail('EMPLOYEE_SOURCE_WIRE_DRIFT');
   const emailWire=wire(entry,'email','text');
   const matches=email[0].rows.filter(r=>same(r.key,entry.key));
   const witness=matches[0];
   if(matches.length!==1||witness.rowChecksum!==entry.sourceChecksum||witness.workspaceId!==workspaceId||
    witness.included!==(emailWire!==null)||witness.comparison.kind!=='DATABASE_EQUALITY_CLASS'||
    witness.comparison.contractId!=='employees.email_ci'||witness.comparison.captureChecksum!==manifest.namespaceCaptureChecksum||
    (witness.included?typeof witness.comparison.comparisonClass!=='string'||!witness.comparison.comparisonClass:
     witness.comparison.comparisonClass!==null))fail('EMPLOYEE_EMAIL_COMPARATOR_DRIFT');
   // Exactly accepted JavaScript trim().toUpperCase(), through the real module;
   // no UPPER, ASCII-only new-provisioning parser or Unicode normalization.
   const bound=bindLegacyEmployment(workspaceId,employeeId);
   preflight.push({...bound,active:rawActive==='t',databaseEmailKey:witness.comparison.comparisonClass});
   mapping.push({...bound,originalKey:entry.key,sourceChecksum:entry.sourceChecksum,wireChecksum:entry.wireChecksum,source:entry.source});
  }
  const result=preflightEmploymentNamespaces(preflight);
  if(!result.ready)fail('LEGACY_NAMESPACE_PREFLIGHT_BLOCKED');
  const body={format:'CONTROLLED_LEGACY_EMPLOYEE_NUMBER_ENROLLMENT_V1' as const,
   originalPlan:plan,originalPlanDigest:plan.digest,boundary:manifest.boundary,
   namespaceCaptureChecksum:manifest.namespaceCaptureChecksum,keyCaptureChecksum:manifest.keyCaptureChecksum,
   keyComparatorDigest:manifest.keyComparatorDigest,rows:mapping,legacyExceptions:result.legacyExceptions,
   verification:'PURE_COMPLETE_SOURCE_MAPPING_NOT_OPERATOR_OR_DATABASE_AUTHORITY' as const};
  const enrollment:LegacyEmployeeNumberEnrollment=frozen({...body,digest:ownershipDigest(body)});
  issued.add(enrollment);return Object.freeze({status:'COMPILED',enrollment});
 }catch(error){return Object.freeze({status:'BLOCKED',code:error instanceof EnrollmentFailure?error.code:'INVALID_LEGACY_ENROLLMENT_STRUCTURE'});}
}
export function isIssuedLegacyEmployeeNumberEnrollment(input:unknown):input is LegacyEmployeeNumberEnrollment{
 return typeof input==='object'&&input!==null&&issued.has(input);
}

/** Compare only ordinary supplied four-text-column tuples. This cannot prove
 * native full visibility: FORCE-RLS denial/invisible rows must be caught by the
 * separately admitted current native operator before invoking this function. */
export function compareLegacyEmployeeNumberEnrollmentTarget(enrollment:unknown,input:unknown):LegacyEnrollmentTargetOutcome{
 if(!isIssuedLegacyEmployeeNumberEnrollment(enrollment))return Object.freeze({status:'BLOCKED',code:'GENUINE_LEGACY_ENROLLMENT_REQUIRED'});
 try{
  const dataArray=(value:unknown):readonly unknown[]=>{
   if(typeof value!=='object'||value===null||utilTypes.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('MAPPING_TARGET_SHAPE_DRIFT');
   const length=Object.getOwnPropertyDescriptor(value,'length');
   if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0)fail('MAPPING_TARGET_SHAPE_DRIFT');
   const keys=Reflect.ownKeys(value);
   if(keys.length!==length.value+1||keys.some(k=>typeof k!=='string')||!keys.includes('length'))fail('MAPPING_TARGET_SHAPE_DRIFT');
   const out:unknown[]=[];
   for(let i=0;i<length.value;i++){
    const descriptor=Object.getOwnPropertyDescriptor(value,String(i));
    if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable)fail('MAPPING_TARGET_SHAPE_DRIFT');
    out.push(descriptor.value);
   }
   return out;
  };
  const supplied=dataArray(input),actual=supplied.map(row=>{
   const values=dataArray(row);
   if(values.length!==4||values.some(v=>typeof v!=='string'||decodeTypedMigrationWireValue('text',v).status!=='DECODED'))fail('MAPPING_TARGET_SHAPE_DRIFT');
   return values as readonly string[];
  });
  if(actual.length===0&&enrollment.rows.length!==0)return Object.freeze({status:'EMPTY',verification:'SUPPLIED_ROWS_NOT_NATIVE_VISIBILITY_OR_ATOMICITY'});
  const expected=enrollment.rows.map(r=>[r.employeeId,r.workspaceId,r.employeeNumber,r.normalizedNumber]);
  const sort=(tuples:readonly (readonly string[])[])=>[...tuples].sort((a,b)=>{
   const left=canonicalOwnershipJson(a),right=canonicalOwnershipJson(b);return left<right?-1:left>right?1:0;
  });
  if(!same(sort(actual),sort(expected)))fail('MAPPING_TARGET_PARTIAL_OR_CONFLICTING');
  return Object.freeze({status:'COMPLETE_IDENTICAL',verification:'SUPPLIED_ROWS_NOT_NATIVE_VISIBILITY_OR_ATOMICITY'});
 }catch(error){return Object.freeze({status:'BLOCKED',code:error instanceof EnrollmentFailure?error.code:'INVALID_LEGACY_ENROLLMENT_STRUCTURE'});}
}
