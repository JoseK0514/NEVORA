import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { EmployeeMySchedule, type EmployeeMyScheduleProps } from './employee-my-schedule';

vi.mock('next/link',()=>({default:({children,...props}:React.ComponentProps<'a'>)=>createElement('a',props,children)}));
const shift={id:'self-shift',scheduleId:'schedule',employeeId:'self',employeeName:'Fictional Employee',locationId:'north',date:'2026-10-12',startTime:'08:00',endTime:'16:00',isDesignatedLead:false,isCalloutApproved:false,scheduleStatus:'PUBLISHED' as const};
const base:EmployeeMyScheduleProps={weekStart:'2026-10-12',today:'2026-10-12',observedAt:'2026-10-12T11:00:00Z',timeZone:'America/Puerto_Rico',state:'published',shifts:[shift],locations:[{id:'north',shortName:'North Office'}],acknowledged:false};
const html=(props:Partial<EmployeeMyScheduleProps>={})=>renderToStaticMarkup(createElement(EmployeeMySchedule,{...base,...props}));

it('a published empty day is distinguished from an unpublished date',()=>{
 const published=html({selectedDay:'2026-10-13'});
 expect(published).toContain('No shift this day.');expect(published).toContain('Day off');
 const partial=html({state:'unpublished',selectedDay:'2026-10-13'});
 // UX-E-03 / F17 (Oct 25): one footer line names who isn't out yet; a partly published day is never a day off.
 expect(partial).toContain('Another location’s schedule isn’t out yet.');
 expect(partial).not.toContain('Your full week is not published yet');
 expect(partial).toContain('No shift this day yet.');
 expect(partial).not.toContain('Day off');
 const nothing=html({state:'unpublished',shifts:[],unpublishedLocationIds:['north'],selectedDay:'2026-10-13'});
 expect(nothing).toContain('Schedule not published yet');expect(nothing).not.toContain('Day off');
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
 expect(ended).not.toContain('Swap with a teammate');expect(ended).not.toContain('Unable to work this shift');
 expect(html({shifts:[{...shift,isCalloutApproved:true}]})).not.toContain('Change this shift');
 const future=html({shifts:[{...shift,id:'source & /',date:'2026-10-13'}]});
 expect(future).toContain('sourceShiftId=source%20%26%20%2F');expect(future).toContain('shiftId=source%20%26%20%2F');
 // v5: Offer it for cover opens the swap route's cover mode for the same shift.
 expect(future).toContain('sourceShiftId=source%20%26%20%2F&amp;mode=cover');
});
it('an active overnight shift from yesterday retains callout but does not invent a same-day swap',()=>{
 const output=html({weekStart:'2026-10-05',selectedDay:'2026-10-11',shifts:[{...shift,date:'2026-10-11',startTime:'22:00',endTime:'08:00'}]});
 expect(output).toContain('Ends Mon, Oct 12');expect(output).toContain('Unable to work this shift');expect(output).not.toContain('Swap with a teammate');
});
it('midnight end, real position names, lead and approved-callout labels remain explicit',()=>{
 const output=html({shifts:[{...shift,startTime:'16:00',endTime:'24:00',positionName:'Customer Support',isDesignatedLead:true,isCalloutApproved:true}]});
 for(const value of ['Ends Tue, Oct 13','Customer Support','Shift lead','Call-out approved']) expect(output).toContain(value);
});
it('selected day, today, current-week return and calendar destination retain native URLs',()=>{
 const output=html({selectedDay:'2026-10-14'});
 expect(output).toContain('aria-current="date"');expect(output).toContain('selected day');
 expect(output).toContain('href="/app/schedule?week=2026-10-12&amp;day=2026-10-14"');
 // On the current week the arrows are enough; another week offers Today back to the current one.
 expect(output).not.toContain('>Today</a>');
 expect(html({weekStart:'2026-10-19'})).toContain('href="/app/schedule?week=2026-10-12&amp;day=2026-10-12">Today</a>');
 // P1-10 / UX-E-10: the calendar feed lives in More, behind its own icon.
 expect(output).toContain('/app/more#employee-calendar-title');
});

