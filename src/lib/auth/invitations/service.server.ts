import 'server-only';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import type {Workspace} from '@/lib/domain';
import type {SqlExecutor, SqlStatement} from '@/lib/notifications/types';
import type {SessionMutationProof} from '@/lib/shift-changes/types';
import type {InvitationDelivery} from '@/lib/company-access/contracts';
import type {InvitationCommand, InvitationReceipt, InvitationResult, InvitationStatusResult, DeliveryState} from './model';
import {neonNotificationExecutor} from '@/lib/data/notification-transactions';
import {getWorkspace, workspaceReadGuard} from '@/lib/data/workspaces';
import {assertManagementProof, managementSessionStatements} from '@/lib/data/management-session';

const uuid = (v: unknown): v is string => typeof v==='string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const safeId = (v: unknown): v is string => typeof v==='string' && v.length>0 && v.length<=200 && v===v.trim() && !/[\u0000-\u001f\u007f]/.test(v);
const revision = (v: unknown): v is number => typeof v==='number' && Number.isInteger(v) && v>=0 && v<2147483647;
const emailValid = (v: unknown): v is string => typeof v==='string' && v.length<=254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v);
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
/** Domain-separated custody key; persist this digest, never the invitation bearer. */
export const invitationProofDigest = (proof: string) => sha256('NEVORA invitation proof v1\0'+proof);
/** Must stay byte-compatible with the SQL fingerprint used during claim checks. */
export const invitationEmailFingerprint = (email: string) => sha256('NEVORA invitation email v1\0'+email.trim().toLowerCase());
const unavailable = (): InvitationResult => ({state:'unavailable',reason:'source_unavailable'});
const bucket = "date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00Z')";

function parseCommand(value: unknown): InvitationCommand | null {
 if(!value || typeof value!=='object' || Array.isArray(value)) return null;
 const v=value as Record<string,unknown>;
 if(!uuid(v.operationId) || !revision(v.expectedInvitationRevision)) return null;
 if(v.action==='ISSUE' && Object.keys(v).sort().join(',')==='action,expectedEmployeeVersion,expectedInvitationRevision,operationId'
  && typeof v.expectedEmployeeVersion==='string' && v.expectedEmployeeVersion.length>0 && v.expectedEmployeeVersion.length<=100) {
  return {action:'ISSUE',operationId:v.operationId,expectedInvitationRevision:v.expectedInvitationRevision,expectedEmployeeVersion:v.expectedEmployeeVersion};
 }
 if(v.action==='REVOKE' && Object.keys(v).sort().join(',')==='action,expectedInvitationRevision,invitationId,operationId' && uuid(v.invitationId)) {
  return {action:'REVOKE',operationId:v.operationId,invitationId:v.invitationId,expectedInvitationRevision:v.expectedInvitationRevision};
 }
 return null;
}
function commandHash(employeeId: string, command: InvitationCommand) {
 return sha256(JSON.stringify({employeeId,command}));
}
/** Serialize workspace/employee lifecycle before the live Owner session and
 * adoption checks. Reuse this order for receipt reads as well as commands. */
function ownerGuards(proof: SessionMutationProof, workspace: Workspace, employeeIds: readonly string[]=[]): SqlStatement[] {
 assertManagementProof(proof,proof?.employee?.id);
 return [
  {text:'SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR NO KEY UPDATE',values:[]},
  ...workspaceReadGuard(workspace).slice(1),
  {text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[...new Set([proof.employee.id,...employeeIds])].sort()]},
  ...managementSessionStatements(proof,proof.employee.id,['OWNER']),
  {text:`SELECT (CASE WHEN EXISTS(SELECT 1 FROM company_access_adoption WHERE workspace_id=$1 AND protocol_version=1 AND state='ENFORCED'
    AND owner_policy_receipt_id='01a13cda-e556-7652-8469-a18a77094364') THEN '1' ELSE 'company_access_not_adopted' END)::integer`,values:[workspace.id]},
 ];
}

