import 'server-only';

import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import {
  parseEmployeeTimeCorrections,
  parseManagerTimeCorrections,
  type EmployeeTimeCorrections,
  type ManagerTimeCorrections,
} from '../time-corrections/read-model';
import {
  assertManagementProof,
  isManagementAuthorizationError,
  managementSessionStatements,
} from './management-session';
import { neonNotificationExecutor } from './notification-transactions';
import { getWorkspace, workspaceReadGuard } from './workspaces';

const selfRoles = ['EMPLOYEE','LEAD'] as const;
const managerRoles = ['OWNER','MANAGER'] as const;

const publicRequestJson = (alias: string) => `jsonb_build_object(
  'id',${alias}.id::text,
  'kind',${alias}.kind,
  'status',CASE latest.event_kind WHEN 'APPROVED' THEN 'APPROVED' WHEN 'REJECTED' THEN 'REJECTED' ELSE 'PENDING' END,
  'revision',latest.revision,
  'createdAt',${alias}.created_at::text,
  'locationId',${alias}.location_id,
  'locationName',COALESCE(NULLIF(trim(loc.short_name),''),trim(loc.name)),
  'originalStartAt',CASE
    WHEN ${alias}.kind='ENTRY_BOUNDARY' THEN ${alias}.source_snapshot->>'clockInAt'
    WHEN ${alias}.kind='BREAK_BOUNDARY' THEN ${alias}.source_snapshot->>'startAt'
    ELSE NULL END,
  'originalEndAt',CASE
    WHEN ${alias}.kind='ENTRY_BOUNDARY' THEN ${alias}.source_snapshot->>'clockOutAt'
    WHEN ${alias}.kind='BREAK_BOUNDARY' THEN ${alias}.source_snapshot->>'endAt'
    ELSE NULL END,
  'proposedStartAt',${alias}.proposal->>'startAt',
  'proposedEndAt',${alias}.proposal->>'endAt',
  'breakName',CASE WHEN ${alias}.kind='BREAK_BOUNDARY'
    THEN ${alias}.source_snapshot #>> '{breakTypeSnapshot,name}' ELSE NULL END,
  'reason',${alias}.reason
)`;

const employeeSql = `WITH observed AS MATERIALIZED (
  SELECT clock_timestamp() AS at
), own_requests AS MATERIALIZED (
  SELECT r.*,loc.name,loc.short_name,
    latest.revision,latest.event_kind
  FROM time_correction_requests r
  JOIN locations loc ON loc.id=r.location_id
  JOIN LATERAL (
    SELECT e.revision,e.event_kind
    FROM time_correction_events e
    WHERE e.request_id=r.id
    ORDER BY e.revision DESC
    LIMIT 1
  ) latest ON true
  WHERE r.employee_id=$1 AND r.workspace_id=$2
  ORDER BY r.created_at DESC,r.id DESC
  LIMIT 50
), request_rows AS MATERIALIZED (
  SELECT ${publicRequestJson('r')} AS value,r.created_at,r.id
  FROM own_requests r
  JOIN locations loc ON loc.id=r.location_id
  JOIN LATERAL (
    SELECT e.revision,e.event_kind
    FROM time_correction_events e
    WHERE e.request_id=r.id
    ORDER BY e.revision DESC
    LIMIT 1
  ) latest ON true
), eligible_locations AS MATERIALIZED (
  SELECT l.id,COALESCE(NULLIF(trim(l.short_name),''),trim(l.name)) AS name
  FROM employee_location_eligibility elig
  JOIN locations l ON l.id=elig.location_id
  WHERE elig.employee_id=$1 AND l.workspace_id=$2 AND l.active
  ORDER BY l.id
)
SELECT
  (SELECT count(*)::integer FROM time_correction_requests r
    WHERE r.employee_id=$1 AND r.workspace_id=$2) AS "totalRequests",
  (SELECT count(*)::integer FROM eligible_locations) AS "locationCount",
  jsonb_build_object(
    'state','ready',
    'observedAt',o.at::text,
    'timeZone',$3::text,
    'totalRequests',(SELECT count(*)::integer FROM time_correction_requests r
      WHERE r.employee_id=$1 AND r.workspace_id=$2),
    'locations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY id)
      FROM eligible_locations),'[]'::jsonb),
    'requests',COALESCE((SELECT jsonb_agg(value ORDER BY created_at DESC,id DESC)
      FROM request_rows),'[]'::jsonb)
  ) AS snapshot
FROM observed o`;

