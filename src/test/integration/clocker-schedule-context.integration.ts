import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import type { ClockerIdentityProof } from '../../lib/clocker/pin-identity.server';
import type { PunchAction, PunchCommand } from '../../lib/clocker/punch-types';
import type { SqlExecutor } from '../../lib/notifications/types';
let f:Awaited<ReturnType<typeof createPunchFixture>>,service:ClockerPunchService,proof:ClockerIdentityProof,date:string,week:string;
beforeEach(async()=>{
 f=await createPunchFixture({breaks:true});
 service=new ClockerPunchService(f.key,f.db.executor);proof=(await f.identity()).proof;
 [{date,week}]=await f.q<{date:string;week:string}>("SELECT (clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text AS date,date_trunc('week',clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text AS week");
 await f.q("INSERT INTO positions(id,workspace_id,name) VALUES('schedule-pos','workspace-fuel','Published role')");
});
afterEach(async()=>{if(f)await f.db.dispose();});
async function publication(revision=1,rows=1,options:{employeeId?:string;locationId?:string;released?:boolean;name?:string}={}){
 const id='c6-revision-'+revision;
 await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES($1,$2,$3,'PUBLISH','c34-owner')",[id,week,revision]);
 for(let i=0;i<rows;i++)await f.q(`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,position_id,position_name,is_callout_approved)
 VALUES($1,$2,$3,'published-schedule',$4,$5,$6,'00:00','24:00','schedule-pos',$7,$8)`,
 [id+':'+i,id,'source-'+i,options.locationId??'loc-1',options.employeeId??'c34-a',date,options.name??'Published role',options.released??false]);
 return id;
}
async function command(action:PunchAction='CLOCK_IN'):Promise<PunchCommand>{
 const v=await service.read(proof),s=v.snapshot;
 return {commandId:randomUUID(),action,verificationId:v.verificationId,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,
 timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},
 ...(action==='START_BREAK'?{breakType:{id:f.breakType!.id,version:f.breakType!.version}}:{})};
}
const clockIn=async()=>service.execute(proof,await command());
const captured=async()=>{const [r]=await f.q<{context:Record<string,unknown>}>("SELECT schedule_context AS context FROM time_entries WHERE employee_id='c34-a' ORDER BY clock_in_at DESC LIMIT 1");return r?.context;};
it('captures the latest matching published shift with revision and published position at the actual clock-in instant',async()=>{
 await publication();const r=await clockIn();
 expect(await captured()).toMatchObject({version:1,status:'MATCHED',timeZone:'America/Puerto_Rico',capturedAt:r.performedAt,
  candidateCount:1,match:{revisionId:'c6-revision-1',revisionNumber:1,publishedShiftId:'c6-revision-1:0',
   sourceShiftId:'source-0',scheduleId:'published-schedule',positionId:'schedule-pos',positionName:'Published role'}});
 expect(JSON.stringify(r)).not.toMatch(/c6-revision|Published role|schedule-pos/);
});
it('records valid actual time without any schedule instead of rejecting or inventing a shift',async()=>{
 await clockIn();expect(await captured()).toMatchObject({status:'UNMATCHED',match:null,candidateCount:0,reason:'NO_MATCH'});
 expect(await f.q('SELECT count(*)::int AS count FROM time_entries')).toEqual([{count:1}]);
});
it('a latest empty revision does not resurrect an older shift',async()=>{
 await publication(1);await publication(2,0);await clockIn();
 expect(await captured()).toMatchObject({status:'UNMATCHED',reviewedRevisionIds:['c6-revision-2']});
});
it.each(['employee','location','released'] as const)('does not match an ineligible %s publication row',async kind=>{
 await publication(1,1,kind==='employee'?{employeeId:'c34-b'}:kind==='location'?{locationId:'loc-2'}:{released:true});
 await clockIn();expect(await captured()).toMatchObject({status:'UNMATCHED',candidateCount:0});
});
it('overlapping publication rows are ambiguous and never selected arbitrarily',async()=>{
 await publication(1,2);await clockIn();expect(await captured()).toMatchObject({status:'AMBIGUOUS',reason:'OVERLAPPING_SHIFTS',match:null,candidateCount:2});
});
it('draft schedules do not substitute for published revision context',async()=>{
 await f.q("INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('draft','loc-1',$1,'c34-owner','DRAFT')",[week]);
 await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('draft-shift','draft','c34-a',$1,'00:00','24:00')",[date]);
 await clockIn();expect((await captured())?.status).toBe('UNMATCHED');
});
it('publication changes and live position renames do not rematch history or alter a replayed receipt',async()=>{
 await publication();const c=await command(),r=await service.execute(proof,c),original=await captured();
 await publication(2,0);await f.q("UPDATE positions SET name='Renamed',active=false WHERE id='schedule-pos'");
 expect(await captured()).toEqual(original);
 expect(await service.execute(proof,c)).toEqual(r);expect(await service.receipt(proof,c.commandId)).toEqual(r);
 expect((await captured())?.match).toMatchObject({positionName:'Published role',revisionId:'c6-revision-1'});
});
it('breaks and Clock Out preserve the original context and actual timestamps independently',async()=>{
 await publication();const r=await clockIn(),original=await captured();
 await service.execute(proof,await command('START_BREAK'));await service.execute(proof,await command('CLOCK_OUT'));
 expect(await captured()).toEqual(original);
 expect(await f.q('SELECT clock_in_at::text AS start,clock_out_at IS NOT NULL AS closed FROM time_entries')).toMatchObject([{closed:true}]);
 expect(r.snapshot.entry?.clockInAt).toBe(r.performedAt);
});
it('captured context cannot be overwritten or cleared by an ordinary update',async()=>{
 await clockIn();await expect(f.q("UPDATE time_entries SET schedule_context=NULL")).rejects.toMatchObject({code:'23514'});
 await expect(f.q("UPDATE time_entries SET schedule_context='{}'::jsonb")).rejects.toThrow();
});
it('a suppressed capture is not reported as a successful punch and rolls back its ledger',async()=>{
 await f.q(`CREATE FUNCTION c6_suppress_capture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.schedule_context=NULL; RETURN NEW; END $$;
 CREATE TRIGGER zzz_c6_suppress_capture BEFORE INSERT ON time_entries FOR EACH ROW EXECUTE FUNCTION c6_suppress_capture();`);
 await expect(clockIn()).rejects.toMatchObject({code:'INTEGRITY'});
 expect(await f.q('SELECT id FROM time_entries')).toEqual([]);expect(await f.q('SELECT command_id FROM clocker_command_ledger')).toEqual([]);
});
it('a publication change after the pre-read rejects stale context; explicit same-ID retry uses the new source',async()=>{
 await publication();const c=await command();let injected=false;
 const executor:SqlExecutor={query:f.db.executor.query,transaction:async ss=>{
  if(!injected&&ss.some(s=>s.text.includes('clocker_apply_punch'))){injected=true;await publication(2,0);}
  return f.db.executor.transaction(ss);
 }};
 await expect(new ClockerPunchService(f.key,executor).execute(proof,c)).rejects.toMatchObject({code:'SCHEDULE_CHANGED'});
 expect(injected).toBe(true);expect(await f.q('SELECT id FROM time_entries')).toEqual([]);
 await service.execute(proof,c);expect((await captured())?.status).toBe('UNMATCHED');
 expect(await f.q('SELECT count(*)::int AS count FROM clocker_command_ledger')).toEqual([{count:1}]);
});
it('a lost committed reply recovers the immutable captured context from the original command',async()=>{
 await publication();const c=await command();
 const executor:SqlExecutor={query:f.db.executor.query,transaction:async ss=>{const result=await f.db.executor.transaction(ss);
 if(ss.some(s=>s.text.includes('clocker_apply_punch')))throw Error('Fictional lost committed response');return result;}};
 await expect(new ClockerPunchService(f.key,executor).execute(proof,c)).rejects.toMatchObject({code:'UNAVAILABLE'});
 await publication(2,0);const recovered=await service.receipt(proof,c.commandId);
 expect(await captured()).toMatchObject({status:'MATCHED',match:{revisionId:'c6-revision-1'}});
 expect(await service.execute(proof,c)).toEqual(recovered);
});
it('publication-first lock ordering rejects a stale pre-read rather than capturing an obsolete shift',async()=>{
 await publication();const c=await command(),blocker=new Client({connectionString:f.db.connectionString}),worker=new Client({connectionString:f.db.connectionString});
 await blocker.connect();await worker.connect();let pending:Promise<unknown>|undefined;
 const executor:SqlExecutor={query:f.db.executor.query,transaction:async ss=>{await worker.query('BEGIN');try{const rows:unknown[][]=[];
 for(const s of ss)rows.push((await worker.query(s.text,[...s.values])).rows);await worker.query('COMMIT');return rows;
 }catch(e){await worker.query('ROLLBACK');throw e;}}};
 try{
  await blocker.query('BEGIN');await blocker.query("SELECT pg_advisory_xact_lock(hashtextextended('schedule-week:'||$1::text,0))",[week]);
  await blocker.query("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('c6-race',$1,2,'PUBLISH','c34-owner')",[week]);
  const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  pending=new ClockerPunchService(f.key,executor).execute(proof,c).then(value=>({value}),error=>({error}));
  let blocked=false;for(let n=0;n<250;n++){const [r]=await f.q<{blocked:boolean;query:string}>('SELECT cardinality(pg_blocking_pids(pid))>0 AS blocked,query FROM pg_stat_activity WHERE pid=$1',[pid]);
   if(r?.blocked&&r.query.includes('pg_advisory_xact_lock')){blocked=true;break;}await new Promise(r=>setTimeout(r,10));}
  expect(blocked).toBe(true);await blocker.query('COMMIT');expect(await pending).toMatchObject({error:{code:'SCHEDULE_CHANGED'}});
  expect(await f.q('SELECT id FROM time_entries')).toEqual([]);
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await pending;await worker.end();await blocker.end();}
});

