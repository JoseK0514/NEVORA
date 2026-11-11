import {parseExchangeCounts,type ExchangeCounts} from './exchange-counts';
export type OpenEmployeeShift = {
 id:string;revision:number;date:string;startTime:string;endTime:string;location:string;position:string|null;
 check:'eligible'|'refused'|'unavailable';notice:string|null;outcome:'completed'|'pending'|null;
};
/** `endDate`, `startTime` and `endTime` belong to time off only (its last day and a part-day's hours); null for the others. */
export type OwnRequest = {id:string;kind:'timeOff'|'shift'|'callout';status:string;date:string;endDate:string|null;startTime:string|null;endTime:string|null;createdAt:string};
export type EmployeeRequestsSnapshot = {
 state:'ready';kind:'requests';exchangeCounts?:ExchangeCounts;deviceAlerts?:boolean|null;deviceAlertsAvailable?:boolean;authority:string;observedAt:string;validForMs:number;timeZone:string;
 modules:{timeOff:boolean;marketplace:boolean};open:OpenEmployeeShift[]|null;recent:OwnRequest[]|null;incoming:number|null;
}|{state:'unavailable';reason:'read_failed'|'access_denied'};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const text=(v:unknown,max=200):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'));
const instant=(v:unknown)=>typeof v==='string'&&!Number.isNaN(Date.parse(v));
const time=(v:unknown)=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(v);
const unavailable=():EmployeeRequestsSnapshot=>({state:'unavailable',reason:'read_failed'});
/** Strict minimal projection. Raw employee, reasons, policy and source rows are never a client contract. */
export function parseEmployeeRequests(value:unknown):EmployeeRequestsSnapshot {
 if(!object(value))return unavailable();
 if(Object.hasOwn(value,'exchangeCounts')){try{parseExchangeCounts(value.exchangeCounts);}catch{return unavailable();}}
 if(Object.hasOwn(value,'deviceAlerts')&&(value.deviceAlerts!==null&&typeof value.deviceAlerts!=='boolean'||typeof value.deviceAlertsAvailable!=='boolean'))return unavailable();
 if(Object.hasOwn(value,'deviceAlertsAvailable')&&!Object.hasOwn(value,'deviceAlerts'))return unavailable();
 if(value.state==='unavailable')return keys(value,['state','reason'])&&['read_failed','access_denied'].includes(String(value.reason))?value as Extract<EmployeeRequestsSnapshot,{state:'unavailable'}>:unavailable();
 if(!keys(value,['state','kind',...(['exchangeCounts','deviceAlerts','deviceAlertsAvailable'].filter(k=>Object.hasOwn(value,k))),'authority','observedAt','validForMs','timeZone','modules','open','recent','incoming'])||value.state!=='ready'||value.kind!=='requests'
  ||typeof value.authority!=='string'||!/^[a-f0-9]{64}$/.test(value.authority)||!instant(value.observedAt)||!Number.isSafeInteger(value.validForMs)||Number(value.validForMs)<1||Number(value.validForMs)>45000||!text(value.timeZone))return unavailable();
 try{new Intl.DateTimeFormat('en-US',{timeZone:value.timeZone});}catch{return unavailable();}
 if(!object(value.modules)||!keys(value.modules,['timeOff','marketplace'])||typeof value.modules.timeOff!=='boolean'||typeof value.modules.marketplace!=='boolean')return unavailable();
 if(value.open!==null&&(!Array.isArray(value.open)||!value.open.every(row=>object(row)&&keys(row,['id','revision','date','startTime','endTime','location','position','check','notice','outcome'])
  &&text(row.id)&&Number.isSafeInteger(row.revision)&&Number(row.revision)>0&&date(row.date)&&time(row.startTime)&&time(row.endTime)&&text(row.location)
  &&(row.position===null||text(row.position))&&['eligible','refused','unavailable'].includes(String(row.check))&&(row.notice===null||text(row.notice,1000))
  &&(row.check==='eligible'?['completed','pending'].includes(String(row.outcome)):row.outcome===null))))return unavailable();
 if(value.recent!==null&&(!Array.isArray(value.recent)||!value.recent.every(row=>object(row)&&keys(row,['id','kind','status','date','endDate','startTime','endTime','createdAt'])&&text(row.id)&&['timeOff','shift','callout'].includes(String(row.kind))&&text(row.status)&&date(row.date)&&instant(row.createdAt)
  &&(row.kind==='timeOff'?date(row.endDate)&&String(row.endDate)>=String(row.date)&&(row.startTime===null&&row.endTime===null||time(row.startTime)&&time(row.endTime)):row.endDate===null&&row.startTime===null&&row.endTime===null))))return unavailable();
 if(value.incoming!==null&&(!Number.isSafeInteger(value.incoming)||Number(value.incoming)<0))return unavailable();
 if(!value.modules.marketplace&&value.exchangeCounts!==undefined){const counts=parseExchangeCounts(value.exchangeCounts);if(counts.open!==0||counts.forYou!==0)return unavailable();}
 if(!value.modules.marketplace&&(value.incoming!==0||value.open===null||value.open.length||Array.isArray(value.recent)&&value.recent.some(row=>row.kind!=='timeOff')))return unavailable();
 if(!value.modules.timeOff&&Array.isArray(value.recent)&&value.recent.some(row=>row.kind==='timeOff'))return unavailable();
 return value as EmployeeRequestsSnapshot;
}
