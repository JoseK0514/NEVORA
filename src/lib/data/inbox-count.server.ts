import 'server-only';
import {readActionCenter} from '../action-center/service';
import {needsYou} from '../action-center/needs-you';
import {readToday} from './today.server';
import {weekStartFor} from '../date-utils';
import {assertManagementProof,managementSessionStatements} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
export type InboxCount={state:'ready';count:number;observedAt:string}|{state:'unavailable'};
export async function readInboxCount(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<InboxCount> {
  try {
    assertManagementProof(proof,proof?.employee?.id);
    if(!['OWNER','MANAGER'].includes(proof.employee.role))return {state:'unavailable'};
    const today=await readToday(proof,executor);
    if(today.state!=='ready')return {state:'unavailable'};
    const actions=await readActionCenter(proof,weekStartFor(today.today),executor);
    if(actions.state!=='ready')return {state:'unavailable'};
    // Both private sources must still be live; never turn a partial read into zero.
    if(Date.parse(actions.observedAt)>Date.parse(today.observedAt)+today.validForMs)return {state:'unavailable'};
    await executor.transaction(managementSessionStatements(proof,proof.employee.id,[proof.employee.role]));
    return {state:'ready',count:needsYou(actions.items,today.today,today.missed,{id:proof.employee.id,role:proof.employee.role}).count,observedAt:actions.observedAt};
  }catch{return {state:'unavailable'};}
}
