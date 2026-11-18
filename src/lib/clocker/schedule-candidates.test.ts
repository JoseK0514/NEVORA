import { describe, expect, it } from 'vitest';
import { captureScheduleContext, prepareScheduleCapture, type PublishedScheduleSource } from './schedule-candidates';
const scope={employeeId:'worker',locationId:'loc-1',workspaceId:'workspace',timeZone:'America/Puerto_Rico'};
const source=():PublishedScheduleSource=>({anchorDate:'2030-10-07',publication:{
 revisions:[{id:'r1',weekStart:'2030-10-07',revisionNumber:1}],
 shifts:[{id:'r1:s1',revisionId:'r1',sourceShiftId:'s1',scheduleId:'schedule',employeeId:'worker',locationId:'loc-1',
 date:'2030-10-07',startTime:'08:00:00',endTime:'16:00:00',positionId:'p1',positionName:'Barista',isCalloutApproved:false}],
}});
const only=(input=source(),zone=scope.timeZone)=>prepareScheduleCapture(input,{...scope,timeZone:zone}).candidates[0];
describe('C6 bounded published schedule preparation',()=>{
 it('converts configured local time and captures published identifiers/position without granting authority',()=>{
  expect(only()).toEqual({publishedShiftId:'r1:s1',revisionId:'r1',revisionNumber:1,sourceShiftId:'s1',scheduleId:'schedule',
   date:'2030-10-07',startTime:'08:00:00',endTime:'16:00:00',positionId:'p1',positionName:'Barista',
   startAt:'2030-10-07T12:00:00Z',endAt:'2030-10-07T20:00:00Z',uncertain:false});
 });
 it('keeps an explicit fixed yesterday-through-tomorrow window for a waiting clock-in',()=>{
  expect(prepareScheduleCapture(source(),scope)).toMatchObject({version:1,employeeId:'worker',locationId:'loc-1',workspaceId:'workspace',
   timeZone:scope.timeZone,windowStartAt:'2030-10-06T04:00:00Z',windowEndAt:'2030-10-09T04:00:00Z',reviewedWeekStarts:['2030-09-30','2030-10-07'],reviewedRevisionIds:['r1']});
 });
 it('selects the latest revision before filtering so an empty new revision removes old assignments',()=>{
  const s=source();s.publication.revisions.push({id:'r2',weekStart:'2030-10-07',revisionNumber:2});
  expect(prepareScheduleCapture(s,scope).candidates).toEqual([]);
 });
 it('does not resurrect a shift removed or assigned to a different employee in a later revision',()=>{
  const s=source();s.publication.revisions.push({id:'r2',weekStart:'2030-10-07',revisionNumber:2});
  s.publication.shifts.push({...s.publication.shifts[0],id:'r2:s1',revisionId:'r2',employeeId:'someone-else'});
  expect(prepareScheduleCapture(s,scope).candidates).toEqual([]);
 });
 it.each(['employee','location','released','unpublished'] as const)('excludes %s assignments',kind=>{
  const s=source(),r=s.publication.shifts[0];
  if(kind==='employee')r.employeeId='someone-else';if(kind==='location')r.locationId='loc-2';
  if(kind==='released')r.isCalloutApproved=true;if(kind==='unpublished')r.revisionId='draft';
  expect(prepareScheduleCapture(s,scope).candidates).toEqual([]);
 });
 it('retains all overlapping candidates for explicit ambiguity instead of selecting the first',()=>{
  const s=source();s.publication.shifts.push({...s.publication.shifts[0],id:'r1:s2',sourceShiftId:'s2'});
  expect(prepareScheduleCapture(s,scope).candidates).toHaveLength(2);
 });
 it('handles overnight shifts crossing Sunday into a new workweek',()=>{
  const s=source();s.publication.revisions=[{id:'r1',weekStart:'2030-09-30',revisionNumber:1}];
  Object.assign(s.publication.shifts[0],{date:'2030-10-06',startTime:'22:00:00',endTime:'06:00:00'});
  expect(only(s)).toMatchObject({startAt:'2030-10-07T02:00:00Z',endAt:'2030-10-07T10:00:00Z',uncertain:false});
 });
 it('handles end-of-day 24:00 without changing the scheduled business date',()=>{
  const s=source();s.publication.shifts[0].endTime='24:00:00';
  expect(only(s)).toMatchObject({date:'2030-10-07',endAt:'2030-10-08T04:00:00Z'});
 });
 it('preserves subsecond boundaries instead of rounding a scheduled match',()=>{
  const s=source();s.publication.shifts[0].startTime='08:00:00.123456';
  expect(only(s).startAt).toBe('2030-10-07T12:00:00.123456Z');
 });
 it('uses the actual non-hour timezone offset',()=>{
  expect(only(source(),'Asia/Kathmandu')).toMatchObject({startAt:'2030-10-07T02:15:00Z',endAt:'2030-10-07T10:15:00Z'});
 });
 it.each([
  {date:'2030-03-10',start:'02:30:00',end:'04:00:00',from:'2030-03-10T06:30:00Z',to:'2030-03-10T08:00:00Z'},
  {date:'2030-11-03',start:'01:30:00',end:'02:30:00',from:'2030-11-03T05:30:00Z',to:'2030-11-03T07:30:00Z'},
 ])('marks unresolved New York boundaries on $date without choosing an interpretation',({date,start,end,from,to})=>{
  const s=source();s.anchorDate=date;Object.assign(s.publication.shifts[0],{date,startTime:start,endTime:end});
  expect(only(s,'America/New_York')).toMatchObject({startAt:from,endAt:to,uncertain:true});
 });
 it('a shift spanning DST with unambiguous endpoints has real elapsed boundaries',()=>{
  const s=source();s.anchorDate='2030-03-10';Object.assign(s.publication.shifts[0],{date:s.anchorDate,startTime:'00:00:00',endTime:'04:00:00'});
  expect(only(s,'America/New_York')).toMatchObject({startAt:'2030-03-10T05:00:00Z',endAt:'2030-03-10T08:00:00Z',uncertain:false});
 });
 it('does not copy private notes or peer metadata into prepared candidates',()=>{
  const s=source();Object.assign(s.publication.shifts[0],{notes:'Private medical note',phone:'555',employeeName:'Private Name'});
  expect(JSON.stringify(prepareScheduleCapture(s,scope).candidates)).not.toMatch(/Private|555|employeeId|locationId/);
 });
 it('supports a legitimately positionless published shift',()=>{
  const s=source();s.publication.shifts[0].positionId=null;s.publication.shifts[0].positionName=null;
  expect(only(s)).toMatchObject({positionId:null,positionName:null});
 });
 it.each(['equal','invalid-time','invalid-date','invalid-zone'] as const)('rejects corrupt %s source instead of silently claiming unmatched',kind=>{
  const s=source();let zone=scope.timeZone;
  if(kind==='equal')s.publication.shifts[0].endTime='08:00:00';
  if(kind==='invalid-time')s.publication.shifts[0].startTime='25:00';
  if(kind==='invalid-date')s.publication.shifts[0].date='2030-02-30';
  if(kind==='invalid-zone')zone='Invalid/Zone';
  expect(()=>prepareScheduleCapture(s,{...scope,timeZone:zone})).toThrow();
 });
});

