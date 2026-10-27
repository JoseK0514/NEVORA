import type {SqlStatement} from '../notifications/types';
/** Exact own-state freshness only; this digest grants no authority. Same expression is used under the writer's locks. */
function expression(weekly:boolean){return `md5(jsonb_build_object(
 'normal',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM availability_windows a WHERE employee_id=$1),'[]'::jsonb)
 ${weekly?`, 'weekly',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM weekly_availability_windows a WHERE employee_id=$1 AND week_start=$2::date),'[]'::jsonb),
 'exceptions',COALESCE((SELECT jsonb_agg(to_jsonb(a) ORDER BY a.id) FROM availability_exceptions a WHERE employee_id=$1 AND date >= $2::date AND date < $2::date+7),'[]'::jsonb),
 'submission',(SELECT to_jsonb(a) FROM weekly_availability_submissions a WHERE employee_id=$1 AND week_start=$2::date),
 'deadline',(SELECT EXTRACT(EPOCH FROM availability_deadline) FROM schedule_week_settings WHERE week_start=$2::date)` :''})::text)`;}
export function planningBasis(employeeId:string,selection:string,expected?:string):SqlStatement{
 const weekly=selection!=='normal',values:unknown[]=weekly?[employeeId,selection]:[employeeId];
 const basis=expression(weekly);
 if(expected!==undefined){values.push(expected);return {text:`SELECT (CASE WHEN ${basis}=$${values.length} THEN '1' ELSE 'planning_basis_conflict' END)::integer AS planning_basis_guard`,values};}
 return {text:`SELECT ${basis} AS basis`,values};
}
