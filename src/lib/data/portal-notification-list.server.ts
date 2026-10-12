import 'server-only';
import {readEmployeeNotificationList} from './employee-notification-list.server';
import {getWorkspace} from './workspaces';
import {sqlNotificationStateRepository} from './notification-state';
import {neonNotificationExecutor} from './notification-transactions';
import {safeNotificationOpenPath,safeReturnTo} from '../notifications/destinations';
import type {EmployeeViewSnapshot,EmployeeNotificationItem} from '../employee-view';
import type {SqlExecutor,SourceKind} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';

const labels:Record<SourceKind,string>={SCHEDULE:'Schedule update',TIME_OFF:'Time off update',EXCHANGE:'Shift request update',CALLOUT:'Callout update',AVAILABILITY:'Availability update',MANAGER_SUMMARY:'Operations need review',SELF_TEST:'Device notification test',COMMUNICATION:'Team update',PAYROLL_PREPARATION:'Payroll preparation update',PAYROLL_STATEMENT:'Pay statement update'};
/** Management sees only its own notification intents, validated by the existing
 * canonical source/open policies. No private title/body or raw proof is exposed. */
export async function readPortalNotificationList(proof:SessionMutationProof,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeViewSnapshot> {
 if(['EMPLOYEE','LEAD'].includes(proof.employee.role))return readEmployeeNotificationList(proof,environment,executor);
 if(!['OWNER','MANAGER'].includes(proof.employee.role)||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash))return {state:'unavailable',reason:'access_denied'};
 if(environment!=='test'&&environment!=='production')return {state:'unavailable',reason:'read_failed'};
 const signal=AbortSignal.timeout(8000);
 try {
  const workspace=await getWorkspace(executor),values=[proof.employee.id,proof.sessionTokenHash,proof.employee.role,workspace.id,environment];
  const query={text:`SELECT n.id,n.created_at::text AS at,n.read_at::text AS read
   FROM notifications n WHERE n.employee_id=$1 AND n.environment=$5 AND n.cancelled_at IS NULL
   AND EXISTS(SELECT 1 FROM employee_sessions s JOIN employees e ON e.id=s.employee_id CROSS JOIN workspaces w
    WHERE s.token_hash=$2 AND e.id=$1 AND e.active AND e.role=$3 AND s.expires_at>clock_timestamp() AND w.id=$4 AND w.singleton AND w.active)
   ORDER BY n.created_at DESC,n.id DESC LIMIT 26`,values};
  const rows=await executor.query<{id:string;at:string;read:string|null}>(query,signal);
  const repository=sqlNotificationStateRepository(executor,workspace),items:EmployeeNotificationItem[]=[];
  let partial=rows.length>25,validForMs=5000;
  for(const row of rows.slice(0,25)) {
   signal.throwIfAborted();
   const intent=await repository.findIntent(row.id),now=new Date();
   if(!intent||intent.employeeId!==proof.employee.id||intent.environment!==environment||Date.parse(intent.dueAt)>now.getTime())continue;
   const check=await repository.check(intent,proof.employee.id,now,'open');
   const href=safeNotificationOpenPath(row.id);
   if(!check.deliverable||check.effectiveVersion!==intent.effectiveVersion||!href||!safeReturnTo(check.destination)||!(Date.parse(check.expiresAt)>now.getTime()))continue;
   validForMs=Math.min(validForMs,Date.parse(check.expiresAt)-now.getTime());
   items.push({id:row.id,label:labels[intent.source.kind],at:new Date(row.at).toISOString(),href,reviewState:row.read?'read':'unread',actionState:'available'});
  }
  const [session]=await executor.query<{valid:boolean}>({text:`SELECT EXISTS(SELECT 1 FROM employee_sessions s JOIN employees e ON e.id=s.employee_id CROSS JOIN workspaces w WHERE s.token_hash=$2 AND e.id=$1 AND e.active AND e.role=$3 AND s.expires_at>clock_timestamp() AND w.id=$4 AND w.singleton AND w.active) AS valid`,values:values.slice(0,4)},signal);
  if(!session?.valid)return {state:'unavailable',reason:'access_denied'};
  const finalRows=await executor.query<typeof rows[number]>(query,signal);
  if(JSON.stringify(finalRows)!==JSON.stringify(rows))return {state:'unavailable',reason:'read_failed'};
  const currentWorkspace=await getWorkspace(executor);
  if(currentWorkspace.id!==workspace.id||currentWorkspace.updatedAt!==workspace.updatedAt)return {state:'unavailable',reason:'read_failed'};
  partial=partial||items.some(item=>!item.label);
  return {state:'ready',kind:'notifications',coverage:partial?'partial':'complete',items,observedAt:new Date().toISOString(),validForMs:Math.max(1,validForMs)};
 } catch {return {state:'unavailable',reason:'read_failed'};}
}
