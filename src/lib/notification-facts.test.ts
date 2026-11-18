import {describe,expect,it} from '@rstest/core';
import type {EmployeeNotificationItem} from './employee-view';
import {notificationCountNote,notificationKindFor,notificationName,notificationOutcomeNote} from './notification-facts';
import {collapseNotifications,notificationPresentation,notificationTitle} from './notification-inbox-view';
import {notificationTitle as employeeTitle} from '../components/employee-mobile/notifications-list';

// Backend contract (Nov 15, 2026): authorized list items may carry eventType, outcome, names and count.
const row=(over:Partial<EmployeeNotificationItem>):EmployeeNotificationItem=>({id:'n1',label:'Time off approved',at:'2026-11-15T14:00:00Z',href:'/app/notifications/open?notificationId=n1',reviewState:'unread',actionState:'none',...over});

describe('notification facts become words only when the list sends them',()=>{
 it('takes the kind from the event type, so the new event labels keep their icon and destination',()=>{
  expect(notificationKindFor(row({eventType:'TIME_OFF_APPROVED'}))).toBe('TIME_OFF');
  expect(notificationKindFor(row({label:'Swap request',eventType:'SWAP_RESPONSE_REQUIRED'}))).toBe('EXCHANGE');
  expect(notificationKindFor(row({label:'Schedule update'}))).toBe('SCHEDULE');
  expect(notificationKindFor(row({label:'Something new'}))).toBeNull();
  expect(notificationPresentation('Items need review','MANAGER_REVIEW').icon).toBe('operations');
  // A coverage summary for a manager is a summary, not a shift request (found in the browser, Nov 15, 2026).
  expect(notificationKindFor(row({label:'Operations need review',eventType:'COVERAGE_ATTENTION'}))).toBeNull();
  expect(notificationPresentation('Operations need review','COVERAGE_ATTENTION').icon).toBe('operations');
  expect(notificationTitle(row({label:'Operations need review',eventType:'COVERAGE_ATTENTION',count:3})).title).toBe('Things to do are waiting for you');
  expect(notificationKindFor(row({label:'A shift needs cover',eventType:'COVERAGE_INVITATION'}))).toBe('EXCHANGE');
  expect(notificationPresentation('Time off approved','TIME_OFF_APPROVED').icon).toBe('timeOff');
 });
 it('says a decision notice’s request has moved on, and nothing for an unknown or matching status',()=>{
  expect(notificationOutcomeNote(row({eventType:'TIME_OFF_APPROVED',outcome:'CANCELLED'}))).toBe('Now cancelled');
  expect(notificationOutcomeNote(row({eventType:'TIME_OFF_APPROVED',outcome:'APPROVED'}))).toBeNull();
  expect(notificationOutcomeNote(row({eventType:'TIME_OFF_APPROVED',outcome:'SOMETHING_ELSE'}))).toBeNull();
  expect(notificationOutcomeNote(row({eventType:'SWAP_RESPONSE_REQUIRED',outcome:'MANAGER_PENDING'}))).toBeNull();
  expect(notificationOutcomeNote(row({eventType:'TIME_OFF_APPROVED'}))).toBeNull();
 });
 it('counts only what the list counts, and never turns a missing count into zero',()=>{
  expect(notificationCountNote(row({eventType:'SCHEDULE_PUBLISHED',count:3}))?.replace(/ /g,' ')).toBe('3 shifts');
  expect(notificationCountNote(row({eventType:'SCHEDULE_PUBLISHED',count:0}))).toBe('No shifts for you');
  expect(notificationCountNote(row({eventType:'MANAGER_REVIEW',count:5}))?.replace(/ /g,' ')).toBe('5 waiting');
  expect(notificationCountNote(row({eventType:'SCHEDULE_PUBLISHED',count:null}))).toBeNull();
  expect(notificationCountNote(row({eventType:'SCHEDULE_PUBLISHED'}))).toBeNull();
  expect(notificationCountNote(row({eventType:'TIME_OFF_APPROVED',count:2}))).toBeNull();
  expect(notificationName(row({names:['',' ','Ana Colon']}))).toBe('Ana Colon');
  expect(notificationName(row({}))).toBeNull();
 });
 it('Owner and Manager rows: the summary keeps its title and says how many wait; names and later status follow',()=>{
  const summary=notificationTitle(row({label:'Items need review',eventType:'MANAGER_REVIEW',count:5}));
  expect(summary.title).toBe('Things to do are waiting for you');
  expect(summary.detail?.replace(/ /g,' ')).toBe('5 waiting');
  // No count: the general line, as before.
  expect(notificationTitle(row({label:'Items need review',eventType:'MANAGER_REVIEW'})).detail).toBe('Open shifts, requests or missing availability');
  expect(notificationTitle(row({eventType:'TIME_OFF_APPROVED',names:['Ana Colon'],outcome:'CANCELLED'}))).toEqual({title:'Time off approved',detail:'Ana Colon · Now cancelled'});
 });
 it('rows that name different people are not folded together',()=>{
  const a=row({id:'a',label:'Swap request',eventType:'SWAP_RESPONSE_REQUIRED',names:['Ana Colon']}),b=row({id:'b',label:'Swap request',eventType:'SWAP_RESPONSE_REQUIRED',names:['Luis Torres']});
  expect(collapseNotifications([a,b]).map(r=>r.count)).toEqual([1,1]);
  const s=(id:string)=>row({id,label:'Items need review',eventType:'MANAGER_REVIEW',count:3});
  expect(collapseNotifications([s('x'),s('y')]).map(r=>r.count)).toEqual([2]);
 });
 it('Employee rows: the event says what happened; a name only where sent; an action the person owes keeps its words',()=>{
  expect(employeeTitle(row({eventType:'TIME_OFF_DENIED',subject:{kind:'requestDate',startDate:'2026-11-26',endDate:'2026-11-26'}}))).toBe('Your time-off request for Nov 26 was declined');
  expect(employeeTitle(row({label:'Swap request',eventType:'SWAP_RESPONSE_REQUIRED',actionState:'available',names:['Ana Colon']}))).toBe('Ana Colon asked you to swap a shift');
  expect(employeeTitle(row({label:'Swap request',eventType:'SWAP_RESPONSE_REQUIRED',actionState:'available'}))).toBe('You can respond to a shift request');
  expect(employeeTitle(row({label:'Schedule published',eventType:'SCHEDULE_PUBLISHED',actionState:'required',subject:{kind:'scheduleWeek',startDate:'2026-11-16',endDate:'2026-11-22'}}))).toBe('Confirm your schedule for Nov 16 – 22');
  expect(employeeTitle(row({label:'Schedule published',eventType:'SCHEDULE_PUBLISHED'}))).toBe('Your schedule was published');
  // An older row without facts reads as before.
  expect(employeeTitle(row({label:'Time-off update'}))).toBe('Your time-off request was answered');
 });
});
