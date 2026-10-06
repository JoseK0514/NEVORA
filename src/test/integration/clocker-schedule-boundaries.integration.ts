import { createHash, randomUUID } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { afterEach, beforeEach, expect, it } from 'vitest';
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
