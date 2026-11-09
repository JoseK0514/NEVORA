import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {projectStaffingConflict,type StaffingSnapshot,type StaffingLeave,type StaffingAssignment} from './model';
import {addDays,isValidWeekStart} from '../date-utils';
import {assertManagementProof,isManagementAuthorizationError} from '../data/management-session';
import {assertEmployeeViewProof,employeeViewGuards,employeeReadLimits,readEmployeeWorkspace} from '../data/employee-profile.server';
import {assertOperationalAccess,assertOriginalOperationalAccess,isOperationalAuthorizationError,operationalScopeStatements} from '../company-access/operational-scope.server';
import {readActivePresentation} from '../workspace-presentation/service';
import {workspaceReadGuard} from '../data/workspaces';
import {neonNotificationExecutor} from '../data/sql-executor';
import {employeeViewAuthority} from '../employee-view-authority.server';
export type StaffingSelector={weekStart:string;requestId?:string;employeeId?:string};
const safeId=(value:unknown):value is string=>typeof value==='string'&&value.length>0&&value.length<=200&&!/[\p{Cc}\p{Cf}]/u.test(value);
export function parseStaffingSelector(value:unknown):StaffingSelector{
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid staffing selector');
  const v=value as Record<string,unknown>;
  if(Object.keys(v).some(k=>!['weekStart','requestId','employeeId'].includes(k))||typeof v.weekStart!=='string'||!isValidWeekStart(v.weekStart)||
    v.requestId!==undefined&&!safeId(v.requestId)||v.employeeId!==undefined&&!safeId(v.employeeId))throw Error('Invalid staffing selector');
  return {weekStart:v.weekStart,...(v.requestId!==undefined?{requestId:v.requestId as string}:{}),...(v.employeeId!==undefined?{employeeId:v.employeeId as string}:{})};
}

/** Read-only queue over durable approval and immutable publication facts. This
 * also handles approvals already saved before this reader existed. No dismissal
 * command can hide a live conflict; draft rows are deliberately never the source.
 * Location managers see only assignments at authorized locations, without reasons. */
