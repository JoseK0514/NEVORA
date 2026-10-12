import 'server-only';
import {readEmployeeNotificationList} from './employee-notification-list.server';
import {getWorkspace,workspaceReadGuard} from './workspaces';
import {managementSessionStatements} from './management-session';
import {parseEmployeeView} from '../employee-view';
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
  let partial=rows.length>25,deadline=Date.now()+45000;
  for(const row of rows.slice(0,25)) {
   signal.throwIfAborted();
   const intent=await repository.findIntent(row.id),now=new Date();
   if(!intent||intent.employeeId!==proof.employee.id||intent.environment!==environment||Date.parse(intent.dueAt)>now.getTime())continue;
   const check=await repository.check(intent,proof.employee.id,now,'open');
   const href=safeNotificationOpenPath(row.id);
   if(!check.deliverable||check.effectiveVersion!==intent.effectiveVersion||!href||!safeReturnTo(check.destination)||!(Date.parse(check.expiresAt)>now.getTime()))continue;
   deadline=Math.min(deadline,Date.parse(check.expiresAt));
   items.push({id:row.id,label:labels[intent.source.kind],at:new Date(row.at).toISOString(),href,reviewState:row.read?'read':'unread',actionState:'available'});
  }
  const [session]=await executor.query<{valid:boolean;expiry:string}>({text:`SELECT (SELECT expires_at::text FROM employee_sessions WHERE token_hash=$2) AS expiry,EXISTS(SELECT 1 FROM employee_sessions s JOIN employees e ON e.id=s.employee_id CROSS JOIN workspaces w WHERE s.token_hash=$2 AND e.id=$1 AND e.active AND e.role=$3 AND s.expires_at>clock_timestamp() AND w.id=$4 AND w.singleton AND w.active) AS valid`,values:values.slice(0,4)},signal);
  if(!session?.valid)return {state:'unavailable',reason:'access_denied'};
  const finalRows=await executor.query<typeof rows[number]>(query,signal);
  if(JSON.stringify(finalRows)!==JSON.stringify(rows))return {state:'unavailable',reason:'read_failed'};
  const currentWorkspace=await getWorkspace(executor);
  if(currentWorkspace.id!==workspace.id||currentWorkspace.updatedAt!==workspace.updatedAt)return {state:'unavailable',reason:'read_failed'};
  partial=partial||items.some(item=>!item.label);
  const observedAt=new Date().toISOString();deadline=Math.min(deadline,Date.parse(session.expiry));
  return parseEmployeeView({state:'ready',kind:'notifications',coverage:partial?'partial':'complete',items,observedAt,validForMs:deadline-Date.parse(observedAt)},'notifications');
 } catch {return {state:'unavailable',reason:'read_failed'};}
}

/** An explicit inbox read changes only the recipient's read timestamp. It never
 * acknowledges an announcement or completes a request. Repeated reads are safe. */
export async function markManagementNotificationRead(proof:SessionMutationProof,id:string,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<boolean>{
 if(!['OWNER','MANAGER'].includes(proof.employee.role)||!/^[a-f0-9]{64}$/.test(proof.sessionTokenHash)||!id||id.length>100||(environment!=='test'&&environment!=='production'))return false;
 const signal=AbortSignal.timeout(8000),workspace=await getWorkspace(executor);
 const results=await executor.transaction([
  {text:"SET LOCAL lock_timeout='1500ms'",values:[]},{text:"SET LOCAL statement_timeout='2500ms'",values:[]},
  ...workspaceReadGuard(workspace),
  {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
  ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
  {text:`UPDATE notifications SET read_at=COALESCE(read_at,clock_timestamp())
   WHERE id=$1 AND employee_id=$2 AND environment=$3 AND cancelled_at IS NULL
    AND expires_at>clock_timestamp() AND due_at<=clock_timestamp() RETURNING id`,values:[id,proof.employee.id,environment]},
  ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])
 ],signal);
 return results[results.length-3]?.length===1;
}
