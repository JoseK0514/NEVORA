import React,{type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {CorpCorrections,CorpFixTime,CorpHoursFrame,CorpPastTimecards,CorpTimeEntry,CorpTimeTab} from '../employee-mobile/hours-corp';
import {HoursCorrectionOperation} from '../employee-mobile/hours-operation';
import {HoursBContext,type HoursBHead} from './time-b';
import {AvailabilityB,AvailabilityStatusB} from './availability-b';
import {onlyB,withoutB} from '../owner-b/test-support';
import type {EmployeeTimeEntry,EmployeeTimeReady} from '@/lib/employee-time';

/* Direction B Time screens: each corporate view also draws its phone screen (one BScreen) when the page provides its
 * header, and the corporate markup around it is unchanged. Fictional data only. */

const noop=()=>{};
const zone='America/Puerto_Rico';
const text=(html:string)=>html.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
const inPage=(head:HoursBHead,node:ReactNode)=>renderToStaticMarkup(<HoursBContext.Provider value={{head,authority:'fictional-view'}}><div className="c-page">{node}</div></HoursBContext.Provider>);
const bare=(node:ReactNode)=>renderToStaticMarkup(<div className="c-page">{node}</div>);
const done:EmployeeTimeEntry={id:'own-1',locationName:'Condado',clockInAt:'2026-10-26T11:59:00Z',clockOutAt:'2026-10-26T20:01:00Z',state:'CLOCKED_OUT',elapsedSeconds:28920,breakSeconds:1800,breaks:[{id:'b1',startAt:'2026-10-26T16:00:00Z',endAt:'2026-10-26T16:30:00Z',name:'Meal break',elapsedSeconds:1800}]};
const open:EmployeeTimeEntry={id:'own-2',locationName:'Condado',clockInAt:'2026-10-27T11:58:00Z',clockOutAt:null,state:'CLOCKED_IN',elapsedSeconds:5520,breakSeconds:0,breaks:[]};
const ready=(patch:Partial<EmployeeTimeReady>={}):EmployeeTimeReady=>({state:'ready',observedAt:'2026-10-27T13:30:00Z',validForMs:45000,timeZone:zone,date:'2026-10-27',current:null,today:{entries:[],recordedSeconds:0,breakSeconds:0},recent:{entries:[done],total:1,limit:20},...patch});
const timeHead:HoursBHead={title:'Time',sub:'Tue, Oct 27 · Condado'};

describe('Time tab (e-time)',()=>{
 it('draws one phone screen beside the unchanged corporate cards',()=>{
  const data=ready(),html=inPage(timeHead,<CorpTimeTab data={data}/>);
  expect(withoutB(html)).toBe(bare(<CorpTimeTab data={data}/>));
  expect(html.match(/class="b-screen/g)).toHaveLength(1);
  // Without the page's header (a corporate view on its own) there is no phone screen.
  expect(bare(<CorpTimeTab data={data}/>)).not.toContain('b-screen');
 });
 it('shows the week on glass, right now, this week’s days and the way to fix a punch',()=>{
  const b=onlyB(inPage(timeHead,<CorpTimeTab data={ready()}/>)),plain=text(b);
  expect(b).toContain('<h1 id="b-hours-title" tabindex="-1">Time</h1>');expect(plain).toContain('Tue, Oct 27 · Condado');
  expect(plain).toMatch(/This week 8 h 02 8 h 2 min Breaks 30 min/);
  expect(plain).toContain('Right now');expect(plain).toContain('Not clocked in');expect(plain).toContain('Clock in on the Condado tablet');
  expect(plain).toContain('This week · Oct 26 – Nov 1');expect(plain).toContain('In progress');
  expect(b).toContain('href="/app/my-time?entry=own-1"');expect(b).toContain('id="b-hours-entry-own-1"');expect(plain).toContain('30 min break');
  expect(b).toContain('href="/app/my-time?view=corrections&amp;edit=new"');expect(plain).toContain('Fix a missed punch');expect(plain).toContain('Hours include breaks.');
  // Last week is its own private read: hidden until it arrives.
  expect(plain).not.toContain('Last week');
 });
 it('says where and since when while on the clock; a cut read shows dashes, not short totals',()=>{
  const on=text(onlyB(inPage(timeHead,<CorpTimeTab data={ready({current:open,today:{entries:[open],recordedSeconds:5520,breakSeconds:0}})}/>)));
  // B7 wording (NV-119/NV-035): "Clocked in" status, "correction request" naming.
  expect(on).toContain('Clocked in');expect(on).toMatch(/Clocked in at 7:58\sAM/);expect(on).toContain('Condado · 1 h 32 min so far');expect(on).toContain('Take breaks and clock out on your location’s tablet.');
  const cut=text(onlyB(inPage(timeHead,<CorpTimeTab data={ready({recent:{entries:[done],total:40,limit:20}})}/>)));
  expect(cut).toMatch(/This week — Breaks —/);
  const none=onlyB(inPage(timeHead,<CorpTimeTab data={ready({recent:{entries:[],total:0,limit:20}})}/>));
  expect(text(none)).toContain('No time recorded yet this week');expect(none).not.toContain('b-live');
 });
 it('opens a day with its hours, punches and correction link',()=>{
  const b=onlyB(inPage({title:'Mon, Oct 26',back:{href:'/app/my-time#hours-entry-own-1',label:'Time'}},<CorpTimeEntry entry={done} zone={zone}/>)),plain=text(b);
  expect(b).toContain('class="b-screen b-screen--back"');expect(b).toContain('href="/app/my-time#hours-entry-own-1"');
  expect(plain).toContain('Hours');expect(plain).toContain('Completed');expect(plain).toContain('Includes 30 min of breaks');expect(plain).toContain('Meal break');expect(plain).toContain('Condado');
  expect(b).toContain('href="/app/my-time?view=corrections&amp;edit=entry%3Aown-1"');expect(plain).toContain('Hours include breaks.');
 });
});

describe('Past timecards (e-timecards)',()=>{
 const card={employeeId:'e',employeeName:'Fictional',timeZone:zone,startDate:'2026-10-19',endDate:'2026-10-25',pendingCorrections:0,corrections:[],observedAt:'2026-10-27T13:00:00Z',startAt:'2026-10-19T04:00:00Z',endAt:'2026-10-26T04:00:00Z',recordedNanoseconds:'28920000000000',breakNanoseconds:'0',issues:[],
  entries:[{id:'e1',locationId:'l',locationName:'Condado',positionId:null,positionName:null,sourceKind:'RECORDED' as const,adjustmentId:null,recordedVersion:1,startAt:'2026-10-20T11:59:00Z',endAt:'2026-10-20T20:01:00Z',rawStartAt:'2026-10-20T11:59:00Z',rawEndAt:'2026-10-20T20:01:00Z',breaks:[]}]};
 const data={state:'ready',validForMs:1,cards:[{card,state:'APPROVED',history:[]}]} as unknown as Parameters<typeof CorpPastTimecards>[0]['data'];
 const head:HoursBHead={title:'Past timecards',back:{href:'/app/my-time',label:'Time'}};
 const period={startDate:'2026-10-19',endDate:'2026-10-25'};
 it('lists weeks in one card: the later week, this one with its state in words, earlier weeks loading, then Show earlier weeks',()=>{
  const html=inPage(head,<CorpPastTimecards authority="a" data={data} period={period} today="2026-10-27" entryId={null} onRefresh={noop} chosen={false}/>),b=onlyB(html),plain=text(b);
  expect(plain).toContain('Weeks');expect(plain).toContain('Oct 19 – 25');expect(plain).toContain('1 shift · Approved');expect(plain).toContain('8 h 02');
  expect(b).toContain('href="/app/my-time?view=cards&amp;start=2026-10-19&amp;end=2026-10-25"');
  // Employee desktop (Nov 8, 2026) draws the week shown as a detail card before the list (desktop only, eb-desk), so the
  // list's order is read from its own card on.
  const list=plain.slice(plain.indexOf('Weeks'));
  const order=['Oct 26 – Nov 1','Oct 19 – 25','Oct 12 – 18','Sep 21 – 27','Show earlier weeks','Your correction requests'].map(range=>list.indexOf(range));
  expect(order.every(at=>at>=0)).toBe(true);expect([...order].sort((a,b)=>a-b)).toEqual(order);
  expect(plain).toContain('Loading…');expect(plain).toContain('Sent to your manager for review');expect(list).not.toContain('Tue 20');
  // The corporate page keeps its chosen week in full.
  expect(text(withoutB(html))).toContain('Tue 20');
 });
 it('lists a chosen week’s days',()=>{
  const b=onlyB(inPage(head,<CorpPastTimecards authority="a" data={data} period={period} today="2026-10-27" entryId={null} onRefresh={noop}/>)),plain=text(b);
  expect(b).toContain('id="b-hours-card-entry-e1"');expect(plain).toContain('Approved');expect(plain).toContain('Hours · includes 0 min of breaks');
  expect(b).toContain('href="/app/my-time?view=cards&amp;start=2026-10-19&amp;end=2026-10-25&amp;entry=e1"');
 });
});

describe('Your corrections (e-corrections) and Fix my time (e-fix)',()=>{
 const head:HoursBHead={title:'Your corrections',sub:'Fixes to your time, sent to your manager',back:{href:'/app/my-time',label:'Time'}};
 const empty={state:'ready' as const,observedAt:'2026-10-27T18:00:00Z',timeZone:zone,totalRequests:0,locations:[],targets:[],requests:[]};
 it('puts Waiting and Decided on glass and the empty state, the fix link and the hint in one card',()=>{
  const b=onlyB(inPage(head,<CorpCorrections snapshot={empty} decisions={[]} requestId={null} filter="waiting" onRefresh={noop}/>)),plain=text(b);
  expect(b).toMatch(/class="b-seg b-glass"/);expect(b).toMatch(/aria-current="page" href="\/app\/my-time\?view=corrections"|href="\/app\/my-time\?view=corrections" aria-current="page"/);
  expect(plain).toContain('Nothing waiting for review');/* B7 wording (NV-035) */expect(plain).toContain('Requests you send stay here until your manager decides.');
  expect(plain).toContain('Fix a missed punch');expect(plain).toContain('To fix a day you already clocked, open it from Time.');
  expect(text(onlyB(inPage(head,<CorpCorrections snapshot={empty} decisions={[]} requestId={null} filter="decided" onRefresh={noop}/>)))).toContain('No decided requests');
 });
 const snapshot={state:'ready' as const,authority:'a'.repeat(64),observedAt:'2026-10-27T18:00:00Z',timeZone:zone,totalRequests:0,locations:[{id:'loc-1',name:'Condado'}],requests:[],targets:[]};
 const fix=(snap:typeof snapshot)=>inPage({title:'Fix my time',back:{href:'/app/my-time',label:'Cancel',close:true}},
  <CorpFixTime snapshot={snap} basis={'b'.repeat(32)} edit="new" draft={undefined} onDraft={noop} operation={new HoursCorrectionOperation()} isActive otherPending={false} onSubmit={noop} onRetry={noop} onReset={noop} onRefresh={noop} onEdit={noop} cancel="/app/my-time"/>);
 it('keeps one form: the hero says what a lone missed shift is, the form card ends in Send and the review line',()=>{
  const html=fix(snapshot),b=onlyB(html),rest=withoutB(html);
  expect(text(b)).toContain('Fix my time');expect(text(b)).toContain('Cancel');expect(text(b)).toContain('A missed whole shift, with no clock-in or clock-out');expect(b).not.toContain('<form');
  expect(rest.match(/<form/g)).toHaveLength(1);expect(rest).toContain('class="b-keep eb-fix"');expect(rest).toContain('class="c-field eb-fix-one"');
  expect(rest).toMatch(/<button type="submit" class="eb-fix-send"[^>]*aria-disabled="true"[^>]*>Send<\/button>/);
  expect(rest.indexOf('eb-fix-send')).toBeLessThan(rest.indexOf('Your manager reviews it.'));
 });
 it('offers recent days as choices when there are any, and then has no line under the title',()=>{
  const target={kind:'ENTRY_BOUNDARY' as const,timeEntryId:'own-1',breakEntryId:null,recordedStartAt:done.clockInAt,recordedEndAt:done.clockOutAt!,context:{state:'confirmed' as const,sourceKind:'RECORDED' as const,startAt:done.clockInAt,endAt:done.clockOutAt!,totalDecisions:0,decisions:[]}};
  const html=fix({...snapshot,targets:[target]} as unknown as typeof snapshot);
  expect(text(onlyB(html))).not.toContain('A missed whole shift');expect(withoutB(html)).not.toContain('eb-fix-one');expect(text(withoutB(html))).toContain('Mon, Oct 26');
 });
});

describe('read states and Availability',()=>{
 it('shows the frame’s states on the page’s hero',()=>{
  const frame=(state:{snapshot:null|{state:'unavailable';reason:'access_denied'};paused:boolean;refreshing:boolean})=>onlyB(renderToStaticMarkup(<HoursBContext.Provider value={{head:timeHead,authority:'a'}}>
   <CorpHoursFrame contextKey="k" view="records" state={state} ready={false} refresh={noop} head={null} sub={false}>Private records</CorpHoursFrame></HoursBContext.Provider>));
  expect(text(frame({snapshot:null,paused:true,refreshing:false}))).toContain('Your time records are paused.');
  const denied=frame({snapshot:{state:'unavailable',reason:'access_denied'},paused:false,refreshing:false});expect(denied).toContain('href="/login"');expect(text(denied)).not.toContain('Private records');
  expect(text(frame({snapshot:null,paused:false,refreshing:false}))).toContain('Try again');
 });
 it('draws Availability’s hero with Change one week on glass',()=>{
  const html=renderToStaticMarkup(<AvailabilityB sub="Your usual week, used to build your schedule" change="/app/availability?week=2026-11-09"><AvailabilityStatusB message="Loading your planning…"/></AvailabilityB>);
  expect(html).toContain('href="/app/schedule"');expect(text(html)).toContain('Availability');expect(text(html)).toContain('Your usual week, used to build your schedule');
  expect(html).toMatch(/class="b-btn b-btn--glass" href="\/app\/availability\?week=2026-11-09"/);expect(text(html)).toContain('Change one week');
 });
});
