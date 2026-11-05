import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {CorpCorrections,CorpFixTime,CorpHoursTitle,CorpPastTimecards,CorpTimeEntry,CorpTimeTab,boardDuration,clockRange,formatClock,parseClock,timeSubtitle} from './hours-corp';
import {HoursCorrectionOperation} from './hours-operation';
import type {EmployeeTimeEntry,EmployeeTimeReady} from '@/lib/employee-time';

const noop=()=>{};
const zone='America/Puerto_Rico';
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const done:EmployeeTimeEntry={id:'own-1',locationName:'Condado',clockInAt:'2026-10-26T11:59:00Z',clockOutAt:'2026-10-26T20:01:00Z',state:'CLOCKED_OUT',elapsedSeconds:28920,breakSeconds:1800,breaks:[{id:'b1',startAt:'2026-10-26T16:00:00Z',endAt:'2026-10-26T16:30:00Z',name:'Meal break',elapsedSeconds:1800}]};
const open:EmployeeTimeEntry={id:'own-2',locationName:'Condado',clockInAt:'2026-10-27T11:58:00Z',clockOutAt:null,state:'CLOCKED_IN',elapsedSeconds:5520,breakSeconds:0,breaks:[]};
const ready=(patch:Partial<EmployeeTimeReady>={}):EmployeeTimeReady=>({state:'ready',observedAt:'2026-10-27T13:30:00Z',validForMs:45000,timeZone:zone,date:'2026-10-27',current:null,today:{entries:[],recordedSeconds:0,breakSeconds:0},recent:{entries:[done],total:1,limit:20},...patch});

describe('corporate Time formats',()=>{
 it('writes durations and times like the boards',()=>{
  expect(boardDuration(27120)).toBe('7 h 32 min');expect(boardDuration(115200)).toBe('32 h');expect(boardDuration(2700)).toBe('45 min');expect(boardDuration(0)).toBe('0 min');
  expect(clockRange('2026-10-26T16:00:00Z','2026-10-26T16:30:00Z',zone).replace(/\s/g,' ')).toBe('12:00 – 12:30 PM');
  expect(clockRange('2026-10-26T11:59:00Z',null,zone).replace(/\s/g,' ')).toBe('7:59 AM – now');
 });
 it('reads typed times without a native time picker',()=>{
  expect(parseClock('10am')).toBe('10:00');expect(parseClock('6:00 pm')).toBe('18:00');expect(parseClock('930p')).toBe('21:30');expect(parseClock('21:05')).toBe('21:05');
  expect(parseClock('13pm')).toBeNull();expect(parseClock('9:7')).toBeNull();expect(formatClock('00:05')).toBe('12:05 AM');
 });
});

describe('corporate Time tab (G-E-Time, E-TimeOnClock)',()=>{
 it('shows the clock status, this week and one way to fix a punch, without clock controls or footers',()=>{
  const data=ready({current:open,today:{entries:[open],recordedSeconds:5520,breakSeconds:0}}),plain=text(renderToStaticMarkup(<CorpTimeTab data={data}/>));
  expect(plain).toContain('Current shift');expect(plain).toContain('On the clock');expect(plain).toMatch(/Clocked in at 7:58\sAM/);expect(plain).toContain('Condado · 1 h 32 min so far');
  expect(plain).toContain('This week · Oct 26 – Nov 1');expect(plain).toContain('Mon 26');expect(plain).toContain('Tue 27');expect(plain).toContain('8 h 2 min');expect(plain).toContain('30 min break');
  expect(plain).toContain('Fix a missed punch');expect(plain).toContain('Hours include breaks.');
  expect(plain).not.toMatch(/Clocker|Refresh|Your information only|Checked|0h|Clock out<\/button>/);
  expect(timeSubtitle(data)).toBe('Tuesday, October 27 · Condado');
 });
 it('makes its title a focus target, so Back to Time can move focus there when the origin row isn’t listed',()=>{
  expect(renderToStaticMarkup(<CorpHoursTitle sub="Monday"/>)).toMatch(/<h1 id="hours-title" tabindex="-1">Time<\/h1>/);
 });
 it('says plainly when nothing is recorded this week',()=>{
  const plain=text(renderToStaticMarkup(<CorpTimeTab data={ready({recent:{entries:[],total:0,limit:20}})}/>));
  expect(plain).toContain('Not clocked in');expect(plain).toContain('No time recorded yet this week');expect(plain).not.toContain('0 min');
 });
 it('says "not clocked in" once and names the tablet (upscale S9)',()=>{
  const html=renderToStaticMarkup(<CorpTimeTab data={ready()}/>),plain=text(html);
  expect(plain).toContain('Right now');expect(plain).toContain('Not clocked in');expect(plain).toContain('Clock in on the Condado tablet.');
  expect(plain).not.toContain('Off the clock');expect(html.slice(html.indexOf('id="hours-now"'),html.indexOf('id="hours-week"'))).not.toContain('c-pill');
  const two=text(renderToStaticMarkup(<CorpTimeTab data={ready({recent:{entries:[done,{...done,id:'own-3',locationName:'Old San Juan',clockInAt:'2026-10-25T11:59:00Z',clockOutAt:'2026-10-25T20:01:00Z'}],total:2,limit:20}})}/>));
  expect(two).toContain('Clock in on the tablet where you work.');
 });
 it('lists a day’s punches with its correction link (E-TimecardDay)',()=>{
  const html=renderToStaticMarkup(<CorpTimeEntry entry={done} zone={zone}/>),plain=text(html);
  expect(plain).toContain('Punches');expect(plain).toContain('Meal break');expect(plain).toContain('Includes 30 min of breaks');expect(plain).toContain('Request a correction');
  expect(html).toContain('href="/app/my-time?view=corrections&amp;edit=entry%3Aown-1"');
  expect(text(renderToStaticMarkup(<CorpTimeEntry entry={open} zone={zone}/>))).not.toContain('Request a correction');
 });
});

