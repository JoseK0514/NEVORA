import {correctionAuthority} from '../time-corrections/authority.server';
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

// The connected approved missing-time chain is scoped before traversal. UNION
// de-duplicates ancestors/descendants; unrelated missing intervals never join.
const missingChain=(workspace:string,employee:string,kind:string,request:string)=>`WITH RECURSIVE chain AS (
  SELECT a.id,a.request_id,a.supersedes_adjustment_id
  FROM time_correction_adjustments a
  WHERE ${kind}='MISSING_ENTRY' AND a.kind='MISSING_ENTRY'
    AND a.workspace_id=${workspace} AND a.employee_id=${employee}
    AND (a.request_id=${request} OR a.id=(SELECT captured.base_adjustment_id FROM time_correction_requests captured
      WHERE captured.id=${request} AND captured.workspace_id=${workspace} AND captured.employee_id=${employee}))
  UNION
  SELECT a.id,a.request_id,a.supersedes_adjustment_id
  FROM time_correction_adjustments a JOIN chain c
    ON a.supersedes_adjustment_id=c.id OR c.supersedes_adjustment_id=a.id
  WHERE a.kind='MISSING_ENTRY' AND a.workspace_id=${workspace} AND a.employee_id=${employee}
)`;

// Existing canonical views supply effective time. History is scoped to this
// employee/workspace/recorded target; limits are disclosed, never completeness.
const contextJoins=(workspace:string,employee:string,kind:string,entry:string,brk:string,request:string)=>`
LEFT JOIN LATERAL (
  SELECT v.start_at,v.end_at,v.adjustment_id,v.recorded_version,
    CASE WHEN v.adjustment_id IS NULL THEN 'RECORDED' ELSE 'ADJUSTMENT' END AS source_kind
  FROM nevora_effective_time_entries v JOIN locations scope ON scope.id=v.location_id
  WHERE ${kind}='ENTRY_BOUNDARY' AND v.time_entry_id=${entry}
    AND v.employee_id=${employee} AND scope.workspace_id=${workspace}
  UNION ALL
  SELECT v.start_at,v.end_at,v.adjustment_id,v.recorded_version,
    CASE WHEN v.adjustment_id IS NULL THEN 'RECORDED' ELSE 'ADJUSTMENT' END
  FROM nevora_effective_break_entries v
  JOIN time_entries raw_parent ON raw_parent.id=v.time_entry_id JOIN locations scope ON scope.id=raw_parent.location_id
  WHERE ${kind}='BREAK_BOUNDARY' AND v.break_entry_id=${brk} AND v.time_entry_id=${entry}
    AND v.employee_id=${employee} AND scope.workspace_id=${workspace}
  UNION ALL
  SELECT v.start_at,v.end_at,v.adjustment_id,v.recorded_version,v.source_kind
  FROM nevora_effective_time_entries v
  JOIN time_correction_adjustments a ON a.id=v.adjustment_id
  WHERE ${kind}='MISSING_ENTRY' AND a.id IN (${missingChain(workspace,employee,kind,request)} SELECT id FROM chain)
    AND a.workspace_id=${workspace} AND a.employee_id=${employee} AND v.employee_id=${employee}
) effective ON true
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS total,
    COALESCE(jsonb_agg(value ORDER BY occurred_at DESC,id DESC) FILTER(WHERE rank<=5),'[]'::jsonb) AS decisions
  FROM (
    SELECT e.occurred_at,e.id,row_number() OVER(ORDER BY e.occurred_at DESC,e.id DESC) AS rank,
      jsonb_build_object('status',e.event_kind,'decidedAt',e.occurred_at::text,
        'startAt',h.proposal->>'startAt','endAt',h.proposal->>'endAt','note',e.decision_note) AS value
    FROM time_correction_requests h JOIN time_correction_events e ON e.request_id=h.id
    WHERE h.workspace_id=${workspace} AND h.employee_id=${employee} AND h.kind=${kind}
      AND h.time_entry_id IS NOT DISTINCT FROM ${entry}
      AND h.break_entry_id IS NOT DISTINCT FROM ${brk}
      AND (${kind}<>'MISSING_ENTRY' OR h.base_adjustment_id IN (${missingChain(workspace,employee,kind,request)} SELECT id FROM chain)
        OR h.id IN (${missingChain(workspace,employee,kind,request)} SELECT request_id FROM chain))
      AND (${request} IS NULL OR h.id<>${request})
      AND e.event_kind IN ('APPROVED','REJECTED')
  ) history
) prior ON true`;

