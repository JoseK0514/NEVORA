import type {ExchangeRecord} from './data/exchanges';
export type ExchangeCounts={open:number|null;forYou:number|null};
export function parseExchangeCounts(value:unknown):ExchangeCounts{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid exchange counts');
 const v=value as Record<string,unknown>;
 if(Object.keys(v).length!==2||!['open','forYou'].every(k=>Object.hasOwn(v,k)&&(v[k]===null||Number.isSafeInteger(v[k])&&Number(v[k])>=0)))throw Error('Invalid exchange counts');
 return {open:v.open as number|null,forYou:v.forYou as number|null};
}
/** Counts are available rows, not a promise that an eventual claim passes all rules. */
export function projectExchangeCounts(coverage:ExchangeRecord[]|null,incoming:ExchangeRecord[]|null,own:string,locationIds:readonly string[]):ExchangeCounts{
 const allowed=new Set(locationIds),scoped=(r:ExchangeRecord)=>allowed.has(r.sourceShift.locationId)&&(!r.targetShift||allowed.has(r.targetShift.locationId));
 return {open:coverage===null?null:coverage.filter(r=>scoped(r)&&r.kind==='COVERAGE'&&r.status==='OPEN'&&r.requestedByEmployeeId!==own&&r.actionable&&Number.isSafeInteger(r.requestRevision)&&r.requestRevision!>0).length,
 forYou:incoming===null?null:incoming.filter(r=>scoped(r)&&r.kind==='SWAP'&&r.status==='EMPLOYEE_PENDING'&&r.targetEmployeeId===own&&r.requestedByEmployeeId!==own).length};
}