it('shows the chosen week with its days, then earlier weeks as cards and Show earlier weeks (E-PastTimecards, upscale M4)',()=>{
 const card={employeeId:'e',employeeName:'Fictional',timeZone:zone,startDate:'2026-10-19',endDate:'2026-10-25',pendingCorrections:0,corrections:[],observedAt:'2026-10-27T13:00:00Z',startAt:'2026-10-19T04:00:00Z',endAt:'2026-10-26T04:00:00Z',recordedNanoseconds:'28920000000000',breakNanoseconds:'0',issues:[],
  entries:[{id:'e1',locationId:'l',locationName:'Condado',positionId:null,positionName:null,sourceKind:'RECORDED' as const,adjustmentId:null,recordedVersion:1,startAt:'2026-10-20T11:59:00Z',endAt:'2026-10-20T20:01:00Z',rawStartAt:'2026-10-20T11:59:00Z',rawEndAt:'2026-10-20T20:01:00Z',breaks:[]}]};
 const data={state:'ready',validForMs:1,cards:[{card,state:'APPROVED',history:[]}]} as unknown as Parameters<typeof CorpPastTimecards>[0]['data'];
 const html=renderToStaticMarkup(<CorpPastTimecards authority="a" data={data} period={{startDate:'2026-10-19',endDate:'2026-10-25'}} today="2026-10-27" entryId={null} onRefresh={noop}/>),plain=text(html);
 expect(plain).toContain('Oct 19 – 25');expect(plain).toContain('Approved');expect(plain).toContain('8 h 2 min');expect(plain).toContain('Tue 20');expect(plain).toContain('Later week');
 // Four earlier weeks, newest first, each its own card, then Show earlier weeks; no Earlier/Later paging rows below.
 const order=['Oct 12 – 18','Oct 5 – 11','Sep 28 – Oct 4','Sep 21 – 27'].map(range=>plain.indexOf(range));
 expect(order.every(at=>at>plain.indexOf('Tue 20'))).toBe(true);expect([...order].sort((a,b)=>a-b)).toEqual(order);
 expect(plain).toContain('Show earlier weeks');expect(plain).not.toContain('Earlier week ');
 expect(html).not.toMatch(/type="date"|View period|Draft|Effective time|Timecard history/);
 // An empty week says so in words and carries no state.
 const empty={state:'ready',validForMs:1,cards:[{card:{...card,recordedNanoseconds:'0',entries:[]},state:'DRAFT',history:[]}]} as unknown as Parameters<typeof CorpPastTimecards>[0]['data'];
 const none=renderToStaticMarkup(<CorpPastTimecards authority="a" data={empty} period={{startDate:'2026-10-19',endDate:'2026-10-25'}} today="2026-10-27" entryId={null} onRefresh={noop}/>);
 const first=none.slice(none.indexOf('id="hours-timecard"'),none.indexOf('</section>',none.indexOf('id="hours-timecard"')));
 expect(text(first)).toContain('No hours this week');expect(first).not.toMatch(/c-pill|c-meta|Not approved yet/);
});

