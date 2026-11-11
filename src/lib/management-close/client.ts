import {Temporal} from '@js-temporal/polyfill';
import type {ManagementCloseContext,ManagementCloseCommand,ManagementCloseReceipt} from './contracts';
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=200):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&v===v.trim()&&!/[\p{Cc}\p{Cf}]/u.test(v);
const date=(v:unknown):v is string=>text(v,100)&&Number.isFinite(Date.parse(v));
export function parseCloseContext(value:unknown,entryId:string):ManagementCloseContext {
 if(!object(value))throw Error('Invalid close context');
 if(value.state==='closed')return {state:'closed'};
 if(value.state==='unavailable'&&['access_denied','read_failed','schema_missing'].includes(String(value.reason)))return {state:'unavailable',reason:value.reason as 'access_denied'|'read_failed'|'schema_missing'};
 const target=value.target;
 if(value.state!=='ready'||!date(value.observedAt)||!Number.isFinite(value.validForMs)||Number(value.validForMs)<=0||Number(value.validForMs)>15000||
   !text(value.authority)||!/^[a-f0-9]{64}$/.test(value.authority)||!text(value.sourceHash)||!/^[a-f0-9]{32}$/.test(value.sourceHash)||
   !object(target)||target.timeEntryId!==entryId||!text(target.employeeName,300)||!text(target.locationName,300)||!date(target.clockInAt)||
   !(target.openBreakStartedAt===null||date(target.openBreakStartedAt)))throw Error('Invalid close context');
 return {state:'ready',observedAt:value.observedAt,validForMs:Number(value.validForMs),authority:value.authority,sourceHash:value.sourceHash,
   target:{timeEntryId:entryId,employeeName:target.employeeName,locationName:target.locationName,clockInAt:target.clockInAt,openBreakStartedAt:target.openBreakStartedAt}};
}
export function parseCloseReceipt(value:unknown,command:ManagementCloseCommand):ManagementCloseReceipt {
 if(!object(value)||value.status!=='closed'||value.operationId!==command.operationId||value.timeEntryId!==command.timeEntryId||
   !date(value.closedAt)||!date(value.recordedAt)||Temporal.Instant.compare(Temporal.Instant.from(value.closedAt),Temporal.Instant.from(command.closedAt))!==0||
   !Number.isSafeInteger(value.entryVersion)||Number(value.entryVersion)<1||!Number.isSafeInteger(value.clockRevision)||Number(value.clockRevision)<1||
   !(value.endedBreakId===null||text(value.endedBreakId)))throw Error('Invalid close receipt');
 return {status:'closed',operationId:command.operationId,timeEntryId:command.timeEntryId,closedAt:value.closedAt,recordedAt:value.recordedAt,
   entryVersion:Number(value.entryVersion),clockRevision:Number(value.clockRevision),endedBreakId:value.endedBreakId};
}
