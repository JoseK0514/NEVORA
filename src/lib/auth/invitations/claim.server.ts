import 'server-only';
import {randomUUID} from 'node:crypto';
import type {Workspace} from '@/lib/domain';
import type {SqlExecutor,SqlStatement} from '@/lib/notifications/types';
import {neonNotificationExecutor} from '@/lib/data/notification-transactions';
import {workspaceReadGuard} from '@/lib/data/workspaces';
import {hashPassword} from '@/lib/auth/password';
import {invitationProofDigest} from './service.server';
import {tryAcquireInvitationPasswordWork} from './admission.server';
import type {ActivationResult} from './model';

const bucket="date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00Z')";
const joins=`FROM company_invitations i JOIN workspaces w ON w.id=i.workspace_id
 JOIN employees e ON e.id=i.employee_id JOIN locations home ON home.id=e.primary_location_id
 JOIN employees issuer ON issuer.id=i.issuer_employee_id JOIN locations issuer_home ON issuer_home.id=issuer.primary_location_id
 JOIN operational_subject_versions v ON v.workspace_id=i.workspace_id AND v.employee_id=issuer.id`;
const binding=`w.singleton AND w.active AND home.workspace_id=w.id AND issuer_home.workspace_id=w.id
 AND e.active AND e.updated_at::text=i.target_version AND issuer.active AND issuer.role='OWNER' AND v.generation=i.issuer_generation
 AND e.id<>issuer.id AND e.email IS NOT NULL
 AND i.email_fingerprint=encode(sha256(convert_to('NEVORA invitation email v1','UTF8')||decode('00','hex')||convert_to(lower(trim(e.email)),'UTF8')),'hex')
 AND EXISTS(SELECT 1 FROM company_access_adoption a WHERE a.workspace_id=w.id AND a.protocol_version=1 AND a.state='ENFORCED' AND a.owner_policy_receipt_id='01a13cda-e556-7652-8469-a18a77094364')`;
const live=`i.consumed_at IS NULL AND i.retired_at IS NULL AND i.expires_at>clock_timestamp()
 AND NOT EXISTS(SELECT 1 FROM employee_credentials c WHERE c.employee_id=e.id)`;
