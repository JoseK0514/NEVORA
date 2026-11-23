import { Temporal } from '@js-temporal/polyfill';
import type { NativeConfiguration, StoredConfiguration, NativeYtd, NativeTaxProfile, NativeAuthorizedDeduction } from '@/lib/payroll/native/contracts';
import type { NativeWorkweekPolicy } from '@/lib/payroll/native/workweek-policy';
import { dollarsToMinor } from './money';
import { nativeCopy } from './copy/native';
import type { PayrollLang } from './payroll-lang';

// The messages of the current call (each exported reader sets them first; reading a form is synchronous).
let M = nativeCopy.en.form;
const L = () => M.labels;

const raw = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const list = (f: FormData, k: string) => f.getAll(k).map(v => String(v).trim());
function text(f: FormData, key: string, label = key) { const v = raw(f,key); if (!v || v.length > 300 || /[\u0000-\u001f\u007f]/.test(v)) throw Error(M.enter(label)); return v; }
function choice<const T extends string>(f: FormData, key: string, choices: readonly T[], label = key): T { const v = raw(f,key); if (!choices.includes(v as T)) throw Error(M.choose(label)); return v as T; }
function confirm(f: FormData, key: string, label: string) { if (!f.has(key)) throw Error(M.confirm(label)); return true as const; }
function number(f: FormData,key:string,max:number) { const v=text(f,key); if(!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v)>max) throw Error(M.wholeNumber(max, key)); return Number(v); }
function date(f:FormData,key:string) { const v=text(f,key); try { return Temporal.PlainDate.from(v).toString(); } catch { throw Error(M.validDate(key)); } }
function instant(f:FormData,key:string) { const v=text(f,key); try { return Temporal.PlainDateTime.from(v).toZonedDateTime('America/Puerto_Rico').toInstant().toString(); } catch { throw Error(M.validInstant(key)); } }
const end = (f:FormData,key:string,asInstant=false) => raw(f,key) ? (asInstant ? instant(f,key) : date(f,key)) : null;
const money=(f:FormData,key:string)=>dollarsToMinor(text(f,key));
const optionalMoney=(f:FormData,key:string)=>raw(f,key) ? money(f,key) : null;
function percent(f:FormData,key:string,max=10000) { const v=money(f,key); if(BigInt(v)>BigInt(max)) throw Error(M.percentage(key)); return Number(v); }
function locations(f:FormData,key:string,required=true) { const v=list(f,key); if((required&&!v.length) || v.some(id=>!id||id==='*') || new Set(v).size!==v.length) throw Error(M.locations); return v; }
function map(f:FormData,key:string) { const result:Record<string,string>={}; for(const code of list(f,`${key}Code`)) { if(!/^[A-Z][A-Z0-9_]{0,79}$/.test(code)||Object.hasOwn(result,code)) throw Error(M.balanceCodes); result[code]=money(f,`${key}.${code}`); } return result; }
function rate(f:FormData,key:string) { const v=text(f,key); if(!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(v)) throw Error(M.hourlyDecimals); const [whole,decimal='']=v.split('.'); const fraction=decimal.padEnd(6,'0'); const units=BigInt(whole)*BigInt(100)+BigInt(fraction.slice(0,2)); const sub=fraction.slice(2).replace(/0+$/,''); const result=units.toString()+(sub?`.${sub}`:''); if(/^0(?:\.0+)?$/.test(result)) throw Error(M.hourlyPositive); return result; }
function policy(f:FormData,employeeId:string,previous:NativeWorkweekPolicy|null): NativeWorkweekPolicy|null {
  const kind=choice(f,'policyKind',['UNKNOWN','STATUTORY_DEFAULT','EMPLOYER_NOTICE']); if(kind==='UNKNOWN') return null;
  confirm(f,'federalMatch',L().federalMatch);
  const origin:NativeWorkweekPolicy['origin']=kind==='STATUTORY_DEFAULT'
    ? {kind,noticeAbsenceConfirmed:confirm(f,'noticeAbsence',L().noticeAbsence),evidenceReference:text(f,'policyEvidence',L().policyEvidence)}
    : {kind,noticeReference:text(f,'noticeReference',L().noticeReference),deliveredAt:instant(f,'noticeDelivered'),deliveryMethod:choice(f,'noticeMethod',['POSTED_ACCESSIBLE','WRITTEN_EMPLOYEE','ELECTRONIC_ACCESSIBLE']),employeeCoverageConfirmed:confirm(f,'noticeCoverage',L().noticeCoverage),noticeKind:choice(f,'noticeKind',['INITIAL','CHANGE']),previousPolicyReference:raw(f,'noticeKind')==='CHANGE'?text(f,'previousPolicyReference',L().previousPolicy):null};
  const weekday=kind==='STATUTORY_DEFAULT'?1:number(f,'policyWeekday',7); if(weekday<1) throw Error(M.weekday);
  const startTime=kind==='STATUTORY_DEFAULT'?'00:01':text(f,'policyClock',L().policyClock); if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(startTime)) throw Error(M.clock);
  return {version:'PR_WORKWEEK_POLICY_V1',id:previous?.id??text(f,'policyId'),revision:(previous?.revision??0)+1,employeeId,effectiveFrom:instant(f,'policyFrom'),effectiveTo:end(f,'policyTo',true),boundary:{weekday:weekday as 1|2|3|4|5|6|7,startTime,timeZone:'America/Puerto_Rico'},federalWorkweek:'SAME_VERIFIED_BOUNDARY',federalEvidenceReference:text(f,'federalEvidence',L().federalEvidence),origin};
}
export function profileFromForm(f:FormData,employeeId:string,previous:StoredConfiguration|null,lang:PayrollLang='en'):NativeConfiguration {
  M=nativeCopy[lang].form;
  const wageIds=list(f,'wageId'); if(!wageIds.length) throw Error(M.addWage);
  const wages=wageIds.map(id=>{ const p=`wage.${id}.`, before=previous?.wages.find(w=>w.id===id);
    const scoped=new FormData();for(const [key,value] of f)if(key.startsWith(p))scoped.append(key.slice(p.length),value);
    const workweekPolicy=scoped.has('policyKind')?policy(scoped,employeeId,before?.workweekPolicy??null):wageIds.length===1&&f.has('policyKind')?policy(f,employeeId,before?.workweekPolicy??null):before?.workweekPolicy??null;
    choice(f,p+'scope',['CONFIRMED'],L().wageScope);
    const retainLegacy = !workweekPolicy || (!!before?.workweekAnchorDate && Temporal.PlainDate.from(before.workweekAnchorDate).dayOfWeek === workweekPolicy.boundary.weekday && before.workweekStartTime === workweekPolicy.boundary.startTime);
    return {id,revision:(before?.revision??0)+1,effectiveFrom:instant(f,p+'from'),effectiveTo:end(f,p+'to',true),locationIds:locations(f,p+'locations'),hourlyRateMinor:rate(f,p+'rate'),compensation:'HOURLY' as const,employment:'PR_PRIVATE_NONEXEMPT' as const,minimumWageCoverage:'PR_ACT_47_STANDARD_2026' as const,overtime:choice(f,p+'overtime',['TIME_AND_HALF','DOUBLE_PRESERVED']),dailyBasis:'CALENDAR_DAY' as const,workweekAnchorDate:retainLegacy?before?.workweekAnchorDate??null:null,workweekStartTime:retainLegacy?before?.workweekStartTime??null:null,workweekPolicy,overtimeBasis:'WEIGHTED_WEEKLY' as const,wageCentRounding:before?.wageCentRounding??'UNVERIFIED' as const,breakRules:list(f,p+'breakId').filter(typeId=>raw(f,p+'break.'+typeId)).map(typeId=>({typeId,treatment:choice(f,p+'break.'+typeId,['PAID_REST','UNPAID_RELIEVED_MEAL'])})),standardContextAttested:confirm(f,p+'attest',L().wageAttest),evidenceReference:text(f,p+'evidence',L().wageEvidence)}; });
  let tax:NativeTaxProfile|null=null;
  if(f.has('taxEnabled')) {
    choice(f,'taxCoverage',['CONFIRMED'],L().taxCoverage); const method=choice(f,'certificateMethod',['FIXED','PERCENTAGE']); const before=previous?.tax;
    tax={id:before?.id??text(f,'taxId'),revision:(before?.revision??0)+1,effectiveFrom:date(f,'taxFrom'),effectiveTo:end(f,'taxTo'),coverage:'PR_REGULAR_TAXABLE_RESIDENT',certificate:{personal:choice(f,'personal',['INDIVIDUAL_FULL','MARRIED_JOINT_FULL','MARRIED_HALF_OR_OPTIONAL_FULL','NONE']),fullDependents:number(f,'fullDependents',99),halfDependents:number(f,'halfDependents',99),deductionAllowances:number(f,'deductionAllowances',1000),veteran:choice(f,'veteran',['YES','NO'])==='YES',additionalMethod:method,additionalMinor:method==='FIXED'?money(f,'certificateAmount'):null,additionalBasisPoints:method==='PERCENTAGE'?percent(f,'certificatePercent'):null,wageDollarRounding:choice(f,'wageDollarRounding',['NONE','NEAREST_DOLLAR'])},certificateReference:text(f,'certificateEvidence',L().certificateEvidence),ficaCoverage:'STANDARD',sinotCoverage:'STANDARD',sinotEmployeeBasisPoints:percent(f,'sinotRate',30),prCentRounding:before?.prCentRounding??'UNVERIFIED',ruleEvidenceReference:before?.ruleEvidenceReference??null,employerCoverageAttested:confirm(f,'employerAttest',L().employerAttest),employerContributions:list(f,'employerId').map(id=>{const p=`employer.${id}.`, applicability=choice(f,p+'applicability',['APPLICABLE','EXEMPT']); return {code:text(f,p+'code'),label:text(f,p+'label'),applicability,basisPoints:applicability==='APPLICABLE'?percent(f,p+'rate'):null,capMinor:applicability==='APPLICABLE'?optionalMoney(f,p+'cap'):null,wagesBeforeMinor:money(f,p+'opening'),evidenceReference:text(f,p+'evidence',L().employerEvidence)};})};
  }
  confirm(f,'deductionsReviewed',L().deductionsReviewed);
  const deductions:NativeAuthorizedDeduction[]=list(f,'deductionId').map(id=>{const p=`deduction.${id}.`,before=previous?.deductions.find(d=>d.id===id),method=choice(f,p+'method',['FIXED','PERCENTAGE']),legalBasis=choice(f,p+'basis',['PR_LAW_17_5_C','PR_LAW_17_5_G']);confirm(f,p+'authorization',L().deductionAuthorization);return {id,revision:(before?.revision??0)+1,code:text(f,p+'code'),label:text(f,p+'label'),effectiveFrom:date(f,p+'from'),effectiveTo:end(f,p+'to'),method,amountMinor:method==='FIXED'?money(f,p+'amount'):null,basisPoints:method==='PERCENTAGE'?percent(f,p+'rate'):null,capMinor:optionalMoney(f,p+'cap'),deductedBeforeMinor:money(f,p+'opening'),authorization:'WRITTEN_POST_TAX',authorizationReference:text(f,p+'evidence'),revoked:f.has(p+'revoked'),legalBasis,complianceReference:text(f,p+'compliance'),employerContributionCode:legalBasis==='PR_LAW_17_5_G'?text(f,p+'employerCode'):null};});
  return {schema:'NEVORA_NATIVE_CONFIGURATION_V1',employeeId,wages,tax,deductions,...(previous?.calculationPolicyReference!==undefined?{calculationPolicyReference:previous.calculationPolicyReference}:{})};
}
export function openingFromForm(f:FormData,revision:number,lang:PayrollLang='en'):NativeYtd { M=nativeCopy[lang].form; const fingerprint=text(f,'openingFingerprint',L().openingFingerprint); if(!/^[a-f0-9]{64}$/.test(fingerprint)) throw Error(M.fingerprint);return {year:number(f,'year',2100),revision:revision+1,evidenceReference:text(f,'openingEvidence'),attested:confirm(f,'openingAttest',L().openingAttest),grossMinor:money(f,'gross'),netMinor:money(f,'net'),socialSecurityWagesMinor:money(f,'socialSecurity'),medicareWagesMinor:money(f,'medicare'),sinotWagesMinor:money(f,'sinot'),deductions:map(f,'deductions'),employerContributions:map(f,'employerContributions'),employerWagesMinor:map(f,'employerWages'),ledgerFingerprint:fingerprint,locationIds:locations(f,'openingLocations',false)}; }
export function scopeFromForm(f:FormData,lang:PayrollLang='en') { M=nativeCopy[lang].form; const review=f.has('review'),approve=f.has('approve'); if(approve&&!review) throw Error(M.approvalNeedsReview); return {review,approve,locationIds:review?locations(f,'scopeLocations'):[]}; }
