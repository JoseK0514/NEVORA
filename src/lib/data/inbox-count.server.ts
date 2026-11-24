import 'server-only';
import {assertOperationalAccess,assertOriginalOperationalAccess} from '../company-access/operational-scope.server';
import {readActionCenterForCurrentScope} from '../action-center/service';
import {workspaceNow} from '../action-center/inbox';
import {needsYou} from '../action-center/needs-you';
import {readToday} from './today.server';
import {weekStartFor} from '../date-utils';
import {assertManagementProof} from './management-session';
import {neonNotificationExecutor} from './notification-transactions';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor} from '../notifications/types';
export type InboxCount={state:'ready';count:number;observedAt:string}|{state:'unavailable'};
export async function readInboxCount(proof:SessionMutationProof,executor:SqlExecutor=neonNotificationExecutor()):Promise<InboxCount> {
  try {
    assertManagementProof(proof,proof?.employee?.id);
    if(!['OWNER','MANAGER'].includes(proof.employee.role))return {state:'unavailable'};
    const access=await assertOperationalAccess(proof,undefined,executor);
    const today=await readToday(proof,executor,access);
    if(today.state!=='ready')return {state:'unavailable'};
    const actions=await readActionCenterForCurrentScope(proof,weekStartFor(today.today),executor);
    if(actions.state!=='ready')return {state:'unavailable'};
    // Both private sources must still be live; never turn a partial read into zero.
    if(Date.parse(actions.observedAt)>Date.parse(today.observedAt)+today.validForMs)return {state:'unavailable'};
    await assertOriginalOperationalAccess(proof,access,executor);
    return {state:'ready',count:needsYou(actions.items,today.today,today.missed,workspaceNow(actions.observedAt,today.timeZone)).count,observedAt:actions.observedAt};
  }catch{return {state:'unavailable'};}
}