type Custody={id:string;employeeId:string;issuerId:string;workspaceId:string;name:string;timeZone:string;createdAt:string;updatedAt:string};
function workspace(row:Custody):Workspace{return {id:row.workspaceId,name:row.name,timeZone:row.timeZone,createdAt:row.createdAt,updatedAt:row.updatedAt,active:true};}
function validProof(proof:unknown):proof is string{
 return typeof proof==='string'&&/^[A-Za-z0-9_-]{43}$/.test(proof)&&Buffer.from(proof,'base64url').length===32&&Buffer.from(proof,'base64url').toString('base64url')===proof;
}
function assertion(expression:string,values:readonly unknown[]):SqlStatement{
 return {text:`SELECT(CASE WHEN ${expression} THEN '1' ELSE 'company_access_claim_invalid' END)::integer`,values};
}
function current(digest:string,row:Custody,consumedHash?:string):SqlStatement{
 const phase=consumedHash===undefined?live:`i.consumed_at IS NOT NULL AND i.retired_at IS NULL AND i.expires_at>clock_timestamp()
  AND EXISTS(SELECT 1 FROM employee_credentials c WHERE c.employee_id=e.id AND c.password_hash=$3)`;
 return assertion(`EXISTS(SELECT 1 ${joins} WHERE i.proof_digest=$1 AND i.id=$2::uuid AND ${binding} AND ${phase})`,consumedHash===undefined?[digest,row.id]:[digest,row.id,consumedHash]);
}
function locks(row:Custody):SqlStatement[]{
 return [...workspaceReadGuard(workspace(row)),
  {text:'SELECT id FROM employees WHERE id=ANY($1::text[]) ORDER BY id FOR UPDATE',values:[[row.employeeId,row.issuerId].sort()]},
  {text:'SELECT employee_id FROM employee_credentials WHERE employee_id=$1 FOR UPDATE',values:[row.employeeId]},
  {text:'SELECT id FROM company_invitations WHERE workspace_id=$1 AND id=$2 FOR UPDATE',values:[row.workspaceId,row.id]}];
}
function failure(error:unknown,commitAttempted:boolean,aborted:boolean):ActivationResult{
 const message=error instanceof Error?error.message:'';
 const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
 if(message.includes('company_access_claim_invalid')||message.includes('company_access_invitation_expired')||message.includes('workspace_version_conflict')||code==='23505')return {state:'invalid'};
 if(commitAttempted&&(!/^[0-9A-Z]{5}$/.test(code)||code.startsWith('08')))return {state:'outcome_unknown'};
 return {state:aborted?'invalid':'unavailable'};
}
/** The public path. Identity is returned only following a known credential+consume commit. */
export async function claimInvitation(proof:string,password:string,executor:SqlExecutor=neonNotificationExecutor(),signal?:AbortSignal):Promise<ActivationResult>{
 if(!validProof(proof)||typeof password!=='string'||password.length<8||password.length>1024||signal?.aborted)return {state:'invalid'};
 let release:(()=>void)|null=null,commitAttempted=false;
 try{
  const digest=invitationProofDigest(proof);
  // A unique indexed known-custody read precedes counters, process slots and password work.
  const rows=await executor.query<Custody>({text:`SELECT i.id::text,i.employee_id AS "employeeId",i.issuer_employee_id AS "issuerId",w.id AS "workspaceId",
   w.name,w.time_zone AS "timeZone",w.created_at::text AS "createdAt",w.updated_at::text AS "updatedAt"
   ${joins} WHERE i.proof_digest=$1 AND ${binding} AND ${live}
   AND COALESCE((SELECT c.attempts FROM company_invitation_claim_counters c WHERE c.workspace_id=i.workspace_id AND c.invitation_id=i.id AND c.bucket_start=${bucket}),0)<10 LIMIT 1`,values:[digest]},signal);
  const row=rows[0];if(!row||signal?.aborted)return {state:'invalid'};
  release=tryAcquireInvitationPasswordWork();if(!release)return {state:'unavailable'};
  const admission:SqlStatement[]=[...locks(row),current(digest,row),
   {text:`DELETE FROM company_invitation_claim_counters WHERE workspace_id=$1 AND invitation_id=$2 AND bucket_start<${bucket}-interval '24 hours'`,values:[row.workspaceId,row.id]},
   {text:`INSERT INTO company_invitation_claim_counters(workspace_id,invitation_id,bucket_start,attempts) VALUES($1,$2,${bucket},1)
    ON CONFLICT(workspace_id,invitation_id,bucket_start) DO UPDATE SET attempts=company_invitation_claim_counters.attempts+1 WHERE company_invitation_claim_counters.attempts<10 RETURNING attempts`,values:[row.workspaceId,row.id]},
   current(digest,row)];
  const admitted=await executor.transaction(admission,signal);
  if(admitted[admission.length-2]?.length!==1||signal?.aborted)return {state:'invalid'};
  const passwordHash=await hashPassword(password);
  if(signal?.aborted)return {state:'invalid'};
  const statements:SqlStatement[]=[...locks(row),current(digest,row),
   {text:'INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false) RETURNING employee_id',values:[row.employeeId,passwordHash]},
   {text:'UPDATE company_invitations SET consumed_at=clock_timestamp() WHERE workspace_id=$1 AND id=$2 AND consumed_at IS NULL AND retired_at IS NULL RETURNING id',values:[row.workspaceId,row.id]},
   {text:"UPDATE company_invitations SET retired_at=clock_timestamp(),retired_reason='INVALIDATED' WHERE workspace_id=$1 AND employee_id=$2 AND id<>$3 AND consumed_at IS NULL AND retired_at IS NULL",values:[row.workspaceId,row.employeeId,row.id]},
   {text:"INSERT INTO company_invitation_events(workspace_id,id,invitation_id,action,actor_employee_id) VALUES($1,$2,$3,'CONSUME',$4)",values:[row.workspaceId,randomUUID(),row.id,row.employeeId]},
   current(digest,row,passwordHash)];
  commitAttempted=true;await executor.transaction(statements,signal);
  return {state:'activated',employeeId:row.employeeId};
 }catch(error){return failure(error,commitAttempted,signal?.aborted??false);}
 finally{release?.();}
}
/** Internal maintenance only; no public route or new scheduler. Metadata remains retained. */
export async function clearTerminalInvitationDigests(executor:SqlExecutor=neonNotificationExecutor()):Promise<number>{
 const rows=await executor.query<{id:string}>({text:`UPDATE company_invitations SET proof_digest=NULL WHERE proof_digest IS NOT NULL
  AND COALESCE(consumed_at,retired_at,expires_at)<=clock_timestamp()-interval '24 hours' RETURNING id`,values:[]});
 return rows.length;
}
