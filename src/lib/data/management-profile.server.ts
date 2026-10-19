import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {managementAlertTopics,parseManagementAlertChoice,type ManagementProfile} from '../management-profile';
import {neonNotificationExecutor} from './notification-transactions';
import {assertManagementProof,managementSessionStatements,isManagementAuthorizationError} from './management-session';
import {getWorkspace,workspaceReadGuard} from './workspaces';
import {managerLocationsSql,managerScopeStatements,readManagerScopeStorage} from './manager-location-scope.server';

function assertProfileProof(proof:SessionMutationProof) {
  assertManagementProof(proof,proof?.employee?.id);
  if(!['OWNER','MANAGER'].includes(proof.employee.role))throw Error('management_authorization');
}
const limits=[{text:"SET LOCAL lock_timeout='1500ms'",values:[]},{text:"SET LOCAL statement_timeout='2500ms'",values:[]}];
export async function readManagementProfile(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<ManagementProfile> {
  try{assertProfileProof(proof);}catch{return {state:'unavailable',reason:'access_denied'};}
  try {
    const signal=AbortSignal.timeout(8000),workspace=await getWorkspace(executor),storage=await readManagerScopeStorage(executor);
    const guards=[...limits,...workspaceReadGuard(workspace),
      {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
      ...managerScopeStatements(storage,workspace.id,proof.employee.id),
      ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])];
    const query={text:`WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS at)
      SELECT to_jsonb(o.at) AS "observedAt",LEAST(600000,FLOOR(EXTRACT(EPOCH FROM(s.expires_at-o.at))*1000)) AS "validForMs",
        e.email,e.phone,
        ${storage==='legacy'?"'all'":`CASE WHEN e.role='OWNER' OR EXISTS(SELECT 1 FROM nevora_tenancy.portal_administrative_authority a WHERE a.workspace_id=$3 AND a.employee_id=e.id AND a.scope_kind='ALL_TENANT') THEN 'all' ELSE 'assigned' END`} AS scope,
        ARRAY(SELECT l.name FROM locations l WHERE l.active AND l.id IN (${managerLocationsSql(storage,'$3','$1')}) ORDER BY l.id) AS names,
        COALESCE((SELECT jsonb_object_agg(p.topic_id,p.enabled) FROM management_alert_preferences p WHERE p.workspace_id=$3 AND p.employee_id=e.id),'{}'::jsonb) AS choices
      FROM employees e JOIN employee_sessions s ON s.employee_id=e.id CROSS JOIN observed o
      WHERE e.id=$1 AND s.token_hash=$2 AND e.active AND e.role=$4 AND s.expires_at>o.at`,values:[proof.employee.id,proof.sessionTokenHash,workspace.id,proof.employee.role]};
    const results=await executor.transaction([...guards,query,...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],signal);
    const row=results[guards.length]?.[0] as {observedAt:string;validForMs:number;email:string|null;phone:string|null;scope:'all'|'assigned';names:string[];choices:Record<string,boolean>}|undefined;
    if(!row)return {state:'unavailable',reason:'access_denied'};
    const validForMs=Number(row.validForMs);
    if(!Number.isFinite(Date.parse(row.observedAt))||!(validForMs>0&&validForMs<=600000)||
      !['all','assigned'].includes(row.scope)||!Array.isArray(row.names)||row.names.length>500||row.names.some(n=>typeof n!=='string'||n.length>200)||
      [row.email,row.phone].some(v=>v!==null&&(typeof v!=='string'||v.length>200))||!row.choices||typeof row.choices!=='object'||Array.isArray(row.choices)||Object.values(row.choices).some(v=>typeof v!=='boolean'))throw Error('invalid_profile_snapshot');
    return {state:'ready',kind:'management-profile',observedAt:new Date(row.observedAt).toISOString(),validForMs,
      contact:{email:row.email,phone:row.phone},locations:{scope:row.scope,names:row.names},
      alerts:managementAlertTopics.filter(t=>proof.employee.role==='OWNER'||t.id!=='payroll-ready').map(t=>({...t,on:t.id==='payroll-ready'&&process.env.NEVORA_PAYROLL_ENABLED!=='true'?false:row.choices[t.id]??true}))};
  }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
export async function saveManagementAlertChoice(proof:SessionMutationProof,value:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<void> {
  assertProfileProof(proof);
  const choice=parseManagementAlertChoice(value,proof.employee.role),workspace=await getWorkspace(executor);
  await executor.transaction([...limits,...workspaceReadGuard(workspace),
    {text:'SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE',values:[proof.employee.id]},
    ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role]),
    {text:`INSERT INTO management_alert_preferences(workspace_id,employee_id,topic_id,enabled) VALUES($1,$2,$3,$4)
      ON CONFLICT(workspace_id,employee_id,topic_id) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=clock_timestamp()`,values:[workspace.id,proof.employee.id,choice.topicId,choice.on]},
    // Reapply the same insertion policy to queued work, including mixed summaries.
    // Turning a topic back on never resurrects an already-cancelled old message.
    {text:`UPDATE notifications SET item_keys=item_keys WHERE employee_id=$1 AND cancelled_at IS NULL
      AND push_state IN ('pending','materialized','no_active_subscription')`,values:[proof.employee.id]},
    {text:`UPDATE push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp()
      WHERE notification_id IN (SELECT id FROM notifications WHERE employee_id=$1 AND cancelled_at IS NOT NULL)
      AND status IN ('queued','retry_pending','processing')`,values:[proof.employee.id]},
    ...managementSessionStatements(proof,proof.employee.id,[proof.employee.role])],AbortSignal.timeout(8000));
}
