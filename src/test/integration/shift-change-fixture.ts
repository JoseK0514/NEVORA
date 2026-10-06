import type { SqlExecutor } from '../../lib/notifications/types';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import { fictionalProfile } from '../fixtures/shift-changes';
import { sourceShiftTerms,shiftTermsFingerprint } from '../../lib/shift-changes/terms';
export const proof=(id:string):SessionMutationProof=>({employee:{id,firstName:'Fictional',lastName:id,role:id==='owner'?'OWNER':'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:(id==='owner'?'a':id==='e1'?'b':id==='e2'?'c':'d').repeat(64)});
export async function seedShiftChanges(executor:SqlExecutor) {
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
}
export async function fixtureShift(executor:SqlExecutor,id:string,employee='e1',date='2035-10-02') {
 const q=(text:string,values:readonly unknown[]=[])=>executor.query<Record<string,unknown>>({text,values});
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES($1,'schedule',$2,$3,'08:00','16:00')",[id,employee,date]);
 const [row]=await q('SELECT to_jsonb(sh) AS sh FROM shifts sh WHERE id=$1',[id]);
 const t=sourceShiftTerms(row.sh as Record<string,unknown>,{id:'schedule',locationId:'loc-1',weekStart:'2035-10-01',status:'PUBLISHED'},'workspace-fuel','America/Puerto_Rico');
 return {sourceShiftId:id,sourceEpisodeId:t.assignmentEpisodeId,sourceTermsFingerprint:shiftTermsFingerprint(t)};
}
