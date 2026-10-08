import {afterEach,beforeEach,expect,it} from 'vitest';
import {createDisposableFoundationDatabase} from './local-postgres';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {Client} from 'pg';
import {calendarAuthority,manageEmployeeCalendarSubscription,readCalendarFeed} from '../../lib/calendar/service.server';
import {publishScheduleWithRevision} from '../../lib/data/publication-revisions';
import {commitPublishedWeekChange} from '../../lib/data/notification-transactions';
import {businessDate} from '../../lib/business-time';
import {addDays,weekStartFor} from '../../lib/date-utils';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const q=(text:string,values:unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
beforeEach(async()=>{db=await createDisposableFoundationDatabase({mode:'current-runtime'});});
afterEach(async()=>{await db?.dispose();});
it('publication and label sources share committed calendar serial metadata',async()=>{
 const rows=await q("SELECT table_name,column_name FROM information_schema.columns WHERE table_name IN ('locations','schedule_publication_revisions') AND column_name IN ('calendar_serial','calendar_modified_at') ORDER BY table_name,column_name");
 expect(rows).toHaveLength(4);
});
it('removal projection has canonical source references without copied schedule body',async()=>{
 expect(await q("SELECT to_regclass('calendar_removals')::text AS name")).toEqual([{name:'calendar_removals'}]);
 expect(await q("SELECT column_name FROM information_schema.columns WHERE table_name='calendar_removals' AND column_name IN ('notes','reason','recipient','start_time','end_time','body')")).toEqual([]);
});

const proof:SessionMutationProof={employee:{id:'calendar-self',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const owner:SessionMutationProof={employee:{id:'calendar-owner',firstName:'Fictional',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
async function seed(requestedDate?:string,includeSecondLocation=true){
 await q("UPDATE locations SET name='Fictional main office',short_name='Main Office' WHERE id='loc-1'");
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('calendar-owner','Fictional','Owner','555-0100','OWNER','loc-1'),('calendar-self','Fictional','Self','555-0101','EMPLOYEE','loc-1'),('calendar-other','Fictional','Other','555-0102','EMPLOYEE','loc-1')");
 await q("INSERT INTO employee_location_eligibility VALUES('calendar-self','loc-1')");if(includeSecondLocation)await q("INSERT INTO employee_location_eligibility VALUES('calendar-self','loc-2')");
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'calendar-owner',now()+interval '1 day'),(repeat('b',64),'calendar-self',now()+interval '1 day')");
 const date=requestedDate??addDays(businessDate(new Date(),'America/Puerto_Rico'),1),week=weekStartFor(date);
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('calendar-schedule','loc-1',$1,'DRAFT','calendar-owner')",[week]);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('calendar-shift','calendar-schedule','calendar-self',$1,'08:00','16:00','PRIVATE NOTE'),('calendar-coworker','calendar-schedule','calendar-other',$1,'09:00','17:00','PRIVATE COWORKER')",[date]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:owner.employee.id,proof:owner},db.executor);
 const created=await manageEmployeeCalendarSubscription(proof,{kind:'ISSUE',operationId:randomUUID(),authority:calendarAuthority(proof),expectedGeneration:null},db.executor);expect(created.status).toBe('created');if(created.status!=='created')throw Error('No capability');return {token:created.url.split('/')[3],date,week,created};
}
it('own published events carry opaque stable identity committed serial and no private fields',async()=>{
 const {token,date}=await seed();const result=await readCalendarFeed(token,db.executor);expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('No feed');expect(result.events).toHaveLength(1);expect(result.events[0]).toMatchObject({summary:'Work shift',location:'Main Office',startAt:date+'T12:00:00.000Z',endAt:date+'T20:00:00.000Z'});expect(result.events[0].sequence).toBeGreaterThan(0);expect(JSON.stringify(result)).not.toMatch(/PRIVATE|calendar-self|calendar-other|calendar-shift/);expect((await readCalendarFeed(token,db.executor))).toMatchObject({events:result.events});
});
it('label rename and republish increase sequence while preserving UID and original history',async()=>{
 const {token,week,created}=await seed();const read=()=>readCalendarFeed(token,db.executor);const first=await read();if(first.state!=='ready')throw Error('No feed');const original=await q('SELECT id,created_at,revision_number FROM schedule_publication_revisions ORDER BY id');
 await q("UPDATE locations SET short_name='Café 😀; new\nINJECTION' WHERE id='loc-1'");const renamed=await read();if(renamed.state!=='ready')throw Error('No feed');expect(renamed.events[0].uid).toBe(first.events[0].uid);expect(renamed.events[0].sequence).toBeGreaterThan(first.events[0].sequence);
 await q("UPDATE shifts SET start_time='10:00' WHERE id='calendar-shift'");await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:owner.employee.id,proof:owner},db.executor);const resized=await read();if(resized.state!=='ready')throw Error('No feed');expect(resized.events[0].sequence).toBeGreaterThan(renamed.events[0].sequence);expect(resized.events[0].uid).toBe(first.events[0].uid);expect(await q('SELECT id,created_at,revision_number FROM schedule_publication_revisions WHERE id=$1',[original[0].id])).toEqual(original);
 const rotated=await manageEmployeeCalendarSubscription(proof,{kind:'ROTATE',operationId:randomUUID(),authority:calendarAuthority(proof),expectedGeneration:created.generation},db.executor);if(rotated.status!=='created')throw Error('No replacement');const after=await readCalendarFeed(rotated.url.split('/')[3],db.executor);if(after.state!=='ready')throw Error('No feed');expect(after.events[0]).toEqual(resized.events[0]);
});
it('reassignment cancellation references former own boundaries without recipient or location disclosure and own return suppresses it',async()=>{
 const {token,week}=await seed();const initial=await readCalendarFeed(token,db.executor);if(initial.state!=='ready')throw Error('No feed');
 await q("UPDATE shifts SET employee_id='calendar-other' WHERE id='calendar-shift'");await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:owner.employee.id,proof:owner},db.executor);
 const removed=await readCalendarFeed(token,db.executor);if(removed.state!=='ready')throw Error('No feed');expect(removed.events).toHaveLength(1);expect(removed.events[0]).toMatchObject({uid:initial.events[0].uid,status:'CANCELLED',location:null,startAt:initial.events[0].startAt});expect(removed.events[0].sequence).toBeGreaterThan(initial.events[0].sequence);expect(JSON.stringify(removed)).not.toContain('calendar-other');expect((await q('SELECT count(*)::integer AS n FROM calendar_removals'))[0].n).toBe(1);
 await q("UPDATE shifts SET employee_id='calendar-self' WHERE id='calendar-shift'");await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:owner.employee.id,proof:owner},db.executor);const returned=await readCalendarFeed(token,db.executor);if(returned.state!=='ready')throw Error('No feed');expect(returned.events).toHaveLength(1);expect(returned.events[0].status).toBe('CONFIRMED');expect(returned.events[0].uid).toBe(initial.events[0].uid);
});
it('callout release produces canonical cancellation in the same published batch',async()=>{
 const {token,week}=await seed();
 const {currentShiftTermsSql,currentShiftFingerprintSql}=await import('../../lib/data/shift-change-release');
 await commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:owner.employee.id,sourceType:'CALLOUT',build:state=>({afterSchedules:state.schedules,afterShifts:state.shifts.map(row=>row.sourceShiftId==='calendar-shift'?{...row,isCalloutApproved:true}:row),statements:[{text:`INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status,legacy_manual,assignment_episode_id,source_terms,reviewed_terms_fingerprint) SELECT 'calendar-callout',sh.id,sh.employee_id,'OTHER','APPROVED',false,sh.assignment_episode_id,${currentShiftTermsSql()},${currentShiftFingerprintSql()} FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id='calendar-shift'`,values:[]}]})},db.executor);
 const result=await readCalendarFeed(token,db.executor);expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('No feed');expect(result.events).toHaveLength(1);expect(result.events[0]).toMatchObject({status:'CANCELLED',location:null});expect(await q('SELECT count(*)::integer AS n FROM calendar_removals')).toEqual([{n:1}]);
});
it('revocation between observation and final authority check suppresses every event',async()=>{
 const {token}=await seed();let observed=false;const executor={...db.executor,transaction:async(statements:Parameters<typeof db.executor.transaction>[0],signal?:AbortSignal)=>{if(observed)await q("UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason='test' WHERE revoked_at IS NULL");const results=await db.executor.transaction(statements,signal);if(statements.some(s=>s.text.includes('calendar_feed_observation')))observed=true;return results;}};
 expect((await readCalendarFeed(token,executor)).state).toBe('unauthorized');expect(observed).toBe(true);
});
it('missing canonical publication metadata fails closed instead of borrowing label metadata',async()=>{
 const {token}=await seed();await q('DELETE FROM schedule_publication_revisions');expect((await readCalendarFeed(token,db.executor)).state).toBe('unavailable');
});
it('30 past through 180 future workspace dates retain full overlapping overnight boundaries',async()=>{
 const {token}=await seed(),today=businessDate(new Date(),'America/Puerto_Rico');await q("DELETE FROM shifts WHERE id='calendar-shift'");
 const offsets=[-32,-31,-30,180,181];for(const offset of offsets)await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES($1,'calendar-schedule','calendar-self',$2,'23:00','02:00')",['boundary-'+offset,addDays(today,offset)]);
 const result=await readCalendarFeed(token,db.executor);expect(result.state).toBe('ready');if(result.state!=='ready')throw Error('No feed');expect(result.events).toHaveLength(3);expect(result.events.map(e=>e.startAt).sort()).toEqual([-31,-30,180].map(n=>addDays(addDays(today,n),1)+'T03:00:00.000Z').sort());expect(result.events.every(e=>Date.parse(e.endAt)-Date.parse(e.startAt)===3*3600000)).toBe(true);
});
it('resource overflow returns unavailable with no truncated success',async()=>{
 const {token,date}=await seed();await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) SELECT 'overflow-'||n,'calendar-schedule','calendar-self',$1,'08:00','16:00' FROM generate_series(1,500) n",[date]);expect((await readCalendarFeed(token,db.executor)).state).toBe('unavailable');
});
it('own cross-week moves both directions retain UID and increase global sequence',async()=>{
 const {token,week,date}=await seed();const initial=await readCalendarFeed(token,db.executor);if(initial.state!=='ready')throw Error('No feed');const destination=addDays(week,7);
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('calendar-destination','loc-1',$1,'DRAFT','calendar-owner')",[destination]);await q("UPDATE shifts SET schedule_id='calendar-destination',date=$1 WHERE id='calendar-shift'",[addDays(date,7)]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:destination,managerId:owner.employee.id,proof:owner},db.executor);await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:owner.employee.id,proof:owner},db.executor);
 const moved=await readCalendarFeed(token,db.executor);if(moved.state!=='ready')throw Error('No feed');expect(moved.events).toHaveLength(1);expect(moved.events[0].uid).toBe(initial.events[0].uid);expect(moved.events[0].sequence).toBeGreaterThan(initial.events[0].sequence);
 await q("UPDATE shifts SET schedule_id='calendar-schedule',date=$1 WHERE id='calendar-shift'",[date]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:owner.employee.id,proof:owner},db.executor);await publishScheduleWithRevision({locationId:'loc-1',weekStart:destination,managerId:owner.employee.id,proof:owner},db.executor);const returned=await readCalendarFeed(token,db.executor);if(returned.state!=='ready')throw Error('No feed');expect(returned.events).toHaveLength(1);expect(returned.events[0].uid).toBe(initial.events[0].uid);expect(returned.events[0].sequence).toBeGreaterThan(moved.events[0].sequence);
});
it('failed publication rolls back serial allocation snapshots and cancellation references atomically',async()=>{
 const {week}=await seed();const before=await q('SELECT * FROM calendar_clock');const revisions=await q('SELECT id FROM schedule_publication_revisions');const snapshots=await q('SELECT id FROM schedule_publication_revision_shifts');
 const failing={...db.executor,transaction:(statements:Parameters<typeof db.executor.transaction>[0])=>db.executor.transaction([...statements,{text:"SELECT 'fixture_rollback'::integer",values:[]}])};
 await expect(commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:owner.employee.id,sourceType:'MANAGER_MUTATION',proof:owner,build:state=>({afterSchedules:state.schedules,afterShifts:state.shifts.filter(s=>s.sourceShiftId!=='calendar-shift'),statements:[{text:"DELETE FROM shifts WHERE id='calendar-shift'",values:[]}]})},failing)).rejects.toThrow();
 expect(await q('SELECT * FROM calendar_clock')).toEqual(before);expect(await q('SELECT id FROM schedule_publication_revisions')).toEqual(revisions);expect(await q('SELECT id FROM schedule_publication_revision_shifts')).toEqual(snapshots);expect(await q('SELECT * FROM calendar_removals')).toEqual([]);expect(await q("SELECT id FROM shifts WHERE id='calendar-shift'")).toHaveLength(1);
});
it('0022 upgrade backfills a deterministic shared serial without rewriting original publication or location values',async()=>{
 await db.dispose();db=await createDisposableFoundationDatabase({mode:'empty'});const files=(await readdir('db/migrations')).filter(f=>/^00\d\d_/.test(f)).sort();for(const file of files.slice(0,22))await q(await readFile(join('db/migrations',file),'utf8'));
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('history-owner','Fictional','Owner','555-0100','OWNER','loc-1');UPDATE locations SET updated_at='2020-01-01T00:00:00Z';INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by,created_at) VALUES('history-b','2020-01-06',1,'PUBLISH','history-owner','2020-01-01T00:00:00Z'),('history-a','2020-01-13',1,'PUBLISH','history-owner','2020-01-01T00:00:00Z')");
 const originals=await q("SELECT jsonb_build_object('publications',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM schedule_publication_revisions r),'locations',(SELECT jsonb_agg(to_jsonb(l) ORDER BY id) FROM locations l)) AS history");for(const file of files.slice(22))await q(await readFile(join('db/migrations',file),'utf8'));
 expect(await q("SELECT jsonb_build_object('publications',(SELECT jsonb_agg(to_jsonb(r)-'calendar_serial'-'calendar_modified_at' ORDER BY id) FROM schedule_publication_revisions r),'locations',(SELECT jsonb_agg(to_jsonb(l)-'calendar_serial'-'calendar_modified_at' ORDER BY id) FROM locations l)) AS history")).toEqual(originals);
 expect(await q("SELECT id,calendar_serial FROM locations UNION ALL SELECT id,calendar_serial FROM schedule_publication_revisions ORDER BY calendar_serial")).toEqual([{id:'loc-1',calendar_serial:1},{id:'loc-2',calendar_serial:2},{id:'history-a',calendar_serial:3},{id:'history-b',calendar_serial:4}]);
});
it('disjoint source writers serialize their commits through the shared clock and rolled-back stamps are invisible',async()=>{
 const first=new Client({connectionString:db.connectionString}),second=new Client({connectionString:db.connectionString});await first.connect();await second.connect();
 try{await first.query('BEGIN');await first.query("UPDATE locations SET short_name='Fictional first' WHERE id='loc-1'");const firstStamp=(await first.query("SELECT calendar_serial,calendar_modified_at FROM locations WHERE id='loc-1'")).rows[0];await second.query('BEGIN');let finished=false;const waiting=second.query("UPDATE locations SET short_name='Fictional second' WHERE id='loc-2'").then(()=>{finished=true;});await new Promise(resolve=>setTimeout(resolve,40));expect(finished).toBe(false);await first.query('COMMIT');await waiting;await second.query('COMMIT');const next=(await q("SELECT calendar_serial,calendar_modified_at::text at FROM locations WHERE id='loc-2'"))[0];expect(Number(next.calendar_serial)).toBeGreaterThan(firstStamp.calendar_serial);expect(Date.parse(String(next.at))).toBeGreaterThanOrEqual(firstStamp.calendar_modified_at.getTime());
  const clock=await q('SELECT * FROM calendar_clock');await first.query('BEGIN');await first.query("UPDATE locations SET short_name='Fictional rollback' WHERE id='loc-1'");await first.query('ROLLBACK');expect(await q('SELECT * FROM calendar_clock')).toEqual(clock);
 }finally{await first.query('ROLLBACK');await second.query('ROLLBACK');await first.end();await second.end();}
});
it('removal metadata is omitted after 60 days while canonical history is retained',async()=>{
 const {token,week}=await seed(addDays(businessDate(new Date(),'America/Puerto_Rico'),90));await q("UPDATE shifts SET employee_id='calendar-other' WHERE id='calendar-shift'");await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:owner.employee.id,proof:owner},db.executor);const history=await q('SELECT * FROM schedule_publication_revision_shifts ORDER BY id');
 const clockErrors:string[]=[];
 const at=(days:number)=>({...db.executor,transaction:(statements:Parameters<typeof db.executor.transaction>[0],signal?:AbortSignal)=>db.executor.transaction(statements.map(s=>s.text.includes('calendar_feed_observation')?{...s,text:s.text.replace('SELECT clock_timestamp() at',`SELECT (clock_timestamp()+interval '${days} days') AS at`)}:s),signal).catch(error=>{clockErrors.push(String(error.message));throw error;})});
 const retained=await readCalendarFeed(token,at(59));expect(clockErrors).toEqual([]);if(retained.state!=='ready')throw Error('No feed');expect(retained.events).toHaveLength(1);expect(retained.events[0].status).toBe('CANCELLED');const expired=await readCalendarFeed(token,at(61));expect(clockErrors).toEqual([]);if(expired.state!=='ready')throw Error('No feed');expect(expired.events).toEqual([]);expect(await q('SELECT * FROM schedule_publication_revision_shifts ORDER BY id')).toEqual(history);expect(await q('SELECT * FROM calendar_removals')).toHaveLength(1);
});
it('workspace daylight saving overnight conversion emits full absolute boundaries without payroll inference',async()=>{
 const {token}=await seed('2026-10-31');await q("UPDATE workspaces SET time_zone='America/New_York';UPDATE shifts SET start_time='22:00',end_time='06:00' WHERE id='calendar-shift'");const result=await readCalendarFeed(token,db.executor);if(result.state!=='ready')throw Error('No feed');expect(result.events[0]).toMatchObject({startAt:'2026-11-01T02:00:00.000Z',endAt:'2026-11-01T11:00:00.000Z'});expect(result.events[0]).not.toHaveProperty('paidMinutes');
});