it('matches a relevant published interval even when its owning week differs from the shift date',async()=>{
 await publication();await f.q("UPDATE schedule_publication_revisions SET week_start=$1::date-14 WHERE id='c6-revision-1'",[week]);
 await clockIn();expect(await captured()).toMatchObject({status:'MATCHED',match:{revisionId:'c6-revision-1'}});
});
it('schema rejects a partially missing context rather than accepting a NULL CHECK result',async()=>{
 await clockIn();
 // Isolate the CHECK from the stronger immutable-update trigger on fictional data only.
 await f.q('ALTER TABLE time_entries DISABLE TRIGGER clocker_preserve_schedule_context');
 await expect(f.q("UPDATE time_entries SET schedule_context=schedule_context-'version'")).rejects.toMatchObject({code:'23514'});
});
it('replacement with a different plausible capture rolls back the whole punch',async()=>{
 await publication();
 await f.q(`CREATE FUNCTION c6_wrong_capture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 NEW.schedule_context=jsonb_set(NEW.schedule_context,'{match,positionName}','"Wrong role"'::jsonb);RETURN NEW;END $$;
 CREATE TRIGGER zzz_c6_wrong_capture BEFORE INSERT ON time_entries FOR EACH ROW EXECUTE FUNCTION c6_wrong_capture();`);
 await expect(clockIn()).rejects.toMatchObject({code:'INTEGRITY'});
 expect(await f.q('SELECT id FROM time_entries')).toEqual([]);expect(await f.q('SELECT command_id FROM clocker_command_ledger')).toEqual([]);
});
it('replaying a saved command does not depend on reading the current publication tables',async()=>{
 await publication();const c=await command(),receipt=await service.execute(proof,c),original=await captured();
 await f.q('ALTER TABLE schedule_publication_revisions RENAME TO c6_hidden_publications');
 expect(await service.execute(proof,c)).toEqual(receipt);expect(await service.receipt(proof,c.commandId)).toEqual(receipt);
 expect(await captured()).toEqual(original);
});
