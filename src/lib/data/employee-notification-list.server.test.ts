import {expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
import {readEmployeeNotificationList,notificationReadManifest} from './employee-notification-list.server';
import type {SqlExecutor} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
const proof={employee:{id:'self',role:'EMPLOYEE'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
it('requires explicit environment independently of push and rejects forged/management proof before reads',async()=>{
 const db={query:vi.fn(),transaction:vi.fn()} as unknown as SqlExecutor;
 expect(await readEmployeeNotificationList(proof,undefined,db)).toEqual({state:'unavailable',reason:'read_failed'});
 expect(await readEmployeeNotificationList({...proof,sessionTokenHash:'forged'},'test',db)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(await readEmployeeNotificationList({...proof,employee:{...proof.employee,role:'OWNER'}},'test',db)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(db.query).not.toHaveBeenCalled();expect(db.transaction).not.toHaveBeenCalled();
});
it('closed manifest rejects unknown/mutation/multi-statement/changed parameter queries and never falls back',()=>{
 const replay=notificationReadManifest();
 expect(()=>replay.identify({text:'SELECT private FROM arbitrary',values:[]})).toThrow();
 expect(()=>replay.identify({text:'DELETE FROM notifications',values:[]})).toThrow();
 expect(()=>replay.identify({text:'SELECT 1; SELECT 2',values:[]})).toThrow();
 expect(()=>replay.identify({text:'SELECT id FROM locations WHERE id=ANY($1::text[]) AND active=true',values:[undefined]})).toThrow();
});
