import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readPortalNotificationList,markManagementNotificationRead} from './portal-notification-list.server';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
const proof={employee:{id:'owner',role:'OWNER'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
afterEach(()=>vi.restoreAllMocks());
it.each(['list','read'] as const)('cancels stalled %s workspace reads and forwards the eight-second signal',async kind=>{
 const controller=new AbortController(),timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(controller.signal);
 let received:AbortSignal|undefined;
 const executor:SqlExecutor={query:async<T>(_statement,signal)=>{received=signal;return new Promise<T[]>(()=>{});},transaction:async(_statements,signal)=>{received=signal;return new Promise<unknown[][]>(()=>{});}};
 const operation=kind==='list'?readPortalNotificationList(proof,'test',executor):markManagementNotificationRead(proof,'own','test',executor);
 const result=operation.then(value=>value,()=>({state:'unavailable'}));
 expect(timeout).toHaveBeenCalledWith(8000);controller.abort(Error('Fixture deadline'));
 expect(await Promise.race([result,new Promise(resolve=>setTimeout(()=>resolve('still pending'),30))])).toMatchObject({state:'unavailable'});
 expect(received).toBe(controller.signal);
});
