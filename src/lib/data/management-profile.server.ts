import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {managementAlertTopics,parseManagementAlertChoice,type ManagementProfile} from '../management-profile';
import {neonNotificationExecutor} from './notification-transactions';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {getWorkspace,workspaceReadGuard} from './workspaces';
import {readOperationalAuthority} from '../company-access/operational-scope.server';

function assertProfileProof(proof:SessionMutationProof) {
  assertManagementProof(proof,proof?.employee?.id);
  if(!['OWNER','MANAGER'].includes(proof.employee.role))throw Error('management_authorization');
}
const limits=[{text:"SET LOCAL lock_timeout='1500ms'",values:[]},{text:"SET LOCAL statement_timeout='2500ms'",values:[]}];
export async function readManagementProfile(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<ManagementProfile> {
  try{assertProfileProof(proof);}catch{return {state:'unavailable',reason:'access_denied'};}
  try {
    const signal=AbortSignal.timeout(8000),workspace=await getWorkspace(executor),startedAt=Date.now();
    const before=await readOperationalAuthority(proof,executor);
    if(before.state!=='ready')return before;
    if(before.role!==proof.employee.role||before.employeeId!==proof.employee.id)return {state:'unavailable',reason:'access_denied'};
    const guards=[...limits,...workspaceReadGuard(workspace),
      {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
      ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])];
    const query={text:`WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS at)
      SELECT to_jsonb(o.at) AS "observedAt",LEAST(600000,FLOOR(EXTRACT(EPOCH FROM(s.expires_at-o.at))*1000)) AS "validForMs",
        e.email,e.phone,
        e.management_alert_choices AS choices
      FROM employees e JOIN employee_sessions s ON s.employee_id=e.id CROSS JOIN observed o
      WHERE e.id=$1 AND s.token_hash=$2 AND e.active AND e.role=$3 AND s.expires_at>o.at`,values:[proof.employee.id,proof.sessionTokenHash,proof.employee.role]};
    const results=await executor.transaction([...guards,query,...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
    const row=results[guards.length]?.[0] as {observedAt:string;validForMs:number;email:string|null;phone:string|null;choices:Record<string,boolean>}|undefined;
    if(!row)return {state:'unavailable',reason:'access_denied'};
    const after=await readOperationalAuthority(proof,executor);
    if(after.state!=='ready')return after;
    if(after.employeeId!==before.employeeId||after.role!==before.role||after.authority!==before.authority||
      JSON.stringify(after.scope)!==JSON.stringify(before.scope)||JSON.stringify(after.locations)!==JSON.stringify(before.locations))
      return {state:'unavailable',reason:'access_denied'};
    const scope=before.scope?.mode==='COMPANY'?'all':'assigned';
    const names=before.scope?before.locations.filter(location=>before.scope?.mode==='COMPANY'||before.scope?.locationIds.includes(location.id)).map(location=>location.name):[];
    const sessionValidForMs=Number(row.validForMs);
    const validForMs=Math.min(sessionValidForMs,before.validForMs-(Date.now()-startedAt),after.validForMs);
    if(!Number.isFinite(Date.parse(row.observedAt))||!(sessionValidForMs>0&&sessionValidForMs<=600000)||!(validForMs>0&&validForMs<=600000)||
      names.length>500||names.some(n=>typeof n!=='string'||n.length>200)||
      [row.email,row.phone].some(v=>v!==null&&(typeof v!=='string'||v.length>200))||!row.choices||typeof row.choices!=='object'||Array.isArray(row.choices)||Object.values(row.choices).some(v=>typeof v!=='boolean'))throw Error('invalid_profile_snapshot');
    return {state:'ready',kind:'management-profile',observedAt:new Date(row.observedAt).toISOString(),validForMs,
      contact:{email:row.email,phone:row.phone},locations:{scope,names},
      alerts:managementAlertTopics.filter(t=>proof.employee.role==='OWNER'||t.id!=='payroll-ready').map(t=>({...t,on:t.id==='payroll-ready'&&process.env.NEVORA_PAYROLL_ENABLED!=='true'?false:row.choices[t.id]??true}))};
  }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
export async function saveManagementAlertChoice(proof:SessionMutationProof,value:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<void> {
  assertProfileProof(proof);
  const choice=parseManagementAlertChoice(value,proof.employee.role),workspace=await getWorkspace(executor);
  await executor.transaction([...limits,...workspaceReadGuard(workspace),
    {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR NO KEY UPDATE',values:[proof.employee.id]},
    ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
    {text:`UPDATE employees SET management_alert_choices=jsonb_set(management_alert_choices,ARRAY[$2::text],to_jsonb($3::boolean)) WHERE id=$1`,values:[proof.employee.id,choice.topicId,choice.on]},
    // Reapply the same insertion policy to queued work, including mixed summaries.
    // Turning a topic back on never resurrects an already-cancelled old message.
    {text:`UPDATE notifications SET item_keys=item_keys WHERE employee_id=$1 AND cancelled_at IS NULL
      AND push_state IN ('pending','materialized','no_active_subscription')`,values:[proof.employee.id]},
    {text:`UPDATE push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
      WHERE notification_id IN (SELECT id FROM notifications WHERE employee_id=$1 AND cancelled_at IS NOT NULL)
      AND status IN ('queued','retry_pending','processing')`,values:[proof.employee.id]},
    ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],AbortSignal.timeout(8000));
}
