import 'server-only';
import {createHash,randomBytes} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {getWorkspace,workspaceReadGuard} from '../data/workspaces';
import {assertManagementProof,managementSessionStatements} from '../data/management-session';
import {hashPassword} from './password';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const safeId=(v:string)=>v.trim().length>0&&v.trim().length<=200&&!/[\u0000-\u001f\u007f]/.test(v);
const unavailable={state:'unavailable' as const};
export type RecoveryDelivery={send:(email:string,proof:string)=>Promise<void>};
function issueStatement(tokenHash:string,employeeId:string,email:string|null,actor:string|null,note:string|null,workspaceId:string):SqlStatement{
 return {text:`INSERT INTO password_recovery_proofs(token_hash,employee_id,credential_updated_at,employee_updated_at,method,actor_employee_id,attestation,expires_at)
  SELECT $1,e.id,c.password_updated_at,e.updated_at,CASE WHEN $4::text IS NULL THEN 'EMAIL' ELSE 'ASSISTED' END,$4,$5,clock_timestamp()+interval '15 minutes'
  FROM employees e JOIN employee_credentials c ON c.employee_id=e.id JOIN locations l ON l.id=e.primary_location_id
  WHERE upper(e.id)=upper($2) AND e.active AND l.workspace_id=$7 AND ($3::text IS NULL OR lower(trim(e.email))=lower($3))
   AND ($4::text IS NOT NULL OR (SELECT attempts FROM password_recovery_limits WHERE scope='global' AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900))<=300)
   AND ($4::text IS NOT NULL OR (SELECT attempts FROM password_recovery_limits WHERE scope=$6 AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900))<=3)
  RETURNING employee_id AS "employeeId",eXpires_at::text AS "expiresAt",(SELECT email FROM employees WHERE id=employee_id) AS email`,values:[tokenHash,employeeId,email,actor,note,hash(employeeId.toUpperCase()),workspaceId]};
}
/** Called after the public response. Known/unknown/inactive/unconfigured cases
 * share the response; no existence/channel information crosses that boundary. */
