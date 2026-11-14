/**
 * Pure export projection and provider mapping. Canonical durations are decimal
 * nanosecond strings of recorded elapsed time INCLUDING breaks; break duration is
 * reported separately and is not automatically subtracted to imply paid hours.
 */
import {parseTimecardsResponse,type TimecardItem} from '../timecards/read-model';
import {parsePeriod,projectTimecard,type TimecardEntry,type Period} from '../timecards/project';
import {csvDocument} from '../reports/csv';
import type {CompleteReadManifest} from '../complete-read-pages';
export type CanonicalPayrollExport={version:1;workspaceId:string;timeZone:string;period:Period;timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS';rows:{employeeId:string;employeeName:string;revision:number;sourceHash:string;finalizationOperationId:string;recordedNanoseconds:string;breakNanoseconds:string;entries:(TimecardEntry&{recordedNanoseconds:string;breakNanoseconds:string})[]}[]};
export type MappingSource='employeeId'|'employeeName'|'providerEmployeeId'|'periodStart'|'periodEnd'|'recordedHours'|'breakHours'|'recordedNanoseconds'|'breakNanoseconds'|'revision'|'sourceHash'|'constant';
export type ExportColumn={header:string;source:MappingSource;constant?:string};
export type ExportProfile={version:1;name:string;product:string;format:'CUSTOM_CSV'|'ADP_RUN_GENERIC_V1';dateFormat:'ISO'|'US';hourDecimals:number;precision:'REJECT_INEXACT'|'HALF_UP';verifiedRequirements:string;reviewedTimeBasis:true;columns:ExportColumn[];employeeMappings:{employeeId:string;providerEmployeeId:string}[]};
export const mappingSources:MappingSource[]=['employeeId','employeeName','providerEmployeeId','periodStart','periodEnd','recordedHours','breakHours','recordedNanoseconds','breakNanoseconds','revision','sourceHash','constant'];
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=200):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&v===v.trim()&&!/[\u0000-\u001f\u007f]/.test(v);
const safeImport=(s:string)=>!/^\s*[=+@-]/.test(s);
/** Revalidate 1–100 selected cards as currently finalized, with matching source hashes
 * and one shared time zone. Produces stable employee ordering without persistence
 * or authorization; the service owns current company access and receipt creation. */
export function canonicalPayrollExport(workspaceId:string,observedAt:string,period:Period,cards:unknown,employeeIds:readonly string[],paging?:CompleteReadManifest):CanonicalPayrollExport{
 if(!text(workspaceId)||employeeIds.length<1||employeeIds.length>100||employeeIds.some(id=>!text(id))||new Set(employeeIds).size!==employeeIds.length)throw new Error('Choose 1 to 100 distinct employees');
 const normalizedPeriod=parsePeriod(period.startDate,period.endDate);
 const parsed=parseTimecardsResponse({observedAt,cards,...(paging?{paging}:{})},normalizedPeriod);
 const selected=employeeIds.map(id=>{const c=parsed.cards.find(c=>c.card.employeeId===id);if(!c)throw new Error('Employee unavailable in this workspace');return c;});
 if(selected.some(c=>c.state!=='FINALIZED'||c.card.issues.length||c.history[0]?.action!=='FINALIZE'||c.history[0].sourceHash!==c.sourceHash))throw new Error('Every selected timecard must have a current finalized revision');
 const zones=new Set(selected.map(c=>c.card.timeZone));if(zones.size!==1)throw new Error('Inconsistent export timezone');
 return {version:1,workspaceId,timeZone:selected[0].card.timeZone,period:normalizedPeriod,timeBasis:'RECORDED_ELAPSED_INCLUDING_BREAKS',rows:selected.sort((a,b)=>a.card.employeeId.localeCompare(b.card.employeeId)).map(c=>({employeeId:c.card.employeeId,employeeName:c.card.employeeName,revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId,recordedNanoseconds:c.card.recordedNanoseconds,breakNanoseconds:c.card.breakNanoseconds,entries:c.card.entries.map(e=>{const single=projectTimecard({...c.source,entries:[e],pendingCorrections:0,corrections:[]},observedAt);return {...e,recordedNanoseconds:single.recordedNanoseconds,breakNanoseconds:single.breakNanoseconds};})}))};
}
export function parseExportProfile(v:unknown):ExportProfile{
 if(!object(v)||v.version!==1||!text(v.name,120)||!text(v.product,120)||typeof v.format!=='string'||!['CUSTOM_CSV','ADP_RUN_GENERIC_V1'].includes(v.format)||typeof v.dateFormat!=='string'||!['ISO','US'].includes(v.dateFormat)||!Number.isSafeInteger(v.hourDecimals)||Number(v.hourDecimals)<0||Number(v.hourDecimals)>9||typeof v.precision!=='string'||!['REJECT_INEXACT','HALF_UP'].includes(v.precision)||!text(v.verifiedRequirements,600)||v.reviewedTimeBasis!==true||!Array.isArray(v.columns)||v.columns.length<1||v.columns.length>20||!Array.isArray(v.employeeMappings)||v.employeeMappings.length>100||Object.keys(v).some(k=>!['version','name','product','format','dateFormat','hourDecimals','precision','verifiedRequirements','reviewedTimeBasis','columns','employeeMappings'].includes(k)))throw new Error('Verify the import requirements, fields and time basis');
 const columns=v.columns.map((c):ExportColumn=>{if(!object(c)||!text(c.header,80)||!safeImport(c.header)||typeof c.source!=='string'||!mappingSources.includes(c.source as MappingSource)||Object.keys(c).some(k=>!['header','source','constant'].includes(k))||(c.source==='constant'&&!(c.constant===''||text(c.constant,100)))||(c.constant!==undefined&&c.source!=='constant')||(typeof c.constant==='string'&&!safeImport(c.constant)))throw new Error('Invalid import column');return {header:c.header,source:c.source as MappingSource,...(c.source==='constant'?{constant:c.constant as string}:{})};});
 const employeeMappings=v.employeeMappings.map((m)=>{if(!object(m)||Object.keys(m).length!==2||!text(m.employeeId)||!text(m.providerEmployeeId,100)||!safeImport(m.providerEmployeeId))throw new Error('Invalid provider employee identifier');return {employeeId:m.employeeId,providerEmployeeId:m.providerEmployeeId};});
 if(new Set(columns.map(c=>c.header.toLowerCase())).size!==columns.length||new Set(employeeMappings.map(m=>m.employeeId)).size!==employeeMappings.length||new Set(employeeMappings.map(m=>m.providerEmployeeId)).size!==employeeMappings.length)throw new Error('Duplicate import column or employee identifier');
 const profile={...v,columns,employeeMappings} as ExportProfile;
 if(profile.format==='ADP_RUN_GENERIC_V1')validateAdp(profile);
 return profile;
}
/** Documented RUN generic v1 shape only; no assumed earnings/rate identifiers. */
export function adpRunColumns(companyCode='',payFrequency='',earningsCode='',rateCode=''):ExportColumn[]{return [
 {header:'IID',source:'constant',constant:companyCode},{header:'Pay Frequency',source:'constant',constant:payFrequency},{header:'Pay Period Start Date',source:'periodStart'},{header:'Pay Period End Date',source:'periodEnd'},
 {header:'Employee ID',source:'providerEmployeeId'},{header:'Earnings Code',source:'constant',constant:earningsCode},{header:'Pay Hours',source:'recordedHours'},
 {header:'Dollars',source:'constant',constant:''},{header:'Separate Check',source:'constant',constant:'0'},{header:'Worked In Dept',source:'constant',constant:''},{header:'Rate Code',source:'constant',constant:rateCode}];}
