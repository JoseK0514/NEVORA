import {createElement,type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,rs} from '@rstest/core';
rs.mock('next/link',()=>({default:({children,prefetch:_prefetch,...props}:ComponentProps<'a'>&{prefetch?:boolean})=>createElement('a',props,children)}));
import {EmployeeNotificationList,notificationGroup,notificationHeadline,notificationTitle} from './notifications-list';
import type {EmployeeNotificationItem} from '../../lib/employee-view';
const zone='America/Puerto_Rico',now=new Date('2026-10-31T16:00:00Z');
const item=(id:string,at:string,label='Schedule update',extra:Partial<EmployeeNotificationItem>={}):EmployeeNotificationItem=>({id,label,at,href:'/app/notifications/open?notificationId='+id,reviewState:'read',actionState:'none',...extra});
const items=[item('a','2026-10-30T23:45:00Z','Schedule update',{reviewState:'unread',actionState:'required'}),item('b','2026-10-30T15:20:00Z','Time off update'),item('c','2026-10-28T12:00:00Z','Pay statement update')];
const draw=(tab:'all'|'unread'='all',list=items)=>renderToStaticMarkup(<EmployeeNotificationList items={list} partial={false} tab={tab} onTab={()=>{}} timeZone={zone} now={now}/>);
const plain=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
it('groups by day in the workplace time zone',()=>{
 expect(notificationGroup('2026-10-31T13:00:00Z',zone,now)).toBe('Today');expect(notificationGroup('2026-10-30T23:45:00Z',zone,now)).toBe('Yesterday');expect(notificationGroup('2026-10-28T12:00:00Z',zone,now)).toBe('Earlier');
});
it('board E-Notifications: All / Unread tabs, Yesterday and Earlier cards, an unread dot and plain times',()=>{
 const html=draw(),text=plain(html);
 expect(html).toMatch(/aria-pressed="true"[^>]*>All</);expect(text).toContain('Unread 1');expect(text).not.toContain('Unread (1)');expect(html).toMatch(/<span class="c-count[^"]*"[^>]*><span class="sr-only">\u00a0<\/span>1<\/span>/);
 expect(text.indexOf('Yesterday')).toBeLessThan(text.indexOf('Earlier'));expect(text).toContain('7:45 PM');expect(text).toContain('Wed, Oct 28 · 8:00 AM');
 expect(text).not.toMatch(/\bAST\b|\bEDT\b|GMT/);expect(html).toContain('em-notif-dot');expect(text).toContain('Action needed · 7:45 PM');
 // Upscale B7: one dot and no icon tile or pill.
 expect(html.match(/em-notif-dot/g)).toHaveLength(1);expect(html).not.toMatch(/em-notif-icon|c-pill/);
 for(const gone of ['Search this page','Show','Your information only','Review schedule'])expect(text).not.toContain(gone);
 expect(html).toContain('href="/app/notifications/open?notificationId=a"');
});
it('Unread shows only unread notices, and says when there are none',()=>{
 const text=plain(draw('unread'));expect(text).toContain('Confirm your schedule');expect(text).not.toContain('time-off request');
 expect(plain(draw('unread',[items[1]]))).toContain('You’re all caught up');expect(plain(draw('all',[]))).toContain('No current notifications');
});
it('a notice says what happened, from its kind, its dates and whether it still needs you (inspection Nov 14, BR-6)',()=>{
 const title=(label:string,extra:Partial<EmployeeNotificationItem>={})=>notificationTitle(item('x','2026-10-30T15:20:00Z',label,extra));
 const week={kind:'scheduleWeek' as const,startDate:'2026-11-09',endDate:'2026-11-15'},day={kind:'requestDate' as const,startDate:'2026-11-26',endDate:'2026-11-26'};
 expect(title('Schedule update',{actionState:'required',subject:week})).toBe('Confirm your schedule for Nov 9–15');
 expect(title('Schedule update',{actionState:'complete',subject:week})).toBe('Your schedule for Nov 9–15 was updated');expect(title('Schedule update')).toBe('Your schedule was updated');
 expect(title('Time-off update',{subject:{kind:'requestDate',startDate:'2026-11-28',endDate:'2026-12-02'}})).toBe('Your time-off request for Nov 28–Dec 2 was answered');
 expect(title('Time off update',{subject:null})).toBe('Your time-off request was answered');
 expect(title('Can’t-work update',{subject:day})).toBe('Your can’t-work request for Nov 26 was answered');
 expect(title('Shift request update',{actionState:'available',subject:day})).toBe('You can respond to a shift request for Nov 26');
 expect(title('Shift request update',{actionState:'complete',subject:day})).toBe('A shift request for Nov 26 is closed');expect(title('Shift request update',{subject:day})).toBe('A shift request for Nov 26 was updated');
 expect(title('Availability update',{actionState:'required'})).toBe('Reminder to submit your availability');expect(title('Availability update',{actionState:'complete'})).toBe('Your availability was submitted');
 expect(title('Team update',{actionState:'required'})).toBe('Confirm the team update');expect(title('Team update')).toBe('A team update was shared with you');
 expect(title('Pay statement update',{actionState:'available'})).toBe('A pay statement was shared with you');
 // A kind with nothing more to say, and a label that isn't a known kind, keep their own words.
 expect(title('Device notification test')).toBe('Device notification test');expect(title('Holiday hours')).toBe('Holiday hours');
 // The row and its accessible name carry the title; the category name is gone from the list.
 const html=draw();expect(html).toContain('aria-label="Confirm your schedule, unread, action needed, 7:45 PM"');
 for(const gone of ['Schedule update','Time off update','Pay statement update'])expect(plain(html)).not.toContain(gone);
 expect(plain(html)).toContain('Your time-off request was answered');expect(plain(html)).toContain('A pay statement was shared with you');
});
it('a tapped notice stays pressed with its own spinner while it opens',()=>{
 const html=renderToStaticMarkup(<EmployeeNotificationList items={items} partial={false} tab="all" onTab={()=>{}} timeZone={zone} now={now} opening="a"/>);
 const row=html.slice(html.indexOf('id="message-a"'),html.indexOf('</a>',html.indexOf('id="message-a"')));
 expect(row).toContain('aria-busy="true"');expect(row).toContain('em-notif-row--busy');expect(row).toContain('em-notif-spin');expect(row).not.toContain('em-notif-dot');
 expect(plain(html)).not.toContain('Opening current details');
});

