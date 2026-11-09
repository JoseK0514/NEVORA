import 'server-only';
import type { SessionMutationProof } from '../shift-changes/types';
import type { SqlExecutor } from '../notifications/types';
import type { WeeklyApprovedAbsences, ApprovedAbsence } from '../scheduling/manager-roster-presentation';
import { addDays, isValidWeekStart } from '../date-utils';
import { businessDateStart, timeMinutes } from '../scheduling/periods';
import { neonNotificationExecutor } from './notification-transactions';
import { assertManagementProof, managementSessionStatements, isManagementAuthorizationError } from './management-session';
import { getWorkspace, workspaceReadGuard } from './workspaces';
import { managerLocationsSql, managerScopeStatements, readManagerScopeStorage } from './manager-location-scope.server';

type AbsenceRow = { employee_id: string; start_date: string; end_date: string; start_time: string | null; end_time: string | null };
function project(row: AbsenceRow): ApprovedAbsence {
  businessDateStart(row.start_date); businessDateStart(row.end_date);
  if (!row.employee_id || row.end_date < row.start_date || Boolean(row.start_time) !== Boolean(row.end_time)) throw Error('invalid_absence');
  const start = row.start_time ? timeMinutes(row.start_time.slice(0, 5)) : 0;
  const end = row.end_time ? timeMinutes(row.end_time.slice(0, 5), true) : 1440;
  if (start >= end) throw Error('invalid_absence');
  return { employeeId: row.employee_id, startDate: row.start_date, endDate: row.end_date,
    ...(row.start_time && row.end_time ? { startTime: row.start_time.slice(0, 5), endTime: row.end_time.slice(0, 5) } : {}) };
}

/** Scope is derived from the live actor and singleton workspace, never a client employee list.
 * The projection intentionally excludes reasons, request identifiers and session material. */
export async function readWeeklyApprovedAbsences(proof: SessionMutationProof, weekStart: string, executor: SqlExecutor = neonNotificationExecutor()): Promise<WeeklyApprovedAbsences> {
  try {
    assertManagementProof(proof, proof?.employee?.id);
    if (!['OWNER', 'MANAGER'].includes(proof.employee.role)) throw Error('management_authorization');
  } catch { return { state: 'unavailable', reason: 'access_denied' }; }
  try {
    if (!isValidWeekStart(weekStart)) throw Error('invalid_week');
    const workspace = await getWorkspace(executor), storage = await readManagerScopeStorage(executor);
    const guards = [
      { text: "SET LOCAL lock_timeout='1500ms'", values: [] },
      { text: "SET LOCAL statement_timeout='2500ms'", values: [] },
      ...workspaceReadGuard(workspace),
      { text: 'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE', values: [proof.employee.id] },
      ...managerScopeStatements(storage, workspace.id, proof.employee.id),
      ...managementSessionStatements(proof, proof.employee.id, [proof.employee.role]),
    ];
    const results = await executor.transaction([...guards, {
      text: `WITH scope AS (${managerLocationsSql(storage, '$1', '$2')})
        SELECT e.id AS employee_id,r.start_date::text,r.end_date::text,r.start_time::text,r.end_time::text
        FROM employees e JOIN locations l ON l.id=e.primary_location_id AND l.active AND l.id IN (SELECT id FROM scope)
        LEFT JOIN time_off_requests r ON r.employee_id=e.id AND r.status='APPROVED' AND r.start_date<=$4::date AND r.end_date>=$3::date
        WHERE e.active
        ORDER BY e.id,r.start_date,r.end_date,r.id`,
      values: [workspace.id, proof.employee.id, weekStart, addDays(weekStart, 6)],
    }, ...managementSessionStatements(proof, proof.employee.id, [proof.employee.role])], AbortSignal.timeout(8000));
    const rows = results[guards.length] as AbsenceRow[];
    return { state: 'ready', employeeIds: [...new Set(rows.map(row => row.employee_id))], rows: rows.filter(row => row.start_date !== null).map(project) };
  } catch (error) { return { state: 'unavailable', reason: isManagementAuthorizationError(error) ? 'access_denied' : 'read_failed' }; }
}
