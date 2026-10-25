/**
 * Pure export projection and provider mapping. Canonical durations are decimal
 * nanosecond strings. recorded/break fields are elapsed time INCLUDING breaks, kept
 * as provenance. Payable hours (paid, regular, overtime, double time) come only from
 * the native payroll engine (classifyPayableHours), never from elapsed time; a file
 * that maps them blocks when the engine cannot classify an employee, unless the file
 * also carries the "payableStatus" column that states why the cells are blank.
 */
import {parseTimecardsResponse,type TimecardItem} from '../timecards/read-model';
import {parsePeriod,projectTimecard,type TimecardEntry,type Period} from '../timecards/project';
import type {PayableHoursResult} from '../payroll/native/payable-hours';
import {csvDocument} from '../reports/csv';
export type ExportPayable=PayableHoursResult;
export type CanonicalPayrollExportRow={employeeId:string;employeeName:string;revision:number;sourceHash:string;finalizationOperationId:string;recordedNanoseconds:string;breakNanoseconds:string;entries:(TimecardEntry&{recordedNanoseconds:string;breakNanoseconds:string})[];payable?:ExportPayable};
/** version 2 adds engine-classified payable hours to every row; version 1 receipts replay unchanged. */
export type CanonicalPayrollExport={version:1|2;workspaceId:string;timeZone:string;period:Period;timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS';payableBasis?:'NATIVE_PAYROLL_ENGINE';rows:CanonicalPayrollExportRow[]};
export type MappingSource='employeeId'|'employeeName'|'providerEmployeeId'|'periodStart'|'periodEnd'|'paidHours'|'regularHours'|'overtimeHours'|'doubleTimeHours'|'restDayHours'|'unpaidBreakHours'|'payableStatus'|'earningsCode'|'earningsHours'|'recordedHours'|'breakHours'|'recordedNanoseconds'|'breakNanoseconds'|'revision'|'sourceHash'|'constant';
export type ExportColumn={header:string;source:MappingSource;constant?:string};
/** earningsCodes drive one row per employee and earning (REG, then OT and DT when
 * present) whenever a column maps earningsCode or earningsHours. */
export type EarningsCodes={regular:string;overtime:string|null;doubleTime:string|null};
export type ExportProfile={version:1;name:string;product:string;format:'CUSTOM_CSV'|'ADP_RUN_GENERIC_V1';dateFormat:'ISO'|'US';hourDecimals:number;precision:'REJECT_INEXACT'|'HALF_UP';verifiedRequirements:string;reviewedTimeBasis:true;columns:ExportColumn[];employeeMappings:{employeeId:string;providerEmployeeId:string}[];earningsCodes?:EarningsCodes};
export const mappingSources:MappingSource[]=['employeeId','employeeName','providerEmployeeId','periodStart','periodEnd','paidHours','regularHours','overtimeHours','doubleTimeHours','restDayHours','unpaidBreakHours','payableStatus','earningsCode','earningsHours','recordedHours','breakHours','recordedNanoseconds','breakNanoseconds','revision','sourceHash','constant'];
const payableSources:readonly MappingSource[]=['paidHours','regularHours','overtimeHours','doubleTimeHours','restDayHours','unpaidBreakHours','earningsHours'];
const earningSources:readonly MappingSource[]=['earningsCode','earningsHours'];
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=200):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&v===v.trim()&&!/[\u0000-\u001f\u007f]/.test(v);
const safeImport=(s:string)=>!/^\s*[=+@-]/.test(s);
/** Revalidate 1–100 selected cards as currently finalized, with matching source hashes
 * and one shared time zone. Produces stable employee ordering without persistence
 * or authorization; the service owns current company access and receipt creation. */
