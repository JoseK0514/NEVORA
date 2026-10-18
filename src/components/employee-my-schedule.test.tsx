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
 expect(partial).toContain('Your North Office shifts are final. Another location you work at hasn’t published this week yet.');
 expect(partial).not.toContain('Your full week is not published yet');
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
 for(const value of ['Ends Tue, Oct 13','Customer Support','Designated lead','Call-out approved']) expect(output).toContain(value);
});
it('selected day, today, current-week return and planning destinations retain native URLs',()=>{
 const output=html({selectedDay:'2026-10-14'});
 expect(output).toContain('aria-current="date"');expect(output).toContain('Selected day');
 expect(output).toContain('/app/schedule?week=2026-10-12&amp;day=2026-10-12#schedule-2026-10-12');
 expect(output).toContain('/app/availability');expect(output).toContain('/app/requests');
});

const open={id:'open-1',date:'2026-10-14',startTime:'09:00',endTime:'17:00',location:'North Office',position:'Barista',href:'/app/exchange?tab=available#request-open-1'};
it('My shifts and Open shifts are real URLs with an announced count',()=>{
 const mine=html({openShifts:{available:[open],requested:[]}});
 expect(mine).toContain('href="/app/schedule?week=2026-10-12" aria-current="page">My shifts');
 expect(mine).toContain('href="/app/schedule?week=2026-10-12&amp;view=open">Open shifts');
 expect(mine).toMatch(/<span class="sr-only">, (<!-- -->)?1(<!-- -->)? available<\/span>/);
 expect(mine).toContain('employee-schedule-agenda');
});
it('Open shifts lists claimable shifts and own claims waiting for approval without the week agenda',()=>{
 const output=html({view:'open',openShifts:{available:[open],requested:[{...open,id:'mine-1',href:'/app/exchange?tab=requests&requestId=mine-1'}]}});
 for(const value of ['Waiting for approval','Requested · waiting for approval','View request','View and claim','#request-open-1','North Office · Barista','Claiming sends a request to your manager']) expect(output).toContain(value);
 expect(output).not.toContain('employee-schedule-agenda');
});
it('Open shifts shows a calm empty state and an honest unavailable state',()=>{
 expect(html({view:'open',openShifts:{available:[],requested:[]}})).toContain('No open shifts right now');
 const failed=html({view:'open',openShifts:null});
 expect(failed).toContain('Open shifts unavailable');expect(failed).not.toContain('No open shifts right now');
});
it('B3: shifts the claim rules refuse sit collapsed below the claimable ones, with plain reasons and no claim action',()=>{
 const refused={...open,id:'blocked-1',href:'/app/exchange?tab=available#request-blocked-1',reasons:['You have approved time off then','It’s outside your availability']};
 const output=html({view:'open',openShifts:{available:[open],requested:[],unavailable:[refused]}});
 expect(output).toContain('<details class="blocked-open-shifts">');
 for(const value of ['Shifts you can’t pick up','>1<','You have approved time off then','It’s outside your availability','Update your availability','/app/availability']) expect(output).toContain(value);
 expect(output.split('blocked-open-shifts')[1]).not.toContain('View and claim');
 expect(output).not.toContain('#request-blocked-1');
 const onlyRefused=html({view:'open',openShifts:{available:[],requested:[],unavailable:[{...refused,reasons:['It needs a position you’re not set up for']}]}});
 expect(onlyRefused).toContain('No open shifts fit your schedule right now');expect(onlyRefused).not.toContain('No open shifts right now');expect(onlyRefused).not.toContain('Update your availability');
});

it('opens swap choosing from Home: a banner, open options on upcoming shifts, and the mode kept across weeks (Codex F1)', () => {
  const markup = html({intent: 'swap'});
  expect(markup).toContain('Choose the shift you want to swap');
  expect(markup).toMatch(/<details class="my-shift-options" open="">/);
  expect(markup).toContain('href="/app/exchange/swap?sourceShiftId=self-shift"');
  expect(markup).toContain('href="/app/schedule?week=2026-10-19&amp;intent=swap"');
  const none = html({intent: 'swap', shifts: []});
  expect(none).toContain('No shifts to swap this week');
  expect(html()).not.toContain('Choose the shift you want to swap');
  expect(html()).not.toMatch(/<details class="my-shift-options" open="">/);
});

it('lists Planning ahead as one group of rows with the same destinations (Jose phone notes)', () => {
  const markup = html();
  expect(markup).toContain('id="my-schedule-more-title">Planning ahead</h2>');
  for (const href of ['/app/exchange?tab=my', '/app/availability', '/app/requests', '/app/profile#employee-calendar-title']) {
    expect(markup).toMatch(new RegExp(`<a href="${href.replace(/[?#]/g, m => '\\' + m)}" class="my-schedule-row">`));
  }
});

it('says plainly what the review asks: confirm you have seen your own schedule (Jose, 2026-10-18)', () => {
  const markup = html({confirmationNeeded: true, confirmation: createElement('button', null, 'Confirm schedule')});
  expect(markup).toContain('>Your manager asks you to confirm this week</a>');
  expect(markup).toContain('Confirm you’ve seen your schedule');
  expect(markup).toContain('Check your shifts for this week, then confirm.');
  expect(markup).not.toContain('below');
});

it('names the location that has not published, inside the week card (Jose, 2026-10-18)', () => {
  const markup = html({state: 'unpublished', locations: [{id: 'north', shortName: 'North Office'}, {id: 'harbor', shortName: 'Harbor'}], unpublishedLocationIds: ['harbor']});
  expect(markup).toContain('class="my-week-note"');
  expect(markup).toContain('Your North Office shifts are final. Harbor hasn’t published this week yet.');
  const none = html({state: 'unpublished', shifts: [], locations: [{id: 'harbor', shortName: 'Harbor'}], unpublishedLocationIds: ['harbor']});
  expect(none).toContain('Harbor hasn’t published this week yet. Shifts shown are final. An empty day isn’t a day off yet.');
});
