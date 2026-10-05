import type { SessionMutationProof } from '../shift-changes/types';
import type { SqlStatement } from '../notifications/types';
export function shiftChangeSessionGuard(proof:SessionMutationProof,deadline?:string):SqlStatement {
 return {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token_hash=$1 AND e.id=$2 AND e.role=$3 AND e.active AND s.expires_at>clock_timestamp()) AND EXISTS(SELECT 1 FROM workspaces WHERE singleton AND active) THEN '1' ELSE 'shift_change_authorization' END)::integer, (CASE WHEN $4::timestamptz IS NULL OR clock_timestamp()<$4::timestamptz THEN '1' ELSE 'shift_change_deadline' END)::integer`,values:[proof.sessionTokenHash,proof.employee.id,proof.employee.role,deadline??null]};
}

import type { CommandSnapshot } from './shift-change-snapshot';
import type { GuardedShift } from './notification-transactions';
/** Compare every live shift property, including protected provenance. Only the
 * clock and server-minted episode of a transferred slot are nondeterministic. */
export function shiftChangeAfterGuard(snapshot:CommandSnapshot,after:readonly GuardedShift[]):SqlStatement {
 const changed=after.filter(a=>snapshot.source.shifts.some(s=>s.id===a.sourceShiftId&&s.employee_id!==a.employeeId));
 const ids=changed.map(a=>a.sourceShiftId);
 const expected=snapshot.source.shifts.map(s=>{const a=changed.find(x=>x.sourceShiftId===s.id);if(!a)return s;const next={...s,employee_id:a.employeeId,assignment_origin:'MANAGER',generated_claims:null};delete (next as Record<string,unknown>).updated_at;delete (next as Record<string,unknown>).assignment_episode_id;return next;});
 return {text:`WITH actual AS (SELECT COALESCE(jsonb_agg(CASE WHEN sh.id=ANY($2::text[]) THEN to_jsonb(sh)-'updated_at'-'assignment_episode_id' ELSE to_jsonb(sh) END ORDER BY sh.id COLLATE "C"),'[]'::jsonb) AS shifts FROM shifts sh)
 SELECT (CASE WHEN shifts=$1::jsonb AND NOT EXISTS(SELECT 1 FROM shifts WHERE id=ANY($2::text[]) AND assignment_episode_id::text=ANY($3::text[])) THEN '1' ELSE 'shift_change_after_conflict' END)::integer FROM actual`,values:[JSON.stringify(expected),ids,snapshot.source.shifts.map(s=>s.assignment_episode_id)]};
}
