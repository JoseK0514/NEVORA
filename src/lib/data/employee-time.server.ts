import 'server-only';
import {projectEmployeeTime,type EmployeeTime} from '../employee-time';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {neonNotificationExecutor} from './notification-transactions';
import {getWorkspace,workspaceReadGuard} from './workspaces';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {payProfilesStatement,resolveBreakPay,type BreakPayQuery,type PayProfileRow} from '../payroll/native/break-pay';

const selfRoles=['EMPLOYEE','LEAD'] as const;
// Single observation and MVCC snapshot; never derive actual time from a schedule.
// Keep all of today plus the current entry and explicitly bounded earlier history.
// Effective time: recorded punches with approved corrections applied (and approved
// missing entries), the same source Timecards and payroll read.
const timeSql=`WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS at), day AS (
 SELECT at,((at AT TIME ZONE $4)::date::timestamp AT TIME ZONE $4) AS start FROM observed
), own AS (
 SELECT COALESCE(v.time_entry_id,v.adjustment_id::text) AS id,v.employee_id,v.location_id,v.time_entry_id,
  v.adjustment_id IS NOT NULL AS corrected,v.start_at AS clock_in_at,v.end_at AS clock_out_at,v.status,l.short_name AS location_name
 FROM nevora_effective_time_entries v JOIN locations l ON l.id=v.location_id
 WHERE v.employee_id=$1 AND l.workspace_id=$2
), recent AS (
 SELECT t.id FROM own t CROSS JOIN day d WHERE t.clock_out_at<=d.start
 ORDER BY t.clock_in_at DESC,t.id DESC LIMIT 20
), selected AS (
 SELECT t.* FROM own t CROSS JOIN day d
 WHERE t.clock_out_at IS NULL OR t.clock_out_at>d.start OR t.id IN(SELECT id FROM recent)
), rows AS (
 SELECT t.id,t.employee_id,t.location_id,t.location_name,t.clock_in_at::text,t.clock_out_at::text,t.status,t.corrected,
  NOT EXISTS(SELECT 1 FROM own other WHERE other.id<>t.id
    AND t.clock_in_at<COALESCE(other.clock_out_at,'infinity'::timestamptz)
    AND other.clock_in_at<COALESCE(t.clock_out_at,'infinity'::timestamptz)) AS history_valid,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.break_entry_id,'break_start_at',b.start_at,
    'break_end_at',b.end_at,'break_type_id',b.break_type_id,'break_type_snapshot',b.break_type_snapshot)
    ORDER BY b.start_at,b.break_entry_id) FROM nevora_effective_break_entries b WHERE b.time_entry_id=t.time_entry_id),'[]'::jsonb) AS breaks
 FROM selected t
)
SELECT jsonb_build_object('observedAt',d.at,'expiresAt',(SELECT expires_at FROM employee_sessions WHERE token_hash=$3),
 'timeZone',$4::text,'recentCount',(SELECT count(*)::integer FROM own t WHERE t.clock_out_at<=d.start),
 'entries',COALESCE((SELECT jsonb_agg(r ORDER BY r.clock_in_at::timestamptz,r.id) FROM rows r),'[]'::jsonb)) AS snapshot FROM day d`;

const missingPayProfiles=(error:unknown)=>!!error&&typeof error==='object'&&String((error as {code?:unknown}).code)==='42P01'&&/native_payroll_profiles_current/.test(String((error as {message?:unknown}).message));
/** Classify each recorded break with the employee's payroll break rule, server-side. */
function breakPayFor(snapshot:unknown,employeeId:string,profiles:PayProfileRow[]){
 const entries=snapshot&&typeof snapshot==='object'&&Array.isArray((snapshot as {entries?:unknown}).entries)?(snapshot as {entries:Record<string,unknown>[]}).entries:[];
 const breaks:BreakPayQuery[]=entries.flatMap(e=>Array.isArray(e?.breaks)?(e.breaks as Record<string,unknown>[]).flatMap(b=>typeof b?.id==='string'&&typeof b.break_start_at==='string'?[{id:b.id,employeeId,typeId:typeof b.break_type_id==='string'?b.break_type_id:null,locationId:String(e.location_id),startAt:b.break_start_at,endAt:typeof b.break_end_at==='string'?b.break_end_at:null}]:[]):[]);
 try{return resolveBreakPay(profiles,breaks);}catch{return {};}
}
/** Caller derives proof from the real portal cookie. Client IDs cannot select an employee. */
export async function readEmployeeTime(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeTime>{
 try{assertManagementProof(proof,proof?.employee?.id);}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const workspace=await getWorkspace(executor);
  const guards=[...workspaceReadGuard(workspace),
   {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
   ...managementSessionStatements(proof,proof.employee.id,selfRoles),
  ];
  const read=(withProfiles:boolean)=>executor.transaction([...guards,
   {text:timeSql,values:[proof.employee.id,workspace.id,proof.sessionTokenHash,workspace.timeZone]},
   ...(withProfiles?[payProfilesStatement(workspace.id,[proof.employee.id])]:[]),
   ...managementSessionStatements(proof,proof.employee.id,selfRoles),
  ]);
  let result,withProfiles=true;
  try{result=await read(true);}catch(error){if(!missingPayProfiles(error))throw error;withProfiles=false;result=await read(false);}
  const row=result[guards.length]?.[0] as {snapshot:unknown}|undefined;
  const profiles=withProfiles?(result[guards.length+1]??[]) as PayProfileRow[]:[];
  return projectEmployeeTime(row?.snapshot,proof.employee.id,breakPayFor(row?.snapshot,proof.employee.id,profiles));
 }catch(error){
  if(isManagementAuthorizationError(error))return {state:'unavailable',reason:'access_denied'};
  if(error&&typeof error==='object'&&'code' in error&&['42P01','42703','42883'].includes(String(error.code)))return {state:'unavailable',reason:'schema_missing'};
  return {state:'unavailable',reason:'read_failed'};
 }
}
