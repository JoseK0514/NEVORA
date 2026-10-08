import {afterEach,beforeEach,expect,it} from 'vitest';
import {Client} from 'pg';
import {createDisposableFoundationDatabase} from './local-postgres';
import {seedOwnedApp} from './owned-app-fixture';
import {readEmployeePublishedAssignments,readEmployeePublishedAssignmentWindow} from '../../lib/data/employee-published-assignments.server';
import {addDays,weekStartFor} from '../../lib/date-utils';
import {businessDate} from '../../lib/business-time';
import {currentShiftFingerprintSql,currentShiftTermsSql} from '../../lib/data/shift-change-release';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';

let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>,proof:SessionMutationProof;
const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
const week=(days:number)=>weekStartFor(addDays(businessDate(new Date(),'America/Puerto_Rico'),days));
async function schedule(id:string,weekStart:string,locationId='loc-1',status='PUBLISHED'){
 await q('INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,$4,\'QAOWNER\')',[id,locationId,weekStart,status]);
 if(status==='PUBLISHED')await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES($1,$2,(SELECT COALESCE(max(revision_number),0)+1 FROM schedule_publication_revisions WHERE week_start=$2::date),'PUBLISH','QAOWNER')",['rev-'+id,weekStart]);
}
async function shift(id:string,scheduleId:string,employeeId:string,date:string,start='08:00',end='16:00',notes='PRIVATE NOTE'){
 await q('INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes,position_id) VALUES($1,$2,$3,$4,$5,$6,$7,\'qa-pos\')',[id,scheduleId,employeeId,date,start,end,notes]);
}
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});await seedOwnedApp(db.executor);
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QA-E11-SELF','Fictional','Self','555-0199','EMPLOYEE','loc-1'),('QA-E11-COWORKER','Fictional','Coworker','555-0198','EMPLOYEE','loc-1')");
 await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('QA-E11-SELF','loc-1'),('QA-E11-SELF','loc-2'),('QA-E11-COWORKER','loc-1')");
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'QA-E11-SELF',now()+interval '1 day')");
 proof={employee:{id:'QA-E11-SELF',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
});
afterEach(async()=>{await db?.dispose();});
const read=(executor:SqlExecutor=db.executor)=>readEmployeePublishedAssignments(proof,executor);

