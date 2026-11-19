import { createHash, randomUUID } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { afterEach, beforeEach, expect, it } from '@rstest/core';
import { createPunchFixture } from './clocker-punch-fixture';
import { prepareScheduleCapture, captureScheduleContext } from '../../lib/clocker/schedule-candidates';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import { parsePunchCommand } from '../../lib/clocker/punch-command';

let f: Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async()=>{f=await createPunchFixture({breaks:true});});
afterEach(async()=>{if(f)await f.db.dispose();});

it.each([
 {name:'inclusive microsecond',date:'2030-10-07',start:'08:00:00.123456',end:'16:00:00',at:'2030-10-07T12:00:00.123456Z',zone:'America/Puerto_Rico',status:'MATCHED'},
 {name:'before microsecond',date:'2030-10-07',start:'08:00:00.123456',end:'16:00:00',at:'2030-10-07T12:00:00.123455Z',zone:'America/Puerto_Rico',status:'UNMATCHED'},
 {name:'exclusive end',date:'2030-10-07',start:'08:00:00',end:'16:00:00',at:'2030-10-07T20:00:00Z',zone:'America/Puerto_Rico',status:'UNMATCHED'},
 {name:'overnight week boundary',date:'2030-10-06',start:'22:00:00',end:'06:00:00',at:'2030-10-07T05:00:00Z',zone:'America/Puerto_Rico',status:'MATCHED'},
 {name:'DST fold',date:'2030-11-03',start:'01:30:00',end:'02:30:00',at:'2030-11-03T06:00:00Z',zone:'America/New_York',status:'AMBIGUOUS'},
 {name:'DST gap',date:'2030-03-10',start:'02:30:00',end:'04:00:00',at:'2030-03-10T07:00:00Z',zone:'America/New_York',status:'AMBIGUOUS'},
 {name:'unambiguous DST endpoints',date:'2030-03-10',start:'00:00:00',end:'04:00:00',at:'2030-03-10T06:00:00Z',zone:'America/New_York',status:'MATCHED'},
 {name:'non-hour offset',date:'2030-10-07',start:'08:00:00',end:'16:00:00',at:'2030-10-07T03:00:00Z',zone:'Asia/Kathmandu',status:'MATCHED'},
])('SQL capture preserves $name without rounding or selecting an uncertain offset',async v=>{
 await f.q('UPDATE workspaces SET time_zone=$1 WHERE id=$2',[v.zone,'workspace-fuel']);
 const day=Temporal.PlainDate.from(v.date),week=day.subtract({days:day.dayOfWeek-1}).toString();
 const prepared=prepareScheduleCapture({anchorDate:v.date,publication:{revisions:[{id:'r',weekStart:week,revisionNumber:1}],shifts:[{
  id:'snapshot-row',revisionId:'r',sourceShiftId:null,scheduleId:'schedule',employeeId:'c34-a',locationId:'loc-1',date:v.date,
  startTime:v.start,endTime:v.end,positionId:null,positionName:null,isCalloutApproved:false,
 }]}},{employeeId:'c34-a',locationId:'loc-1',workspaceId:'workspace-fuel',timeZone:v.zone});
 const [row]=await f.q<{context:ReturnType<typeof captureScheduleContext>}>('SELECT clocker_resolve_schedule_context($1::jsonb,$2,$3,$4::timestamptz) AS context',
  [JSON.stringify(prepared),'c34-a','loc-1',v.at]);
 expect(row.context.status).toBe(v.status);
 expect(Temporal.Instant.from(row.context.capturedAt).epochNanoseconds).toBe(Temporal.Instant.from(v.at).epochNanoseconds);
 expect({...row.context,capturedAt:Temporal.Instant.from(row.context.capturedAt).toString()}).toEqual(captureScheduleContext(prepared,v.at));
 if(v.status==='MATCHED')expect(row.context.match).toMatchObject({publishedShiftId:'snapshot-row',sourceShiftId:null,positionId:null,positionName:null});
});

