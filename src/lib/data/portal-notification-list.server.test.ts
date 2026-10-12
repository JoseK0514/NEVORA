import {afterEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readPortalNotificationList,markManagementNotificationRead} from './portal-notification-list.server';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {notificationReadManifest} from './employee-notification-list.server';
import {notificationReadSql} from './notification-state';
import {workspaceReadSql} from './workspaces';
const proof={employee:{id:'owner',role:'OWNER'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
afterEach(()=>vi.restoreAllMocks());
it.each(['list','read'] as const)('cancels stalled %s workspace reads and forwards the eight-second signal',async kind=>{
 const controller=new AbortController(),timeout=vi.spyOn(AbortSignal,'timeout').mockReturnValue(controller.signal);
 let received:AbortSignal|undefined;
 const executor:SqlExecutor={query:async<T>(_statement:SqlStatement,signal?:AbortSignal)=>{received=signal;return new Promise<T[]>(()=>{});},transaction:async(_statements,signal)=>{received=signal;return new Promise<unknown[][]>(()=>{});}};
 const operation=kind==='list'?readPortalNotificationList(proof,'test',executor):markManagementNotificationRead(proof,'own','test',executor);
 const result=operation.then(value=>value,()=>({state:'unavailable'}));
 expect(timeout).toHaveBeenCalledWith(8000);controller.abort(Error('Fixture deadline'));
 expect(await Promise.race([result,new Promise(resolve=>setTimeout(()=>resolve('still pending'),30))])).toMatchObject({state:'unavailable'});
 expect(received).toBe(controller.signal);
});
it('bounds expanded management sources and rejects arbitrary SQL',()=>{
 const manifest=notificationReadManifest(true);
 expect(()=>manifest.identify({text:'SELECT * FROM payroll_documents',values:[]})).toThrow('Unsupported');
 for(let i=0;i<64;i++)manifest.identify({text:notificationReadSql.intent(),values:['fictional-'+i]});
 expect(()=>manifest.identify({text:notificationReadSql.intent(),values:['fictional-over-budget']})).toThrow('budget');
});
it('rejects an oversized source observation without releasing a ready view',async()=>{
 const query=vi.fn(async()=>{throw Error('Unbounded query');});let count=0;
 const executor:SqlExecutor={query,transaction:async statements=>{
  count++;const last=statements.at(-1)!;
  const value=last.text===workspaceReadSql()?[{id:'workspace',name:'Fictional',active:true,timeZone:'America/Puerto_Rico',updatedAt:'2030-01-01T00:00:00Z'}]:last.text.startsWith('SELECT id,created_at')?[{id:'intent',at:'2030-01-01T00:00:00Z',read:null}]:[{rows:[{body:'x'.repeat(1_000_001)}]}];
  return statements.map((_,i)=>i===statements.length-1?value:[]);
 }};
 expect(await readPortalNotificationList(proof,'test',executor)).toEqual({state:'unavailable',reason:'read_failed'});
 expect(query).not.toHaveBeenCalled();expect(count).toBe(3);
});