it('Phase 4 (EM-005): a headline is the outcome and its object, in English and Spanish, and never guesses',()=>{
 const head=(label:string,extra:Partial<EmployeeNotificationItem>={},lang:'en'|'es'='en')=>notificationHeadline(item('x','2026-10-30T15:20:00Z',label,extra),lang);
 const week={kind:'scheduleWeek' as const,startDate:'2026-11-09',endDate:'2026-11-15'},day={kind:'requestDate' as const,startDate:'2026-11-26',endDate:'2026-11-26'},span={kind:'requestDate' as const,startDate:'2026-11-28',endDate:'2026-12-02'};
 expect(head('Time off approved',{eventType:'TIME_OFF_APPROVED',outcome:'APPROVED',subject:span})).toEqual({title:'Time off approved',object:'Nov 28–Dec 2',decided:'approved',forYou:false});
 expect(head('Time off declined',{eventType:'TIME_OFF_DENIED',outcome:'DENIED',subject:day})).toEqual({title:'Time off declined',object:'Thu, Nov 26',decided:'declined',forYou:false});
 expect(head('Time off approved',{eventType:'TIME_OFF_APPROVED',outcome:'CANCELLED',subject:day}).object).toBe('Thu, Nov 26 · Now cancelled');
 expect(head('Schedule published',{eventType:'SCHEDULE_PUBLISHED',count:2,subject:week})).toEqual({title:'Schedule published',object:'Week of Nov 9 · 2 shifts',decided:null,forYou:false});
 expect(head('Schedule published',{eventType:'SCHEDULE_PUBLISHED',count:0,subject:week}).object).toBe('Week of Nov 9 · No shifts for you');
 // A notice that still needs the person is the action, whatever its event type; one without an event type stops at what is known.
 expect(head('Schedule update',{eventType:'SCHEDULE_ACKNOWLEDGEMENT_REMINDER',actionState:'required',count:4,subject:week})).toEqual({title:'Confirm the week of Nov 9',object:'4 shifts',decided:null,forYou:false});
 // Final polish (Nov 20, 2026): the week is in the title, so two weeks waiting are two different rows; without a week the title stays general.
 expect(head('Schedule update',{eventType:'SCHEDULE_ACKNOWLEDGEMENT_REMINDER',actionState:'required',count:4,subject:{...week,startDate:'2026-11-16',endDate:'2026-11-22'}}).title).toBe('Confirm the week of Nov 16');
 expect(head('Schedule update',{eventType:'SCHEDULE_ACKNOWLEDGEMENT_REMINDER',actionState:'required',count:4}).title).toBe('Confirm your schedule');
 expect(head('Schedule update',{eventType:'SCHEDULE_ACKNOWLEDGEMENT_REMINDER',actionState:'required',count:4,subject:week},'es').title).toMatch(/^Confirma la semana del 9 (de )?nov\.?$/);
 expect(head('Schedule update')).toEqual({title:'Schedule updated',object:null,decided:null,forYou:false});expect(head('Time-off update',{subject:span}).title).toBe('Time-off request answered');
 expect(head('Shift swap',{eventType:'SWAP_RESPONSE_REQUIRED',actionState:'available',names:['Ana Colon'],subject:day})).toEqual({title:'Swap request waiting for you',object:'Thu, Nov 26 · From Ana Colon',decided:null,forYou:true});
 expect(head('Cover',{eventType:'COVERAGE_INVITATION',actionState:'available',subject:day})).toEqual({title:'Cover request waiting for you',object:'Thu, Nov 26',decided:null,forYou:true});
 expect(head('Shift swap',{eventType:'SWAP_APPROVED',subject:day}).title).toBe('Shift swap approved');expect(head('Cover',{eventType:'COVERAGE_DENIED',subject:day}).decided).toBe('declined');
 expect(head('Shift request update',{actionState:'complete'}).title).toBe('Shift request closed');expect(head('Can’t-work update',{eventType:'CALLOUT_APPROVED'}).title).toBe('Can’t-work request approved');
 expect(head('Team update',{actionState:'required'})).toEqual({title:'Confirm the team update',object:null,decided:null,forYou:false});expect(head('Team update').title).toBe('New team update');
 expect(head('Pay statement update').title).toBe('Pay statement shared');expect(head('Availability update',{actionState:'required'}).title).toBe('Send your availability');
 expect(head('Holiday hours')).toEqual({title:'Holiday hours',object:null,decided:null,forYou:false});
 // Spanish: every part comes from the copy module and the dates from the es-PR formatter.
 const es=head('Schedule published',{eventType:'SCHEDULE_PUBLISHED',count:2,subject:week},'es');expect(es.title).toBe('Horario publicado');expect(es.object).toMatch(/^Semana del 9 (de )?nov\.? · 2 turnos$/);
 expect(head('Shift swap',{eventType:'SWAP_RESPONSE_REQUIRED',actionState:'available',names:['Ana Colon'],subject:day},'es').object).toMatch(/· De Ana Colon$/);
 expect(head('Time off approved',{eventType:'TIME_OFF_APPROVED',outcome:'CANCELLED',subject:day},'es').object).toMatch(/· Ahora cancelada$/);
});