export async function requestPasswordRecovery(employeeId:string,email:string,delivery:RecoveryDelivery|null,executor:SqlExecutor=neonNotificationExecutor()):Promise<void>{
 if(!safeId(employeeId)||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return;
 const id=employeeId.trim(),token=randomBytes(32).toString('base64url');
 try{
  const workspace=await getWorkspace(executor);
  const statements:SqlStatement[]=[...workspaceReadGuard(workspace),
   {text:"DELETE FROM password_recovery_limits WHERE bucket<floor(EXTRACT(epoch FROM clock_timestamp())/900)-96",values:[]},
   {text:"INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES('global',floor(EXTRACT(epoch FROM clock_timestamp())/900),1) ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1",values:[]},
   {text:"INSERT INTO password_recovery_limits(scope,bucket,attempts) SELECT $1,floor(EXTRACT(epoch FROM clock_timestamp())/900),1 WHERE EXISTS(SELECT 1 FROM password_recovery_limits WHERE scope='global' AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900) AND attempts<=300) ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1",values:[hash(id.toUpperCase())]},
   {text:'SELECT id FROM employees WHERE upper(id)=upper($1) ORDER BY id FOR UPDATE',values:[id]},
   {text:'SELECT employee_id FROM employee_credentials WHERE upper(employee_id)=upper($1) FOR SHARE',values:[id]},
   ...(delivery?[issueStatement(hash(token),id,email.trim(),null,null,workspace.id)]:[]),
  ];
  const results=await executor.transaction(statements),issued=results.at(-1)?.[0] as {email:string}|undefined;
  if(delivery&&issued?.email)await delivery.send(issued.email,token);
 }catch{ /* Public response never reveals account existence or mail/SQL errors. */ }
}
export async function issueAssistedRecovery(proof:SessionMutationProof,employeeId:string,attestation:string,executor:SqlExecutor=neonNotificationExecutor()){
 try{
  assertManagementProof(proof,proof?.employee?.id);
  if(!['OWNER','MANAGER'].includes(proof.employee.role)||!safeId(employeeId)||employeeId===proof.employee.id||attestation.trim().length<10||attestation.length>500||/[\u0000-\u001f\u007f]/.test(attestation))return unavailable;
  const workspace=await getWorkspace(executor),token=randomBytes(32).toString('base64url');
  const guards:SqlStatement[]=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[...new Set([proof.employee.id,employeeId])].sort()]},...managementSessionStatements(proof,proof.employee.id),
   {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees actor JOIN employees target ON target.id=$2 JOIN locations l ON l.id=target.primary_location_id WHERE actor.id=$1 AND actor.active AND target.active AND l.workspace_id=$3 AND (target.role<>'OWNER' OR actor.role='OWNER')) THEN '1' ELSE 'recovery_permission_denied' END)::integer`,values:[proof.employee.id,employeeId,workspace.id]},
   {text:'SELECT employee_id FROM employee_credentials WHERE employee_id=$1 FOR SHARE',values:[employeeId]},
   {text:"SELECT (CASE WHEN EXISTS(SELECT 1 FROM employee_credentials WHERE employee_id=$1) THEN '1' ELSE 'recovery_permission_denied' END)::integer",values:[employeeId]},
   {text:'UPDATE password_recovery_proofs SET retired_at=clock_timestamp() WHERE employee_id=$1 AND used_at IS NULL AND retired_at IS NULL',values:[employeeId]}];
  const results=await executor.transaction([...guards,issueStatement(hash(token),employeeId,null,proof.employee.id,attestation.trim(),workspace.id),...managementSessionStatements(proof,proof.employee.id)]);
  const row=results[guards.length]?.[0] as {employeeId:string;expiresAt:string}|undefined;if(!row)return unavailable;
  return {state:'issued' as const,proof:token,employeeId:row.employeeId,expiresAt:row.expiresAt};
 }catch{return unavailable;}
}
/** Atomic credential replacement + single-use consumption + all portal session
 * revocation. Clocker device/PIN proofs and operational records are untouched. */
export async function resetPasswordWithProof(token:string,password:string,executor:SqlExecutor=neonNotificationExecutor()):Promise<{state:'reset'|'invalid'|'unavailable'}>{
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)||Buffer.from(token,'base64url').length!==32||Buffer.from(token,'base64url').toString('base64url')!==token||password.length<8||password.length>1024)return {state:'invalid'};
 try{
  const tokenHash=hash(token),globalScope=hash('NEVORA password reset limit global v1');
  const limits=await executor.transaction([
   {text:"DELETE FROM password_recovery_limits WHERE bucket<floor(EXTRACT(epoch FROM clock_timestamp())/900)-96",values:[]},
   {text:"INSERT INTO password_recovery_limits(scope,bucket,attempts) VALUES($1,floor(EXTRACT(epoch FROM clock_timestamp())/900),1) ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1",values:[globalScope]},
   {text:"INSERT INTO password_recovery_limits(scope,bucket,attempts) SELECT $1,floor(EXTRACT(epoch FROM clock_timestamp())/900),1 WHERE EXISTS(SELECT 1 FROM password_recovery_limits WHERE scope=$2 AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900) AND attempts<=250) ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1",values:[tokenHash,globalScope]},
   {text:"SELECT count(*)=2 AND bool_and(attempts<=CASE WHEN scope=$1 THEN 250 ELSE 10 END) AS allowed FROM password_recovery_limits WHERE scope=ANY($2::text[]) AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900)",values:[globalScope,[globalScope,tokenHash]]},
  ]);
  if(!(limits.at(-1)?.[0] as {allowed:boolean}|undefined)?.allowed)return {state:'invalid'};
  const newHash=await hashPassword(password),workspace=await getWorkspace(executor);
  const rows=await executor.query<{employeeId:string}>({text:'SELECT employee_id AS "employeeId" FROM password_recovery_proofs WHERE token_hash=$1',values:[tokenHash]});
  if(!rows[0])return {state:'invalid'};const employeeId=rows[0].employeeId;
  const statements:SqlStatement[]=[...workspaceReadGuard(workspace),
   {text:'SELECT id FROM employees WHERE id=$1 FOR UPDATE',values:[employeeId]},
   {text:'SELECT employee_id FROM employee_credentials WHERE employee_id=$1 FOR UPDATE',values:[employeeId]},
   {text:'SELECT token_hash FROM password_recovery_proofs WHERE token_hash=$1 FOR UPDATE',values:[tokenHash]},
   {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM password_recovery_proofs p JOIN employees e ON e.id=p.employee_id JOIN employee_credentials c ON c.employee_id=e.id JOIN locations l ON l.id=e.primary_location_id
    WHERE p.token_hash=$1 AND p.employee_id=$2 AND e.active AND l.workspace_id=$3 AND p.used_at IS NULL AND p.retired_at IS NULL AND p.expires_at>clock_timestamp() AND p.credential_updated_at=c.password_updated_at AND p.employee_updated_at=e.updated_at) THEN '1' ELSE 'recovery_proof_invalid' END)::integer`,values:[tokenHash,employeeId,workspace.id]},
   {text:'UPDATE employee_credentials SET password_hash=$2,password_updated_at=GREATEST(clock_timestamp(),password_updated_at+interval \'1 microsecond\'),must_change_password=false WHERE employee_id=$1',values:[employeeId,newHash]},
   {text:'UPDATE password_recovery_proofs SET used_at=clock_timestamp() WHERE token_hash=$1',values:[tokenHash]},
   {text:'UPDATE password_recovery_proofs SET retired_at=clock_timestamp() WHERE employee_id=$1 AND token_hash<>$2 AND used_at IS NULL AND retired_at IS NULL',values:[employeeId,tokenHash]},
   {text:'DELETE FROM employee_sessions WHERE employee_id=$1',values:[employeeId]},
   {text:"UPDATE push_subscriptions SET status='detached',generation=gen_random_uuid()::text,encrypted_material=NULL,updated_at=clock_timestamp() WHERE employee_id=$1 AND status='active'",values:[employeeId]},
   {text:"UPDATE push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp() WHERE subscription_id IN (SELECT id FROM push_subscriptions WHERE employee_id=$1) AND status IN ('queued','retry_pending','processing')",values:[employeeId]},
  ];
  await executor.transaction(statements);return {state:'reset'};
 }catch(error){return {state:error instanceof Error&&error.message.includes('recovery_proof_invalid')?'invalid':'unavailable'};}
}
