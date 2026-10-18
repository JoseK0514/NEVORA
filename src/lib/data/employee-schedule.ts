import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {isValidWeekStart} from '../date-utils';
import {assertManagementProof, managementSessionStatements} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
import {getWorkspace, workspaceReadGuard} from './workspaces';
import {currentCalloutReleaseSql} from './shift-change-release';
import type {ScheduleShiftRow} from './schedules';

export type EmployeeScheduleState = 'published'|'unpublished'|'unavailable';
export type EmployeeScheduleRead = {state:EmployeeScheduleState;shifts:ScheduleShiftRow[];locations:{id:string;shortName:string}[];
 /** The person's own locations that have not published this week (names it in the employee's note). */
 unpublishedLocationIds?:string[]};
const unavailable:EmployeeScheduleRead={state:'unavailable',shifts:[],locations:[]};

/** Canonical active, currently eligible location source for employee reads. */
export const employeeAllowedLocationsSql=(workspace='$1',employee='$2')=>`SELECT l.id,l.short_name FROM locations l WHERE l.workspace_id=${workspace} AND l.active AND
   (l.id=(SELECT primary_location_id FROM employees WHERE id=${employee}) OR EXISTS(SELECT 1 FROM employee_location_eligibility elig WHERE elig.employee_id=${employee} AND elig.location_id=l.id))`;

/** The existing live published schedule is the source. Coverage and own rows
 * share one SQL observation; no draft row, note, coworker or draft status leaves it. */
export async function readEmployeeSchedule(proof:SessionMutationProof,weekStart:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeScheduleRead>{
 try{
  assertManagementProof(proof,proof?.employee?.id);
  if(!['EMPLOYEE','LEAD'].includes(proof.employee.role)||!isValidWeekStart(weekStart))return unavailable;
  const workspace=await getWorkspace(executor);
  const guards=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...managementSessionStatements(proof,proof.employee.id,['EMPLOYEE','LEAD'])];
  const results=await executor.transaction([...guards,{text:`WITH allowed AS (
   ${employeeAllowedLocationsSql()}
  ), coverage AS (
   SELECT count(*)>0 AND bool_and(EXISTS(SELECT 1 FROM schedules s WHERE s.week_start=$3::date AND s.location_id=l.id AND s.status='PUBLISHED')) AS complete FROM allowed l
  ), own AS (
   SELECT sh.id,sh.schedule_id AS "scheduleId",sh.employee_id AS "employeeId",trim(e.first_name||' '||e.last_name) AS "employeeName",
    s.location_id AS "locationId",sh.date::text AS date,left(sh.start_time::text,5) AS "startTime",left(sh.end_time::text,5) AS "endTime",
    sh.position_id AS "positionId",sh.is_designated_lead AS "isDesignatedLead",
    EXISTS(SELECT 1 FROM shift_callouts c WHERE ${currentCalloutReleaseSql()}) AS "isCalloutApproved",'PUBLISHED'::text AS "scheduleStatus"
   FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id JOIN employees e ON e.id=sh.employee_id JOIN allowed l ON l.id=s.location_id
   WHERE sh.employee_id=$2 AND s.week_start=$3::date AND s.status='PUBLISHED' ORDER BY sh.date,sh.start_time,sh.id LIMIT 501
  ) SELECT (SELECT complete FROM coverage) AS complete,
   COALESCE((SELECT jsonb_agg(to_jsonb(own)) FROM own),'[]') AS shifts,
   COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'shortName',short_name) ORDER BY id) FROM allowed),'[]') AS locations,
   COALESCE((SELECT jsonb_agg(l.id ORDER BY l.id) FROM allowed l WHERE NOT EXISTS(SELECT 1 FROM schedules s WHERE s.week_start=$3::date AND s.location_id=l.id AND s.status='PUBLISHED')),'[]') AS unpublished`,values:[workspace.id,proof.employee.id,weekStart]},...managementSessionStatements(proof,proof.employee.id,['EMPLOYEE','LEAD'])]);
  const row=results[guards.length]?.[0] as {complete:boolean;shifts:ScheduleShiftRow[];locations:{id:string;shortName:string}[];unpublished?:unknown}|undefined;
  if(!row||!Array.isArray(row.shifts)||row.shifts.length>500||!Array.isArray(row.locations)||row.shifts.some(s=>s.employeeId!==proof.employee.id||s.scheduleStatus!=='PUBLISHED'||!row.locations.some(l=>l.id===s.locationId)))return unavailable;
  // Logout/role loss after the protected observation must not return private rows.
  await executor.transaction(managementSessionStatements(proof,proof.employee.id,['EMPLOYEE','LEAD']));
  const unpublishedLocationIds=Array.isArray(row.unpublished)?row.unpublished.filter((id):id is string=>typeof id==='string'&&row.locations.some(l=>l.id===id)):[];
  return {state:row.complete?'published':'unpublished',shifts:row.shifts,locations:row.locations,...(row.complete?{}:{unpublishedLocationIds})};
 }catch{return unavailable;}
}

export function emptyScheduleLabel(state:EmployeeScheduleState){
 return state==='published'?'Off — no assignment':state==='unpublished'?'Schedule not published yet':'Schedule unavailable — try again';
}
