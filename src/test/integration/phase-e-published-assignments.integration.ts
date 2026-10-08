import {afterEach,beforeEach,expect,it} from 'vitest';
import {createDisposableFoundationDatabase} from './local-postgres';
import {seedOwnedApp} from './owned-app-fixture';
import {readEmployeePublishedAssignments} from '../../lib/data/employee-published-assignments.server';
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
 const future=week(42),date=addDays(future,2);await schedule('far',future);await shift('far-own','far','QA-E11-SELF',date);
 const result=await read();expect(result.nextShift).toMatchObject({shiftId:'far-own',weekStart:future,date,locationId:'loc-1',locationLabel:'Main Office',positionLabel:'Customer Support',publicationRevisionId:'rev-far'});
 expect(result.nextShift?.assignmentEpisodeId).toMatch(/^[a-f0-9-]{36}$/);expect(result.nextShift?.termsRevision).toBeGreaterThan(0);
 expect(result.nextShift?.startAt).toBe(`${date}T12:00:00.000Z`);expect(result.publicationState).toBe('partial');
 expect(JSON.stringify(result)).not.toContain('PRIVATE NOTE');
});
it('partial_locations_keep_known_shift while draft_coworker_released_ineligible_excluded',async()=>{
 const future=week(14),date=addDays(future,1);await schedule('known',future);await shift('known-own','known','QA-E11-SELF',date);
 await schedule('draft',addDays(future,7),'loc-2','DRAFT');await shift('draft-own','draft','QA-E11-SELF',addDays(future,8));
 await shift('coworker','known','QA-E11-COWORKER',date);
 await schedule('released',addDays(future,14));await shift('released-own','released','QA-E11-SELF',addDays(future,15));
 await q(`INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status,legacy_manual,assignment_episode_id,source_terms,reviewed_terms_fingerprint)
  SELECT 'approved-release',sh.id,sh.employee_id,'OTHER','APPROVED',false,sh.assignment_episode_id,${currentShiftTermsSql()},${currentShiftFingerprintSql()}
  FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id='released-own'`);
 await schedule('ineligible',addDays(future,21),'loc-2');await shift('ineligible-own','ineligible','QA-E11-SELF',addDays(future,22));
 await q("DELETE FROM employee_location_eligibility WHERE employee_id='QA-E11-SELF' AND location_id='loc-2'");
 const result=await read();expect(result.nextShift?.shiftId).toBe('known-own');expect(result.publicationState).toBe('partial');
 expect(JSON.stringify(result)).not.toContain('PRIVATE NOTE');for(const hidden of ['coworker','draft-own','released-own','ineligible-own'])expect(JSON.stringify(result)).not.toContain(hidden);
});
it('current authorization is checked after a source wait',async()=>{
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