export function canonicalPayrollExport(workspaceId:string,observedAt:string,period:Period,cards:unknown,employeeIds:readonly string[],payable?:Readonly<Record<string,ExportPayable>>):CanonicalPayrollExport{
 if(!text(workspaceId)||employeeIds.length<1||employeeIds.length>100||employeeIds.some(id=>!text(id))||new Set(employeeIds).size!==employeeIds.length)throw new Error('Choose 1 to 100 distinct employees');
 const normalizedPeriod=parsePeriod(period.startDate,period.endDate);
 const parsed=parseTimecardsResponse({observedAt,cards},normalizedPeriod);
 const selected=employeeIds.map(id=>{const c=parsed.cards.find(c=>c.card.employeeId===id);if(!c)throw new Error('Employee unavailable in this workspace');return c;});
 if(selected.some(c=>c.state!=='FINALIZED'||c.card.issues.length||c.history[0]?.action!=='FINALIZE'||c.history[0].sourceHash!==c.sourceHash))throw new Error('Every selected timecard must have a current finalized revision');
 const zones=new Set(selected.map(c=>c.card.timeZone));if(zones.size!==1)throw new Error('Inconsistent export timezone');
 if(payable&&employeeIds.some(id=>!payable[id]))throw new Error('Payable hours missing for a selected employee');
 const rows=selected.sort((a,b)=>a.card.employeeId.localeCompare(b.card.employeeId)).map(c=>({employeeId:c.card.employeeId,employeeName:c.card.employeeName,revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId,recordedNanoseconds:c.card.recordedNanoseconds,breakNanoseconds:c.card.breakNanoseconds,entries:c.card.entries.map(e=>{const single=projectTimecard({...c.source,entries:[e],pendingCorrections:0,corrections:[]},observedAt);return {...e,recordedNanoseconds:single.recordedNanoseconds,breakNanoseconds:single.breakNanoseconds};}),...(payable?{payable:payable[c.card.employeeId]}:{})}));
 return payable?{version:2,workspaceId,timeZone:selected[0].card.timeZone,period:normalizedPeriod,timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS',payableBasis:'NATIVE_PAYROLL_ENGINE',rows}:{version:1,workspaceId,timeZone:selected[0].card.timeZone,period:normalizedPeriod,timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS',rows};
}
export function parseExportProfile(v:unknown):ExportProfile{
 if(!object(v)||v.version!==1||!text(v.name,120)||!text(v.product,120)||typeof v.format!=='string'||!['CUSTOM_CSV','ADP_RUN_GENERIC_V1'].includes(v.format)||typeof v.dateFormat!=='string'||!['ISO','US'].includes(v.dateFormat)||!Number.isSafeInteger(v.hourDecimals)||Number(v.hourDecimals)<0||Number(v.hourDecimals)>9||typeof v.precision!=='string'||!['REJECT_INEXACT','HALF_UP'].includes(v.precision)||!text(v.verifiedRequirements,600)||v.reviewedTimeBasis!==true||!Array.isArray(v.columns)||v.columns.length<1||v.columns.length>20||!Array.isArray(v.employeeMappings)||v.employeeMappings.length>100||Object.keys(v).some(k=>!['version','name','product','format','dateFormat','hourDecimals','precision','verifiedRequirements','reviewedTimeBasis','columns','employeeMappings','earningsCodes'].includes(k)))throw new Error('Verify the import requirements, fields and time basis');
 const columns=v.columns.map((c):ExportColumn=>{if(!object(c)||!text(c.header,80)||!safeImport(c.header)||typeof c.source!=='string'||!mappingSources.includes(c.source as MappingSource)||Object.keys(c).some(k=>!['header','source','constant'].includes(k))||(c.source==='constant'&&!(c.constant===''||text(c.constant,100)))||(c.constant!==undefined&&c.source!=='constant')||(typeof c.constant==='string'&&!safeImport(c.constant)))throw new Error('Invalid import column');return {header:c.header,source:c.source as MappingSource,...(c.source==='constant'?{constant:c.constant as string}:{})};});
 const employeeMappings=v.employeeMappings.map((m)=>{if(!object(m)||Object.keys(m).length!==2||!text(m.employeeId)||!text(m.providerEmployeeId,100)||!safeImport(m.providerEmployeeId))throw new Error('Invalid provider employee identifier');return {employeeId:m.employeeId,providerEmployeeId:m.providerEmployeeId};});
 if(new Set(columns.map(c=>c.header.toLowerCase())).size!==columns.length||new Set(employeeMappings.map(m=>m.employeeId)).size!==employeeMappings.length||new Set(employeeMappings.map(m=>m.providerEmployeeId)).size!==employeeMappings.length)throw new Error('Duplicate import column or employee identifier');
 const earningsCodes=v.earningsCodes===undefined?undefined:parseEarningsCodes(v.earningsCodes);
 if(columns.some(c=>earningSources.includes(c.source))&&!earningsCodes)throw new Error('Add the regular earnings code for earning rows');
 const profile={...v,columns,employeeMappings,...(earningsCodes?{earningsCodes}:{})} as ExportProfile;
 if(profile.format==='ADP_RUN_GENERIC_V1')validateAdp(profile);
 return profile;
}
function parseEarningsCodes(v:unknown):EarningsCodes{
 const code=(c:unknown)=>text(c,10)&&safeImport(c);
 if(!object(v)||Object.keys(v).length!==3||!code(v.regular)||!(v.overtime===null||code(v.overtime))||!(v.doubleTime===null||code(v.doubleTime)))throw new Error('Invalid earnings codes');
 const codes={regular:v.regular as string,overtime:v.overtime as string|null,doubleTime:v.doubleTime as string|null};
 const used=[codes.regular,codes.overtime,codes.doubleTime].filter(Boolean);if(new Set(used).size!==used.length)throw new Error('Use a different earnings code for each kind of hours');
 return codes;
}
/** Documented RUN generic v1 shape only; no assumed earnings/rate identifiers. Each
 * employee gets one row per earning: regular hours, then overtime and double time
 * (from the native payroll engine) under the profile's earnings codes. */
