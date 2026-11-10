import {randomUUID} from 'node:crypto';
import {businessDate} from '../business-time';
import {nextRoutineTime,notificationPolicyFor,notificationEventKey,reminderItemKey} from '../notifications/policy';
import {buildAvailabilityReminderNotification} from '../assistance/notification-events';
import type {NotificationIntent} from '../notifications/types';
/** Manual reminders share the worker's quiet hours and recipient/source/day budget. */
export function planManagerReminder(source:{kind:'AVAILABILITY'|'COMMUNICATION';id:string;version:string;employeeId:string;expiresAt:string},now:Date,timeZone:string):NotificationIntent|null{
 const due=nextRoutineTime(now,notificationPolicyFor(timeZone));
 if(!Number.isFinite(Date.parse(source.expiresAt))||due.getTime()>=Date.parse(source.expiresAt))return null;
 const event=source.kind==='AVAILABILITY'?buildAvailabilityReminderNotification(source.employeeId,source.id):{employeeId:source.employeeId,type:'COMMUNICATION',title:'New team update',body:'Open NEVORA to read it.',actionHref:`/app/updates/${source.id}`,eventKey:''};
 const intent:NotificationIntent={...event,id:randomUUID(),environment:'test',source:{kind:source.kind,id:source.id,version:source.version},effectiveVersion:source.version,purpose:'REMINDER',urgency:'normal',dueAt:due.toISOString(),expiresAt:source.expiresAt};
 const day=businessDate(due,timeZone);intent.eventKey=`${notificationEventKey(intent)}:${day}`;intent.itemKeys=[reminderItemKey(intent,day)];return intent;
}
