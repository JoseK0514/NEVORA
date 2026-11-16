/** Browser-safe PAYROLL_EXPORT_V1 command parsing; no database or session imports. */
import {parsePeriod,type Period} from '../timecards/project';
import {parsePaidTimeReview,type PaidTimeReview} from './paid-time';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
export type ExportCommand=Period&{operationId:string;profileId:string|null;profileRevision:number;cards:{employeeId:string;revision:number;sourceHash:string;finalizationOperationId:string}[];paidTime?:PaidTimeReview};
export function parseExportCommand(v:unknown):ExportCommand{
 if(!object(v)||!uuid(v.operationId)||!(v.profileId===null||uuid(v.profileId))||!Number.isSafeInteger(v.profileRevision)||Number(v.profileRevision)<0||!Array.isArray(v.cards)||v.cards.length<1||v.cards.length>100||Object.keys(v).some(k=>!['operationId','profileId','profileRevision','startDate','endDate','cards','paidTime'].includes(k)))throw new Error('Invalid export command');
 if(v.profileId===null&&v.profileRevision!==0)throw new Error('Invalid neutral profile');
 const cards=v.cards.map(c=>{if(!object(c)||typeof c.employeeId!=='string'||!c.employeeId||c.employeeId.length>200||!Number.isSafeInteger(c.revision)||Number(c.revision)<1||!hash(c.sourceHash)||!uuid(c.finalizationOperationId)||Object.keys(c).length!==4)throw new Error('Review finalized employee revisions');return {employeeId:c.employeeId,revision:Number(c.revision),sourceHash:c.sourceHash,finalizationOperationId:c.finalizationOperationId};});
 if(new Set(cards.map(c=>c.employeeId)).size!==cards.length)throw new Error('Duplicate export employees');
 return {...parsePeriod(String(v.startDate),String(v.endDate)),operationId:v.operationId,profileId:v.profileId,profileRevision:Number(v.profileRevision),cards:cards.sort((a,b)=>a.employeeId.localeCompare(b.employeeId)),...(v.paidTime!==undefined?{paidTime:parsePaidTimeReview(v.paidTime)}:{})};
}