describe('C6 schedule-context finalization',()=>{
 it('uses half-open exact schedule boundaries without an attendance tolerance',()=>{
  const prepared=prepareScheduleCapture(source(),scope),candidate=prepared.candidates[0];
  expect(captureScheduleContext(prepared,candidate.startAt)).toMatchObject({
   status:'MATCHED',candidateCount:1,reason:null,match:{revisionId:'r1',sourceShiftId:'s1',positionName:'Barista'}
  });
  expect(captureScheduleContext(prepared,candidate.endAt)).toMatchObject({
   status:'UNMATCHED',candidateCount:0,reason:'NO_MATCH',match:null
  });
 });
 it('keeps overlapping certain shifts ambiguous rather than choosing one',()=>{
  const overlap=source();
  overlap.publication.shifts.push({...overlap.publication.shifts[0],id:'r1:s2',sourceShiftId:'s2'});
  expect(captureScheduleContext(prepareScheduleCapture(overlap,scope),'2030-10-07T13:00:00Z')).toMatchObject({
   status:'AMBIGUOUS',candidateCount:2,reason:'OVERLAPPING_SHIFTS',match:null
  });
 });
 it('keeps a DST-fold envelope ambiguous instead of picking an offset',()=>{
  const fold=source();fold.anchorDate='2030-11-03';
  Object.assign(fold.publication.shifts[0],{date:'2030-11-03',startTime:'01:30:00',endTime:'02:30:00'});
  expect(captureScheduleContext(
   prepareScheduleCapture(fold,{...scope,timeZone:'America/New_York'}),
   '2030-11-03T06:00:00Z'
  )).toMatchObject({status:'AMBIGUOUS',candidateCount:1,reason:'UNRESOLVED_LOCAL_TIME',match:null});
 });
});