it('next_shift_crosses_multiple_weeks and year_rollover with actual source/date/episode/revision',async()=>{
 const future=weekStartFor(`${Number(businessDate(new Date(),'America/Puerto_Rico').slice(0,4))+2}-01-07`),date=addDays(future,2);
 await schedule('far',future);await shift('far-own','far','QA-E11-SELF',date);
 const result=await read();expect(result.nextShift).toMatchObject({shiftId:'far-own',weekStart:future,date,locationId:'loc-1',locationLabel:'Main Office',positionLabel:'Customer Support',publicationRevisionId:'rev-far'});
 expect(result.nextShift?.assignmentEpisodeId).toMatch(/^[a-f0-9-]{36}$/);expect(result.nextShift?.termsRevision).toBeGreaterThan(0);
 expect(result.nextShift?.startAt).toBe(`${date}T12:00:00.000Z`);expect(result.publicationState).toBe('partial');
 console.log('E11 fictional source identity',JSON.stringify({actor:proof.employee.id,shift:result.nextShift?.shiftId,episode:result.nextShift?.assignmentEpisodeId,termsRevision:result.nextShift?.termsRevision,revision:result.nextShift?.publicationRevisionId,date:result.nextShift?.date,startAt:result.nextShift?.startAt,observedAt:result.observedAt,timeZone:result.timeZone}));
 expect(JSON.stringify(result)).not.toContain('PRIVATE NOTE');
});
it('partial_locations_keep_known_shift while draft_coworker_released_ineligible_excluded',async()=>{
 await schedule('covered-now',week(0));
 const future=week(14),date=addDays(future,1);await schedule('known',future);await shift('known-own','known','QA-E11-SELF',date);
 await schedule('draft',addDays(future,7),'loc-2','DRAFT');await shift('draft-own','draft','QA-E11-SELF',addDays(future,8));
 await shift('coworker','known','QA-E11-COWORKER',date);
 await schedule('released',addDays(future,14));await shift('released-own','released','QA-E11-SELF',addDays(future,15));
 await q(`INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status,legacy_manual,assignment_episode_id,source_terms,reviewed_terms_fingerprint)
  SELECT 'approved-release',sh.id,sh.employee_id,'OTHER','APPROVED',false,sh.assignment_episode_id,${currentShiftTermsSql()},${currentShiftFingerprintSql()}
  FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id='released-own'`);
 await schedule('ineligible',addDays(future,21),'loc-2');await shift('ineligible-own','ineligible','QA-E11-SELF',addDays(future,22));
 const result=await read();expect(result.nextShift?.shiftId).toBe('known-own');expect(result.publicationState).toBe('partial');
 expect(JSON.stringify(result)).not.toContain('PRIVATE NOTE');for(const hidden of ['coworker','draft-own','released-own'])expect(JSON.stringify(result)).not.toContain(hidden);
 await q("DELETE FROM employee_location_eligibility WHERE employee_id='QA-E11-SELF' AND location_id='loc-2'");
 const afterEligibility=await read();expect(afterEligibility.publicationState).toBe('complete');expect(JSON.stringify(afterEligibility)).not.toContain('ineligible-own');
 const window=await readEmployeePublishedAssignmentWindow(proof,future,addDays(future,28),db.executor);
 expect(window.state).toBe('ready');expect(window.assignments.map(item=>item.shiftId)).toEqual(['known-own']);
});
it('complete current-week coverage with no shift is distinct from unavailable and does not invent future publication',async()=>{
 await schedule('empty-main',week(0));await schedule('empty-west',week(0),'loc-2');
 const result=await read();expect(result).toMatchObject({nextShift:null,currentShift:null,publicationState:'complete',timeZone:'America/Puerto_Rico'});
 expect(result.observedAt).toMatch(/^\d{4}-\d\d-\d\dT/);
});
it('unpublished current week and no future row stays partial with no invented off state',async()=>{
 expect(await read()).toMatchObject({nextShift:null,currentShift:null,publicationState:'partial',timeZone:'America/Puerto_Rico'});
});
it('missing publication identity closes a known assignment without exposing its data',async()=>{
 const future=week(14);await schedule('legacy',future);await shift('legacy-own','legacy','QA-E11-SELF',addDays(future,1));
 await q("DELETE FROM schedule_publication_revisions WHERE id='rev-legacy'");
 expect(await read()).toEqual({observedAt:null,timeZone:null,nextShift:null,currentShift:null,publicationState:'unavailable'});
});
it('a fresh read reflects changed live ownership, time and position rather than stale capture',async()=>{
 const future=week(14),date=addDays(future,1);await schedule('change',future);await shift('change-own','change','QA-E11-SELF',date);
 const before=await read();expect(before.nextShift).toMatchObject({shiftId:'change-own',startAt:`${date}T12:00:00.000Z`,positionLabel:'Customer Support',termsRevision:1});
 await q("UPDATE shifts SET start_time='09:00',position_id='qa-pos2' WHERE id='change-own'");
 const changed=await read();expect(changed.nextShift).toMatchObject({shiftId:'change-own',startAt:`${date}T13:00:00.000Z`,positionLabel:'Operations',termsRevision:2});
 await q("UPDATE shifts SET employee_id='QA-E11-COWORKER' WHERE id='change-own'");
 expect((await read()).nextShift).toBeNull();
});
it('session lost before protected source read exposes no private rows',async()=>{
 const future=week(14);await schedule('known',future);await shift('known-own','known','QA-E11-SELF',addDays(future,1));
 let calls=0;const executor={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  calls++;if(calls===2)await q("DELETE FROM employee_sessions WHERE employee_id='QA-E11-SELF'");return db.executor.transaction(statements,signal);
 }};
 expect((await read(executor)).publicationState).toBe('unavailable');
});
it('final session check suppresses rows after source observation',async()=>{
 const future=week(14);await schedule('known',future);await shift('known-own','known','QA-E11-SELF',addDays(future,1));
 let calls=0;const executor={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  calls++;if(calls===3)await q("DELETE FROM employee_sessions WHERE employee_id='QA-E11-SELF'");return db.executor.transaction(statements,signal);
 }};
 expect((await read(executor)).publicationState).toBe('unavailable');
});
it('role change during a blocked source guard is rechecked after the wait',async()=>{
 const future=week(14);await schedule('known',future);await shift('known-own','known','QA-E11-SELF',addDays(future,1));
 const blocker=new Client({connectionString:db.connectionString});await blocker.connect();
 let signalStart:()=>void=()=>{};const started=new Promise<void>(resolve=>{signalStart=resolve;});
 try{
  await blocker.query('BEGIN');await blocker.query("UPDATE employees SET role='MANAGER' WHERE id='QA-E11-SELF'");
  const executor={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
   if(statements.some(statement=>statement.text.includes('SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE')))signalStart();
   return db.executor.transaction(statements,signal);
  }};
  let settled=false;const pending=read(executor).finally(()=>{settled=true;});await started;
  await new Promise(resolve=>setTimeout(resolve,100));const waited=!settled;
  await blocker.query('COMMIT');expect(waited).toBe(true);
  expect(await pending).toEqual({observedAt:null,timeZone:null,nextShift:null,currentShift:null,publicationState:'unavailable'});
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await blocker.end();}
});
it('fictional small and large future sets retain bounded query count and expose local EXPLAIN plans',async()=>{
 const first=week(14);
 await schedule('perf-0',first);await shift('shift-perf-0','perf-0','QA-E11-SELF',addDays(first,1));
 let batches=0,source:{text:string;values:readonly unknown[]}|undefined;
 const executor={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  batches++;source=statements.find(statement=>statement.text.startsWith('WITH clock AS MATERIALIZED'))??source;
  return db.executor.transaction(statements,signal);
 }};
 const explain=async(label:string)=>{
  expect(source).toBeDefined();
  const plan=await q('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+source!.text,[...source!.values]);
  const root=(plan[0] as {'QUERY PLAN':Array<{Plan:Record<string,unknown>}>})['QUERY PLAN'][0].Plan;
  const operators:string[]=[];const visit=(node:Record<string,unknown>)=>{operators.push([node['Node Type'],node['Index Name']].filter(Boolean).join(':'));for(const child of (node.Plans as Record<string,unknown>[]|undefined)??[])visit(child);};visit(root);
  console.log('E11 fictional '+label+' EXPLAIN',JSON.stringify({batches,operators,actualMs:root['Actual Total Time']}));
  expect(operators.length).toBeGreaterThan(0);
 };
 expect((await read(executor)).nextShift?.shiftId).toBe('shift-perf-0');expect(batches).toBe(3);await explain('one-week');
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) SELECT 'perf-'||n,'loc-1',$1::date+n*7,'PUBLISHED','QAOWNER' FROM generate_series(1,299) n",[first]);
 await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) SELECT 'rev-perf-'||n,$1::date+n*7,1,'PUBLISH','QAOWNER' FROM generate_series(1,299) n",[first]);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) SELECT 'shift-perf-'||n,'perf-'||n,'QA-E11-SELF',$1::date+n*7+1,'08:00','16:00','qa-pos' FROM generate_series(1,299) n",[first]);
 await q('ANALYZE shifts');batches=0;
 expect((await read(executor)).nextShift?.shiftId).toBe('shift-perf-0');expect(batches).toBe(3);await explain('300-weeks');
});
