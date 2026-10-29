import { expect, it } from 'vitest';
import { CALENDAR_READ_PATH, pendingReads, type CalendarTrace } from './integration/calendar-request-monitor';

const id = '11111111-1111-4111-8111-111111111111';
const control = '22222222-2222-4222-8222-222222222222';
const trace: CalendarTrace[] = [
  {id:control,request:1,process:1,event:'start',complete:false},
  {id:control,request:1,process:1,event:'finish',complete:true},
];
const finished = new Set([control]);
const orphan = {path:CALENDAR_READ_PATH,id,response:false};
it('retires only an exactly identified aborted Calendar fetch with no server receipt after a verified positive control',()=>{
  expect(pendingReads([orphan],[id],trace,finished)).toEqual([]);
});
it.each(['not-aborted','server-started','response-seen','observer-unproven','unrelated-path','invalid-marker'])('keeps %s pending rather than hiding a live or unobserved request',mode=>{
  const row={...orphan,...(mode==='response-seen'?{response:true}:{}),...(mode==='unrelated-path'?{path:'/api/employee/profile'}:{}),...(mode==='invalid-marker'?{id:'invalid'}:{})};
  const events=mode==='server-started'?[...trace,{id,request:2,process:1,event:'start' as const,complete:false}]:trace;
  expect(pendingReads([row],mode==='not-aborted'?[]:[row.id],events,mode==='observer-unproven'?new Set():finished)).toEqual([row]);
});