it('rejects a clock instant outside the reviewed schedule window instead of guessing unmatched',()=>{
 const prepared=prepareScheduleCapture(source(),scope);
 expect(()=>captureScheduleContext(prepared,'2030-10-10T12:00:00Z')).toThrow('reviewed schedule window');
});

it('reviews the preceding week for an overnight shift entering the earliest captured day',()=>{
 const input=source();input.anchorDate='2030-10-08';
 expect(prepareScheduleCapture(input,scope).reviewedWeekStarts).toEqual(['2030-09-30','2030-10-07']);
});

describe('Owner early clock-in grace',()=>{
 // The fixture shift is 08:00–16:00 in Puerto Rico: 12:00Z–20:00Z.
 const row=(id:string,startTime:string,endTime:string)=>({...source().publication.shifts[0],id:'r1:'+id,sourceShiftId:id,startTime,endTime});
 const shifts=(...rows:ReturnType<typeof row>[])=>{const s=source();s.publication.shifts=rows;return s;};
 const capture=(input:PublishedScheduleSource,at:string,grace?:number,zone=scope.timeZone)=>
  captureScheduleContext(prepareScheduleCapture(input,{...scope,timeZone:zone},grace),at);
 it('grace 0 leaves the prepared capture and the captured context exactly as strict matching',()=>{
  expect(prepareScheduleCapture(source(),scope,0)).toEqual(prepareScheduleCapture(source(),scope));
  expect(prepareScheduleCapture(source(),scope,0)).not.toHaveProperty('earlyGraceMinutes');
  const early=capture(source(),'2030-10-07T11:59:59.999999Z',0);
  expect(early).toEqual({version:1,status:'UNMATCHED',timeZone:scope.timeZone,capturedAt:'2030-10-07T11:59:59.999999Z',
   candidateCount:0,reviewedRevisionIds:['r1'],reason:'NO_MATCH',match:null});
  expect(JSON.stringify(capture(source(),'2030-10-07T12:00:00Z',0))).toBe(JSON.stringify(capture(source(),'2030-10-07T12:00:00Z')));
 });
 it('grace 10: a punch exactly 10:00 early matches that shift as if it were at the start, and keeps the actual instant',()=>{
  const prepared=prepareScheduleCapture(source(),scope,10);
  expect(prepared).toMatchObject({earlyGraceMinutes:10,candidates:[{startAt:'2030-10-07T12:00:00Z'}]});
  const early=captureScheduleContext(prepared,'2030-10-07T11:50:00Z'),atStart=captureScheduleContext(prepared,'2030-10-07T12:00:00Z');
  expect(early).toEqual({version:1,status:'MATCHED',timeZone:scope.timeZone,capturedAt:'2030-10-07T11:50:00Z',candidateCount:1,
   reviewedRevisionIds:['r1'],reason:null,earlyGraceMinutes:10,match:{revisionId:'r1',revisionNumber:1,publishedShiftId:'r1:s1',
    sourceShiftId:'s1',scheduleId:'schedule',positionId:'p1',positionName:'Barista'}});
  expect({...early,capturedAt:atStart.capturedAt}).toEqual(atStart);
 });
 it('grace 10: 10:01 early is outside the window and UNMATCHED, with the grace that was in effect kept',()=>{
  expect(capture(source(),'2030-10-07T11:49:59Z',10)).toEqual({version:1,status:'UNMATCHED',timeZone:scope.timeZone,
   capturedAt:'2030-10-07T11:49:59Z',candidateCount:0,reviewedRevisionIds:['r1'],reason:'NO_MATCH',earlyGraceMinutes:10,match:null});
  expect(capture(source(),'2030-10-07T11:49:59.999999Z',10)).toMatchObject({status:'UNMATCHED'});
 });
 it('grace changes only the start: the end stays exclusive and the shift itself still matches',()=>{
  expect(capture(source(),'2030-10-07T19:59:59Z',10)).toMatchObject({status:'MATCHED',earlyGraceMinutes:10});
  expect(capture(source(),'2030-10-07T20:00:00Z',10)).toMatchObject({status:'UNMATCHED',reason:'NO_MATCH'});
 });
 it('a punch in the grace window of a back-to-back shift, still inside the previous shift, is AMBIGUOUS',()=>{
  const backToBack=shifts(row('morning','08:00:00','12:00:00'),row('afternoon','12:00:00','16:00:00'));
  expect(capture(backToBack,'2030-10-07T15:55:00Z',10)).toMatchObject({status:'AMBIGUOUS',reason:'OVERLAPPING_SHIFTS',candidateCount:2,match:null,earlyGraceMinutes:10});
  // Strict matching is unchanged: the same punch belongs to the morning shift.
  expect(capture(backToBack,'2030-10-07T15:55:00Z')).toMatchObject({status:'MATCHED',match:{sourceShiftId:'morning'}});
  expect(capture(backToBack,'2030-10-07T15:55:00Z',0)).not.toHaveProperty('earlyGraceMinutes');
  // Once the morning shift has ended, the afternoon start is unambiguous.
  expect(capture(backToBack,'2030-10-07T16:00:00Z',10)).toMatchObject({status:'MATCHED',match:{sourceShiftId:'afternoon'}});
 });
 it('two shifts whose grace windows overlap are AMBIGUOUS, never an arbitrary pick',()=>{
  // 08:00–08:03 and 08:05–16:00: grace windows 07:50–08:00 and 07:55–08:05 overlap from 07:55.
  const close=shifts(row('first','08:00:00','08:03:00'),row('second','08:05:00','16:00:00'));
  expect(capture(close,'2030-10-07T11:52:00Z',10)).toMatchObject({status:'MATCHED',match:{sourceShiftId:'first'}});
  expect(capture(close,'2030-10-07T11:57:00Z',10)).toMatchObject({status:'AMBIGUOUS',reason:'OVERLAPPING_SHIFTS',candidateCount:2,match:null});
  expect(capture(close,'2030-10-07T12:01:00Z',10)).toMatchObject({status:'AMBIGUOUS',reason:'OVERLAPPING_SHIFTS',candidateCount:2,match:null});
  expect(capture(close,'2030-10-07T12:04:00Z',10)).toMatchObject({status:'MATCHED',match:{sourceShiftId:'second'}});
 });
 it.each([
  {date:'2030-11-03',start:'01:30:00',end:'02:30:00',inGrace:'2030-11-03T05:25:00Z'},
  {date:'2030-03-10',start:'02:30:00',end:'04:00:00',inGrace:'2030-03-10T06:25:00Z'},
 ])('an unresolved local-time candidate reached through grace on $date stays AMBIGUOUS',({date,start,end,inGrace})=>{
  const s=source();s.anchorDate=date;Object.assign(s.publication.shifts[0],{date,startTime:start,endTime:end});
  expect(capture(s,inGrace,10,'America/New_York')).toMatchObject({status:'AMBIGUOUS',reason:'UNRESOLVED_LOCAL_TIME',candidateCount:1,match:null,earlyGraceMinutes:10});
  expect(capture(s,inGrace,0,'America/New_York')).toMatchObject({status:'UNMATCHED',reason:'NO_MATCH'});
 });
 it('reviews a shift whose grace window, though not its start, falls inside the reviewed window',()=>{
  // The window ends at 2030-10-09T04:00Z; this shift starts 00:05 local (04:05Z) on 2030-10-09.
  const late=shifts({...row('next','00:05:00','08:00:00'),date:'2030-10-09'});
  expect(prepareScheduleCapture(late,scope).candidates).toEqual([]);
  expect(prepareScheduleCapture(late,scope,10).candidates).toHaveLength(1);
  expect(capture(late,'2030-10-09T03:58:00Z',10)).toMatchObject({status:'MATCHED',match:{sourceShiftId:'next'}});
 });
 it.each([-1,31,1.5,Number.NaN,'10' as unknown as number])('rejects grace %s instead of guessing a tolerance',grace=>{
  expect(()=>prepareScheduleCapture(source(),scope,grace)).toThrow('Invalid early clock-in grace');
  const prepared={...prepareScheduleCapture(source(),scope),earlyGraceMinutes:grace};
  expect(()=>captureScheduleContext(prepared,'2030-10-07T12:00:00Z')).toThrow('Invalid early clock-in grace');
 });
 it('accepts the 30-minute maximum',()=>{
  expect(capture(source(),'2030-10-07T11:30:00Z',30)).toMatchObject({status:'MATCHED',earlyGraceMinutes:30});
  expect(capture(source(),'2030-10-07T11:29:59Z',30)).toMatchObject({status:'UNMATCHED',earlyGraceMinutes:30});
 });
});
