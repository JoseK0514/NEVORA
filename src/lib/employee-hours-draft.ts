import {Temporal} from '@js-temporal/polyfill';
import type {CorrectionContext,EmployeeTimeCorrections} from './time-corrections/read-model';
import {hoursInstant,hoursLocalValue,parseHoursCorrection,type HoursCorrectionPayload} from './employee-hours';
export type HoursDraft={basis:string;startDate:string;startTime:string;endDate:string;endTime:string;reason:string;locationId:string};
export type HoursEdit={key:string;kind:'ENTRY_BOUNDARY'|'BREAK_BOUNDARY'|'MISSING_ENTRY';entryId?:string;breakId?:string;locationId?:string;adjustmentId?:string;revision?:number;recordedStartAt:string|null;recordedEndAt:string|null;context:CorrectionContext};
export function resolveHoursEdit(snapshot:Extract<EmployeeTimeCorrections,{state:'ready'}>,key:string):HoursEdit|null{
 if(key==='new')return {key,kind:'MISSING_ENTRY',recordedStartAt:null,recordedEndAt:null,context:{state:'none'}};
 const target=snapshot.targets.find(t=>(t.kind==='ENTRY_BOUNDARY'?'entry:'+t.timeEntryId:'break:'+t.timeEntryId+':'+t.breakEntryId)===key);
 if(target)return {key,kind:target.kind,entryId:target.timeEntryId,breakId:target.breakEntryId??undefined,recordedStartAt:target.recordedStartAt,recordedEndAt:target.recordedEndAt,context:target.context};
 const request=key.startsWith('missing:')?snapshot.requests.find(r=>r.id===key.slice(8)):null;
 if(request?.kind==='MISSING_ENTRY'&&request.status==='APPROVED'&&request.currentAdjustmentId&&!request.baseChanged&&request.context.state==='confirmed'&&snapshot.locations.some(l=>l.id===request.locationId))return {key,kind:'MISSING_ENTRY',locationId:request.locationId,adjustmentId:request.currentAdjustmentId,revision:request.revision,recordedStartAt:null,recordedEndAt:null,context:request.context};
 return null;
}
export function initialHoursDraft(info:HoursEdit,basis:string,zone:string,locations:{id:string}[]):HoursDraft{
 const start=info.context.state==='confirmed'?hoursLocalValue(info.context.startAt,zone).split('T'):['',''],end=info.context.state==='confirmed'?hoursLocalValue(info.context.endAt,zone).split('T'):['',''];
 return {basis,startDate:start[0],startTime:start[1],endDate:end[0],endTime:end[1],reason:'',locationId:info.locationId??(locations.length===1?locations[0].id:'')};
}
export function buildHoursProposal(draft:HoursDraft,info:HoursEdit,operationId:string,zone:string):{payload:HoursCorrectionPayload|null;error:{field:keyof HoursDraft;message:string}|null}{
 const invalid=(field:keyof HoursDraft,message:string)=>({payload:null,error:{field,message}});
 if(info.kind==='MISSING_ENTRY'&&!draft.locationId)return invalid('locationId','Choose the location where you worked.');
 for(const field of ['startDate','startTime','endDate','endTime'] as const)if(!draft[field])return invalid(field,'Choose a '+(field.endsWith('Date')?'date.':'time.'));
 for(const field of ['startDate','endDate'] as const){try{Temporal.PlainDate.from(draft[field],{overflow:'reject'});}catch{return invalid(field,'Choose a valid date.');}}
 let proposedStartAt:string,proposedEndAt:string;
 const start=draft.startDate+'T'+draft.startTime,end=draft.endDate+'T'+draft.endTime;
 try{proposedStartAt=info.context.state==='confirmed'&&hoursLocalValue(info.context.startAt,zone)===start?info.context.startAt:hoursInstant(start,zone);}catch{return invalid('startTime','Choose a valid, unambiguous start date and time.');}
 try{proposedEndAt=info.context.state==='confirmed'&&hoursLocalValue(info.context.endAt,zone)===end?info.context.endAt:hoursInstant(end,zone);}catch{return invalid('endTime','Choose a valid, unambiguous end date and time.');}
 if(Date.parse(proposedEndAt)<=Date.parse(proposedStartAt))return invalid('endTime','The end must be after the start. Check the end date for overnight work.');
 const reason=draft.reason.trim();if(!reason||reason.length>500||/[\u0000-\u001f\u007f]/.test(reason))return invalid('reason','Enter a brief reason on one line, up to 500 characters.');
 const common={operationId,proposedStartAt,proposedEndAt,reason},command=info.kind==='ENTRY_BOUNDARY'?{...common,kind:'ENTRY_BOUNDARY',timeEntryId:info.entryId}:info.kind==='BREAK_BOUNDARY'?{...common,kind:'BREAK_BOUNDARY',timeEntryId:info.entryId,breakEntryId:info.breakId}:{...common,kind:'MISSING_ENTRY',locationId:draft.locationId,...(info.adjustmentId?{targetAdjustmentId:info.adjustmentId,expectedBaseRevision:info.revision}:{})};
 const payload=parseHoursCorrection({basis:draft.basis,command});return payload?{payload,error:null}:invalid('reason','Review your proposed times and reason before sending.');
}
