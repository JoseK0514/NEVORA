import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { EmployeeMySchedule, type EmployeeMyScheduleProps } from './employee-my-schedule';

vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
const shift={id:'self-shift',scheduleId:'schedule',employeeId:'self',employeeName:'Fictional Employee',locationId:'north',date:'2026-10-12',startTime:'08:00',endTime:'16:00',isDesignatedLead:false,isCalloutApproved:false,scheduleStatus:'PUBLISHED' as const};
const base:EmployeeMyScheduleProps={weekStart:'2026-10-12',today:'2026-10-12',observedAt:'2026-10-12T11:00:00Z',timeZone:'America/Puerto_Rico',state:'published',shifts:[shift],locations:[{id:'north',shortName:'North Office'}],acknowledged:false};
const html=(props:Partial<EmployeeMyScheduleProps>={})=>renderToStaticMarkup(createElement(EmployeeMySchedule,{...base,...props}));

it('a published empty day is distinguished from an unpublished date',()=>{
 expect(html()).toContain('Off — no assignment');
 const partial=html({state:'unpublished'});
 expect(partial).toContain('Only your published assignments are shown');
 expect(partial).toContain('Schedule not published yet');
 expect(partial).not.toContain('Off — no assignment');
});
it('unavailable reads hide private shifts, actions, confirmation and change history even when stale props remain',()=>{
 const output=html({state:'unavailable',acknowledged:true,receipt:true,confirmation:createElement('button',null,'Confirm schedule'),changes:createElement('p',null,'Private change')});
 expect(output).toContain('Schedule unavailable');
 for(const privateValue of ['8:00 AM','North Office','self-shift','Private change','Confirm schedule','Schedule confirmed.','You’re up to date']) expect(output).not.toContain(privateValue);
});
it('known confirmation succeeds only with actual confirmation state',()=>{
 expect(html({receipt:true})).not.toContain('Schedule confirmed.');
 expect(html({receipt:true,acknowledged:true})).toContain('Schedule confirmed.');
});
it('closed and approved-callout shifts do not offer requests while future own shifts use encoded source identities',()=>{
 const ended=html({observedAt:'2026-10-12T22:00:00Z'});
 expect(ended).not.toContain('Request a swap');expect(ended).not.toContain('Unable to work');
 expect(html({shifts:[{...shift,isCalloutApproved:true}]})).not.toContain('Shift options');
 const future=html({shifts:[{...shift,id:'source & /',date:'2026-10-13'}]});
 expect(future).toContain('sourceShiftId=source%20%26%20%2F');expect(future).toContain('shiftId=source%20%26%20%2F');
});
it('an active overnight shift from yesterday retains callout but does not invent a same-day swap',()=>{
 const output=html({weekStart:'2026-10-05',shifts:[{...shift,date:'2026-10-11',startTime:'22:00',endTime:'08:00'}]});
 expect(output).toContain('Ends Mon, Oct 12');expect(output).toContain('Unable to work');expect(output).not.toContain('Request a swap');
});
it('midnight end, real position names, lead and approved-callout labels remain explicit',()=>{
 const output=html({shifts:[{...shift,startTime:'16:00',endTime:'24:00',positionName:'Customer Support',isDesignatedLead:true,isCalloutApproved:true}]});
 for(const value of ['Ends Tue, Oct 13','Customer Support','Designated Lead','Call-out approved']) expect(output).toContain(value);
});
it('selected day, today, current-week return and planning destinations retain native URLs',()=>{
 const output=html({selectedDay:'2026-10-14'});
 expect(output).toContain('aria-current="date"');expect(output).toContain('Selected day');
 expect(output).toContain('/app/schedule?week=2026-10-12&amp;day=2026-10-12#schedule-2026-10-12');
 expect(output).toContain('/app/availability');expect(output).toContain('/app/requests');
});