it('replays an actual pre-C6 engine receipt without backfilling its absent context',async()=>{
 const identity=await f.identity(),service=new ClockerPunchService(f.key,f.db.executor),view=await service.read(identity.proof);
 const c=parsePunchCommand({commandId:randomUUID(),action:'CLOCK_IN',verificationId:view.verificationId,
  expected:{revision:0,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}});
 const hash=createHash('sha256').update(JSON.stringify(['nevora-punch-command-v1',identity.proof.employeeId,c])).digest('hex');
 // The unchanged legacy SQL engine produces the real earlier-format receipt. No C6 setting is supplied.
 const [saved]=await f.q<{value:unknown}>('SELECT clocker_apply_punch($1,$2,$3,$4,$5::uuid,$6,$7::jsonb,$8) AS value',[
  identity.proof.employeeId,identity.proof.device.deviceId,identity.proof.device.locationId,identity.proof.device.credentialVersion,
  c.commandId,c.action,JSON.stringify(c.expected),hash,
 ]);
 expect(await f.q('SELECT schedule_context FROM time_entries')).toEqual([{schedule_context:null}]);
 expect(await service.execute(identity.proof,c)).toEqual(saved.value);
 expect(await f.q('SELECT schedule_context FROM time_entries')).toEqual([{schedule_context:null}]);
 expect(await f.q('SELECT count(*)::int AS count FROM clocker_command_ledger')).toEqual([{count:1}]);
});

// Owner early clock-in grace (migration 0069): the SQL resolver and captureScheduleContext agree, and the resolver only
// applies a grace above 0 that equals the persisted setting.
const graceScope={employeeId:'c34-a',locationId:'loc-1',workspaceId:'workspace-fuel',timeZone:'America/Puerto_Rico'};
const graceShift=(id:string,start:string,end:string)=>({id,revisionId:'r',sourceShiftId:id,scheduleId:'schedule',employeeId:'c34-a',
 locationId:'loc-1',date:'2030-10-07',startTime:start,endTime:end,positionId:null,positionName:null,isCalloutApproved:false});
const graceSource=(...shifts:ReturnType<typeof graceShift>[])=>({anchorDate:'2030-10-07',publication:{revisions:[{id:'r',weekStart:'2030-10-07',revisionNumber:1}],shifts}});
const saveGrace=(minutes:number,version=1)=>version===1
 ?f.q("INSERT INTO clocker_schedule_match_policy(workspace_id,version,early_clock_in_grace_minutes,updated_by) VALUES('workspace-fuel',1,$1,'c34-owner')",[minutes])
 :f.q("UPDATE clocker_schedule_match_policy SET version=$2,early_clock_in_grace_minutes=$1,updated_by='c34-owner' WHERE workspace_id='workspace-fuel'",[minutes,version]);
const resolve=async(prepared:unknown,at:string)=>(await f.q<{context:ReturnType<typeof captureScheduleContext>}>(
 'SELECT clocker_resolve_schedule_context($1::jsonb,$2,$3,$4::timestamptz) AS context',[JSON.stringify(prepared),'c34-a','loc-1',at]))[0].context;
const comparable=(context:ReturnType<typeof captureScheduleContext>)=>({...context,capturedAt:Temporal.Instant.from(context.capturedAt).toString()});

it.each([
 {name:'grace window start',grace:10,at:'2030-10-07T11:50:00Z',status:'MATCHED'},
 {name:'one microsecond outside the grace window',grace:10,at:'2030-10-07T11:49:59.999999Z',status:'UNMATCHED'},
 {name:'10:01 early',grace:10,at:'2030-10-07T11:49:59Z',status:'UNMATCHED'},
 {name:'maximum grace',grace:30,at:'2030-10-07T11:30:00Z',status:'MATCHED'},
 {name:'exclusive end under grace',grace:10,at:'2030-10-07T20:00:00Z',status:'UNMATCHED'},
])('SQL capture applies the persisted early grace exactly like TypeScript: $name',async v=>{
 await saveGrace(v.grace);
 const prepared=prepareScheduleCapture(graceSource(graceShift('day','08:00:00','16:00:00')),graceScope,v.grace);
 const context=await resolve(prepared,v.at);
 expect(context.status).toBe(v.status);
 expect(context.earlyGraceMinutes).toBe(v.grace);
 expect(comparable(context)).toEqual(captureScheduleContext(prepared,v.at));
});

it('SQL keeps back-to-back and overlapping grace windows ambiguous exactly like TypeScript',async()=>{
 await saveGrace(10);
 const backToBack=prepareScheduleCapture(graceSource(graceShift('morning','08:00:00','12:00:00'),graceShift('afternoon','12:00:00','16:00:00')),graceScope,10);
 const close=prepareScheduleCapture(graceSource(graceShift('first','08:00:00','08:03:00'),graceShift('second','08:05:00','16:00:00')),graceScope,10);
 for(const [prepared,at,status] of [[backToBack,'2030-10-07T15:55:00Z','AMBIGUOUS'],[backToBack,'2030-10-07T16:00:00Z','MATCHED'],
  [close,'2030-10-07T11:57:00Z','AMBIGUOUS'],[close,'2030-10-07T12:04:00Z','MATCHED']] as const){
  const context=await resolve(prepared,at);
  expect(context.status).toBe(status);expect(comparable(context)).toEqual(captureScheduleContext(prepared,at));
 }
});