const managerSql = `WITH observed AS MATERIALIZED (
  SELECT clock_timestamp() AS at
), pending AS MATERIALIZED (
  SELECT r.*,trim(concat_ws(' ',emp.first_name,emp.last_name)) AS employee_name,
    COALESCE(NULLIF(trim(loc.short_name),''),trim(loc.name)) AS location_name,
    latest.revision,latest.event_kind
  FROM nevora_pending_time_corrections r
  JOIN employees emp ON emp.id=r.employee_id
  JOIN locations loc ON loc.id=r.location_id
  JOIN LATERAL (
    SELECT e.revision,e.event_kind
    FROM time_correction_events e
    WHERE e.request_id=r.id
    ORDER BY e.revision DESC
    LIMIT 1
  ) latest ON true
  WHERE r.workspace_id=$1
  ORDER BY r.created_at,r.id
), rows AS MATERIALIZED (
  SELECT (${publicRequestJson('r')} ||
    jsonb_build_object('employeeName',r.employee_name,'isSelf',r.employee_id=$2)) AS value,
    r.created_at,r.id
  FROM pending r
  JOIN locations loc ON loc.id=r.location_id
  JOIN LATERAL (
    SELECT e.revision,e.event_kind
    FROM time_correction_events e
    WHERE e.request_id=r.id
    ORDER BY e.revision DESC
    LIMIT 1
  ) latest ON true
  ORDER BY r.created_at,r.id
  LIMIT 100
)
SELECT
  (SELECT count(*)::integer FROM pending) AS "pendingCount",
  CASE WHEN (SELECT count(*) FROM pending)>100 THEN NULL ELSE
    jsonb_build_object(
      'state','ready',
      'observedAt',o.at::text,
      'timeZone',$3::text,
      'requests',COALESCE((SELECT jsonb_agg(value ORDER BY created_at,id) FROM rows),'[]'::jsonb)
    )
  END AS snapshot
FROM observed o`;

function schemaMissing(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error &&
    ['42P01','42703','42883'].includes(String(error.code)));
}

export async function readEmployeeTimeCorrections(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<EmployeeTimeCorrections> {
  try { assertManagementProof(proof,proof?.employee?.id); }
  catch { return {state:'unavailable',reason:'access_denied'}; }
  if (!selfRoles.includes(proof.employee.role as 'EMPLOYEE'|'LEAD')) {
    return {state:'unavailable',reason:'access_denied'};
  }
  try {
    const workspace=await getWorkspace(executor);
    const guards=[
      ...workspaceReadGuard(workspace),
      {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
      ...managementSessionStatements(proof,proof.employee.id,selfRoles),
    ];
    const result=await executor.transaction([
      ...guards,
      {text:employeeSql,values:[proof.employee.id,workspace.id,workspace.timeZone]},
      ...managementSessionStatements(proof,proof.employee.id,selfRoles),
    ]);
    const row=result[guards.length]?.[0] as {totalRequests?:number;locationCount?:number;snapshot?:unknown}|undefined;
    if (!row || !Number.isSafeInteger(row.totalRequests) || !Number.isSafeInteger(row.locationCount) ||
        (row.totalRequests ?? 0)>10_000 || (row.locationCount ?? 0)>100 || !row.snapshot) {
      return {state:'unavailable',reason:(row?.totalRequests ?? 0)>10_000 || (row?.locationCount ?? 0)>100 ? 'source_limit':'read_failed'};
    }
    return parseEmployeeTimeCorrections(row.snapshot);
  } catch (error) {
    if (isManagementAuthorizationError(error)) return {state:'unavailable',reason:'access_denied'};
    if (schemaMissing(error)) return {state:'unavailable',reason:'schema_missing'};
    return {state:'unavailable',reason:'read_failed'};
  }
}

export async function readManagerTimeCorrections(
  proof: SessionMutationProof,
  executor: SqlExecutor = neonNotificationExecutor(),
): Promise<ManagerTimeCorrections> {
  try { assertManagementProof(proof,proof?.employee?.id); }
  catch { return {state:'unavailable',reason:'access_denied'}; }
  if (!managerRoles.includes(proof.employee.role as 'OWNER'|'MANAGER')) {
    return {state:'unavailable',reason:'access_denied'};
  }
  try {
    const workspace=await getWorkspace(executor);
    const guards=[
      ...workspaceReadGuard(workspace),
      {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
      ...managementSessionStatements(proof,proof.employee.id,managerRoles),
    ];
    const result=await executor.transaction([
      ...guards,
      {text:managerSql,values:[workspace.id,proof.employee.id,workspace.timeZone]},
      ...managementSessionStatements(proof,proof.employee.id,managerRoles),
    ]);
    const row=result[guards.length]?.[0] as {pendingCount?:number;snapshot?:unknown|null}|undefined;
    if (!row || !Number.isSafeInteger(row.pendingCount)) return {state:'unavailable',reason:'read_failed'};
    if ((row.pendingCount ?? 0)>100) return {state:'unavailable',reason:'source_limit'};
    if (!row.snapshot) return {state:'unavailable',reason:'read_failed'};
    return parseManagerTimeCorrections(row.snapshot);
  } catch (error) {
    if (isManagementAuthorizationError(error)) return {state:'unavailable',reason:'access_denied'};
    if (schemaMissing(error)) return {state:'unavailable',reason:'schema_missing'};
    return {state:'unavailable',reason:'read_failed'};
  }
}
