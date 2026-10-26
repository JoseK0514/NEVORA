import type { NativeProfilesResponse } from '@/lib/payroll/native/contracts';
import { record } from './api';
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0;
const revision=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
const money=(v:unknown)=>typeof v==='string'&&/^(0|[1-9]\d{0,14})$/.test(v);
const ids=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(id=>text(id)&&id!=='*')&&new Set(v).size===v.length;
const instant=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
function policy(v:unknown){if(v===null||v===undefined)return true;if(!record(v)||v.version!=='PR_WORKWEEK_POLICY_V1'||!text(v.id)||!revision(v.revision)||!text(v.employeeId)||!instant(v.effectiveFrom)||(v.effectiveTo!==null&&!instant(v.effectiveTo))||!record(v.boundary)||!Number.isInteger(v.boundary.weekday)||Number(v.boundary.weekday)<1||Number(v.boundary.weekday)>7||typeof v.boundary.startTime!=='string'||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v.boundary.startTime)||v.boundary.timeZone!=='America/Puerto_Rico'||v.federalWorkweek!=='SAME_VERIFIED_BOUNDARY'||!text(v.federalEvidenceReference)||!record(v.origin))return false;const o=v.origin;return o.kind==='STATUTORY_DEFAULT'?o.noticeAbsenceConfirmed===true&&text(o.evidenceReference):o.kind==='EMPLOYER_NOTICE'&&text(o.noticeReference)&&instant(o.deliveredAt)&&['POSTED_ACCESSIBLE','WRITTEN_EMPLOYEE','ELECTRONIC_ACCESSIBLE'].includes(String(o.deliveryMethod))&&o.employeeCoverageConfirmed===true&&['INITIAL','CHANGE'].includes(String(o.noticeKind))&&(o.previousPolicyReference===null||text(o.previousPolicyReference));}
const moneyMap=(v:unknown)=>record(v)&&Object.values(v).every(money);
const optionalMoney=(v:unknown)=>v===null||money(v);
const count=(v:unknown,max:number)=>Number.isSafeInteger(v)&&Number(v)>=0&&Number(v)<=max;
const basisPoints=(v:unknown)=>count(v,10000);
function certificate(v:unknown) {
 if(!record(v)||!['INDIVIDUAL_FULL','MARRIED_JOINT_FULL','MARRIED_HALF_OR_OPTIONAL_FULL','NONE'].includes(String(v.personal))||!count(v.fullDependents,99)||!count(v.halfDependents,99)||!count(v.deductionAllowances,1000)||typeof v.veteran!=='boolean'||!['NONE','NEAREST_DOLLAR'].includes(String(v.wageDollarRounding)))return false;
 return v.additionalMethod==='FIXED'?money(v.additionalMinor)&&v.additionalBasisPoints===null:v.additionalMethod==='PERCENTAGE'&&v.additionalMinor===null&&basisPoints(v.additionalBasisPoints);
}
function employer(v:unknown) {
 if(!record(v)||!text(v.code)||!text(v.label)||!money(v.wagesBeforeMinor)||!text(v.evidenceReference)||!optionalMoney(v.capMinor))return false;
 return v.applicability==='APPLICABLE'?basisPoints(v.basisPoints):v.applicability==='EXEMPT'&&v.basisPoints===null&&v.capMinor===null;
}
function deduction(v:unknown) {
 if(!record(v)||!text(v.id)||!revision(v.revision)||!text(v.code)||!text(v.label)||!text(v.effectiveFrom)||(v.effectiveTo!==null&&!text(v.effectiveTo))||!money(v.deductedBeforeMinor)||!optionalMoney(v.capMinor)||v.authorization!=='WRITTEN_POST_TAX'||!text(v.authorizationReference)||typeof v.revoked!=='boolean'||!['PR_LAW_17_5_C','PR_LAW_17_5_G'].includes(String(v.legalBasis))||!text(v.complianceReference)||(v.employerContributionCode!==null&&!text(v.employerContributionCode)))return false;
 return v.method==='FIXED'?money(v.amountMinor)&&v.basisPoints===null:v.method==='PERCENTAGE'&&v.amountMinor===null&&basisPoints(v.basisPoints);
}
export function readNativeProfiles(value:unknown):NativeProfilesResponse {
  const valid=record(value)&&value.version==='PAYROLL_NATIVE_PROFILES_V1'&&Array.isArray(value.configurations)&&Array.isArray(value.openingYtd)&&Array.isArray(value.managerScopes);
  if(!valid) throw Error('Employee payroll facts could not be read. Reload current Owner access.');
  for(const c of value.configurations as unknown[]) {
    if(!record(c)||c.schema!=='NEVORA_NATIVE_CONFIGURATION_V1'||!text(c.employeeId)||!revision(c.revision)||!text(c.actorId)||!text(c.reason)||!text(c.createdAt)||!Array.isArray(c.wages)||!c.wages.length||!Array.isArray(c.deductions)||!c.wages.every(w=>record(w)&&text(w.id)&&revision(w.revision)&&text(w.effectiveFrom)&&(w.effectiveTo===null||text(w.effectiveTo))&&ids(w.locationIds)&&text(w.hourlyRateMinor)&&/^(0|[1-9]\d{0,8})(\.[0-9]{1,4})?$/.test(w.hourlyRateMinor)&&Array.isArray(w.breakRules)&&typeof w.standardContextAttested==='boolean'&&text(w.evidenceReference)&&policy(w.workweekPolicy)&&w.breakRules.every(b=>record(b)&&text(b.typeId)&&['PAID_REST','UNPAID_RELIEVED_MEAL'].includes(String(b.treatment))))) throw Error('The saved wage facts are incomplete. Reload before editing.');
    if(c.tax!==null&&(!record(c.tax)||!text(c.tax.id)||!revision(c.tax.revision)||!certificate(c.tax.certificate)||!Array.isArray(c.tax.employerContributions)||!text(c.tax.certificateReference)||!count(c.tax.sinotEmployeeBasisPoints,30)||typeof c.tax.employerCoverageAttested!=='boolean'||!c.tax.employerContributions.every(employer))) throw Error('The saved withholding facts are incomplete.');
    if(!c.deductions.every(deduction)) throw Error('The saved deduction facts are incomplete.');
  }
  if(!(value.openingYtd as unknown[]).every(o=>{if(!record(o)||!text(o.employeeId)||!record(o.ytd))return false;const y=o.ytd;return revision(y.revision)&&Number.isInteger(y.year)&&['grossMinor','netMinor','socialSecurityWagesMinor','medicareWagesMinor','sinotWagesMinor'].every(k=>money(y[k]))&&['deductions','employerContributions','employerWagesMinor'].every(k=>moneyMap(y[k]))&&ids(y.locationIds)&&text(y.evidenceReference)&&text(y.ledgerFingerprint)&&typeof y.attested==='boolean';})) throw Error('The opening payroll balances could not be read.');
  if(!(value.managerScopes as unknown[]).every(s=>record(s)&&text(s.employeeId)&&revision(s.revision)&&typeof s.review==='boolean'&&typeof s.approve==='boolean'&&(!s.approve||s.review)&&ids(s.locationIds)&&(!s.review||s.locationIds.length>0)&&text(s.subjectEmployeeVersion))) throw Error('The current Manager payroll scope could not be read.');
  if(value.setup!==undefined){
    const setup=value.setup;
    const valid=(r:unknown)=>record(r)&&r.version==='NATIVE_SETUP_RECORD_V1'&&['COMPANY_DEFAULTS','EMPLOYEE_PAY','OPENING_TOTALS'].includes(String(r.kind))&&text(r.subjectId)&&revision(r.revision)&&text(r.statement)&&text(r.attestation)&&typeof r.factsSha256==='string'&&/^[a-f0-9]{64}$/.test(r.factsSha256)&&text(r.reference)&&record(r.enteredBy);
    if(!record(setup)||!(setup.companyDefaults===null||valid(setup.companyDefaults))||!Array.isArray(setup.records)||!setup.records.every(valid)) throw Error('The recorded payroll setup could not be read. Reload this page.');
  }
  return value as NativeProfilesResponse;
}
