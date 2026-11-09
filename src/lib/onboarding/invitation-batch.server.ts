import 'server-only';
import {mutationTransaction} from '../data/transaction-composition';
import {createHash} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {WorkspaceBinding} from '../workspace-routing/resolver.server';
import {workspaceBindingFacts,assertWorkspaceBindingCurrent} from '../workspace-routing/resolver.server';
import {getWorkspaceDb} from '../workspace-routing/transport.server';
import {withWorkspaceBinding} from '../workspace-routing/context.server';
import type {InvitationDelivery} from '../company-access/contracts';
import type {InvitationResult,InvitationStatusResult} from '../auth/invitations/model';
import {issueOrRevokeInvitation,readInvitationOperation,readInvitationStatus} from '../auth/invitations/service.server';
import {parseOnboardingCommand,isClosedRecord,readableText,isOperationId,type OnboardingResult,type OperationReceipt} from './contracts';
import {onboardingOwnerGuards,onboardingCommandReceipt,onboardingMutationExecutor} from './setup.server';
export type InvitationBatchTarget={employeeId:string;expectedEmployeeVersion:string;expectedInvitationRevision:number};
export function parseInvitationBatchCommand(value:unknown){return parseOnboardingCommand<{targets:InvitationBatchTarget[]}>(value,v=>{
 if(!isClosedRecord(v,['targets'])||!Array.isArray(v.targets)||!v.targets.length||v.targets.length>50)return null;
 const targets:InvitationBatchTarget[]=[];
 for(const t of v.targets){if(!isClosedRecord(t,['employeeId','expectedEmployeeVersion','expectedInvitationRevision'])||!readableText(t.employeeId,128)||!readableText(t.expectedEmployeeVersion,100)||typeof t.expectedInvitationRevision!=='number'||!Number.isInteger(t.expectedInvitationRevision)||t.expectedInvitationRevision<0||t.expectedInvitationRevision>=2147483647)return null;targets.push({employeeId:t.employeeId,expectedEmployeeVersion:t.expectedEmployeeVersion,expectedInvitationRevision:t.expectedInvitationRevision});}
 if(new Set(targets.map(t=>t.employeeId)).size!==targets.length)return null;
 return {targets:targets.sort((a,b)=>a.employeeId.localeCompare(b.employeeId))};
});}
/** Deterministic UUIDv8 child identity is a receipt key, never an authority token. */
export function invitationChildOperationId(workspaceId:string,actorId:string,batchId:string,employeeId:string):string{
 const b=createHash('sha256').update(JSON.stringify(['NEVORA invitation batch v1',workspaceId,actorId,batchId,employeeId])).digest().subarray(0,16);b[6]=(b[6]&15)|128;b[8]=(b[8]&63)|128;const s=b.toString('hex');return [s.slice(0,8),s.slice(8,12),s.slice(12,16),s.slice(16,20),s.slice(20)].join('-');
}
type BatchRow={owner_generation:string;current_generation:string;version:string;command_hash:string};
type ItemRow={target_generation:string;employee_id:string;child_operation_id:string;expected_employee_version:string;expected_invitation_revision:number;state:'PREPARED'|'SAVED'|'BLOCKED'|'UNKNOWN';result:InvitationResult|null};
export type BatchSnapshot={state:'ready';operationId:string;version:string;stage:'PENDING'|'COMPLETE'|'PARTIAL'|'UNKNOWN';receipt:OperationReceipt;items:{employeeId:string;operationId:string;commandState:ItemRow['state'];result:InvitationResult|null;status:InvitationStatusResult}[]}|{state:'unavailable'};
const unavailable=():OnboardingResult=>({state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'});
function batchVersion(workspaceId:string,actorId:string,operationId:string):SqlStatement{return {text:'UPDATE onboarding_invitation_batches SET version=version+1 WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3',values:[workspaceId,actorId,operationId]};}
async function batchRead(proof:SessionMutationProof,binding:WorkspaceBinding,operationId:string,ex:SqlExecutor){
 const {record}=await assertWorkspaceBindingCurrent(binding),guards=onboardingOwnerGuards(proof,record.id);
 const result=await ex.transaction([...guards,{text:'SELECT b.owner_generation::text,b.version::text,b.command_hash,v.generation::text AS current_generation FROM onboarding_invitation_batches b JOIN operational_subject_versions v ON v.workspace_id=b.workspace_id AND v.employee_id=b.actor_employee_id WHERE b.workspace_id=$1 AND b.actor_employee_id=$2 AND b.operation_id=$3',values:[record.id,proof.employee.id,operationId]},
 {text:'SELECT target_generation::text,employee_id,child_operation_id::text,expected_employee_version,expected_invitation_revision,state,result FROM onboarding_invitation_items WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3 ORDER BY employee_id LIMIT 51',values:[record.id,proof.employee.id,operationId]},...onboardingOwnerGuards(proof,record.id)]);
 const row=result[guards.length]?.[0] as BatchRow|undefined,items=result[guards.length+1] as ItemRow[];if(!row||!items.length||items.length>50)throw Error('onboarding_batch_unavailable');return {row,items};
}
function generationGuard(workspaceId:string,actorId:string,generation:string):SqlStatement{return {text:`SELECT(CASE WHEN EXISTS(SELECT 1 FROM operational_subject_versions v JOIN employees e ON e.id=v.employee_id WHERE v.workspace_id=$1 AND e.id=$2 AND e.active AND e.role='OWNER' AND v.generation=$3::bigint AND $3::bigint>0) THEN '1' ELSE 'onboarding_batch_owner_changed' END)::integer`,values:[workspaceId,actorId,generation]};}
/** Dispatch only PREPARED targets. UNKNOWN is a durable intent fence before the
 * canonical invitation call, including crashes before/after SMTP. No bearer queue. */
async function processPrepared(proof:SessionMutationProof,binding:WorkspaceBinding,operationId:string,delivery:InvitationDelivery|null,ex:SqlExecutor){
 if(!delivery)return;
 const {record}=workspaceBindingFacts(binding),batch=await batchRead(proof,binding,operationId,ex),generation=generationGuard(record.id,proof.employee.id,batch.row.owner_generation);
 if(batch.row.owner_generation!==batch.row.current_generation){await ex.transaction([...onboardingOwnerGuards(proof,record.id,true),{text:"UPDATE onboarding_invitation_items SET state='BLOCKED',result=$4::jsonb,updated_at=clock_timestamp() WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3 AND state='PREPARED'",values:[record.id,proof.employee.id,operationId,JSON.stringify({state:'unavailable',reason:'source_unavailable'})]},batchVersion(record.id,proof.employee.id,operationId)]);return;}
 let attempts=0;
 for(const item of batch.items){
  if(item.state!=='PREPARED'||attempts>=5)continue;attempts++;
  const guards=onboardingOwnerGuards(proof,record.id,true);
  const claimed=await ex.transaction([...guards,generation,{text:"UPDATE onboarding_invitation_items SET state='UNKNOWN',updated_at=clock_timestamp() WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3 AND employee_id=$4 AND state='PREPARED' RETURNING employee_id",values:[record.id,proof.employee.id,operationId,item.employee_id]},batchVersion(record.id,proof.employee.id,operationId)]);
  if(!claimed[guards.length+1]?.length)continue;
  const targetGuard:SqlStatement={text:`SELECT(CASE WHEN EXISTS(SELECT 1 FROM operational_subject_versions v WHERE v.workspace_id=$1 AND v.employee_id=$2 AND v.generation=$3::bigint AND $3::bigint>0) THEN '1' ELSE 'onboarding_batch_target_changed' END)::integer`,values:[record.id,item.employee_id,item.target_generation]};
  const scoped:SqlExecutor={query:(s,signal)=>ex.query(s,signal),async transaction(statements,signal){return (await ex.transaction([...statements,generation,targetGuard],signal)).slice(0,statements.length);}};
  const result=await withWorkspaceBinding(binding,()=>issueOrRevokeInvitation(proof,item.employee_id,{action:'ISSUE',operationId:item.child_operation_id,expectedEmployeeVersion:item.expected_employee_version,expectedInvitationRevision:item.expected_invitation_revision},delivery,scoped));
  const state=result.state==='saved'?'SAVED':result.state==='outcome_unknown'?'UNKNOWN':'BLOCKED';
  // Journal outcome only under live Owner authority. If access vanished during
  // delivery, UNKNOWN remains; later receipt lookup can recover known metadata.
  await ex.transaction([...onboardingOwnerGuards(proof,record.id,true),{text:"UPDATE onboarding_invitation_items SET state=$5,result=$6::jsonb,updated_at=clock_timestamp() WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3 AND employee_id=$4 AND state='UNKNOWN'",values:[record.id,proof.employee.id,operationId,item.employee_id,state,JSON.stringify(result)]},batchVersion(record.id,proof.employee.id,operationId)]);
 }
}
export async function issueInvitationBatch(proof:SessionMutationProof,binding:WorkspaceBinding,value:unknown,delivery:InvitationDelivery|null,ex?:SqlExecutor):Promise<OnboardingResult>{
 const command=parseInvitationBatchCommand(value);if(!command)return {state:'invalid',fieldErrors:[{field:'targets',code:'INVALID_COMMAND'}]};
 const sql=ex??getWorkspaceDb(binding),kind='PREPARE_INVITATION_BATCH',hash=createHash('sha256').update(JSON.stringify({kind,command})).digest('hex');
 try{
  const prior=await onboardingCommandReceipt(proof,binding,command.operationId,sql);
  if(prior&&(prior.kind!==kind||prior.hash!==hash))return {state:'conflict',reason:'changed_replay'};
  if(!prior){
   if(!delivery)return {state:'unavailable',reasonCode:'DELIVERY_NOT_CONFIGURED'};
   const {record}=workspaceBindingFacts(binding),composed=onboardingMutationExecutor({proof,binding,operationId:command.operationId,expectedVersion:command.expectedVersion,kind,hash},sql);
   await mutationTransaction(composed.executor,[...onboardingOwnerGuards(proof,record.id,true),
    {text:'INSERT INTO onboarding_invitation_batches(workspace_id,actor_employee_id,operation_id,command_hash,owner_generation) SELECT $1,$2,$3,$4,v.generation FROM operational_subject_versions v WHERE v.workspace_id=$1 AND v.employee_id=$2 RETURNING operation_id',values:[record.id,proof.employee.id,command.operationId,hash]},
    ...command.payload.targets.map(t=>({text:'INSERT INTO onboarding_invitation_items(workspace_id,actor_employee_id,operation_id,employee_id,child_operation_id,expected_employee_version,expected_invitation_revision,target_generation) SELECT $1,$2,$3,$4,$5,$6,$7,v.generation FROM operational_subject_versions v WHERE v.workspace_id=$1 AND v.employee_id=$4',values:[record.id,proof.employee.id,command.operationId,t.employeeId,invitationChildOperationId(record.id,proof.employee.id,command.operationId,t.employeeId),t.expectedEmployeeVersion,t.expectedInvitationRevision]})),
    {text:`SELECT(CASE WHEN EXISTS(SELECT 1 FROM onboarding_invitation_batches b WHERE b.workspace_id=$1 AND b.actor_employee_id=$2 AND b.operation_id=$3 AND b.owner_generation>0) AND (SELECT count(*) FROM onboarding_invitation_items WHERE workspace_id=$1 AND actor_employee_id=$2 AND operation_id=$3)=$4 THEN '1' ELSE 'onboarding_batch_targets_missing' END)::integer`,values:[record.id,proof.employee.id,command.operationId,command.payload.targets.length]}]);
  }
  await processPrepared(proof,binding,command.operationId,delivery,sql);
  return {state:'pending',operationId:command.operationId,stage:'INVITATIONS_REVIEW_STATUS',pollAfterMs:1000};
 }catch(error){
  const message=error instanceof Error?error.message:'',code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  try{const prior=await onboardingCommandReceipt(proof,binding,command.operationId,sql);if(prior)return prior.hash===hash?{state:'pending',operationId:command.operationId,stage:'INVITATIONS_REVIEW_STATUS',pollAfterMs:1000}:{state:'conflict',reason:'changed_replay'};}catch{return unavailable();}
  if(message.includes('onboarding_version_changed'))return {state:'conflict',reason:'version_changed'};
  if(code==='23503'||message.includes('onboarding_batch_targets_missing'))return {state:'invalid',fieldErrors:[{field:'targets',code:'EMPLOYEE_NOT_FOUND'}]};
  return unavailable();
 }
}
/** Read/reconcile only. It never repeats issue/send, even for missing receipts. */
export async function readInvitationBatch(proof:SessionMutationProof,binding:WorkspaceBinding,operationId:string,ex?:SqlExecutor):Promise<BatchSnapshot>{
 if(!isOperationId(operationId))return {state:'unavailable'};
 const sql=ex??getWorkspaceDb(binding);
 try{
  const batch=await batchRead(proof,binding,operationId,sql),prior=await onboardingCommandReceipt(proof,binding,operationId,sql);if(!prior||prior.hash!==batch.row.command_hash||prior.kind!=='PREPARE_INVITATION_BATCH')return {state:'unavailable'};
  const items:Extract<BatchSnapshot,{state:'ready'}>['items']=[];
  for(const item of batch.items){
   let result=item.result,state=item.state;
   if(state==='PREPARED'&&batch.row.owner_generation!==batch.row.current_generation){state='BLOCKED';result={state:'unavailable',reason:'source_unavailable'};}
   if(state==='UNKNOWN'||state==='SAVED'){
    const recovered=await readInvitationOperation(proof,item.child_operation_id,sql);
    if(recovered.state==='saved'){result=recovered;state=item.state==='UNKNOWN'&&recovered.receipt.delivery==='PREPARED'?'UNKNOWN':'SAVED';}
   }
   const status=await readInvitationStatus(proof,item.employee_id,sql);if(status.state!=='ready')return {state:'unavailable'};
   items.push({employeeId:item.employee_id,operationId:item.child_operation_id,commandState:state,result,status});
  }
  await onboardingCommandReceipt(proof,binding,operationId,sql);
  const pending=items.some(i=>i.commandState==='PREPARED'||(i.commandState==='SAVED'&&i.result?.state==='saved'&&i.result.receipt.delivery==='PREPARED')),
   unknown=items.some(i=>i.commandState==='UNKNOWN'||(i.result?.state==='saved'&&i.result.receipt.delivery==='UNKNOWN')),
   failed=items.some(i=>i.commandState==='BLOCKED'||(i.result?.state==='saved'&&i.result.receipt.delivery==='FAILED'));
  return {state:'ready',operationId,version:batch.row.version,receipt:prior.receipt,stage:pending?'PENDING':unknown?'UNKNOWN':failed?'PARTIAL':'COMPLETE',items};
 }catch{return {state:'unavailable'};}
}
