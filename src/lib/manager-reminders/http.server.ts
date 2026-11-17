import 'server-only';
import {getSession,readSessionMutationProof} from '../auth/session';
import {reportHandledServerError,withServerErrorDiagnostics} from '../server-error';
import {correctionBoundary,correctionJson,readCorrectionJson} from '../time-corrections/http.server';
import {communicationAuthority} from '../communications/service.server';
import {moduleEnabled} from '../workspace-presentation/current.server';
import {executeManagerReminder,findManagerReminderOperation,readManagerReminderEligibility} from './service.server';
import type {ManagerReminderCommand} from './types';
const transportBytes=2048;
/** Same-origin management command and session-bound status recovery; never sends. */
export async function managerReminderHttp(request:Request,operationId?:string):Promise<Response>{
 return reminderHttp(request,operationId,false);
}
/** POST carries the exact proposed command privately; this handler only reads. */
export async function managerReminderEligibilityHttp(request:Request):Promise<Response>{
 return withServerErrorDiagnostics('/api/manager/reminders/eligibility',()=>reminderHttp(request,undefined,true));
}
async function reminderHttp(request:Request,operationId:string|undefined,preview:boolean):Promise<Response>{
 const write=operationId===undefined,boundary=correctionBoundary(request,write,'x-nevora-reminder',transportBytes);
 if(boundary)return correctionJson({status:'blocked',reason:'access_denied'},boundary);
 if(request.method!==(write?'POST':'GET'))return correctionJson({status:'unavailable',reason:'method_not_allowed'},405);
 try{
  const session=await getSession();if(!session)return correctionJson({status:'blocked',reason:'access_denied'},401);
  if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({status:'blocked',reason:'access_denied'},403);
  const proof=await readSessionMutationProof();if(!proof)return correctionJson({status:'blocked',reason:'access_denied'},401);
  const authority=communicationAuthority(proof);
  if(proof.employee.id!==session.id||proof.employee.role!==session.role||request.headers.get('x-nevora-reminder-authority')!==authority)return correctionJson({status:'blocked',reason:'access_denied'},403);
  let value:unknown;
  if(write){try{value=await readCorrectionJson(request,transportBytes);}catch{return correctionJson({status:'blocked',reason:'invalid_command'},400);}
   if(value&&typeof value==='object'&&'kind'in value&&value.kind==='COMMUNICATION'&&!await moduleEnabled('updates'))return correctionJson({status:'unavailable',reason:'module_off'},404);
  }
  const result=preview?await readManagerReminderEligibility(proof,value as ManagerReminderCommand):write?await executeManagerReminder(proof,value as ManagerReminderCommand):await findManagerReminderOperation(proof,operationId!,authority);
  return correctionJson(result,['committed','ready','cooldown'].includes(result.status)?200:result.status==='blocked'?403:result.status==='conflict'?409:503);
 }catch(error){if(preview)reportHandledServerError(error,'/api/manager/reminders/eligibility');return correctionJson({status:'unavailable',reason:'read_failed'},503);}
}
