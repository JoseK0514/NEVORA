import {Temporal} from '@js-temporal/polyfill';
import {isValidIsoDate,addDays} from '../date-utils';

export type RequestStatus='PENDING'|'OPEN'|'EMPLOYEE_PENDING'|'MANAGER_PENDING'|'APPROVED'|'DENIED'|'CANCELLED'|'EXPIRED';
export type RequestShift={date:string;endDate:string;startTime:string;endTime:string;locationName:string;timeZone:string};
export type ActionRequestFacts={exchangeKind?:'SWAP'|'COVERAGE';startDate:string;endDate:string;partialDay?:{start:string;end:string};lengthText:string;locationName:string;note?:string;counterpartName?:string;reviewHref:string;
 status?:RequestStatus;createdAt?:string;shift?:RequestShift;
 counterpartShift?:({state:'ready'}&RequestShift)|{state:'unavailable';reason:'details_unavailable'};
};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=200):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const clock=(v:unknown,end=false):v is string=>typeof v==='string'&&(/^([01]\d|2[0-3]):[0-5]\d$/.test(v)||end&&v==='24:00');
export function requestShift(date:string,startTime:string,endTime:string,locationName:string,timeZone:string):RequestShift {
 if(!isValidIsoDate(date)||!clock(startTime)||!clock(endTime,true)||startTime===endTime||!text(locationName)||!text(timeZone))throw Error('Invalid request shift');
 Temporal.Instant.from('2000-01-01T00:00:00Z').toZonedDateTimeISO(timeZone);
 return {date,endDate:endTime<startTime||endTime==='24:00'?addDays(date,1):date,startTime,endTime,locationName,timeZone};
}
export function validateRequestFacts(value:ActionRequestFacts) {
 if(!object(value)||Object.keys(value).some(k=>!['exchangeKind','startDate','endDate','partialDay','lengthText','locationName','note','counterpartName','reviewHref','status','createdAt','shift','counterpartShift'].includes(k))||
  value.exchangeKind!==undefined&&value.exchangeKind!=='SWAP'&&value.exchangeKind!=='COVERAGE'||
  !isValidIsoDate(value.startDate)||!isValidIsoDate(value.endDate)||value.endDate<value.startDate||!text(value.lengthText)||!text(value.locationName)||
  value.counterpartName!==undefined&&!text(value.counterpartName)||value.note!==undefined&&(typeof value.note!=='string'||value.note.length>3000)||
  typeof value.reviewHref!=='string'||!/^\/app\/(requests|exchange)\?/.test(value.reviewHref)||/[\\\u0000-\u001f\u007f]/.test(value.reviewHref))throw Error('Invalid request facts');
 if(value.partialDay!==undefined){const p=value.partialDay;if(!object(p)||Object.keys(p).sort().join(',')!=='end,start'||!clock(p.start)||!clock(p.end,true))throw Error('Invalid request facts');}
 if(value.status!==undefined&&!['PENDING','OPEN','EMPLOYEE_PENDING','MANAGER_PENDING','APPROVED','DENIED','CANCELLED','EXPIRED'].includes(value.status))throw Error('Invalid request facts');
 if(value.createdAt!==undefined){try{Temporal.Instant.from(value.createdAt);}catch{throw Error('Invalid request facts');}}
 const shift=(s:RequestShift,extra:string[]=[])=>{
  if(!object(s)||Object.keys(s).sort().join(',')!==['date','endDate','endTime','locationName','startTime','timeZone',...extra].sort().join(','))throw Error('Invalid request facts');
  const expected=requestShift(s.date,s.startTime,s.endTime,s.locationName,s.timeZone);
  if(s.endDate!==expected.endDate)throw Error('Invalid request facts');
 };
 if(value.shift!==undefined)shift(value.shift);
 if(value.counterpartShift!==undefined){
  const c=value.counterpartShift;if(value.exchangeKind!=='SWAP'||!object(c))throw Error('Invalid request facts');
  if(c.state==='ready')shift(c,['state']);
  else if(c.state!=='unavailable'||c.reason!=='details_unavailable'||Object.keys(c).sort().join(',')!=='reason,state')throw Error('Invalid request facts');
 }

}
