import type {ManagerReminderCommand} from './types';
export const reminderUuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
/** Closed contract: one recipient, exact required-action source, no delivery knobs. */
export function validManagerReminderCommand(value:unknown):value is ManagerReminderCommand{
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const c=value as Record<string,unknown>,extra=c.kind==='AVAILABILITY'?['weekStart','expectedDeadline']:c.kind==='COMMUNICATION'?['communicationId','expectedRevisionId']:[];
 const keys=['kind','operationId','authority','employeeId',...extra];
 if(extra.length===0||Object.keys(c).length!==keys.length||Object.keys(c).some(k=>!keys.includes(k))||!reminderUuid(c.operationId)||typeof c.authority!=='string'||!/^[a-f0-9]{64}$/.test(c.authority)||typeof c.employeeId!=='string'||!/^[A-Za-z0-9_-]{1,200}$/.test(c.employeeId))return false;
 if(c.kind==='COMMUNICATION')return reminderUuid(c.communicationId)&&reminderUuid(c.expectedRevisionId);
 if(typeof c.weekStart!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(c.weekStart)||typeof c.expectedDeadline!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(c.expectedDeadline))return false;
 const week=new Date(c.weekStart+'T00:00:00Z'),deadline=new Date(c.expectedDeadline);
 return Number.isFinite(week.getTime())&&week.toISOString().slice(0,10)===c.weekStart&&week.getUTCDay()===1&&Number.isFinite(deadline.getTime())&&deadline.toISOString()===c.expectedDeadline;
}