function validateAdp(p:ExportProfile){
 const expected=adpRunColumns();if(p.dateFormat!=='US'||p.hourDecimals!==2||p.columns.length!==expected.length||p.columns.some((c,i)=>c.header!==expected[i].header||c.source!==expected[i].source))throw new Error('RUN generic v1 columns or formats do not match verified documentation');
 const constant=(i:number)=>p.columns[i].constant??'';
 if(!/^[A-Za-z0-9]{1,10}$/.test(constant(0))||!['B','W','S','M','Q'].includes(constant(1))||!text(constant(5),10)||!text(constant(10),10)||constant(7)!==''||!/^[0-9]$/.test(constant(8))||!/^\d{0,6}$/.test(constant(9))||p.employeeMappings.some(m=>m.providerEmployeeId.length>15||!/^[A-Za-z0-9]+$/.test(m.providerEmployeeId)))throw new Error('Verify RUN company, frequency, employee, earnings, department and rate codes');
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
/** Apply a validated mapping and its explicit precision policy. Missing provider IDs
 * fail the entire file; RUN output uses its marker while custom CSV starts with BOM. */
export function mappedPayrollCsv(model:CanonicalPayrollExport,input:ExportProfile):string{
 const profile=parseExportProfile(input);const date=(d:string)=>profile.dateFormat==='US'?`${d.slice(5,7)}/${d.slice(8,10)}/${d.slice(0,4)}`:d;
 const rows=model.rows.map(row=>profile.columns.map(column=>{
  switch(column.source){
   case 'constant':return column.constant??'';
   case 'providerEmployeeId':{const id=profile.employeeMappings.find(m=>m.employeeId===row.employeeId)?.providerEmployeeId;if(!id)throw new Error(`Provider identifier required for ${row.employeeName}`);return id;}
   case 'periodStart':return date(model.period.startDate);case 'periodEnd':return date(model.period.endDate);
   case 'recordedHours':{const hours=decimalHours(row.recordedNanoseconds,profile.hourDecimals,profile.precision);if(profile.format==='ADP_RUN_GENERIC_V1'&&hours.length>11)throw new Error('RUN hours exceed documented field width');return hours;}
   case 'breakHours':return decimalHours(row.breakNanoseconds,profile.hourDecimals,profile.precision);
   default:return row[column.source];
  }
 }));
 return (profile.format==='ADP_RUN_GENERIC_V1'?'##GENERIC## V1.0\r\n':'\uFEFF')+csvDocument([profile.columns.map(c=>c.header),...rows]);
}
export function neutralProfile():ExportProfile{return {version:1,name:'NEVORA normalized time',product:'Provider neutral',format:'CUSTOM_CSV',dateFormat:'ISO',hourDecimals:9,precision:'REJECT_INEXACT',verifiedRequirements:'NEVORA canonical time CSV v1; no provider compatibility claim.',reviewedTimeBasis:true,employeeMappings:[],columns:[{header:'Employee ID',source:'employeeId'},{header:'Employee',source:'employeeName'},{header:'Period start',source:'periodStart'},{header:'Period end',source:'periodEnd'},{header:'Recorded nanoseconds',source:'recordedNanoseconds'},{header:'Break nanoseconds',source:'breakNanoseconds'},{header:'Finalized revision',source:'revision'},{header:'Source fingerprint',source:'sourceHash'}]};}
export type ExportCard=TimecardItem;