it('lists corrections without pointing to pages a phone doesn’t have',()=>{
 const plain=text(renderToStaticMarkup(<CorpCorrections snapshot={{state:'ready',observedAt:'2026-10-27T18:00:00Z',timeZone:zone,totalRequests:0,locations:[],targets:[],requests:[]}} decisions={[]} requestId={null} filter="waiting" onRefresh={noop}/>));
 expect(plain).toContain('No requests are waiting in your recent history.');expect(plain).toContain('Fix a missed punch');expect(plain).not.toMatch(/Hours or Timecards|Clocker/);
});

describe('Fix my time sheet (E-CorrectionSheet)',()=>{
 const snapshot={state:'ready' as const,authority:'a'.repeat(64),observedAt:'2026-10-27T18:00:00Z',timeZone:zone,totalRequests:0,locations:[{id:'loc-1',name:'Condado'},{id:'loc-2',name:'Old San Juan'}],requests:[],
  targets:[{kind:'ENTRY_BOUNDARY' as const,timeEntryId:'own-1',breakEntryId:null,recordedStartAt:done.clockInAt,recordedEndAt:done.clockOutAt!,context:{state:'confirmed' as const,sourceKind:'RECORDED' as const,startAt:done.clockInAt,endAt:done.clockOutAt!,totalDecisions:0,decisions:[]}}]};
 const render=(edit:string,operation=new HoursCorrectionOperation())=>renderToStaticMarkup(<CorpFixTime snapshot={snapshot} basis={'b'.repeat(32)} edit={edit} draft={undefined} onDraft={noop} operation={operation} isActive otherPending={false} onSubmit={noop} onRetry={noop} onReset={noop} onRefresh={noop} onEdit={noop} cancel="/app/my-time"/>);
 it('asks what to fix, the day, start, end and a required note, with kit fields only',()=>{
  const html=render('new'),plain=text(html);
  for(const label of ['Cancel','Fix my time','Send','What to fix','Missed a whole shift','Mon, Oct 26','Location','Day','Start','End','Note (required)'])expect(plain).toContain(label);
  expect(html).not.toMatch(/type="(date|time)"/);expect(plain).not.toMatch(/Current effective|No approved missing-time adjustment|Clocker/);
  expect(plain).toContain('Your manager reviews it. Your timecard changes once it’s approved.');
  // Upscale S14: nothing to prefill, so the times say "Choose", and Send stays grey (aria-disabled) until it's complete.
  expect(html).toContain('placeholder="Choose"');expect(html).not.toMatch(/placeholder="(9:00 AM|5:00 PM)"/);
  expect(html).toMatch(/<button type="submit"[^>]*aria-disabled="true"[^>]*>Send<\/button>/);
 });
 it('starts an entry fix from its recorded times',()=>{
  const html=render('entry:own-1');
  expect(html).toContain('value="7:59 AM"');expect(html).toContain('value="4:01 PM"');expect(html).toMatch(/checked="" value="entry:own-1"/);
  // The note is still empty, so Send is not ready yet.
  expect(html).toMatch(/<button type="submit"[^>]*aria-disabled="true"[^>]*>Send<\/button>/);
  // With a note the proposal is complete and Send is live.
  const draft={basis:'b'.repeat(32),startDate:'2026-10-26',startTime:'07:59',endDate:'2026-10-26',endTime:'16:30',reason:'Stayed late to close',locationId:''};
  const filled=renderToStaticMarkup(<CorpFixTime snapshot={snapshot} basis={'b'.repeat(32)} edit="entry:own-1" draft={draft} onDraft={noop} operation={new HoursCorrectionOperation()} isActive otherPending={false} onSubmit={noop} onRetry={noop} onReset={noop} onRefresh={noop} onEdit={noop} cancel="/app/my-time"/>);
  expect(filled).toMatch(/<button type="submit"[^>]*>Send<\/button>/);expect(filled).not.toContain('aria-disabled="true"');
 });
 it('keeps original-operation recovery reachable after its fresh edit source disappears',async()=>{
  const operation=new HoursCorrectionOperation();
  await operation.submit({basis:'a'.repeat(32),command:{operationId:'c3849d11-f86e-4f08-8b90-84a8e2053290',kind:'ENTRY_BOUNDARY',timeEntryId:'no-longer-editable',proposedStartAt:'2026-10-27T13:00:00Z',proposedEndAt:'2026-10-27T17:00:00Z',reason:'Original proposal'}},async()=>({status:'unknown'}),()=>true);
  const plain=text(render('entry:no-longer-editable',operation));
  expect(plain).toContain('Check submission status');expect(plain).not.toContain('Send');
 });
});
