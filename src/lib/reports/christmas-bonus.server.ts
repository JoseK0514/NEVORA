import 'server-only';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { assertManagementProof, isManagementAuthorizationError, managementSessionStatements } from '../data/management-session';
import { neonNotificationExecutor } from '../data/notification-transactions';
import { getWorkspace, workspaceReadGuard } from '../data/workspaces';
import { projectChristmasBonusReport, type BonusYear, type ChristmasBonusReport } from './christmas-bonus';

/** More finalized timecards than this in one bonus year is refused as a source limit rather than shown partly. */
const MAX_FINALIZED_TIMECARDS = 20000;

// One statement snapshot. $1 workspace, $2 first day, $3 last day (business-local dates), $4 business time zone.
// Selects only what the report shows: name, ID, active, hire date (management-only) and finalized snapshots. The
// termination date only decides who is listed; no birth date or contact detail is read.
const scopeSql = `bounds AS MATERIALIZED (
 SELECT $2::date AS first_day,$3::date AS last_day,$2::date::timestamp AT TIME ZONE $4 AS first_at,($3::date+1)::timestamp AT TIME ZONE $4 AS after_at,clock_timestamp() AS observed_at
), finalized AS MATERIALIZED (
 SELECT t.employee_id,t.start_date,t.end_date,t.occurred_at,t.snapshot FROM nevora_timecard_latest t
 JOIN employees e ON e.id=t.employee_id JOIN locations l ON l.id=e.primary_location_id CROSS JOIN bounds b
 WHERE t.workspace_id=$1 AND l.workspace_id=$1 AND e.role<>'OWNER' AND t.action='FINALIZE' AND t.start_date<=b.last_day AND t.end_date>=b.first_day
)`;
const limitSql = `WITH ${scopeSql} SELECT (CASE WHEN (SELECT count(*) FROM finalized)<=${MAX_FINALIZED_TIMECARDS} THEN '1' ELSE 'christmas_bonus_source_limit' END)::integer`;
const bonusSql = `WITH ${scopeSql}, recorded_days AS MATERIALIZED (
 SELECT DISTINCT v.employee_id,d::date AS day
 FROM nevora_effective_time_entries v JOIN locations l ON l.id=v.location_id CROSS JOIN bounds b
 CROSS JOIN LATERAL generate_series((GREATEST(v.start_at,b.first_at) AT TIME ZONE $4)::date::timestamp,
  ((LEAST(COALESCE(v.end_at,b.observed_at),b.after_at)-interval '1 microsecond') AT TIME ZONE $4)::date::timestamp,interval '1 day') d
 WHERE l.workspace_id=$1 AND v.start_at<b.after_at AND COALESCE(v.end_at,b.observed_at)>b.first_at
), people AS MATERIALIZED (
 SELECT e.id,trim(e.first_name||' '||e.last_name) AS name,e.active,to_char(e.hire_date,'YYYY-MM-DD') AS hire_date
 FROM employees e JOIN locations l ON l.id=e.primary_location_id CROSS JOIN bounds b
 WHERE l.workspace_id=$1 AND e.role<>'OWNER' AND (
  EXISTS(SELECT 1 FROM finalized f WHERE f.employee_id=e.id) OR EXISTS(SELECT 1 FROM recorded_days r WHERE r.employee_id=e.id)
  OR (e.active AND (e.termination_date IS NULL OR e.termination_date>=b.first_day)
   AND (e.hire_date<=b.last_day OR (e.hire_date IS NULL AND (e.created_at AT TIME ZONE $4)::date<=b.last_day)))
  OR (NOT e.active AND e.hire_date<=b.last_day AND e.termination_date>=b.first_day))
 ORDER BY e.id LIMIT 5001
)
SELECT jsonb_build_object('observedAt',b.observed_at::text,'timeZone',$4::text,'people',COALESCE((SELECT jsonb_agg(jsonb_build_object(
 'employeeId',p.id,'name',p.name,'active',p.active,'hireDate',p.hire_date,
 'unfinalizedDays',(SELECT count(*) FROM recorded_days r WHERE r.employee_id=p.id
  AND NOT EXISTS(SELECT 1 FROM finalized f WHERE f.employee_id=p.id AND r.day BETWEEN f.start_date AND f.end_date)),
 'timecards',COALESCE((SELECT jsonb_agg(jsonb_build_object('startDate',f.start_date::text,'endDate',f.end_date::text,
  'finalizedAt',f.occurred_at::text,'snapshot',f.snapshot) ORDER BY f.start_date) FROM finalized f WHERE f.employee_id=p.id),'[]'::jsonb)
) ORDER BY p.id) FROM people p),'[]'::jsonb)) AS source FROM bounds b`;

export type ChristmasBonusResult =
  | { state: 'ready'; report: ChristmasBonusReport }
  | { state: 'unavailable'; reason: 'access_denied' | 'read_failed' | 'source_limit' };

/**
 * Read one bonus year for an Owner or Manager. Callers wrap it in the same current
 * company-wide authority the Insights page uses (withOperationalCompany); this read
 * adds the management session guards around its own statement, like Insights'
 * report read. Read-only: it writes nothing and returns no money amounts.
 */
export async function readChristmasBonusReport(proof: SessionMutationProof, year: BonusYear, executor: SqlExecutor = neonNotificationExecutor()): Promise<ChristmasBonusResult> {
  try { assertManagementProof(proof, proof?.employee?.id); } catch { return { state: 'unavailable', reason: 'access_denied' }; }
  if (!['OWNER', 'MANAGER'].includes(proof.employee.role)) return { state: 'unavailable', reason: 'access_denied' };
  try {
    const workspace = await getWorkspace(executor);
    const values = [workspace.id, year.startDate, year.endDate, workspace.timeZone];
    const guards = [...workspaceReadGuard(workspace),
      { text: 'SELECT e.id FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE l.workspace_id=$1 ORDER BY e.id FOR SHARE OF e', values: [workspace.id] },
      ...managementSessionStatements(proof, proof.employee.id),
      { text: limitSql, values }];
    const results = await executor.transaction([...guards, { text: bonusSql, values }, ...managementSessionStatements(proof, proof.employee.id)]);
    const row = results[guards.length]?.[0] as { source?: unknown } | undefined;
    if (!row) throw new Error('Missing bonus source');
    return { state: 'ready', report: projectChristmasBonusReport(row.source, year) };
  } catch (error) {
    if (isManagementAuthorizationError(error)) return { state: 'unavailable', reason: 'access_denied' };
    const message = error instanceof Error ? error.message : '';
    return { state: 'unavailable', reason: /christmas_bonus_source_limit|Bonus source limit/.test(message) ? 'source_limit' : 'read_failed' };
  }
}
