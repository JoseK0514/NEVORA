import 'server-only';
import {assertOperationalAccess,operationalScopeStatements} from '../company-access/operational-scope.server';
import {createHash,randomBytes} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {neonNotificationExecutor} from '../data/notification-transactions';
import {getWorkspace,workspaceReadGuard} from '../data/workspaces';
import {assertManagementProof} from '../data/management-session';
import {hashPassword,verifyPassword} from './password';
import {passwordRejection} from './password-policy';
import type {PasswordRejection} from './password-requirements';
import type {AccountEmailContext} from './account-email-copy';
import type {ReviewedLoginCredential} from './session-issuance';
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const safeId=(v:string)=>v.trim().length>0&&v.trim().length<=200&&!/[\u0000-\u001f\u007f]/.test(v);
const unavailable={state:'unavailable' as const};
/** `notifyReset` tells the account's registered email that its password was just changed (optional for older senders). */
export type RecoveryDelivery={send:(email:string,proof:string,context?:AccountEmailContext)=>Promise<void>;notifyReset?:(email:string,context?:AccountEmailContext)=>Promise<void>};
function issueStatement(tokenHash:string,employeeId:string,email:string|null,actor:string|null,note:string|null,workspaceId:string):SqlStatement{
 return {text:`INSERT INTO password_recovery_proofs(token_hash,employee_id,credential_updated_at,employee_updated_at,method,actor_employee_id,attestation,expires_at)
  SELECT $1,e.id,c.password_updated_at,e.updated_at,CASE WHEN $4::text IS NULL THEN 'EMAIL' ELSE 'ASSISTED' END,$4,$5,clock_timestamp()+interval '15 minutes'
  FROM employees e JOIN employee_credentials c ON c.employee_id=e.id JOIN locations l ON l.id=e.primary_location_id
  WHERE upper(e.id)=upper($2) AND e.active AND l.workspace_id=$7 AND ($3::text IS NULL OR lower(trim(e.email))=lower($3))
   AND ($4::text IS NOT NULL OR COALESCE((SELECT attempts FROM password_recovery_limits WHERE scope='global' AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900)),0)<300)
   AND ($4::text IS NOT NULL OR COALESCE((SELECT attempts FROM password_recovery_limits WHERE scope=$6 AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900)),0)<3)
  RETURNING employee_id AS "employeeId",eXpires_at::text AS "expiresAt",(SELECT email FROM employees WHERE id=employee_id) AS email,(SELECT first_name FROM employees WHERE id=employee_id) AS "firstName"`,values:[tokenHash,employeeId,email,actor,note,hash(employeeId.toUpperCase()),workspaceId]};
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
   {text:'SELECT id FROM employees WHERE upper(id)=upper($1) ORDER BY id FOR UPDATE',values:[id]},
   {text:'SELECT employee_id FROM employee_credentials WHERE upper(employee_id)=upper($1) FOR SHARE',values:[id]},
  ];
  // Only a request that matches an active account and its registered email uses up the hourly budgets, so anonymous
  // requests can't lock a person (or the whole company) out of self-recovery.
  const issueAt=statements.length;
  if(delivery){
   const issued="EXISTS(SELECT 1 FROM password_recovery_proofs WHERE token_hash=$1)",bucket="floor(EXTRACT(epoch FROM clock_timestamp())/900)";
   statements.push(issueStatement(hash(token),id,email.trim(),null,null,workspace.id),
    {text:`INSERT INTO password_recovery_limits(scope,bucket,attempts) SELECT 'global',${bucket},1 WHERE ${issued} ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1`,values:[hash(token)]},
    {text:`INSERT INTO password_recovery_limits(scope,bucket,attempts) SELECT $2,${bucket},1 WHERE ${issued} ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1`,values:[hash(token),hash(id.toUpperCase())]});
  }
  const results=await executor.transaction(statements),issued=results[issueAt]?.[0] as {email:string;firstName:string;expiresAt:string}|undefined;
  if(delivery&&issued?.email)await delivery.send(issued.email,token,{companyName:workspace.name,firstName:issued.firstName,expiresAt:issued.expiresAt,timeZone:workspace.timeZone});
 }catch{ /* Public response never reveals account existence or mail/SQL errors. */ }
}
/** Issue a short-lived recovery bearer after current Company access and target
 * role checks. Managers may assist employee/lead accounts; Owners may assist
 * other roles too. Prior unused proofs retire in the issue transaction, and
 * actor authority is checked again before returning the bearer to the caller.
 * All failures collapse to unavailable; this path sends no recovery email. */