export function adpRunColumns(companyCode='',payFrequency='',rateCode=''):ExportColumn[]{return [
 {header:'IID',source:'constant',constant:companyCode},{header:'Pay Frequency',source:'constant',constant:payFrequency},{header:'Pay Period Start Date',source:'periodStart'},{header:'Pay Period End Date',source:'periodEnd'},
 {header:'Employee ID',source:'providerEmployeeId'},{header:'Earnings Code',source:'earningsCode'},{header:'Pay Hours',source:'earningsHours'},
 {header:'Dollars',source:'constant',constant:''},{header:'Separate Check',source:'constant',constant:'0'},{header:'Worked In Dept',source:'constant',constant:''},{header:'Rate Code',source:'constant',constant:rateCode}];}
/** The pre-overtime RUN shape (one constant earnings code, elapsed hours including
 * breaks). Saved copies still load so the page works, but never produce a file. */
const legacyAdpSource=(i:number):MappingSource=>i===5?'constant':i===6?'recordedHours':adpRunColumns()[i].source;
export function isLegacyAdpProfile(p:ExportProfile):boolean{return p.format==='ADP_RUN_GENERIC_V1'&&p.columns.length===11&&p.columns.every((c,i)=>c.source===legacyAdpSource(i));}
function validateAdp(p:ExportProfile){
 const expected=adpRunColumns(),legacy=isLegacyAdpProfile(p);
 if(p.dateFormat!=='US'||p.hourDecimals!==2||p.columns.length!==expected.length||p.columns.some((c,i)=>c.header!==expected[i].header||c.source!==(legacy?legacyAdpSource(i):expected[i].source)))throw new Error('RUN generic v1 columns or formats do not match verified documentation');
 const constant=(i:number)=>p.columns[i].constant??'';
 if(!/^[A-Za-z0-9]{1,10}$/.test(constant(0))||!['B','W','S','M','Q'].includes(constant(1))||(legacy?!text(constant(5),10):!p.earningsCodes)||!text(constant(10),10)||constant(7)!==''||!/^[0-9]$/.test(constant(8))||!/^\d{0,6}$/.test(constant(9))||p.employeeMappings.some(m=>m.providerEmployeeId.length>15||!/^[A-Za-z0-9]+$/.test(m.providerEmployeeId)))throw new Error('Verify RUN company, frequency, employee, earnings, department and rate codes');
}
/** Convert nonnegative nanoseconds with integer arithmetic. A reviewed HALF_UP profile
 * may round; REJECT_INEXACT fails when the requested decimal scale loses precision. */
