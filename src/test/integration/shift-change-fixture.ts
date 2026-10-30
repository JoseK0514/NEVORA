import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {currentCalloutReleaseSql} from '../../lib/data/shift-change-release';
import type { SqlExecutor } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { fictionalProfile } from '../fixtures/shift-changes';
import { sourceShiftTerms,shiftTermsFingerprint } from '../../lib/shift-changes/terms';
export const proof=(id:string):SessionMutationProof=>({employee:{id,firstName:'Fictional',lastName:id,role:id==='owner'?'OWNER':'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:(id==='owner'?'a':id==='e1'?'b':id==='e2'?'c':'d').repeat(64)});
export async function seedShiftChanges(executor:SqlExecutor,{companyAccess=false}:{companyAccess?:boolean}={}) {
 const q=(text:string,values:readonly unknown[]=[])=>executor.query({text,values});
 for(const id of ['owner','e1','e2','e3']) {
  await q('INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,\'Fictional\',$1,$1,$2,\'loc-1\')',[id,proof(id).employee.role]);
  await q("INSERT INTO employee_sessions VALUES($1,$2,now()+interval '1 day',now())",[proof(id).sessionTokenHash,id]);
  await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1'),($1,'loc-2')",[id]);
  await q('INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) VALUES($1,40,80,$2)',[id,JSON.stringify(fictionalProfile())]);
  for(let d=0;d<7;d++) await q("INSERT INTO availability_windows VALUES($1,$2,$3,'00:00','24:00')",[id+d,id,d]);
 }
 const scope={revision:1,mode:'AUTOMATIC_WHEN_VALID',submissionAdvanceMinutes:0,completionAdvanceMinutes:0};
 await q('UPDATE workspaces SET shift_change_policy=$1',[JSON.stringify({version:1,revision:1,swap:scope,coverage:scope})]);
 await q("UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false");
 for(let d=0;d<7;d++) await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES($1,'loc-1',$2,'08:00','16:00')",['win'+d,d]);
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('schedule','loc-1','2035-10-01','PUBLISHED','owner')");
 // Current operational tests opt in after seeding their intended Owner census.
 // Managers created later receive no automatic Company assignment.
 if(companyAccess)for(const file of ['0031_native_payroll.sql','0032_company_access_invitations.sql'])await q(await readFile('db/migrations/'+file,'utf8'));
}
/** Publish changes (Jose, 2026-10-29): a raw shift row in an already captured
 * published week is a held edit until published. Fixture shifts stand for
 * published assignments, so once the week has a revision, record a new PUBLISH
 * revision of the whole live week, exactly what Publish changes would write. */
export async function publishFixtureWeek(executor:SqlExecutor,week='2035-10-01') {
 const revision='fixture-publish-'+randomUUID();
 await executor.query({text:`WITH latest AS (SELECT max(revision_number) AS n FROM schedule_publication_revisions WHERE week_start=$2::date)
  INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) SELECT $1,$2::date,n+1,'PUBLISH','owner' FROM latest WHERE n IS NOT NULL`,values:[revision,week]});
 await executor.query({text:`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes,is_designated_lead,is_callout_approved,position_id,position_name)
  SELECT $1||':'||sh.id,$1,sh.id,sh.schedule_id,s.location_id,sh.employee_id,sh.date,sh.start_time,sh.end_time,sh.notes,sh.is_designated_lead,
   EXISTS(SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()}),sh.position_id,(SELECT p.name FROM positions p WHERE p.id=sh.position_id)
  FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start=$2::date AND s.status='PUBLISHED' AND EXISTS(SELECT 1 FROM schedule_publication_revisions WHERE id=$1)`,values:[revision,week]});
}
export async function fixtureShift(executor:SqlExecutor,id:string,employee='e1',date='2035-10-02') {
 const q=(text:string,values:readonly unknown[]=[])=>executor.query<Record<string,unknown>>({text,values});
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES($1,'schedule',$2,$3,'08:00','16:00')",[id,employee,date]);
 await publishFixtureWeek(executor);
 const [row]=await q('SELECT to_jsonb(sh) AS sh FROM shifts sh WHERE id=$1',[id]);
 const t=sourceShiftTerms(row.sh as Record<string,unknown>,{id:'schedule',locationId:'loc-1',weekStart:'2035-10-01',status:'PUBLISHED'},'workspace-fuel','America/Puerto_Rico');
 return {sourceShiftId:id,sourceEpisodeId:t.assignmentEpisodeId,sourceTermsFingerprint:shiftTermsFingerprint(t)};
}