type Target = {
 employeeId:string;employeeVersion:string;email:string|null;active:boolean;credentialed:boolean;self:boolean;
 invitationRevision:number;invitationId:string|null;issuedAt:string|null;expiresAt:string|null;issuerName:string|null;
 invitationState:'ISSUED'|'CONSUMED'|'REVOKED'|'EXPIRED'|'INVALIDATED'|null;delivery:DeliveryState|null;
};
function targetStatement(workspaceId: string, employeeId: string, actorId: string): SqlStatement {
 return {text:`SELECT e.id AS "employeeId",e.updated_at::text AS "employeeVersion",e.email,e.active,
  EXISTS(SELECT 1 FROM employee_credentials c WHERE c.employee_id=e.id) AS credentialed,e.id=$3 AS self,
  COALESCE(i.revision,0) AS "invitationRevision",i.id::text AS "invitationId",i.issued_at::text AS "issuedAt",i.expires_at::text AS "expiresAt",
  concat(issuer.first_name,' ',issuer.last_name) AS "issuerName",
  CASE WHEN i.id IS NULL THEN NULL WHEN i.consumed_at IS NOT NULL THEN 'CONSUMED'
   WHEN i.retired_at IS NOT NULL THEN CASE WHEN i.retired_reason='REVOKED' THEN 'REVOKED' ELSE 'INVALIDATED' END
   WHEN i.expires_at<=clock_timestamp() THEN 'EXPIRED'
   WHEN NOT e.active OR i.target_version<>e.updated_at::text OR NOT issuer.active OR issuer.role<>'OWNER' OR v.generation IS DISTINCT FROM i.issuer_generation
    OR i.email_fingerprint IS DISTINCT FROM encode(sha256(convert_to('NEVORA invitation email v1','UTF8')||decode('00','hex')||convert_to(lower(trim(e.email)),'UTF8')),'hex')
    OR EXISTS(SELECT 1 FROM employee_credentials c WHERE c.employee_id=e.id) THEN 'INVALIDATED' ELSE 'ISSUED' END AS "invitationState",
  CASE WHEN d.state='PREPARED' AND d.occurred_at<clock_timestamp()-interval '10 seconds' THEN 'UNKNOWN' ELSE d.state END AS delivery
  FROM employees e JOIN locations l ON l.id=e.primary_location_id
  LEFT JOIN LATERAL(SELECT * FROM company_invitations x WHERE x.workspace_id=$1 AND x.employee_id=e.id ORDER BY revision DESC LIMIT 1)i ON true
  LEFT JOIN employees issuer ON issuer.id=i.issuer_employee_id
  LEFT JOIN operational_subject_versions v ON v.workspace_id=$1 AND v.employee_id=issuer.id
  LEFT JOIN LATERAL(SELECT state,occurred_at FROM company_invitation_delivery_events d WHERE d.workspace_id=$1 AND d.invitation_id=i.id ORDER BY occurred_at DESC,id DESC LIMIT 1)d ON true
  WHERE e.id=$2 AND l.workspace_id=$1`,values:[workspaceId,employeeId,actorId]};
}
async function targetRead(proof: SessionMutationProof, workspace: Workspace, employeeId: string, executor: SqlExecutor): Promise<Target|null> {
 const statements=[...ownerGuards(proof,workspace,[employeeId]),targetStatement(workspace.id,employeeId,proof.employee.id),...managementSessionStatements(proof,proof.employee.id,['OWNER'])];
 const rows=await executor.transaction(statements);
 return rows[statements.length-3]?.[0] as Target|undefined ?? null;
}
function eligibility(target: Target): Extract<InvitationStatusResult,{state:'ready'}>['eligibility'] {
 return target.self?'SELF_ISSUE_DENIED':!target.active?'INACTIVE':target.credentialed?'ALREADY_ACTIVATED':!emailValid(target.email)?'NO_EMAIL':'INVITABLE';
}
function maskedEmail(email: string|null): string|null {
 if(!emailValid(email)) return null;
 const [local,domain]=email.split('@');
 return local.slice(0,1)+'***@'+domain;
}
function receipt(value: unknown, delivery?: DeliveryState): InvitationReceipt|null {
 if(!value || typeof value!=='object' || Array.isArray(value)) return null;
 const v=value as Record<string,unknown>;
 if(!uuid(v.operationId)||!uuid(v.invitationId)||!safeId(v.employeeId)||typeof v.revision!=='number'||!Number.isInteger(v.revision)||v.revision<1
  ||!['ISSUE','REVOKE'].includes(String(v.action))||typeof v.committedAt!=='string'||!(v.expiresAt===null||typeof v.expiresAt==='string')
  ||!['PREPARED','PROVIDER_ACCEPTED','UNKNOWN','FAILED'].includes(String(delivery??v.delivery))) return null;
 return {operationId:v.operationId,invitationId:v.invitationId,employeeId:v.employeeId,revision:v.revision,action:v.action as 'ISSUE'|'REVOKE',
  committedAt:v.committedAt,expiresAt:v.expiresAt as string|null,delivery:(delivery??v.delivery) as DeliveryState};
}
type StoredOperation = {commandHash:string;receipt:InvitationReceipt;delivery:DeliveryState|null};
async function operationRead(proof: SessionMutationProof, workspace: Workspace, operationId: string, executor: SqlExecutor): Promise<StoredOperation|null> {
 const guards=ownerGuards(proof,workspace);
 const results=await executor.transaction([...guards,{text:`SELECT o.command_hash AS "commandHash",o.receipt,
  CASE WHEN d.state='PREPARED' AND d.occurred_at<clock_timestamp()-interval '10 seconds' THEN 'UNKNOWN' ELSE d.state END AS delivery
  FROM company_access_operations o LEFT JOIN LATERAL(SELECT d.state,d.occurred_at FROM company_invitation_delivery_events d
    WHERE d.workspace_id=o.workspace_id AND d.invitation_id=(o.receipt->>'invitationId')::uuid ORDER BY d.occurred_at DESC,d.id DESC LIMIT 1)d ON true
  WHERE o.workspace_id=$1 AND o.actor_employee_id=$2 AND o.operation_id=$3 AND o.kind='INVITATION'`,values:[workspace.id,proof.employee.id,operationId]},
  ...managementSessionStatements(proof,proof.employee.id,['OWNER'])]);
 const row=results[guards.length]?.[0] as StoredOperation|undefined;
 if(!row) return null;
 const clean=receipt(row.receipt,row.delivery??undefined);
 if(!clean) throw Error('company_access_invalid_receipt');
 return {...row,receipt:clean};
}
/** Owner-only current eligibility/status view. Exposes a masked registered email
 * and derived lifecycle state, never a stored proof digest or bearer. */
