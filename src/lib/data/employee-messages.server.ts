import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import {parseEmployeeMessages,validMessageSelection,type EmployeeMessages,type UpdatesAvailability} from '../employee-messages';
import {employeeViewAuthority} from '../employee-view-authority.server';
import {communicationAuthority,readEmployeeCommunicationPage,readCommunication,readCommunicationContext} from '../communications/service.server';
import {assertEmployeeViewProof,employeeViewGuards,employeeReadLimits,readEmployeeWorkspace} from './employee-profile.server';
import {isManagementAuthorizationError} from './management-session';
import {readActivePresentation} from '../workspace-presentation/service';
import {neonNotificationExecutor} from './notification-transactions';
import {readEmployeeNotificationPage} from './employee-notification-list.server';
import {employeeUpdatesExecutor} from './employee-message-module.server';
function deadline(value:unknown):number{
 if(!value||typeof value!=='object')return Infinity;const v=value as Record<string,unknown>;
 if('value'in v)return deadline(v.value);
 return ['ready','complete','partial'].includes(String(v.state))&&typeof v.observedAt==='string'&&typeof v.validForMs==='number'?Date.parse(v.observedAt)+v.validForMs:Infinity;
}
export async function employeeMessageReadContext(proof:SessionMutationProof,executor:SqlExecutor){
 assertEmployeeViewProof(proof);
  const started=performance.now(),signal=AbortSignal.timeout(10000),workspace=await readEmployeeWorkspace(executor,signal),admission=()=>[...employeeReadLimits,...employeeViewGuards(proof,workspace,false)];
  const guarded:SqlExecutor={
   async query<T>(statement:SqlStatement,caller?:AbortSignal){const prefix=admission(),rows=await executor.transaction([...prefix,statement,...employeeViewGuards(proof,workspace,false)],caller?AbortSignal.any([caller,signal]):signal);return rows[prefix.length] as T[];},
   async transaction(statements,caller){const prefix=admission(),rows=await executor.transaction([...prefix,...statements,...employeeViewGuards(proof,workspace,false)],caller?AbortSignal.any([caller,signal]):signal);return rows.slice(prefix.length,prefix.length+statements.length);},
  };
 return {started,signal,workspace,guarded};
}
/** Finite own reads. The command/preview/operation HTTP owner remains canonical. */
export async function readEmployeeMessages(proof:SessionMutationProof,view:string,selection:string,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeMessages>{
 try{assertEmployeeViewProof(proof);}catch{return {state:'unavailable',reason:'access_denied'};}
 if(!validMessageSelection(view,selection))return {state:'unavailable',reason:'read_failed'};
 try{
  const {started,workspace,guarded}=await employeeMessageReadContext(proof,executor);
  const availability=async():Promise<UpdatesAvailability>=>{try{return (await readActivePresentation(workspace.id,guarded,{strict:true})).modules.updates?'on':'off';}catch(error){if(isManagementAuthorizationError(error))throw error;return 'unavailable';}};
  let updates=await availability(),data:unknown=null;
  if(view==='notifications')data=await readEmployeeNotificationPage(proof,environment,guarded,selection==='first'?null:selection);
  else if(updates==='on'){
   const ownUpdates=await employeeUpdatesExecutor(proof,guarded);
   data=view==='updates'?await readEmployeeCommunicationPage(proof,ownUpdates,selection==='first'?null:selection):view==='detail'?await readCommunication(proof,selection,ownUpdates):await readCommunicationContext(proof,ownUpdates);
  }
  const [lease]=await guarded.query<{observedAt:string;validForMs:number}>({text:`SELECT clock_timestamp()::text AS "observedAt",LEAST(45000,FLOOR(EXTRACT(EPOCH FROM(expires_at-clock_timestamp()))*1000))::integer AS "validForMs" FROM employee_sessions WHERE employee_id=$1 AND token_hash=$2`,values:[proof.employee.id,proof.sessionTokenHash]});
  updates=await availability();if(view!=='notifications'&&updates!=='on')data=null;
  const validForMs=Math.floor(Math.min(lease.validForMs,45000-(performance.now()-started),deadline(data)-Date.parse(lease.observedAt)));
  return parseEmployeeMessages({state:'ready',kind:'communications',view,selection,authority:employeeViewAuthority(proof,'communications'),communicationAuthority:communicationAuthority(proof),observedAt:lease.observedAt,validForMs,timeZone:workspace.timeZone,updates,data});
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