it('SQL keeps an unresolved local-time candidate reached through grace ambiguous',async()=>{
 await f.q("UPDATE workspaces SET time_zone='America/New_York' WHERE id='workspace-fuel'");await saveGrace(10);
 const prepared=prepareScheduleCapture({anchorDate:'2030-11-03',publication:{revisions:[{id:'r',weekStart:'2030-10-28',revisionNumber:1}],
  shifts:[{...graceShift('fold','01:30:00','02:30:00'),date:'2030-11-03'}]}},{...graceScope,timeZone:'America/New_York'},10);
 const context=await resolve(prepared,'2030-11-03T05:25:00Z');
 expect(context).toMatchObject({status:'AMBIGUOUS',reason:'UNRESOLVED_LOCAL_TIME',earlyGraceMinutes:10});
 expect(comparable(context)).toEqual(captureScheduleContext(prepared,'2030-11-03T05:25:00Z'));
});

it('SQL refuses a grace the Owner has not saved, while strict capture never needs the setting',async()=>{
 const strict=prepareScheduleCapture(graceSource(graceShift('day','08:00:00','16:00:00')),graceScope);
 const graced=prepareScheduleCapture(graceSource(graceShift('day','08:00:00','16:00:00')),graceScope,10);
 await expect(resolve(graced,'2030-10-07T11:55:00Z')).rejects.toThrow('clocker_punch_SCHEDULE_CHANGED');
 await saveGrace(5);
 await expect(resolve(graced,'2030-10-07T11:55:00Z')).rejects.toThrow('clocker_punch_SCHEDULE_CHANGED');
 for(const forged of [31,'10',1.5,-1,null])await expect(resolve({...graced,earlyGraceMinutes:forged},'2030-10-07T11:55:00Z')).rejects.toThrow('clocker_punch_SCHEDULE_CHANGED');
 // A capture prepared without grace (a failed read, or older code) stays strict even though 5 is saved.
 const context=await resolve(strict,'2030-10-07T11:55:00Z');
 expect(context).toMatchObject({status:'UNMATCHED',reason:'NO_MATCH'});expect(context).not.toHaveProperty('earlyGraceMinutes');
 expect(comparable(context)).toEqual(captureScheduleContext(strict,'2030-10-07T11:55:00Z'));
 expect(await resolve({...strict,earlyGraceMinutes:0},'2030-10-07T11:55:00Z')).toEqual(context);
});

it('Owner grace rows are versioned, audited with actor and time, Owner-only and never deleted',async()=>{
 await expect(f.q("INSERT INTO clocker_schedule_match_policy(workspace_id,version,early_clock_in_grace_minutes,updated_by) VALUES('workspace-fuel',2,10,'c34-owner')")).rejects.toThrow('clocker_grace_STALE');
 await expect(f.q("INSERT INTO clocker_schedule_match_policy(workspace_id,version,early_clock_in_grace_minutes,updated_by) VALUES('workspace-fuel',1,10,'c34-a')")).rejects.toThrow('clocker_grace_FORBIDDEN');
 await expect(saveGrace(31)).rejects.toMatchObject({code:'23514'});
 await saveGrace(10);await saveGrace(5,2);
 await expect(saveGrace(7,4)).rejects.toThrow('clocker_grace_STALE');
 expect(await f.q(`SELECT version,actor_employee_id AS actor,previous_grace_minutes AS previous,early_clock_in_grace_minutes AS minutes,
  occurred_at IS NOT NULL AS timed FROM clocker_schedule_match_policy_revisions ORDER BY version`)).toEqual([
  {version:1,actor:'c34-owner',previous:0,minutes:10,timed:true},{version:2,actor:'c34-owner',previous:10,minutes:5,timed:true}]);
 await expect(f.q('DELETE FROM clocker_schedule_match_policy')).rejects.toThrow('clocker_grace_IMMUTABLE');
 await expect(f.q('TRUNCATE clocker_schedule_match_policy')).rejects.toThrow();
 await expect(f.q('UPDATE clocker_schedule_match_policy_revisions SET early_clock_in_grace_minutes=0')).rejects.toMatchObject({code:'23514'});
 await expect(f.q('DELETE FROM clocker_schedule_match_policy_revisions')).rejects.toMatchObject({code:'23514'});
 await expect(f.q('TRUNCATE clocker_schedule_match_policy_revisions')).rejects.toThrow();
 expect(await f.q('SELECT early_clock_in_grace_minutes AS minutes,version FROM clocker_schedule_match_policy')).toEqual([{minutes:5,version:2}]);
});
