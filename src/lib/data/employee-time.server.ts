import 'server-only';
import {projectEmployeeTime,type EmployeeTime} from '../employee-time';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {neonNotificationExecutor} from './notification-transactions';
import {getWorkspace,workspaceReadGuard} from './workspaces';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from './management-session';

const selfRoles=['EMPLOYEE','LEAD'] as const;
// Single observation and MVCC snapshot; never derive actual time from a schedule.
// Keep all of today plus the current entry and explicitly bounded earlier history.
const timeSql=`WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS at), day AS (
 SELECT at,((at AT TIME ZONE $4)::date::timestamp AT TIME ZONE $4) AS start FROM observed
), own AS (
 SELECT t.*,l.short_name AS location_name FROM time_entries t JOIN locations l ON l.id=t.location_id
 WHERE t.employee_id=$1 AND l.workspace_id=$2
), recent AS (
 SELECT t.id FROM own t CROSS JOIN day d WHERE t.clock_out_at<=d.start
 ORDER BY t.clock_in_at DESC,t.id DESC LIMIT 20
), selected AS (
 SELECT t.* FROM own t CROSS JOIN day d
 WHERE t.clock_out_at IS NULL OR t.clock_out_at>d.start OR t.id IN(SELECT id FROM recent)
), rows AS (
 SELECT t.id,t.employee_id,t.location_name,t.clock_in_at::text,t.clock_out_at::text,t.status,
  NOT EXISTS(SELECT 1 FROM own other WHERE other.id<>t.id
    AND t.clock_in_at<COALESCE(other.clock_out_at,'infinity'::timestamptz)
    AND other.clock_in_at<COALESCE(t.clock_out_at,'infinity'::timestamptz)) AS history_valid,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('id',b.id,'break_start_at',b.break_start_at,
    'break_end_at',b.break_end_at,'break_type_id',b.break_type_id,'break_type_snapshot',b.break_type_snapshot)
    ORDER BY b.break_start_at,b.id) FROM break_entries b WHERE b.time_entry_id=t.id),'[]'::jsonb) AS breaks
 FROM selected t
)
SELECT jsonb_build_object('observedAt',d.at,'expiresAt',(SELECT expires_at FROM employee_sessions WHERE token_hash=$3),
 'timeZone',$4::text,'recentCount',(SELECT count(*)::integer FROM own t WHERE t.clock_out_at<=d.start),
 'entries',COALESCE((SELECT jsonb_agg(r ORDER BY r.clock_in_at::timestamptz,r.id) FROM rows r),'[]'::jsonb)) AS snapshot FROM day d`;

/** Caller derives proof from the real portal cookie. Client IDs cannot select an employee. */
export async function readEmployeeTime(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeTime>{
 try{assertManagementProof(proof,proof?.employee?.id);}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const workspace=await getWorkspace(executor);
  const guards=[...workspaceReadGuard(workspace),
   {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
   ...managementSessionStatements(proof,proof.employee.id,selfRoles),
  ];
  const result=await executor.transaction([...guards,
   {text:timeSql,values:[proof.employee.id,workspace.id,proof.sessionTokenHash,workspace.timeZone]},
   ...managementSessionStatements(proof,proof.employee.id,selfRoles),
  ]);
  const row=result[guards.length]?.[0] as {snapshot:unknown}|undefined;
  return projectEmployeeTime(row?.snapshot,proof.employee.id);
 }catch(error){
  if(isManagementAuthorizationError(error))return {state:'unavailable',reason:'access_denied'};
  if(error&&typeof error==='object'&&'code' in error&&['42P01','42703','42883'].includes(String(error.code)))return {state:'unavailable',reason:'schema_missing'};
  return {state:'unavailable',reason:'read_failed'};
 }
}