export async function issueAssistedRecovery(proof:SessionMutationProof,employeeId:string,attestation:string,executor:SqlExecutor=neonNotificationExecutor()){
 try{
  assertManagementProof(proof,proof?.employee?.id);
  if(!['OWNER','MANAGER'].includes(proof.employee.role)||!safeId(employeeId)||employeeId===proof.employee.id||attestation.trim().length<10||attestation.length>500||/[\u0000-\u001f\u007f]/.test(attestation))return unavailable;
  const access=await assertOperationalAccess(proof,{kind:'COMPANY'},executor),workspace=access.workspace,token=randomBytes(32).toString('base64url');
  const authority=()=>operationalScopeStatements(proof,workspace,{kind:'COMPANY'},access.authority);
  const guards:SqlStatement[]=[...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[...new Set([proof.employee.id,employeeId])].sort()]},...authority(),
   {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees actor JOIN employees target ON target.id=$2 JOIN locations l ON l.id=target.primary_location_id WHERE actor.id=$1 AND actor.active AND target.active AND l.workspace_id=$3 AND (target.role IN ('EMPLOYEE','LEAD') OR actor.role='OWNER')) THEN '1' ELSE 'recovery_permission_denied' END)::integer`,values:[proof.employee.id,employeeId,workspace.id]},
   {text:'SELECT employee_id FROM employee_credentials WHERE employee_id=$1 FOR SHARE',values:[employeeId]},
   {text:"SELECT (CASE WHEN EXISTS(SELECT 1 FROM employee_credentials WHERE employee_id=$1) THEN '1' ELSE 'recovery_permission_denied' END)::integer",values:[employeeId]},
   {text:'UPDATE password_recovery_proofs SET retired_at=clock_timestamp() WHERE employee_id=$1 AND used_at IS NULL AND retired_at IS NULL',values:[employeeId]}];
  const results=await executor.transaction([...guards,issueStatement(hash(token),employeeId,null,proof.employee.id,attestation.trim(),workspace.id),...authority()]);
  await executor.transaction([...workspaceReadGuard(workspace),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...authority()]);
  const row=results[guards.length]?.[0] as {employeeId:string;expiresAt:string}|undefined;if(!row)return unavailable;
  return {state:'issued' as const,proof:token,employeeId:row.employeeId,expiresAt:row.expiresAt};
 }catch{return unavailable;}
}
/** Called only after password verification. Rechecks its exact reviewed revision
 * under lifecycle/credential locks; the proof grants replacement only, never app
 * authority. No channel claim or delivery is involved. */
export async function issueInitialPasswordReplacement(employeeId:string,reviewed:ReviewedLoginCredential,executor:SqlExecutor=neonNotificationExecutor()){
 try{
  if(!safeId(employeeId)||!reviewed?.updated_at||!reviewed.password_hash||!reviewed.password_updated_at)return unavailable;
  const workspace=await getWorkspace(executor),token=randomBytes(32).toString('base64url');
  const results=await executor.transaction([...workspaceReadGuard(workspace),
   {text:'SELECT id FROM employees WHERE id=$1 FOR UPDATE',values:[employeeId]},
   {text:'SELECT employee_id FROM employee_credentials WHERE employee_id=$1 FOR UPDATE',values:[employeeId]},
   {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM employees e JOIN employee_credentials c ON c.employee_id=e.id JOIN locations l ON l.id=e.primary_location_id
    WHERE e.id=$1 AND e.active AND l.workspace_id=$5 AND e.updated_at::text=$2 AND c.password_hash=$3 AND c.password_updated_at::text=$4 AND c.must_change_password)
    THEN '1' ELSE 'initial_password_changed' END)::integer`,values:[employeeId,reviewed.updated_at,reviewed.password_hash,reviewed.password_updated_at,workspace.id]},
   {text:'UPDATE password_recovery_proofs SET retired_at=clock_timestamp() WHERE employee_id=$1 AND used_at IS NULL AND retired_at IS NULL',values:[employeeId]},
   {text:`INSERT INTO password_recovery_proofs(token_hash,employee_id,credential_updated_at,employee_updated_at,method,expires_at)
    SELECT $1,e.id,c.password_updated_at,e.updated_at,'INITIAL_PASSWORD',clock_timestamp()+interval '15 minutes' FROM employees e JOIN employee_credentials c ON c.employee_id=e.id WHERE e.id=$2 RETURNING expires_at::text AS "expiresAt"`,values:[hash(token),employeeId]},
  ]);
  const row=results.at(-1)?.[0] as {expiresAt:string}|undefined;
  return row?{state:'issued' as const,proof:token,expiresAt:row.expiresAt}:unavailable;
 }catch{return unavailable;}
}
/** Atomic credential replacement + single-use consumption + all portal session
 * revocation. The proof binds the employee and credential revisions at issuance,
 * so later lifecycle/password changes invalidate it. Push detachment/cancellation
 * commits with the reset; the optional registered-email notice is best effort
 * after commit. Clocker device/PIN proofs and operational records are untouched. */
