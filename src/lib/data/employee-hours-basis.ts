import type {SqlStatement} from '../notifications/types';
/** Own-source freshness, never authorization. Actor serialization is supplied by the existing correction writer. */
const expression=`md5(jsonb_build_object(
 'entries',COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.id) FROM time_entries t JOIN locations l ON l.id=t.location_id WHERE t.employee_id=$1 AND l.workspace_id=$2),'[]'::jsonb),
 'breaks',COALESCE((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM break_entries b JOIN time_entries t ON t.id=b.time_entry_id JOIN locations l ON l.id=t.location_id WHERE t.employee_id=$1 AND l.workspace_id=$2),'[]'::jsonb),
 'events',COALESCE((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.id) FROM time_correction_events e JOIN time_correction_requests r ON r.id=e.request_id WHERE r.employee_id=$1 AND r.workspace_id=$2),'[]'::jsonb),
 'adjustments',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM time_correction_adjustments a WHERE a.employee_id=$1 AND a.workspace_id=$2),'[]'::jsonb),
 'locations',COALESCE((SELECT jsonb_agg(jsonb_build_array(l.id,l.name,l.short_name,l.active) ORDER BY l.id) FROM employee_location_eligibility e JOIN locations l ON l.id=e.location_id WHERE e.employee_id=$1 AND l.workspace_id=$2),'[]'::jsonb)
)::text)`;
export function hoursCorrectionBasis(employeeId:string,workspaceId:string,expected?:{basis:string;operationId:string}):SqlStatement{
 const values:unknown[]=[employeeId,workspaceId];
 if(expected){values.push(expected.operationId,expected.basis);return {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM time_correction_events e JOIN time_correction_requests r ON r.id=e.request_id WHERE e.id=$3::uuid AND e.event_kind='REQUESTED' AND e.actor_employee_id=$1 AND r.employee_id=$1 AND r.workspace_id=$2) OR ${expression}=$4 THEN '1' ELSE 'nevora_correction_STALE_SOURCE' END)::integer AS hours_source_guard`,values};}
 return {text:`SELECT ${expression} AS basis`,values};
}
