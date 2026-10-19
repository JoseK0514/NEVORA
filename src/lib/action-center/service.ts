import 'server-only';
import {withActionRequestFacts} from '../data/action-request-facts.server';
import {readActivePresentation} from '../workspace-presentation/service';
import {requestTypeAllowed} from '../workspace-presentation/modules';
import {combineManagerActions,type ActionCenter} from './project';
import {loadManagerDashboardData} from '../data/manager-dashboard';
import {readAttendanceReview} from '../data/attendance-review.server';
import {readManagerTimeCorrections} from '../data/time-corrections.server';
import {readTimecards} from '../timecards/service';
import {getWorkspace,workspaceReadGuard} from '../data/workspaces';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from '../data/management-session';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {addDays,isValidWeekStart} from '../date-utils';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import type {ManagerActionItem} from '../assistance/manager-actions';
type SchedulingReader=(proof:SessionMutationProof,week:string,executor:SqlExecutor)=>Promise<ManagerActionItem[]>;
const schedulingReader:SchedulingReader=async(proof,week,executor)=>(await loadManagerDashboardData(week,proof,executor)).managerActions;
/** Reuses the scheduling builder, D1 observations, D2 pending requests and D3
 * canonical cards. All four must succeed under current authority. */
export async function readActionCenter(proof:SessionMutationProof,weekStart:string,executor:SqlExecutor=neonNotificationExecutor(),readScheduling:SchedulingReader=schedulingReader):Promise<ActionCenter>{
 try{
  assertManagementProof(proof,proof?.employee?.id);if(!['OWNER','MANAGER'].includes(proof.employee.role))return {state:'unavailable',reason:'access_denied'};if(!isValidWeekStart(weekStart))throw Error('Invalid week');
  const workspace=await getWorkspace(executor),started=performance.now();
  await executor.transaction([...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...managementSessionStatements(proof,proof.employee.id)]);
  const settled=await Promise.allSettled([readScheduling(proof,weekStart,executor),readAttendanceReview(proof,executor),readManagerTimeCorrections(proof,executor),readTimecards(proof,{startDate:weekStart,endDate:addDays(weekStart,6)},executor)]);
  if(settled.some(result=>result.status==='rejected'))throw Error('Source unavailable');
  const [scheduling,attendance,corrections,timecards]=settled.map(result=>result.status==='fulfilled'?result.value:null) as [ManagerActionItem[],Awaited<ReturnType<typeof readAttendanceReview>>,Awaited<ReturnType<typeof readManagerTimeCorrections>>,Awaited<ReturnType<typeof readTimecards>>];
  for(const source of [attendance,corrections,timecards])if(source.state!=='ready')return {state:'unavailable',reason:source.reason==='access_denied'?'access_denied':'read_failed'};
  if(attendance.state!=='ready'||corrections.state!=='ready'||timecards.state!=='ready')throw Error('Incomplete sources');
  // Company modules (B2): requests in a module that is off are not shown.
  const modules=(await readActivePresentation(workspace.id,executor)).modules;
  const items=await withActionRequestFacts(proof,workspace,combineManagerActions(scheduling,attendance,corrections,timecards,proof.employee.id).filter(item=>requestTypeAllowed(item.type,modules)),executor);
  const authority=await executor.query<{observedAt:string;remaining:number}>({text:`SELECT clock_timestamp()::text AS "observedAt",floor(LEAST(45000,EXTRACT(epoch FROM (s.expires_at-clock_timestamp()))*1000))::integer AS remaining FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token_hash=$1 AND e.id=$2 AND e.active AND e.role IN ('OWNER','MANAGER') AND s.expires_at>clock_timestamp()`,values:[proof.sessionTokenHash,proof.employee.id]});
  if(!authority[0])return {state:'unavailable',reason:'access_denied'};
  const validForMs=Math.floor(Math.min(authority[0].remaining,attendance.validForMs,corrections.validForMs,timecards.validForMs,45000)-(performance.now()-started));if(validForMs<1)throw Error('Sources expired');
  return {state:'ready',observedAt:authority[0].observedAt,weekStart,validForMs,items,counts:{total:items.length,scheduling:items.filter(i=>i.category==='scheduling').length,requests:items.filter(i=>i.category==='requests').length,timekeeping:items.filter(i=>i.category==='timekeeping').length},limitedAttendance:attendance.coverage.state==='limited'};
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