export async function resetPasswordWithProof(token:string,password:string,executor:SqlExecutor=neonNotificationExecutor(),delivery:RecoveryDelivery|null=null):Promise<{state:'reset'|'invalid'|'unavailable';passwordReason?:PasswordRejection}>{
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)||Buffer.from(token,'base64url').length!==32||Buffer.from(token,'base64url').toString('base64url')!==token)return {state:'invalid'};
 if(password.length>1024)return {state:'invalid',passwordReason:'too_long'};
 try{
  const tokenHash=hash(token),globalScope=hash('NEVORA password reset limit global v1');
  // Only codes that exist are counted (10 tries per code, 250 resets per 15 minutes overall), so random codes from
  // anyone can't use up the company-wide budget and stop real resets.
  const bucket="floor(EXTRACT(epoch FROM clock_timestamp())/900)",exists="EXISTS(SELECT 1 FROM password_recovery_proofs WHERE token_hash=$1)";
  const limits=await executor.transaction([
   {text:`DELETE FROM password_recovery_limits WHERE bucket<${bucket}-96`,values:[]},
   {text:`INSERT INTO password_recovery_limits(scope,bucket,attempts) SELECT $2,${bucket},1 WHERE ${exists} ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1`,values:[tokenHash,globalScope]},
   {text:`INSERT INTO password_recovery_limits(scope,bucket,attempts) SELECT $1,${bucket},1 WHERE ${exists} ON CONFLICT(scope,bucket) DO UPDATE SET attempts=password_recovery_limits.attempts+1`,values:[tokenHash]},
   {text:`SELECT ${exists} AND COALESCE((SELECT attempts FROM password_recovery_limits WHERE scope=$2 AND bucket=${bucket}),0)<=250
     AND COALESCE((SELECT attempts FROM password_recovery_limits WHERE scope=$1 AND bucket=${bucket}),0)<=10 AS allowed`,values:[tokenHash,globalScope]},
  ]);
  if(!(limits.at(-1)?.[0] as {allowed:boolean}|undefined)?.allowed)return {state:'invalid'};
  const workspace=await getWorkspace(executor);
  const rows=await executor.query<{employeeId:string;method:string;passwordHash:string;mustChange:boolean}>({text:'SELECT p.employee_id AS "employeeId",p.method,c.password_hash AS "passwordHash",c.must_change_password AS "mustChange" FROM password_recovery_proofs p JOIN employee_credentials c ON c.employee_id=p.employee_id JOIN employees e ON e.id=p.employee_id JOIN locations l ON l.id=e.primary_location_id WHERE p.token_hash=$1 AND l.workspace_id=$2 AND e.active AND p.used_at IS NULL AND p.retired_at IS NULL AND p.expires_at>clock_timestamp() AND p.credential_updated_at=c.password_updated_at AND p.employee_updated_at=e.updated_at',values:[tokenHash,workspace.id]});
  if(!rows[0])return {state:'invalid'};const employeeId=rows[0].employeeId;
  const passwordReason=passwordRejection(password,{employeeId,companyName:workspace.name});if(passwordReason)return {state:'invalid',passwordReason};
  const newHash=await hashPassword(password);
  if((rows[0].mustChange||rows[0].method==='INITIAL_PASSWORD')&&await verifyPassword(password,rows[0].passwordHash))return {state:'invalid'};
  const statements:SqlStatement[]=[...workspaceReadGuard(workspace),
   {text:'SELECT id FROM employees WHERE id=$1 FOR UPDATE',values:[employeeId]},
   {text:'SELECT employee_id FROM employee_credentials WHERE employee_id=$1 FOR UPDATE',values:[employeeId]},
   {text:'SELECT token_hash FROM password_recovery_proofs WHERE token_hash=$1 FOR UPDATE',values:[tokenHash]},
   {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM password_recovery_proofs p JOIN employees e ON e.id=p.employee_id JOIN employee_credentials c ON c.employee_id=e.id JOIN locations l ON l.id=e.primary_location_id
    WHERE p.token_hash=$1 AND p.employee_id=$2 AND e.active AND l.workspace_id=$3 AND p.used_at IS NULL AND p.retired_at IS NULL AND p.expires_at>clock_timestamp() AND p.credential_updated_at=c.password_updated_at AND p.employee_updated_at=e.updated_at AND c.password_hash=$4 AND c.must_change_password=$5) THEN '1' ELSE 'recovery_proof_invalid' END)::integer`,values:[tokenHash,employeeId,workspace.id,rows[0].passwordHash,rows[0].mustChange]},
   {text:'UPDATE employee_credentials SET password_hash=$2,password_updated_at=GREATEST(clock_timestamp(),password_updated_at+interval \'1 microsecond\'),must_change_password=false WHERE employee_id=$1',values:[employeeId,newHash]},
   {text:'UPDATE password_recovery_proofs SET used_at=clock_timestamp() WHERE token_hash=$1',values:[tokenHash]},
   {text:'UPDATE password_recovery_proofs SET retired_at=clock_timestamp() WHERE employee_id=$1 AND token_hash<>$2 AND used_at IS NULL AND retired_at IS NULL',values:[employeeId,tokenHash]},
   {text:'DELETE FROM employee_sessions WHERE employee_id=$1',values:[employeeId]},
   {text:"UPDATE push_subscriptions SET status='detached',generation=gen_random_uuid()::text,encrypted_material=NULL,updated_at=clock_timestamp() WHERE employee_id=$1 AND status='active'",values:[employeeId]},
   {text:"UPDATE push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp() WHERE subscription_id IN (SELECT id FROM push_subscriptions WHERE employee_id=$1) AND status IN ('queued','retry_pending','processing')",values:[employeeId]},
  ];
  const results=await executor.transaction([...statements,{text:`SELECT NULLIF(trim(email),'') AS email,first_name AS "firstName" FROM employees WHERE id=$1`,values:[employeeId]}]);
  // The person hears about the change on their registered email, whoever asked for the reset. Best effort: the reset
  // has already happened, and every session was ended with it.
  const contact=results.at(-1)?.[0] as {email:string|null;firstName:string}|undefined;
  if(contact?.email&&delivery?.notifyReset)await delivery.notifyReset(contact.email,{companyName:workspace.name,firstName:contact.firstName,timeZone:workspace.timeZone}).catch(()=>undefined);
  return {state:'reset'};
 }catch(error){return {state:error instanceof Error&&error.message.includes('recovery_proof_invalid')?'invalid':'unavailable'};}
}
