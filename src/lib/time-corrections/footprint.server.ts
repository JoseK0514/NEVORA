import 'server-only';
import type { SqlStatement } from '../notifications/types';

// The connected approved missing-time chain is scoped before traversal. UNION
// de-duplicates ancestors/descendants; unrelated missing intervals never join.
export const missingChain=(workspace:string,employee:string,kind:string,request:string)=>`WITH RECURSIVE chain AS (
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

// Every connected request, adjustment, and recorded target can add a worksite.
export const correctionFootprintCtes = `relevant_requests AS MATERIALIZED (
    SELECT h.* FROM time_correction_requests h
    WHERE h.workspace_id=r.workspace_id AND h.employee_id=r.employee_id
      AND (h.id=r.id OR (h.kind=r.kind
        AND h.time_entry_id IS NOT DISTINCT FROM r.time_entry_id
        AND h.break_entry_id IS NOT DISTINCT FROM r.break_entry_id
        AND (r.kind<>'MISSING_ENTRY'
          OR h.base_adjustment_id IN (${missingChain('r.workspace_id','r.employee_id','r.kind','r.id')} SELECT id FROM chain)
          OR h.id IN (${missingChain('r.workspace_id','r.employee_id','r.kind','r.id')} SELECT request_id FROM chain))))
  ), relevant_adjustments AS MATERIALIZED (
    SELECT a.* FROM time_correction_adjustments a
    WHERE a.workspace_id=r.workspace_id AND a.employee_id=r.employee_id
      AND (a.request_id IN (SELECT id FROM relevant_requests)
        OR a.id IN (${missingChain('r.workspace_id','r.employee_id','r.kind','r.id')} SELECT id FROM chain))
  ), location_ids AS (
    SELECT location_id AS id FROM relevant_requests
    UNION SELECT source_snapshot->>'locationId' FROM relevant_requests
    UNION SELECT location_id FROM relevant_adjustments
    UNION SELECT source_snapshot->>'locationId' FROM relevant_adjustments
    UNION SELECT t.location_id FROM time_entries t WHERE t.id=r.time_entry_id
  )`;

export const correctionReviewSubjectSql = `SELECT r.employee_id AS "employeeId",
  r.requested_by_employee_id AS "requestedByEmployeeId", footprint."locationIds"
  FROM time_correction_requests r
  CROSS JOIN LATERAL (
    WITH ${correctionFootprintCtes}
    SELECT ARRAY(SELECT id FROM location_ids WHERE id IS NOT NULL ORDER BY id) AS "locationIds"
  ) footprint
  WHERE r.id=$1::uuid AND r.workspace_id=$2`;

export type CorrectionReviewSubject = {
  employeeId: string;
  requestedByEmployeeId: string | null;
  locationIds: string[];
};

export function correctionFootprintGuard(requestId: string, workspaceId: string, source: CorrectionReviewSubject): SqlStatement {
  return {
    text: `SELECT (CASE WHEN EXISTS (SELECT 1 FROM (${correctionReviewSubjectSql}) subject
      WHERE subject."employeeId"=$3 AND subject."requestedByEmployeeId" IS NOT DISTINCT FROM $4::text
        AND subject."locationIds"=$5::text[]) THEN '1' ELSE 'operational_authorization' END)::integer`,
    values: [requestId, workspaceId, source.employeeId, source.requestedByEmployeeId, source.locationIds],
  };
}