const contextJson=(kind:string)=>`CASE
  WHEN effective.start_at IS NOT NULL AND effective.end_at IS NOT NULL THEN jsonb_build_object(
    'state','confirmed','sourceKind',effective.source_kind,
    'startAt',effective.start_at::text,'endAt',effective.end_at::text,
    'totalDecisions',prior.total,'decisions',prior.decisions)
  WHEN ${kind}='MISSING_ENTRY' THEN jsonb_build_object('state','none')
  ELSE jsonb_build_object('state','unavailable') END`;

const publicRequestJson = (alias: string) => `jsonb_build_object(
  'id',${alias}.id::text,
  'kind',${alias}.kind,
  'status',CASE latest.event_kind WHEN 'APPROVED' THEN 'APPROVED' WHEN 'REJECTED' THEN 'REJECTED' ELSE 'PENDING' END,
  'revision',latest.revision,
  'currentAdjustmentId',CASE WHEN ${alias}.kind='MISSING_ENTRY' AND latest.event_kind='APPROVED'
    AND EXISTS (SELECT 1 FROM nevora_time_correction_leaf_adjustments leaf
      WHERE leaf.id=latest.adjustment_id AND leaf.request_id=${alias}.id
        AND leaf.employee_id=${alias}.employee_id AND leaf.workspace_id=${alias}.workspace_id)
    THEN latest.adjustment_id::text ELSE NULL END,
  'createdAt',${alias}.created_at::text,
  'locationId',${alias}.location_id,
  'locationName',COALESCE(NULLIF(trim(loc.short_name),''),trim(loc.name)),
  'originalStartAt',CASE
    WHEN ${alias}.kind='ENTRY_BOUNDARY' THEN ${alias}.source_snapshot->>'clockInAt'
    WHEN ${alias}.kind='BREAK_BOUNDARY' THEN ${alias}.source_snapshot->>'startAt'
    WHEN ${alias}.kind='MISSING_ENTRY' THEN ${alias}.source_snapshot->>'startAt'
    ELSE NULL END,
  'originalEndAt',CASE
    WHEN ${alias}.kind='ENTRY_BOUNDARY' THEN ${alias}.source_snapshot->>'clockOutAt'
    WHEN ${alias}.kind='BREAK_BOUNDARY' THEN ${alias}.source_snapshot->>'endAt'
    WHEN ${alias}.kind='MISSING_ENTRY' THEN ${alias}.source_snapshot->>'endAt'
    ELSE NULL END,
  'proposedStartAt',${alias}.proposal->>'startAt',
  'proposedEndAt',${alias}.proposal->>'endAt',
  'breakName',CASE WHEN ${alias}.kind='BREAK_BOUNDARY'
    THEN ${alias}.source_snapshot #>> '{breakTypeSnapshot,name}' ELSE NULL END,
  'reason',${alias}.reason,
  'baseChanged',CASE WHEN ${alias}.kind='MISSING_ENTRY' THEN
    effective.adjustment_id IS DISTINCT FROM CASE WHEN latest.event_kind='APPROVED' THEN latest.adjustment_id ELSE ${alias}.base_adjustment_id END
    ELSE effective.adjustment_id IS DISTINCT FROM ${alias}.base_adjustment_id
      OR effective.recorded_version::text IS DISTINCT FROM ${alias}.source_snapshot->>'sourceVersion' END,
  'context',${contextJson(`${alias}.kind`)}
)`;