export async function readInvitationStatus(proof: SessionMutationProof, employeeId: string, executor: SqlExecutor=neonNotificationExecutor()): Promise<InvitationStatusResult> {
 if(!safeId(employeeId)) return {state:'unavailable',reason:'access_denied'};
 try {
  const workspace=await getWorkspace(executor),target=await targetRead(proof,workspace,employeeId,executor);
  if(!target) return {state:'unavailable',reason:'access_denied'};
  const eligible=eligibility(target);
  return {state:'ready',employeeId:target.employeeId,employeeVersion:target.employeeVersion,eligibility:eligible,
   registeredEmailMasked:maskedEmail(target.email),invitationRevision:target.invitationRevision,
   invitation:target.invitationId && target.invitationState && target.issuedAt && target.expiresAt ? {id:target.invitationId,state:target.invitationState,
    issuedAt:target.issuedAt,expiresAt:target.expiresAt,issuerName:target.issuerName??''}:null,
   delivery:target.delivery??'UNAVAILABLE',allowedCommands:[...(eligible==='INVITABLE'?['ISSUE' as const]:[]),...(target.invitationState==='ISSUED'?['REVOKE' as const]:[])],retryAfterMs:null};
 } catch {return {state:'unavailable',reason:'access_denied'};}
}
/** Recover this actor's historical receipt after an uncertain command response.
 * Reading a receipt rechecks current Owner access and never retries delivery. */