it('move into newly added location cancels original scoped event until deliberate rotation includes the new scope',async()=>{
 const {token,week,created}=await seed(undefined,false);const initial=await readCalendarFeed(token,db.executor);if(initial.state!=='ready')throw Error('No feed');expect(initial.events).toHaveLength(1);
 await q("INSERT INTO employee_location_eligibility VALUES('calendar-self','loc-2')");await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('new-scope-schedule','loc-2',$1,'DRAFT','calendar-owner')",[week]);await q("UPDATE shifts SET schedule_id='new-scope-schedule' WHERE id='calendar-shift'");await publishScheduleWithRevision({locationId:'loc-2',weekStart:week,managerId:owner.employee.id,proof:owner},db.executor);
 const oldScope=await readCalendarFeed(token,db.executor);if(oldScope.state!=='ready')throw Error('No old scoped feed');expect(oldScope.events).toHaveLength(1);expect(oldScope.events[0]).toMatchObject({uid:initial.events[0].uid,status:'CANCELLED',location:null,startAt:initial.events[0].startAt});expect(oldScope.events[0].sequence).toBeGreaterThan(initial.events[0].sequence);
 const rotated=await manageEmployeeCalendarSubscription(proof,{kind:'ROTATE',operationId:randomUUID(),authority:calendarAuthority(proof),expectedGeneration:created.generation},db.executor);if(rotated.status!=='created')throw Error('No replacement');const newScope=await readCalendarFeed(rotated.url.split('/')[3],db.executor);if(newScope.state!=='ready')throw Error('No new scoped feed');expect(newScope.events).toHaveLength(1);expect(newScope.events[0]).toMatchObject({uid:initial.events[0].uid,status:'CONFIRMED'});expect(newScope.events[0].location).not.toBeNull();expect((await readCalendarFeed(token,db.executor)).state).toBe('unauthorized');
});