const employeeSql = `WITH observed AS MATERIALIZED (
  SELECT clock_timestamp() AS at
), own_requests AS MATERIALIZED (
  SELECT r.*,loc.name,loc.short_name,
    latest.revision,latest.event_kind
  FROM time_correction_requests r
  JOIN locations loc ON loc.id=r.location_id
  JOIN LATERAL (
    SELECT e.revision,e.event_kind,e.adjustment_id
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
    SELECT e.revision,e.event_kind,e.adjustment_id
    FROM time_correction_events e
    WHERE e.request_id=r.id
    ORDER BY e.revision DESC
    LIMIT 1
  ) latest ON true
  ${contextJoins('r.workspace_id','r.employee_id','r.kind','r.time_entry_id','r.break_entry_id','r.id')}
), selected_entries AS MATERIALIZED (
  SELECT t.* FROM time_entries t JOIN locations l ON l.id=t.location_id
  WHERE t.employee_id=$1 AND l.workspace_id=$2 AND t.clock_out_at IS NOT NULL
    AND (t.clock_out_at>((SELECT at FROM observed) AT TIME ZONE $3)::date::timestamp AT TIME ZONE $3
      OR t.id IN(SELECT old.id FROM time_entries old JOIN locations ol ON ol.id=old.location_id
        WHERE old.employee_id=$1 AND ol.workspace_id=$2 AND old.clock_out_at<=
          ((SELECT at FROM observed) AT TIME ZONE $3)::date::timestamp AT TIME ZONE $3
        ORDER BY old.clock_in_at DESC,old.id DESC LIMIT 20))
), targets AS MATERIALIZED (
  SELECT 'ENTRY_BOUNDARY'::text AS kind,t.id AS time_entry_id,NULL::text AS break_entry_id,
    t.clock_in_at AS recorded_start_at,t.clock_out_at AS recorded_end_at
  FROM selected_entries t
  UNION ALL
  SELECT 'BREAK_BOUNDARY',t.id,b.id,b.break_start_at,b.break_end_at
  FROM selected_entries t JOIN break_entries b ON b.time_entry_id=t.id WHERE b.break_end_at IS NOT NULL
), target_rows AS MATERIALIZED (
  SELECT jsonb_build_object('kind',t.kind,'timeEntryId',t.time_entry_id,'breakEntryId',t.break_entry_id,
    'recordedStartAt',t.recorded_start_at::text,'recordedEndAt',t.recorded_end_at::text,
    'context',${contextJson('t.kind')}) AS value,t.time_entry_id,t.break_entry_id
  FROM (SELECT * FROM targets ORDER BY time_entry_id,break_entry_id NULLS FIRST LIMIT 100) t
  ${contextJoins('$2','$1','t.kind','t.time_entry_id','t.break_entry_id','NULL::uuid')}
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
  (SELECT count(*)::integer FROM targets) AS "targetCount",
  jsonb_build_object(
    'state','ready',
    'observedAt',o.at::text,
    'timeZone',$3::text,
    'totalRequests',(SELECT count(*)::integer FROM time_correction_requests r
      WHERE r.employee_id=$1 AND r.workspace_id=$2),
    'locations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',id,'name',name) ORDER BY id)
      FROM eligible_locations),'[]'::jsonb),
    'targets',COALESCE((SELECT jsonb_agg(value ORDER BY time_entry_id,break_entry_id NULLS FIRST)
      FROM target_rows),'[]'::jsonb),
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
    SELECT e.revision,e.event_kind,e.adjustment_id
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
    SELECT e.revision,e.event_kind,e.adjustment_id
    FROM time_correction_events e
    WHERE e.request_id=r.id
    ORDER BY e.revision DESC
    LIMIT 1
  ) latest ON true
  ${contextJoins('r.workspace_id','r.employee_id','r.kind','r.time_entry_id','r.break_entry_id','r.id')}
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
    const row=result[guards.length]?.[0] as {totalRequests?:number;locationCount?:number;targetCount?:number;snapshot?:unknown}|undefined;
    if (!row || !Number.isSafeInteger(row.totalRequests) || !Number.isSafeInteger(row.locationCount) ||
        !Number.isSafeInteger(row.targetCount) || (row.totalRequests ?? 0)>10_000 || (row.locationCount ?? 0)>100 || (row.targetCount ?? 0)>100 || !row.snapshot) {
      return {state:'unavailable',reason:(row?.totalRequests ?? 0)>10_000 || (row?.locationCount ?? 0)>100 || (row?.targetCount ?? 0)>100 ? 'source_limit':'read_failed'};
    }
    const snapshot=parseEmployeeTimeCorrections(row.snapshot);
    return snapshot.state==='ready'?{...snapshot,authority:correctionAuthority(proof)}:snapshot;
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
    const source=parseManagerTimeCorrections({...row.snapshot as object,validForMs:45000});
    const started=performance.now();
    const [final]=await executor.query<{validForMs:number}>({text:`SELECT floor(LEAST(45000,
      EXTRACT(epoch FROM(s.expires_at-clock_timestamp()))*1000,
      45000-EXTRACT(epoch FROM(clock_timestamp()-$3::timestamptz))*1000))::integer AS "validForMs"
      FROM employee_sessions s JOIN employees e ON e.id=s.employee_id
      WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role IN ('OWNER','MANAGER') AND s.expires_at>clock_timestamp()`,
      values:[proof.sessionTokenHash,proof.employee.id,source.state==='ready'?source.observedAt:null]});
    if(!final)return {state:'unavailable',reason:'access_denied'};
    const remaining=final.validForMs-Math.ceil(performance.now()-started);
    if(source.state!=='ready'||remaining<1)return {state:'unavailable',reason:'read_failed'};
    return {...source,validForMs:remaining,authority:correctionAuthority(proof)};
  } catch (error) {
    if (isManagementAuthorizationError(error)) return {state:'unavailable',reason:'access_denied'};
    if (schemaMissing(error)) return {state:'unavailable',reason:'schema_missing'};
    return {state:'unavailable',reason:'read_failed'};
  }
}
