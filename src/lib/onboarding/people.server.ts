import 'server-only';
import {createHash} from 'node:crypto';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import type {WorkspaceBinding} from '../workspace-routing/resolver.server';
import {getWorkspaceDb} from '../workspace-routing/transport.server';
import {createEmployeeWithAccess,readEmployeeCoreAccessOperation,parseCreateEmployeeWithAccessCommand} from '../company-access/employee-profile.server';
import {isClosedRecord,parseOnboardingCommand,type OnboardingResult} from './contracts';
import {onboardingCommandReceipt,onboardingMutationExecutor,readOnboardingState} from './setup.server';
/** Thin canonical adapter. Profile/eligibility/qualification/scope and both
 * receipts share one transaction. This module never imports mail delivery. */
export async function saveOnboardingPerson(proof:SessionMutationProof,binding:WorkspaceBinding,value:unknown,ex?:SqlExecutor):Promise<OnboardingResult>{
 const envelope=parseOnboardingCommand(value,v=>isClosedRecord(v,['employee'],['initialManagerScope'])?v:null);
 if(!envelope)return {state:'invalid',fieldErrors:[{field:'employee',code:'INVALID_COMMAND'}]};
 const command=parseCreateEmployeeWithAccessCommand({operationId:envelope.operationId,...envelope.payload});
 if(!command)return {state:'invalid',fieldErrors:[{field:'employee',code:'EMPLOYEE_DETAILS_REQUIRED'}]};
 const sql=ex??getWorkspaceDb(binding),kind='CREATE_EMPLOYEE',hash=createHash('sha256').update(JSON.stringify({schemaVersion:1,kind,expectedVersion:envelope.expectedVersion,command})).digest('hex');
 const recover=async():Promise<OnboardingResult|null>=>{
  const prior=await onboardingCommandReceipt(proof,binding,envelope.operationId,sql);if(!prior)return null;
  if(prior.kind!==kind||prior.hash!==hash)return {state:'conflict',reason:'changed_replay'};
  const core=await readEmployeeCoreAccessOperation(proof,envelope.operationId,sql);
  if(core.state!=='saved'||core.receipt.employeeId!==command.employee.id)return {state:'unavailable',reasonCode:'CANONICAL_RECEIPT_UNAVAILABLE'};
  return {state:'saved',receipt:prior.receipt,snapshot:await readOnboardingState(proof,binding,sql)};
 };
 try{
  const prior=await recover();if(prior)return prior;
  const composed=onboardingMutationExecutor({proof,binding,operationId:envelope.operationId,expectedVersion:envelope.expectedVersion,kind,hash,subjectId:command.employee.id,matches:statements=>statements.some(s=>s.text.startsWith('INSERT INTO employees('))},sql);
  const result=await createEmployeeWithAccess(proof,command,composed.executor);
  const saved=await recover();if(saved)return saved;
  if(composed.failureReason()==='version_changed')return {state:'conflict',reason:'version_changed'};
  switch(result.state){
   case 'invalid':return {state:'invalid',fieldErrors:result.fieldErrors.map(e=>({field:e.field,code:'CANONICAL_VALIDATION_FAILED'}))};
   case 'conflict':return {state:'conflict',reason:result.reason==='changed_replay'?'changed_replay':'target_changed'};
   case 'outcome_unknown':return {state:'outcome_unknown',operationId:envelope.operationId};
   case 'saved':return {state:'unavailable',reasonCode:'CANONICAL_COMMAND_REQUIRES_REVIEW'};
   default:return {state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'};
  }
 }catch(error){
  try{const prior=await recover();if(prior)return prior;}catch{return {state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'};}
  const message=error instanceof Error?error.message:'';
  return /onboarding_version_changed/.test(message)?{state:'conflict',reason:'version_changed'}:{state:'unavailable',reasonCode:'ACCESS_OR_SOURCE_UNAVAILABLE'};
 }
}