export function decimalHours(nanoseconds:string,decimals:number,precision:ExportProfile['precision']):string{
 if(!/^\d+$/.test(nanoseconds))throw new Error('Invalid canonical time');
 const divisor=BigInt(3_600_000_000_000),scale=BigInt(10)**BigInt(decimals),numerator=BigInt(nanoseconds)*scale;
 const remainder=numerator%divisor;if(remainder&&precision==='REJECT_INEXACT')throw new Error('Time cannot be represented exactly at this profile precision. Review a rounding profile explicitly.');
 const result=numerator/divisor+(precision==='HALF_UP'&&remainder*BigInt(2)>=divisor?BigInt(1):BigInt(0));
 if(!decimals)return result.toString();const value=result.toString().padStart(decimals+1,'0');return `${value.slice(0,-decimals)}.${value.slice(-decimals)}`;
}
const payableMessages:Record<string,string>={
 WAGE_PROFILE_REQUIRED:'Needs a pay profile in Payroll settings',WORKWEEK_EVIDENCE_REQUIRED:'Needs a workweek in the pay profile',
 BREAK_PAY_BASIS_REQUIRED:'A break type needs Paid or Unpaid in the pay profile',UNSUPPORTED_UNPAID_BREAK_DURATION:'An unpaid meal is shorter than 30 minutes',
 UNSUPPORTED_PAID_BREAK_BASIS:'A paid rest is longer than 20 minutes',DAILY_BOUNDARY_SENSITIVE:'A shift crosses midnight and the overnight rule is not chosen',
 COMPLETE_CONTEXT_REQUIRED:'Finalize the full workweek and the 6 days before it',RECORDED_SOURCE_COVERAGE_MISSING:'Finalize the full workweek and the 6 days before it',
 RECORDED_SOURCE_NOT_FINALIZED:'Finalize the full workweek and the 6 days before it',FINALIZED_TIME_REQUIRED:'Finalize the full workweek and the 6 days before it',
 BELOW_APPLICABLE_MINIMUM_WAGE:'The pay rate is below the minimum wage',PAYROLL_SCHEMA_UNAVAILABLE:'Payroll is not set up',
};
/** Plain reason an employee's payable hours are blank; codes stay in the JSON record. */
export function payableStatus(p:ExportPayable|undefined):string{
 if(!p)return 'Not classified (export made before payable hours)';if(p.state==='ready')return 'Ready';
 return payableMessages[p.code]??(/^WORKWEEK_/.test(p.code)?'Needs a workweek in the pay profile':`Payable hours unavailable (${p.code})`);
}
type Earning={kind:'REGULAR'|'OVERTIME'|'DOUBLE_TIME';code:string|null;nanoseconds:string};
const kindName={REGULAR:'regular',OVERTIME:'overtime',DOUBLE_TIME:'double-time'} as const;
/** Apply a validated mapping and its explicit precision policy. Missing provider IDs
 * fail the entire file; RUN output uses its marker while custom CSV starts with BOM.
 * Payable sources fail the file for an unclassified employee unless the profile also
 * maps payableStatus, which then explains the blank cells. Earning rows always need
 * classified hours and a code for every kind of hours present. */
