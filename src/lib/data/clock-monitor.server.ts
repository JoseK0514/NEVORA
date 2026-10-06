import 'server-only';
import type { ClockMonitor } from '../time-clock';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { projectClockMonitor } from '../clock-monitor';
import { getWorkspace, workspaceReadGuard } from './workspaces';
import { assertManagementProof, managementSessionStatements, isManagementAuthorizationError } from './management-session';
import { neonNotificationExecutor } from './notification-transactions';

// All observations, counts and durations share one SQL snapshot and database clock.
// An inactive employee/location/device never erases an unclosed actual time entry.
const monitorSql=`WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS at), rows AS (
 SELECT t.id,t.employee_id,e.first_name || ' ' || e.last_name AS employee_name,
  t.location_id,l.short_name AS location_name,t.device_id,t.clock_in_at::text,t.status,
  t.schedule_context,
  (SELECT min(b.break_start_at)::text FROM break_entries b WHERE b.time_entry_id=t.id AND b.break_end_at IS NULL) AS break_start_at,
  (SELECT count(*)::integer FROM break_entries b WHERE b.time_entry_id=t.id AND b.break_end_at IS NULL) AS open_break_count,
  (NOT EXISTS(SELECT 1 FROM break_entries b WHERE b.time_entry_id=t.id AND
    (b.break_start_at<t.clock_in_at OR b.break_start_at>o.at OR b.break_end_at>o.at OR b.break_end_at<b.break_start_at))
   AND NOT EXISTS(SELECT 1 FROM break_entries a JOIN break_entries b ON a.time_entry_id=b.time_entry_id AND a.id<b.id
    WHERE a.time_entry_id=t.id AND a.break_start_at<COALESCE(b.break_end_at,'infinity'::timestamptz)
      AND b.break_start_at<COALESCE(a.break_end_at,'infinity'::timestamptz))) AS history_valid
 FROM time_entries t JOIN employees e ON e.id=t.employee_id JOIN locations l ON l.id=t.location_id CROSS JOIN observed o
 WHERE t.clock_out_at IS NULL AND l.workspace_id=$1
)
SELECT jsonb_build_object('observedAt',o.at,'expiresAt',(SELECT expires_at FROM employee_sessions WHERE token_hash=$2),
 'timeZone',$3::text,'rows',COALESCE((SELECT jsonb_agg(r ORDER BY r.clock_in_at::timestamptz,r.employee_id) FROM rows r),'[]'::jsonb)) AS snapshot
FROM observed o`;

/** Server-derived session proof only. Read data is returned only after the trailing
 * authority assertion, including any expiry during a blocked monitor SELECT. */
export async function readClockMonitor(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<ClockMonitor>{
 try{assertManagementProof(proof,proof?.employee?.id);}catch{return {state:'unavailable',reason:'access_denied'};}
 try{
  const workspace=await getWorkspace(executor);
  const guards=[...workspaceReadGuard(workspace),
   {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
   ...managementSessionStatements(proof,proof.employee.id),
  ];
  const result=await executor.transaction([...guards,
   {text:monitorSql,values:[workspace.id,proof.sessionTokenHash,workspace.timeZone]},
   ...managementSessionStatements(proof,proof.employee.id),
  ]);
  const row=result[guards.length]?.[0] as {snapshot:unknown}|undefined;
  return projectClockMonitor(row?.snapshot);
 }catch(error){
  if(isManagementAuthorizationError(error))return {state:'unavailable',reason:'access_denied'};
  if(error&&typeof error==='object'&&'code' in error&&['42P01','42703','42883'].includes(String(error.code)))return {state:'unavailable',reason:'schema_missing'};
  return {state:'unavailable',reason:'read_failed'};
 }
}
