import {expect,it} from 'vitest';
import {filterNotifications,groupNotifications} from './notification-inbox-view';
import type {EmployeeNotificationItem} from './employee-view';

const rows:EmployeeNotificationItem[]=[
 {id:'read-required',label:'Schedule update',at:'2026-10-12T14:00:00Z',href:'/app/notifications/open?notificationId=read-required',reviewState:'read',actionState:'required'},
 {id:'unread-complete',label:'Time off update',at:'2026-10-11T14:00:00Z',href:'/app/notifications/open?notificationId=unread-complete',reviewState:'unread',actionState:'complete'},
 {id:'unknown',label:'Team update',at:'2026-10-12T16:00:00Z',href:'/app/notifications/open?notificationId=unknown',reviewState:'unavailable',actionState:'unavailable'},
];
it('does not confuse read status, completion, or unknown status with a required action',()=>{
 expect(filterNotifications(rows,'required','').map(row=>row.id)).toEqual(['read-required']);
 expect(filterNotifications(rows,'unread','').map(row=>row.id)).toEqual(['unread-complete']);
 expect(filterNotifications(rows,'all','').map(row=>row.id)).toEqual(rows.map(row=>row.id));
});
it('keeps search within the selected view and never mutates private snapshots',()=>{
 const before=structuredClone(rows);
 expect(filterNotifications(rows,'all','  SCHEDULE ').map(row=>row.id)).toEqual(['read-required']);
 expect(filterNotifications(rows,'unread','schedule')).toEqual([]);
 expect(filterNotifications(rows,'all','  ')).toEqual(rows);
 groupNotifications(rows);
 expect(rows).toEqual(before);
});
it('groups dates in chronological order while preserving every notification',()=>{
 const groups=groupNotifications(rows);
 expect(groups).toHaveLength(2);
 expect(groups.flatMap(group=>group.items.map(item=>item.id))).toEqual(['unknown','read-required','unread-complete']);
});