export function mappedPayrollCsv(model:CanonicalPayrollExport,input:ExportProfile):string{
 const profile=parseExportProfile(input);const date=(d:string)=>profile.dateFormat==='US'?`${d.slice(5,7)}/${d.slice(8,10)}/${d.slice(0,4)}`:d;
 if(isLegacyAdpProfile(profile))throw new Error('This ADP RUN mapping was saved before paid and overtime hours. Choose the ADP RUN layout again, add the earnings codes and save it.');
 const usesPayable=profile.columns.some(c=>payableSources.includes(c.source)),explains=profile.columns.some(c=>c.source==='payableStatus'),perEarning=profile.columns.some(c=>earningSources.includes(c.source));
 const hours=(ns:string)=>{const value=decimalHours(ns,profile.hourDecimals,profile.precision);if(profile.format==='ADP_RUN_GENERIC_V1'&&value.length>11)throw new Error('RUN hours exceed documented field width');return value;};
 const rows=model.rows.flatMap(row=>{
  const payable=row.payable?.state==='ready'?row.payable:null;
  if((perEarning||(usesPayable&&!explains))&&!payable)throw new Error(`Payable hours unavailable for ${row.employeeName}: ${payableStatus(row.payable)}`);
  const earnings:Earning[]=perEarning&&payable?[{kind:'REGULAR',code:profile.earningsCodes!.regular,nanoseconds:payable.regularNanoseconds},
   ...(BigInt(payable.overtimeNanoseconds)>BigInt(0)?[{kind:'OVERTIME' as const,code:profile.earningsCodes!.overtime,nanoseconds:payable.overtimeNanoseconds}]:[]),
   ...(BigInt(payable.doubleTimeNanoseconds)>BigInt(0)?[{kind:'DOUBLE_TIME' as const,code:profile.earningsCodes!.doubleTime,nanoseconds:payable.doubleTimeNanoseconds}]:[])]:[{kind:'REGULAR',code:null,nanoseconds:'0'}];
  return earnings.map(earning=>{
   if(perEarning&&!earning.code)throw new Error(`Add the ${kindName[earning.kind]} earnings code: ${row.employeeName} has ${kindName[earning.kind]} hours`);
   return profile.columns.map(column=>{
    switch(column.source){
     case 'constant':return column.constant??'';
     case 'providerEmployeeId':{const id=profile.employeeMappings.find(m=>m.employeeId===row.employeeId)?.providerEmployeeId;if(!id)throw new Error(`Provider identifier required for ${row.employeeName}`);return id;}
     case 'periodStart':return date(model.period.startDate);case 'periodEnd':return date(model.period.endDate);
     case 'recordedHours':return hours(row.recordedNanoseconds);
     case 'breakHours':return decimalHours(row.breakNanoseconds,profile.hourDecimals,profile.precision);
     case 'paidHours':return payable?hours(payable.paidNanoseconds):'';
     case 'regularHours':return payable?hours(payable.regularNanoseconds):'';
     case 'overtimeHours':return payable?hours(payable.overtimeNanoseconds):'';
     case 'doubleTimeHours':return payable?hours(payable.doubleTimeNanoseconds):'';
     case 'restDayHours':return payable?hours(payable.restDayNanoseconds):'';
     case 'unpaidBreakHours':return payable?hours(payable.unpaidBreakNanoseconds):'';
     case 'payableStatus':return payableStatus(row.payable);
     case 'earningsCode':return earning.code??'';
     case 'earningsHours':return hours(earning.nanoseconds);
     default:return row[column.source];
    }
   });
  });
 });
 return (profile.format==='ADP_RUN_GENERIC_V1'?'##GENERIC## V1.0\r\n':'﻿')+csvDocument([profile.columns.map(c=>c.header),...rows]);
}
/** Default file: hours to 2 decimals (half up) for people; payable hours from the
 * payroll engine with a status column; elapsed time kept only as labelled detail.
 * Exact nanoseconds and source fingerprints stay in the JSON record. */
export function neutralProfile():ExportProfile{return {version:1,name:'NEVORA normalized time',product:'Provider neutral',format:'CUSTOM_CSV',dateFormat:'ISO',hourDecimals:2,precision:'HALF_UP',verifiedRequirements:'NEVORA time CSV v2: hours to 2 decimals, rounded half up; payable hours from the NEVORA payroll engine; exact nanoseconds stay in the JSON record; no provider compatibility claim.',reviewedTimeBasis:true,employeeMappings:[],columns:[{header:'Employee ID',source:'employeeId'},{header:'Employee',source:'employeeName'},{header:'Period start',source:'periodStart'},{header:'Period end',source:'periodEnd'},{header:'Paid hours',source:'paidHours'},{header:'Regular hours',source:'regularHours'},{header:'Overtime hours',source:'overtimeHours'},{header:'Double-time hours',source:'doubleTimeHours'},{header:'7th-day hours (in overtime)',source:'restDayHours'},{header:'Unpaid break hours',source:'unpaidBreakHours'},{header:'Elapsed hours incl. breaks (not payable)',source:'recordedHours'},{header:'Break hours',source:'breakHours'},{header:'Payable hours',source:'payableStatus'},{header:'Finalized revision',source:'revision'}]};}
export type ExportCard=TimecardItem;