export async function readLeaveStaffing(proof:SessionMutationProof,selector:StaffingSelector,executor:SqlExecutor=neonNotificationExecutor()):Promise<StaffingSnapshot>{
  const started=performance.now(),signal=AbortSignal.timeout(8000);
  try{assertManagementProof(proof,proof?.employee?.id);if(!['OWNER','MANAGER','EMPLOYEE','LEAD'].includes(proof.employee.role))throw Error('denied');}
  catch{return {state:'unavailable',reason:'access_denied'};}
  try{
    const selected=parseStaffingSelector(selector),management=['OWNER','MANAGER'].includes(proof.employee.role);
    if(!management){assertEmployeeViewProof(proof);if(selected.employeeId&&selected.employeeId!==proof.employee.id)return {state:'unavailable',reason:'access_denied'};}
    const admission=management?await assertOperationalAccess(proof,undefined,executor):null;
    const workspace=admission?.workspace??await readEmployeeWorkspace(executor,signal);
    const footprint=admission?.scope.mode==='LOCATIONS'?{kind:'LOCATIONS' as const,locationIds:admission.scope.locationIds}:{kind:'COMPANY' as const};
    const authority=():SqlStatement[]=>admission
      ?[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},...operationalScopeStatements(proof,workspace,footprint,admission.authority)]
      :employeeViewGuards(proof,workspace);
    await executor.transaction([...employeeReadLimits,...authority()],signal);
    const enabled=(await readActivePresentation(workspace.id,executor,{strict:true})).modules.timeOff;
    const employeeId=management?selected.employeeId??null:proof.employee.id;
    const statement:SqlStatement=enabled?{
      text:`WITH latest AS (
        SELECT DISTINCT ON(week_start) id,revision_number FROM schedule_publication_revisions
        WHERE week_start IN($4::date-7,$4::date) ORDER BY week_start,revision_number DESC
      ),pairs AS (
        SELECT jsonb_build_object('id',r.id,'employeeId',r.employee_id,'startDate',r.start_date::text,'endDate',r.end_date::text,
          'startTime',CASE WHEN r.start_time IS NULL THEN NULL ELSE to_char(r.start_time,'HH24:MI') END,
          'endTime',CASE WHEN r.end_time IS NULL THEN NULL ELSE r.end_time::text END,
          'status',r.status,'reviewedBy',r.reviewed_by,'reviewedAt',r.reviewed_at::text) AS leave,
        jsonb_build_object('id',sh.source_shift_id,'employeeId',sh.employee_id,'employeeName',trim(e.first_name||' '||e.last_name),
          'locationId',l.id,'locationName',l.short_name,'date',sh.date::text,'startTime',sh.start_time::text,'endTime',sh.end_time::text,
          'publicationId',p.id,'revisionNumber',p.revision_number,'isCalloutApproved',sh.is_callout_approved) AS assignment
        FROM latest p JOIN schedule_publication_revision_shifts sh ON sh.revision_id=p.id
        JOIN locations l ON l.id=sh.location_id AND l.workspace_id=$1
        JOIN employees e ON e.id=sh.employee_id JOIN locations home ON home.id=e.primary_location_id AND home.workspace_id=$1
        JOIN time_off_requests r ON r.employee_id=e.id AND r.status IN('PENDING','APPROVED')
          AND r.start_date<=sh.date+1 AND r.end_date>=sh.date
        WHERE sh.date BETWEEN $4::date-1 AND $4::date+6 AND NOT sh.is_callout_approved
          AND ($5::text IS NULL OR r.id=$5) AND ($6::text IS NULL OR e.id=$6)
          AND ($7::text[] IS NULL OR sh.location_id=ANY($7))
        ORDER BY sh.date,sh.source_shift_id,r.id LIMIT 1001
      ) SELECT clock_timestamp()::text AS "observedAt",
        floor(LEAST(45000,extract(epoch FROM(s.expires_at-clock_timestamp()))*1000))::integer AS "validForMs",
        (SELECT COALESCE(jsonb_agg(to_jsonb(pairs)),'[]'::jsonb) FROM pairs) AS pairs
        FROM employee_sessions s WHERE s.token_hash=$2 AND s.employee_id=$3`,
      values:[workspace.id,proof.sessionTokenHash,proof.employee.id,selected.weekStart,selected.requestId??null,employeeId,admission?.scope.mode==='LOCATIONS'?admission.scope.locationIds:null],
    }:{text:`SELECT clock_timestamp()::text AS "observedAt",floor(LEAST(45000,extract(epoch FROM(expires_at-clock_timestamp()))*1000))::integer AS "validForMs",'[]'::jsonb AS pairs FROM employee_sessions WHERE token_hash=$1 AND employee_id=$2`,values:[proof.sessionTokenHash,proof.employee.id]};
    const guards=[...employeeReadLimits,...authority()];
    const results=await executor.transaction([...guards,statement,...authority()],signal);
    const row=results[guards.length]?.[0] as {observedAt:string;validForMs:number;pairs:{leave:StaffingLeave;assignment:StaffingAssignment}[]}|undefined;
    if(!row||!Array.isArray(row.pairs)||row.pairs.length>1000||!Number.isSafeInteger(row.validForMs)||!Number.isFinite(Date.parse(row.observedAt)))throw Error('Staffing source unavailable');
    const items=row.pairs.flatMap(pair=>{
      const leave={...pair.leave,startTime:pair.leave.startTime?.slice(0,5),endTime:pair.leave.endTime?.slice(0,5)};
      const assignment={...pair.assignment,startTime:pair.assignment.startTime.slice(0,5),endTime:pair.assignment.endTime.slice(0,5)};
      const item=projectStaffingConflict(leave,assignment);
      return item?.overlapDates.some(date=>date>=selected.weekStart&&date<=addDays(selected.weekStart,6))?[item]:[];
    });
    if(new Set(items.map(i=>i.id)).size!==items.length)throw Error('Duplicate staffing source');
    if(admission)await assertOriginalOperationalAccess(proof,admission,executor);
    else await executor.transaction([...employeeReadLimits,...authority()],signal);
    const validForMs=Math.floor(Math.min(row.validForMs,admission?.validForMs??45000)-(performance.now()-started));
    if(validForMs<1) return {state:'unavailable',reason:'access_denied'};
    return {state:'ready',authority:employeeViewAuthority(proof,'requests'),weekStart:selected.weekStart,observedAt:row.observedAt,validForMs,items};
  }catch(error){return {state:'unavailable',reason:isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