const open={id:'open-1',date:'2026-10-14',startTime:'09:00',endTime:'17:00',location:'North Office',position:'Barista',href:'/app/exchange?tab=available#request-open-1'};
it('My shifts and Open shifts are real URLs with an announced count',()=>{
 const mine=html({openShifts:{available:[open],requested:[]}});
 expect(mine).toContain('href="/app/schedule?week=2026-10-12" aria-current="page">My shifts');
 // The count is part of the segment's visible name, so it is announced with it; a zero count is hidden.
 expect(mine).toContain('href="/app/schedule?week=2026-10-12&amp;view=open">Open shifts · 1</a>');
 expect(html({openShifts:{available:[],requested:[]}})).toContain('view=open">Open shifts</a>');
 expect(mine).toContain('id="my-day"');
});
it('Open shifts lists claimable shifts and own claims waiting for approval without the week agenda',()=>{
 const output=html({view:'open',openShifts:{available:[open],requested:[{...open,id:'mine-1',href:'/app/exchange?tab=requests&requestId=mine-1'}]}}).replace(/ /g,' ');
 for(const value of ['Waiting for approval','View request','View and claim','#request-open-1','North Office · Barista','Claiming sends a request to your manager']) expect(output).toContain(value);
 expect(output).not.toContain('id="my-day"');
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

it('opens swap choosing from Home: a note, swap on upcoming shifts from their sheet, and the mode kept across weeks (Codex F1)', () => {
  const markup = html({intent: 'swap'});
  expect(markup).toContain('Choose the shift you want to swap');
  expect(markup).toContain('href="/app/exchange/swap?sourceShiftId=self-shift"');
  expect(markup).toContain('href="/app/schedule?week=2026-10-19&amp;intent=swap"');
  const none = html({intent: 'swap', shifts: []});
  expect(none).toContain('No shifts to swap this week');
  expect(html()).not.toContain('Choose the shift you want to swap');
});

it('says plainly what the review asks: confirm you have seen your own schedule (Jose, 2026-10-18)', () => {
  const markup = html({confirmationNeeded: true, confirmation: createElement('button', null, 'Confirm schedule')});
  // The review sits right under the week strip, before the day and its shifts.
  expect(markup.indexOf('id="my-review-title"')).toBeLessThan(markup.indexOf('id="my-day"'));
  expect(markup).toContain('Confirm this week');
  expect(markup).toContain('Your manager asked you to check it');
  expect(markup).not.toContain('below');
});

it('names the location that has not published, beside the week (Jose, 2026-10-18)', () => {
  const markup = html({state: 'unpublished', locations: [{id: 'north', shortName: 'North Office'}, {id: 'harbor', shortName: 'Harbor'}], unpublishedLocationIds: ['harbor']});
  expect(markup).toContain('data-week-note=""');
  // UX-E-03 (Oct 25): said once, in plain words.
  expect(markup).toContain('Harbor’s schedule isn’t out yet.');
  expect(markup.match(/isn’t out yet/g)).toHaveLength(1);
  const none = html({state: 'unpublished', shifts: [], locations: [{id: 'harbor', shortName: 'Harbor'}], unpublishedLocationIds: ['harbor']});
  expect(none).toContain('Harbor’s schedule isn’t out yet.');
  expect(none).toContain('Not published yet');
  expect(none).not.toContain('Day off');
});

it('v5: the chosen day, then what is coming up later this week; earlier days stay one tap away on the strip', () => {
  const markup = html({today: '2026-10-14', observedAt: '2026-10-14T12:00:00Z', shifts: [{...shift, id: 'past', date: '2026-10-12'}, {...shift, id: 'next', date: '2026-10-15'}]});
  const day = markup.indexOf('id="my-day"'), later = markup.indexOf('id="my-later"');
  expect(day).toBeGreaterThan(0);expect(later).toBeGreaterThan(day);
  expect(markup).toContain('Coming up');expect(markup).toContain('Thursday, Oct 15');
  expect(markup).not.toContain('shift=past');
  expect(markup).toContain('href="/app/schedule?week=2026-10-12&amp;day=2026-10-12"');
  expect(markup.match(/class="q-wk"/g)).toHaveLength(1);
});

it('F17: a week every location published, with no shifts for the person, says so plainly', () => {
  const markup = html({shifts: [], selectedDay: '2026-10-13'});
  expect(markup).toContain('No shifts for you this week');
  expect(markup).toContain('Day off');
  expect(markup).not.toContain('not published');
});

it('F9: approved time off shows on the person’s own day and in the week strip', () => {
  const markup = html({shifts: [], selectedDay: '2026-10-14', timeOff: [{startDate: '2026-10-14', endDate: '2026-10-15', startTime: null, endTime: null}]}).replace(/[\u00a0\u202f]/g, ' ');
  expect(markup).toContain('<b>Time off</b>');
  expect(markup).toContain('All day');
  expect(markup).toContain('Approved');
  expect(markup).toContain('Wednesday, October 14, time off');
  const part = html({selectedDay: '2026-10-12', timeOff: [{startDate: '2026-10-12', endDate: '2026-10-12', startTime: '09:00', endTime: '13:00'}]}).replace(/[\u00a0\u202f]/g, ' ');
  expect(part).toContain('9:00 AM – 1:00 PM');
});

it('UX-E-13: a shift with a pending change shows its chip; swap and cover wait while it is pending', () => {
  const markup = html({pendingChanges: {'self-shift': 'Offered'}, today: '2026-10-12', observedAt: '2026-10-12T11:00:00Z'});
  expect(markup).toContain('<span class="q-chip">Offered</span>');
  expect(markup).not.toContain('Offer it for cover');
  expect(markup).not.toContain('Swap with a teammate');
});

it('P2-16: Open shifts has no week arrows and no repeated heading', () => {
  const markup = html({view: 'open', openShifts: {available: [], requested: []}});
  expect(markup).not.toContain('aria-label="Previous week"');
  expect(markup).not.toContain('<h2 id="my-open-title">Open shifts</h2>');
  expect(markup).toContain('No open shifts right now.');
});
