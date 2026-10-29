import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';
import { CALENDAR_READ_PATH, pendingReads, calendarTrace, installCalendarFetchObservation, type CalendarTrace } from './integration/calendar-request-monitor';

const id = '11111111-1111-4111-8111-111111111111';
const control = '22222222-2222-4222-8222-222222222222';
const trace: CalendarTrace[] = [
  {id:control,request:1,process:1,event:'start',complete:false},
  {id:control,request:1,process:1,event:'finish',complete:true},
];
const finished = new Set([control]);
const orphan = {path:CALENDAR_READ_PATH,method:'GET',id,response:false};
it('retires only an exactly identified aborted Calendar fetch with no server receipt after a verified positive control',()=>{
  expect(pendingReads([orphan],[id],trace,finished)).toEqual([]);
});
it.each(['not-aborted','server-started','response-seen','observer-unproven','unrelated-path','invalid-marker'])('keeps %s pending rather than hiding a live or unobserved request',mode=>{
  const row={...orphan,...(mode==='response-seen'?{response:true}:{}),...(mode==='unrelated-path'?{path:'/api/employee/profile'}:{}),...(mode==='invalid-marker'?{id:'invalid'}:{})};
  const events=mode==='server-started'?[...trace,{id,request:2,process:1,event:'start' as const,complete:false}]:trace;
  expect(pendingReads([row],mode==='not-aborted'?[]:[row.id],events,mode==='observer-unproven'?new Set():finished)).toEqual([row]);
});

it.each(['POST','DELETE',undefined])('keeps an aborted %s pending even after a successful observed GET',method=>{
  const row={...orphan,method};
  expect(pendingReads([row],[id],trace,finished)).toEqual([row]);
});
it('keeps every unknown request pending after server observation becomes unavailable',()=>{
  const unavailable={event:'unavailable',process:1,reason:'capacity'} as CalendarTrace;
  const events=calendarTrace([...trace,unavailable].map(event=>'[Owned calendar read] '+JSON.stringify(event)).join('\n'));
  expect(pendingReads([orphan],[id],events,finished)).toEqual([orphan]);
});
it('keeps requests pending if diagnostic evidence is malformed instead of silently ignoring its absence',()=>{
  const events=calendarTrace(trace.map(event=>'[Owned calendar read] '+JSON.stringify(event)).join('\n')+'\n[Owned calendar read] {incomplete');
  expect(pendingReads([orphan],[id],events,finished)).toEqual([orphan]);
});
it.each([
  {request:'POST',override:undefined},
  {request:'GET',override:'POST'},
])('does not tag or record aborted mutation $request overridden by $override',async({request,override})=>{
  const calls:{headers:Headers}[]=[];
  const browser:{fetch:typeof fetch;__nevoraAbortedCalendarReads?:string[]}={fetch:async(_input,init)=>{calls.push({headers:new Headers(init?.headers)});throw new DOMException('aborted','AbortError');}};
  await installCalendarFetchObservation({addInitScript:async script=>{runInNewContext('('+script.toString()+')()',{
    window:browser,Request,Headers,URL,location:new URL('http://127.0.0.1:9999/app'),crypto,
  });}});
  const abort=new AbortController();abort.abort();
  const input=new Request('http://127.0.0.1:9999/api/employee/calendar-subscriptions',{method:request,signal:abort.signal});
  await expect(browser.fetch(input,override?{method:override}:undefined)).rejects.toMatchObject({name:'AbortError'});
  expect(calls[0].headers.has('x-nevora-qa-calendar-read')).toBe(false);
  expect(browser.__nevoraAbortedCalendarReads).toEqual([]);
});

it.each([
  {request:'GET',override:undefined},
  {request:'POST',override:'get'},
])('records an actual aborted effective GET for $request overridden by $override',async({request,override})=>{
  let sentId:string|null=null;
  const browser:{fetch:typeof fetch;__nevoraAbortedCalendarReads?:string[]}={fetch:async(_input,init)=>{sentId=new Headers(init?.headers).get('x-nevora-qa-calendar-read');throw new DOMException('aborted','AbortError');}};
  await installCalendarFetchObservation({addInitScript:async script=>{runInNewContext('('+script.toString()+')()',{
    window:browser,Request,Headers,URL,location:new URL('http://127.0.0.1:9999/app'),crypto,
  });}});
  const abort=new AbortController();abort.abort();
  const input=new Request('http://127.0.0.1:9999/api/employee/calendar-subscriptions',{method:request,signal:abort.signal});
  await expect(browser.fetch(input,override?{method:override}:undefined)).rejects.toMatchObject({name:'AbortError'});
  expect(sentId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);
  expect(browser.__nevoraAbortedCalendarReads).toEqual([sentId]);
});