export async function readInvitationOperation(proof: SessionMutationProof, operationId: string, executor: SqlExecutor=neonNotificationExecutor()): Promise<InvitationResult> {
 if(!uuid(operationId)) return {state:'invalid',fieldErrors:[{field:'operationId',message:'Invalid operation.'}]};
 try {const workspace=await getWorkspace(executor),row=await operationRead(proof,workspace,operationId,executor);return row?{state:'saved',receipt:row.receipt}:unavailable();}
 catch {return unavailable();}
}
function assertion(text: string, values: readonly unknown[], reason: string): SqlStatement {
 return {text:`SELECT(CASE WHEN ${text} THEN '1' ELSE '${reason}' END)::integer`,values};
}
/** Commit a versioned Owner command and actor-scoped idempotency receipt before
 * external SMTP work. Replaying identical input returns the original receipt;
 * changing input under the same operation ID conflicts. Delivery acceptance is
 * tracked separately from invitation validity, and uncertain commit/delivery
 * outcomes require receipt lookup rather than a new blind issue attempt. */
export async function issueOrRevokeInvitation(proof: SessionMutationProof, employeeId: string, value: InvitationCommand,
 delivery: InvitationDelivery|null, executor: SqlExecutor=neonNotificationExecutor()): Promise<InvitationResult> {
 const command=parseCommand(value);
 if(!command||!safeId(employeeId)) return {state:'invalid',fieldErrors:[{field:'invitation',message:'Invalid invitation command.'}]};
 let workspace:Workspace|undefined;
 let attemptedMutation=false;
 try {
  workspace=await getWorkspace(executor);
  const hash=commandHash(employeeId,command),old=await operationRead(proof,workspace,command.operationId,executor);
  if(old) return old.commandHash===hash?{state:'saved',receipt:old.receipt}:{state:'conflict',reason:'changed_replay'};
  if(command.action==='ISSUE'&&!delivery) return {state:'unavailable',reason:'delivery_unavailable'};
  const target=await targetRead(proof,workspace,employeeId,executor);
  if(!target) return unavailable();
  // Another identical operation can commit after the initial lookup but before this target read.
  const concurrent=await operationRead(proof,workspace,command.operationId,executor);
  if(concurrent)return concurrent.commandHash===hash?{state:'saved',receipt:concurrent.receipt}:{state:'conflict',reason:'changed_replay'};
  if(target.invitationRevision!==command.expectedInvitationRevision) return {state:'conflict',reason:'invitation_changed'};
  if(command.action==='ISSUE' && target.employeeVersion!==command.expectedEmployeeVersion) return {state:'conflict',reason:'employee_changed'};
  if(command.action==='ISSUE' && eligibility(target)!=='INVITABLE') return {state:'invalid',fieldErrors:[{field:'employee',message:'This employee cannot receive an invitation.'}]};
  if(command.action==='REVOKE' && (target.invitationId!==command.invitationId||target.invitationState==='CONSUMED'||target.invitationState==='REVOKED')) return {state:'conflict',reason:'invitation_changed'};
  const invitationId=command.action==='ISSUE'?randomUUID():command.invitationId;
  const bearer=command.action==='ISSUE'?randomBytes(32).toString('base64url'):null;
  const guards=ownerGuards(proof,workspace,[employeeId]);
  const statements:SqlStatement[]=[...guards,
   assertion('NOT EXISTS(SELECT 1 FROM company_access_operations WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3)',[workspace.id,proof.employee.id,command.operationId],'company_access_existing_operation'),
   assertion('COALESCE((SELECT max(revision) FROM company_invitations WHERE workspace_id=$1 AND employee_id=$2),0)=$3',[workspace.id,employeeId,command.expectedInvitationRevision],'company_access_invitation_changed'),
  ];
  if(command.action==='ISSUE') {
   statements.push(
    assertion(`EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id WHERE e.id=$1 AND e.active AND e.updated_at::text=$2
      AND l.workspace_id=$3 AND e.id<>$4 AND e.email=$5 AND NOT EXISTS(SELECT 1 FROM employee_credentials c WHERE c.employee_id=e.id))`,
      [employeeId,command.expectedEmployeeVersion,workspace.id,proof.employee.id,target.email],'company_access_employee_changed'),
    assertion(`COALESCE((SELECT attempts FROM company_invitation_issue_counters WHERE workspace_id=$1 AND bucket_start=${bucket} AND kind='TARGET' AND subject=$2),0)<3
     AND COALESCE((SELECT attempts FROM company_invitation_issue_counters WHERE workspace_id=$1 AND bucket_start=${bucket} AND kind='GLOBAL' AND subject=''),0)<300`,[workspace.id,employeeId],'company_access_issue_limited'),
    {text:`DELETE FROM company_invitation_issue_counters WHERE workspace_id=$1 AND bucket_start<${bucket}-interval '24 hours'`,values:[workspace.id]},
    {text:`INSERT INTO company_invitation_issue_counters VALUES($1,${bucket},'GLOBAL','',1) ON CONFLICT(workspace_id,bucket_start,kind,subject) DO UPDATE SET attempts=company_invitation_issue_counters.attempts+1`,values:[workspace.id]},
    {text:`INSERT INTO company_invitation_issue_counters VALUES($1,${bucket},'TARGET',$2,1) ON CONFLICT(workspace_id,bucket_start,kind,subject) DO UPDATE SET attempts=company_invitation_issue_counters.attempts+1`,values:[workspace.id,employeeId]},
    {text:"UPDATE company_invitations SET retired_at=clock_timestamp(),retired_reason='REISSUED' WHERE workspace_id=$1 AND employee_id=$2 AND consumed_at IS NULL AND retired_at IS NULL",values:[workspace.id,employeeId]},
    {text:`WITH now AS MATERIALIZED(SELECT clock_timestamp() AS value)
     INSERT INTO company_invitations(workspace_id,id,employee_id,revision,target_version,email_fingerprint,issuer_employee_id,issuer_generation,proof_digest,issued_at,expires_at)
     SELECT $1,$2,$3,company_access_next_revision($4),$5,$6,$7,v.generation,$8,now.value,now.value+interval '168 hours'
      FROM operational_subject_versions v CROSS JOIN now WHERE v.workspace_id=$1 AND v.employee_id=$7`,
     values:[workspace.id,invitationId,employeeId,command.expectedInvitationRevision,command.expectedEmployeeVersion,invitationEmailFingerprint(target.email!),proof.employee.id,invitationProofDigest(bearer!)]},
    {text:"INSERT INTO company_invitation_delivery_events(workspace_id,id,invitation_id,state) VALUES($1,$2,$3,'PREPARED')",values:[workspace.id,randomUUID(),invitationId]},
   );
  } else {
   statements.push(assertion('EXISTS(SELECT 1 FROM company_invitations WHERE workspace_id=$1 AND id=$2 AND employee_id=$3 AND consumed_at IS NULL AND retired_at IS NULL)',[workspace.id,invitationId,employeeId],'company_access_invitation_changed'),
    {text:"UPDATE company_invitations SET retired_at=clock_timestamp(),retired_reason='REVOKED' WHERE workspace_id=$1 AND id=$2",values:[workspace.id,invitationId]});
  }
  statements.push({text:'INSERT INTO company_invitation_events(workspace_id,id,invitation_id,action,actor_employee_id) VALUES($1,$2,$3,$4,$5)',values:[workspace.id,randomUUID(),invitationId,command.action,proof.employee.id]},
   {text:`INSERT INTO company_access_operations(workspace_id,actor_employee_id,operation_id,employee_id,kind,command_hash,receipt)
    SELECT $1::text,$2::text,$3::uuid,$4::text,'INVITATION',$5::text,jsonb_build_object('operationId',$3::uuid::text,'invitationId',i.id::text,'revision',i.revision,'employeeId',$4::text,
    'action',$6::text,'committedAt',clock_timestamp()::text,'expiresAt',i.expires_at::text,'delivery',COALESCE((SELECT state FROM company_invitation_delivery_events d
      WHERE d.workspace_id=$1 AND d.invitation_id=i.id ORDER BY occurred_at DESC,id DESC LIMIT 1),'PREPARED'))
    FROM company_invitations i WHERE i.workspace_id=$1 AND i.id=$7 RETURNING receipt`,values:[workspace.id,proof.employee.id,command.operationId,employeeId,hash,command.action,invitationId]});
  const receiptIndex=statements.length-1;
  statements.push(...managementSessionStatements(proof,proof.employee.id,['OWNER']));
  attemptedMutation=true;
  const result=await executor.transaction(statements);
  const saved=receipt((result[receiptIndex]?.[0] as {receipt:unknown}|undefined)?.receipt);
  if(!saved) return {state:'outcome_unknown',operationId:command.operationId};
  if(command.action==='REVOKE') return {state:'saved',receipt:saved};
  let outcome:DeliveryState='UNKNOWN';
  try {const sent=await delivery!.send({registeredEmail:target.email!,proof:bearer!,expiresAt:saved.expiresAt!});if(sent.providerAccepted===true)outcome='PROVIDER_ACCEPTED';}
  catch(error) {if(error && typeof error==='object' && 'deliveryState' in error && error.deliveryState==='FAILED')outcome='FAILED';}
  try {await executor.query({text:'INSERT INTO company_invitation_delivery_events(workspace_id,id,invitation_id,state) VALUES($1,$2,$3,$4)',values:[workspace.id,randomUUID(),invitationId,outcome]});}
  catch {return {state:'outcome_unknown',operationId:command.operationId};}
  // SMTP is outside the commit. Reauthorize after that wait before disclosing the historical receipt.
  try {
   const current=await operationRead(proof,workspace,command.operationId,executor);
   if(current)return {state:'saved',receipt:current.receipt};
  } catch {}
  return {state:'outcome_unknown',operationId:command.operationId};
 } catch(error) {
  const message=error instanceof Error?error.message:'';
  if(message.includes('company_access_existing_operation')&&workspace) {
   try {const row=await operationRead(proof,workspace,command.operationId,executor);if(row)return row.commandHash===commandHash(employeeId,command)?{state:'saved',receipt:row.receipt}:{state:'conflict',reason:'changed_replay'};}catch{}
  }
  if(message.includes('company_access_employee_changed'))return {state:'conflict',reason:'employee_changed'};
  if(message.includes('company_access_invitation_changed'))return {state:'conflict',reason:'invitation_changed'};
  if(message.includes('company_access_issue_limited')) {
   try {const [r]=await executor.query<{retryAfterMs:number}>({text:`SELECT ceil(EXTRACT(epoch FROM(${bucket}+interval '15 minutes'-clock_timestamp()))*1000)::integer AS "retryAfterMs"`,values:[]});return {state:'limited',retryAfterMs:Math.max(1,r.retryAfterMs)};}catch{}
  }
  const code=error&&typeof error==='object'&&'code' in error?String(error.code):'';
  const knownRollback=/^[0-9A-Z]{5}$/.test(code)&&!code.startsWith('08');
  return attemptedMutation&&!knownRollback?{state:'outcome_unknown',operationId:command.operationId}:unavailable();
 }
}
