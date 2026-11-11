import 'server-only';
import {getSession,requireSessionMutationProof} from '../auth/session';
import {correctionBoundary,correctionJson,readCorrectionJson} from '../time-corrections/http.server';
import {communicationAuthority} from '../communications/service.server';
import {moduleEnabled} from '../workspace-presentation/current.server';
import {executeManagerReminder,findManagerReminderOperation} from './service.server';
import type {ManagerReminderCommand} from './types';
const transportBytes=2048;
/** Same-origin management command and session-bound status recovery; never sends. */
export async function managerReminderHttp(request:Request,operationId?:string):Promise<Response>{
 const write=operationId===undefined,boundary=correctionBoundary(request,write,'x-nevora-reminder',transportBytes);
 if(boundary)return correctionJson({status:'blocked',reason:'access_denied'},boundary);
 if(request.method!==(write?'POST':'GET'))return correctionJson({status:'unavailable',reason:'method_not_allowed'},405);
 try{
  const session=await getSession();if(!session)return correctionJson({status:'blocked',reason:'access_denied'},401);
  if(!['OWNER','MANAGER'].includes(session.role))return correctionJson({status:'blocked',reason:'access_denied'},403);
  const proof=await requireSessionMutationProof(),authority=communicationAuthority(proof);
  if(proof.employee.id!==session.id||proof.employee.role!==session.role||request.headers.get('x-nevora-reminder-authority')!==authority)return correctionJson({status:'blocked',reason:'access_denied'},403);
  let value:unknown;
  if(write){try{value=await readCorrectionJson(request,transportBytes);}catch{return correctionJson({status:'blocked',reason:'invalid_command'},400);}
   if(value&&typeof value==='object'&&'kind'in value&&value.kind==='COMMUNICATION'&&!await moduleEnabled('updates'))return correctionJson({status:'unavailable',reason:'module_off'},404);
  }
  const result=write?await executeManagerReminder(proof,value as ManagerReminderCommand):await findManagerReminderOperation(proof,operationId!,authority);
  return correctionJson(result,result.status==='committed'?200:result.status==='blocked'?403:result.status==='conflict'?409:503);
 }catch{return correctionJson({status:'unavailable',reason:'read_failed'},503);}
}
