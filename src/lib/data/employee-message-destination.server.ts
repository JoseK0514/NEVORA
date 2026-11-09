import 'server-only';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
import {createNotificationOpenHandler} from '../notifications/open';
import {safeNotificationOpenPath} from '../notifications/destinations';
import {safeMessageDestination} from '../employee-message-navigation';
import {sqlNotificationStateRepository} from './notification-state';
import {employeeMessageReadContext} from './employee-messages.server';
import {readActivePresentation} from '../workspace-presentation/service';
import {moduleForPath} from '../workspace-presentation/modules';
import {neonNotificationExecutor} from './notification-transactions';
import {isManagementAuthorizationError} from './management-session';
export type EmployeeMessageDestination={state:'ready';href:string}|{state:'unavailable';reason:'access_denied'|'read_failed'};
/** A JSON adapter of the existing guarded open handler, with no read/ack mutation.
 * Normal clicks can retain mounted navigation memory; native/new-tab links keep
 * the existing redirect route and start a fresh document lifetime. */
export async function readEmployeeMessageDestination(proof:SessionMutationProof,id:string,environment:unknown,executor:SqlExecutor=neonNotificationExecutor()):Promise<EmployeeMessageDestination>{
 try{
  if(!safeNotificationOpenPath(id)||(environment!=='test'&&environment!=='production'))return {state:'unavailable',reason:'read_failed'};
  const {workspace,guarded}=await employeeMessageReadContext(proof,executor);
  const response=await createNotificationOpenHandler({session:async()=>proof.employee,state:sqlNotificationStateRepository(guarded,workspace),environment,clock:()=>new Date()})(new Request('https://nevora.invalid'+safeNotificationOpenPath(id)));
  const href=response.headers.get('location');if(response.status!==303||!safeMessageDestination(href))return {state:'unavailable',reason:'read_failed'};
  const destinationModule=moduleForPath(href);if(destinationModule&&!(await readActivePresentation(workspace.id,guarded,{strict:true})).modules[destinationModule])return {state:'unavailable',reason:'read_failed'};
  await guarded.query({text:'SELECT 1',values:[]});return {state:'ready',href};
 }catch(error){return {state:'unavailable',reason:isManagementAuthorizationError(error)?'access_denied':'read_failed'};}
}
