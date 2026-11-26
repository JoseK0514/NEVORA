import {expect,it} from '@rstest/core';
import {collapseNotifications,filterNotifications,groupNotifications,notificationPresentation,notificationTitle} from './notification-inbox-view';
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

it.each(['Can’t-work update','Unable to work update','Callout update'])('preserves callout presentation for current and stored label %s',label=>{
 expect(notificationPresentation(label)).toEqual({icon:'callout',destination:'Review your can’t-work request',action:'View can’t-work request'});
});
it.each(['Time-off update','Time off update'])('preserves time-off presentation for current and stored label %s',label=>{
 expect(notificationPresentation(label)).toEqual({icon:'timeOff',destination:'Review your time-off request',action:'View request'});
});

// BR-6 (Nov 14, 2026): a row says what it is about from the fields the list carries.
it('titles a manager summary by what it gathers, since the list carries no counts or names',()=>{
 expect(notificationTitle({label:'Operations need review'})).toEqual({title:'Things to do are waiting for you',detail:'Open shifts, requests or missing availability'});
 expect(filterNotifications([{id:'summary',label:'Operations need review',at:'2026-11-14T12:00:00Z',href:'/app/notifications/open?notificationId=summary'}],'all','things to do').map(row=>row.id)).toEqual(['summary']);
});
it('adds the dates a row is about when the list carries them, and never guesses a kind from its words',()=>{
 expect(notificationTitle({label:'Schedule update',subject:{kind:'scheduleWeek',startDate:'2026-11-09',endDate:'2026-11-15'}})).toEqual({title:'Schedule update',detail:'Week of Nov 9–15'});
 expect(notificationTitle({label:'Time-off update',subject:{kind:'requestDate',startDate:'2026-11-30',endDate:'2026-12-02'}})).toEqual({title:'Time-off update',detail:'Nov 30–Dec 2'});
 expect(notificationTitle({label:'Time-off update',subject:{kind:'requestDate',startDate:'2026-11-30',endDate:'2026-11-30'}}).detail).toBe('Nov 30');
 expect(notificationTitle({label:'Team update',subject:null})).toEqual({title:'Team update',detail:null});
 expect(notificationTitle({label:'toString'})).toEqual({title:'toString',detail:null});
 expect(notificationTitle({label:'Operations'})).toEqual({title:'Operations',detail:null});
});

// Phase 3 (OW-002): repeats of one summary read as one row.
it('folds rows that follow each other with the same kind, and keeps which are unread',()=>{
 const summary=(id:string,at:string,reviewState:'read'|'unread'):EmployeeNotificationItem=>({id,label:'Operations need review',at,href:'/app/notifications/open?notificationId='+id,reviewState,actionState:'available'});
 const list=[summary('a','2026-11-15T14:00:00Z','unread'),summary('b','2026-11-15T13:00:00Z','read'),summary('c','2026-11-15T12:00:00Z','unread'),rows[0],summary('d','2026-11-14T12:00:00Z','read')];
 const folded=collapseNotifications(list);
 expect(folded.map(row=>[row.item.id,row.count,row.unreadIds])).toEqual([['a',3,['a','c']],['read-required',1,[]],['d',1,[]]]);
 // Jose (Nov 15, 2026, item 8): the fold keeps every notification it holds, so opening it can list each one.
 expect(folded[0].items.map(item=>item.id)).toEqual(['a','b','c']);
});
it('never folds rows that carry their own dates or are of different kinds',()=>{
 const dated=(id:string):EmployeeNotificationItem=>({id,label:'Time-off update',at:'2026-11-15T14:00:00Z',href:'/app/requests',reviewState:'read',actionState:'none',subject:{kind:'requestDate',startDate:'2026-11-26',endDate:'2026-11-26'}});
 expect(collapseNotifications([dated('a'),dated('b')]).map(row=>row.count)).toEqual([1,1]);
 expect(collapseNotifications(rows).map(row=>row.count)).toEqual([1,1,1]);
});

it('finds the translated title in a Spanish notification search',()=>{
 const item={id:'summary',label:'Operations need review',at:'2026-11-14T12:00:00Z',href:'/app/notifications/open?notificationId=summary'};
 expect(filterNotifications([item],'all','Pendientes','es')).toEqual([item]);
 expect(filterNotifications([item],'unread','Pendientes','es')).toEqual([]);
 expect(filterNotifications([item],'all','Pendientes')).toEqual([]);
});
